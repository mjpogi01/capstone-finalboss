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

function getPool() {
  if (!connectionString) {
    const errorMsg = 'Missing DATABASE_URL environment variable for direct SQL access.\n' +
      'To fix this, add DATABASE_URL to your server/.env file.\n' +
      'Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres\n' +
      'You can find this in your Supabase project settings under Database > Connection String > URI';
    console.error(errorMsg);
    throw new Error('Missing DATABASE_URL environment variable');
  }

  if (!pool) {
    try {
      // Check if connection string is for Supabase (requires SSL)
      const isSupabase = connectionString.includes('supabase') || connectionString.includes('.supabase.co');
      
      pool = new Pool({
        connectionString,
        // Always use SSL for Supabase connections, with rejectUnauthorized: false for self-signed certs
        ssl: isSupabase ? {
          rejectUnauthorized: false,
          require: true
        } : {
          rejectUnauthorized: false
        },
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000
      });
      
      // Test the connection
      pool.on('connect', () => {
        console.log('✅ Database pool connected successfully');
      });
      
      pool.on('error', (err) => {
        console.error('❌ Database pool error:', err.message);
      });
    } catch (poolError) {
      console.error('Failed to create database connection pool:', poolError);
      throw new Error(`Database connection failed: ${poolError.message}`);
    }
  }

  return pool;
}

async function executeSql(sql, params = []) {
  let client;
  try {
    client = await getPool().connect();
    const start = Date.now();
    const result = await client.query(sql, params);
    result.durationMs = Date.now() - start;
    return result;
  } catch (error) {
    console.error('SQL execution error:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL query:', sql.substring(0, 200));

    const errorMsg = (error.message || String(error) || '').toLowerCase();
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
      client.release();
    }
  }
}

module.exports = {
  executeSql
};

