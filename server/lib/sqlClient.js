const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Try multiple .env file locations
const rootEnvPath = path.join(__dirname, '..', '..', '.env'); // Root directory
const serverEnvPath = path.join(__dirname, '..', '.env'); // Server directory

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
  console.log('✅ Loaded .env from server directory');
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
  console.log('✅ Loaded .env from root directory');
} else {
  // Try loading from default locations
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  console.log('⚠️  .env file not found, trying default paths');
}

const connectionString = process.env.DATABASE_URL;

let pool;
let keepAliveInterval;
let lastActivityTime = Date.now();
const KEEP_ALIVE_INTERVAL = 25000; // 25 seconds (before 30s idle timeout)
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Check if error is a connection termination error
 */
function isTerminationError(error) {
  if (!error) return false;
  
  const errorMsg = (error.message || String(error) || '').toLowerCase();
  const errorCode = error.code || '';
  
  return (
    errorMsg.includes('shutdown') ||
    errorMsg.includes('db_termination') ||
    errorMsg.includes('connection terminated') ||
    errorMsg.includes('server closed the connection') ||
    errorCode === 'XX000' ||
    errorCode === '57P01' || // Admin shutdown
    errorCode === '57P02' || // Crash shutdown
    errorCode === '57P03'    // Cannot connect now
  );
}

/**
 * Create a new database pool
 */
function createPool() {
  if (!connectionString) {
    const errorMsg = 'Missing DATABASE_URL environment variable for direct SQL access.\n' +
      'To fix this, add DATABASE_URL to your server/.env file.\n' +
      'Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres\n' +
      'You can find this in your Supabase project settings under Database > Connection String > URI';
    console.error(errorMsg);
    throw new Error('Missing DATABASE_URL environment variable');
  }

  // Check if connection string is for Supabase (requires SSL)
  const isSupabase = connectionString.includes('supabase') || connectionString.includes('.supabase.co');
  const isPooler = connectionString.includes('pooler.supabase.com');
  
  const newPool = new Pool({
    connectionString,
    // Always use SSL for Supabase connections, with rejectUnauthorized: false for self-signed certs
    ssl: isSupabase ? {
      rejectUnauthorized: false,
      require: true
    } : {
      rejectUnauthorized: false
    },
    max: isPooler ? 3 : 5, // Lower max for pooler to avoid limits
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000
  });
  
  // Handle connection events
  newPool.on('connect', () => {
    console.log('✅ Database pool connected successfully');
    lastActivityTime = Date.now();
  });
  
  newPool.on('error', (err) => {
    const errorMsg = err.message || String(err);
    if (isTerminationError(err)) {
      console.warn('⚠️  Database pool connection terminated (will auto-recover):', errorMsg.substring(0, 100));
      // Mark pool as invalid so it gets recreated on next use
      pool = null;
    } else {
      console.error('❌ Database pool error:', errorMsg.substring(0, 100));
    }
  });
  
  return newPool;
}

/**
 * Get or create database pool with automatic recovery
 */
function getPool() {
  if (!pool) {
    try {
      pool = createPool();
      startKeepAlive();
    } catch (poolError) {
      console.error('Failed to create database connection pool:', poolError);
      throw new Error(`Database connection failed: ${poolError.message}`);
    }
  }
  return pool;
}

/**
 * Start keep-alive mechanism to prevent idle connection termination
 */
function startKeepAlive() {
  // Clear existing interval if any
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  keepAliveInterval = setInterval(async () => {
    // Only ping if no activity in the last 20 seconds
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    if (timeSinceLastActivity > 20000 && pool) {
      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        lastActivityTime = Date.now();
      } catch (error) {
        // If keep-alive fails, pool might be terminated - will be recreated on next query
        if (isTerminationError(error)) {
          console.warn('⚠️  Keep-alive ping failed, pool may be terminated');
          pool = null;
        }
      }
    }
  }, KEEP_ALIVE_INTERVAL);
}

/**
 * Health check: verify pool is still valid
 */
async function checkPoolHealth() {
  if (!pool) return false;
  
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    lastActivityTime = Date.now();
    return true;
  } catch (error) {
    if (isTerminationError(error)) {
      console.warn('⚠️  Pool health check failed, recreating pool');
      try {
        await pool.end();
      } catch (e) {
        // Ignore errors when ending terminated pool
      }
      pool = null;
      return false;
    }
    throw error;
  }
}

/**
 * Execute SQL with automatic retry and connection recovery
 */
async function executeSql(sql, params = [], retryCount = 0) {
  let client;
  
  try {
    // Check pool health before connecting
    if (pool && !(await checkPoolHealth())) {
      // Pool was terminated, recreate it
      console.log('🔄 Recreating database pool after termination');
      try {
        await pool.end();
      } catch (e) {
        // Ignore errors when ending terminated pool
      }
      pool = null;
    }
    
    // Get or create pool
    const currentPool = getPool();
    client = await currentPool.connect();
    lastActivityTime = Date.now();
    
    const start = Date.now();
    const result = await client.query(sql, params);
    result.durationMs = Date.now() - start;
    lastActivityTime = Date.now();
    
    return result;
  } catch (error) {
    // Release client if we got one
    if (client) {
      try {
        client.release();
      } catch (e) {
        // Ignore release errors
      }
    }
    
    // Check if this is a termination error that we can retry
    if (isTerminationError(error) && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      console.log(`🔄 Connection terminated, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      
      // Recreate pool
      if (pool) {
        try {
          await pool.end();
        } catch (e) {
          // Ignore errors
        }
        pool = null;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the query
      return executeSql(sql, params, retryCount + 1);
    }
    
    // Log error details
    console.error('SQL execution error:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL query:', sql.substring(0, 200));

    const errorMsg = (error.message || String(error) || '').toLowerCase();
    
    // Handle specific error types
    if (errorMsg.includes('tenant') || errorMsg.includes('user not found')) {
      const helpfulError = new Error(
        'Database connection failed with "Tenant or user not found" error.\n' +
        'This usually means:\n' +
        '  1. The database password in DATABASE_URL is incorrect\n' +
        '  2. The connection pooler is having issues (try direct connection on port 5432)\n' +
        '  3. The connection string format is wrong\n\n' +
        'To fix:\n' +
        '  1. Go to Supabase Dashboard > Project Settings > Database\n' +
        '  2. Reset your database password if needed\n' +
        '  3. Copy the "URI" connection string (not Connection Pooling)\n' +
        '  4. Update DATABASE_URL in server/.env with the working connection string.'
      );
      helpfulError.originalError = error;
      throw helpfulError;
    }

    if (errorMsg.includes('password authentication failed')) {
      const helpfulError = new Error(
        'Database password authentication failed. Please check your DATABASE_URL password in server/.env'
      );
      helpfulError.originalError = error;
      throw helpfulError;
    }

    if (errorMsg.includes('self-signed certificate') || errorMsg.includes('certificate') || error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('❌ SSL Certificate error detected. This might be a Node.js SSL configuration issue.');
      console.error('❌ Try setting NODE_TLS_REJECT_UNAUTHORIZED=0 in your environment (development only!)');
      const helpfulError = new Error(
        'SSL certificate verification failed. This is common with Supabase connections.\n' +
        'For development: Set NODE_TLS_REJECT_UNAUTHORIZED=0 in your .env file or environment variables.'
      );
      helpfulError.originalError = error;
      helpfulError.isSSLError = true;
      throw helpfulError;
    }

    if (errorMsg.includes('does not exist') || errorMsg.includes('relation')) {
      console.error('Table might not exist or schema issue');
    }

    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (e) {
        // Ignore release errors
      }
    }
  }
}

/**
 * Cleanup function to close pool and intervals
 */
function cleanup() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (pool) {
    return pool.end();
  }
  return Promise.resolve();
}

// Cleanup on process exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
  executeSql,
  checkPoolHealth,
  cleanup
};

