const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
const serverEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Import backup using connection pooler (IPv4 compatible)
 */
async function importBackupWithPooler(databaseUrl, backupFile) {
  console.log('\n📥 Importing backup using connection pooler (IPv4 compatible)...\n');
  
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  // Validate connection string
  if (!databaseUrl || typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('Invalid DATABASE_URL: URL is empty or invalid');
  }

  // Parse URL and verify format
  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
    console.log(`📡 Connecting via pooler: ${parsedUrl.hostname}:${parsedUrl.port || 5432}`);
    console.log(`👤 Username: ${parsedUrl.username}`);
    
    // Verify pooler username format
    if (!parsedUrl.username.includes('.')) {
      throw new Error(`Invalid pooler username format. Should be "postgres.PROJECT_ID", got: "${parsedUrl.username}"`);
    }
    
    if (!parsedUrl.password) {
      throw new Error('Password is missing in connection string');
    }
    
    console.log(`🔐 Password: ${parsedUrl.password ? '***' + parsedUrl.password.slice(-4) : 'MISSING'}\n`);
  } catch (error) {
    if (error.message.includes('Invalid URL')) {
      throw new Error(`Invalid DATABASE_URL format: ${error.message}. Make sure it starts with postgresql://`);
    }
    throw error;
  }

  // Read backup file
  console.log(`📖 Reading backup file: ${backupFile}`);
  const stats = fs.statSync(backupFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 Backup file size: ${fileSizeMB} MB\n`);

  if (stats.size === 0) {
    throw new Error('Backup file is empty!');
  }

  const backupContent = fs.readFileSync(backupFile, 'utf8');
  
  if (!backupContent || backupContent.trim().length === 0) {
    throw new Error('Backup file appears to be empty or invalid!');
  }

  // Create database connection with pooler settings
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    max: 1, // Single connection for import
    connectionTimeoutMillis: 120000, // 2 minutes timeout
    idleTimeoutMillis: 30000
  });

  // Handle pool errors (connection terminations)
  pool.on('error', (err) => {
    const errorMsg = err.message || String(err);
    if (errorMsg.includes('shutdown') || errorMsg.includes('db_termination') || err.code === 'XX000') {
      console.log(`  ⚠️  Pool connection terminated (will retry on next query): ${errorMsg.substring(0, 80)}`);
      // Don't throw - let the retry logic handle it
    } else {
      console.error(`  ❌ Pool error: ${errorMsg.substring(0, 100)}`);
    }
  });

  try {
    // Test connection
    console.log('🔌 Testing database connection via pooler...');
    console.log(`   Username: ${parsedUrl.username}`);
    console.log(`   Host: ${parsedUrl.hostname}`);
    
    try {
      await pool.query('SELECT 1');
      console.log('✅ Connected successfully via pooler!\n');
    } catch (authError) {
      const errorMsg = authError.message || String(authError);
      if (errorMsg.includes('password authentication failed')) {
        console.error('\n❌ Password authentication failed!');
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Verify your database password in Supabase Dashboard:');
        console.error('      Settings → Database → Database password');
        console.error('   2. Reset password if needed:');
        console.error('      Settings → Database → Reset database password');
        console.error('   3. Make sure you\'re using the DATABASE password (not API keys)');
        console.error('   4. Copy the connection string again from Supabase Dashboard');
        console.error('      (Connection Pooling tab) and replace [YOUR-PASSWORD]\n');
        console.error(`   Current username: ${parsedUrl.username}`);
        console.error(`   Current host: ${parsedUrl.hostname}\n`);
      }
      throw authError;
    }

    // For pooler, we need to execute in smaller batches
    console.log('📝 Splitting SQL into manageable batches...\n');
    
    // Split by semicolons, handling strings and CREATE TABLE statements properly
    const allStatements = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let parenDepth = 0; // Track parentheses depth for CREATE TABLE statements
    
    for (let i = 0; i < backupContent.length; i++) {
      const char = backupContent[i];
      const prevChar = i > 0 ? backupContent[i - 1] : '';
      const nextChar = i < backupContent.length - 1 ? backupContent[i + 1] : '';
      
      // Handle string literals
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
      }
      
      // Track parentheses depth (for CREATE TABLE statements)
      if (!inString) {
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
      }
      
      currentStatement += char;
      
      // Only split on semicolon if we're not inside parentheses (CREATE TABLE) or strings
      if (!inString && char === ';' && parenDepth === 0) {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0 && 
            !trimmed.startsWith('--') && 
            trimmed !== 'BEGIN' && 
            trimmed !== 'COMMIT' &&
            !trimmed.match(/^\s*$/)) {
          allStatements.push(trimmed);
        }
        currentStatement = '';
        parenDepth = 0; // Reset for next statement
      }
    }
    
    if (currentStatement.trim().length > 0) {
      allStatements.push(currentStatement.trim());
    }

    // Separate CREATE TABLE statements from INSERT statements
    // This ensures tables are created before data is inserted
    const createStatements = [];
    const insertStatements = [];
    const otherStatements = [];
    
    for (const stmt of allStatements) {
      const upperStmt = stmt.toUpperCase().trim();
      if (upperStmt.startsWith('CREATE TABLE')) {
        createStatements.push(stmt);
      } else if (upperStmt.startsWith('INSERT INTO')) {
        insertStatements.push(stmt);
      } else {
        otherStatements.push(stmt);
      }
    }

    console.log(`📋 Total statements: ${allStatements.length}`);
    console.log(`   - CREATE TABLE: ${createStatements.length}`);
    console.log(`   - INSERT: ${insertStatements.length}`);
    console.log(`   - Other: ${otherStatements.length}\n`);
    
    // Combine in correct order: CREATE TABLE first, then other, then INSERT
    const statements = [...createStatements, ...otherStatements, ...insertStatements];
    
    console.log('✅ Reordered statements: CREATE TABLE → Other → INSERT (ensures tables exist before inserts)\n');
    console.log('🚀 Starting import (this may take 10-20 minutes for large files)...\n');
    console.log('   ⏳ Please be patient, do not interrupt the process...\n');

    // Execute in smaller batches for pooler
    // Use smaller batches and individual statements to avoid connection termination
    const batchSize = 5; // Very small batches to avoid pooler timeouts
    let executed = 0;
    let errors = 0;
    let connectionRetries = 0;
    const maxRetries = 3;

    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      
      // Execute statements individually instead of in a transaction
      // This avoids long-running transactions that get terminated by pooler
      let batchExecuted = 0;
      
      for (const statement of batch) {
        let retryCount = 0;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
          try {
            // Execute each statement individually (no transaction wrapper)
            // Add small delay between statements to avoid overwhelming pooler
            if (executed > 0 && executed % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay every 10 statements
            }
            
            await pool.query(statement);
            batchExecuted++;
            success = true;
          } catch (error) {
            const errorMsg = error.message || String(error);
            const errorCode = error.code || '';
            
            // Check for connection termination
            if (errorMsg.includes('shutdown') || 
                errorMsg.includes('db_termination') ||
                errorMsg.includes('connection terminated') ||
                errorCode === 'XX000') {
              
              if (retryCount < maxRetries - 1) {
                retryCount++;
                connectionRetries++;
                console.log(`  🔄 Connection terminated, retrying statement (${retryCount}/${maxRetries})...`);
                
                // Wait longer before retry (pooler needs time to recover)
                await new Promise(resolve => setTimeout(resolve, 3000 + (retryCount * 1000))); // 3s, 4s, 5s delays
                
                // Try to get a new connection by ending and recreating pool if needed
                try {
                  // Test connection
                  const testClient = await pool.connect();
                  await testClient.query('SELECT 1');
                  testClient.release();
                } catch (reconnectError) {
                  console.log(`  ⚠️  Reconnection test failed, will try statement anyway...`);
                }
                
                continue; // Retry the statement
              } else {
                // Max retries reached - log but continue
                console.error(`  ❌ Connection terminated after ${maxRetries} retries. Skipping this statement.`);
                console.error(`      You may need to run the import again to catch missed statements.`);
                errors++;
                success = true; // Mark as "handled" to continue
              }
            } else if (errorMsg.includes('does not exist')) {
              // Relation doesn't exist - this can happen if CREATE TABLE hasn't run yet
              // Since we reordered statements, this shouldn't happen often, but we'll skip and continue
              if (errors < 20) {
                console.log(`  ⚠️  Relation does not exist (will skip for now): ${errorMsg.substring(0, 80)}`);
              }
              errors++;
              success = true; // Skip this statement and continue
            } else if (errorMsg.includes('already exists')) {
              // Table already exists - this is fine
              if (errors < 10) {
                console.log(`  ℹ️  Table already exists: ${errorMsg.substring(0, 60)}`);
              }
              errors++;
              success = true; // Continue
            } else if (errorMsg.includes('duplicate key')) {
              // Duplicate key - data already exists, continue
              if (errors < 10) {
                console.log(`  ℹ️  Duplicate key: ${errorMsg.substring(0, 60)}`);
              }
              errors++;
              success = true; // Continue
            } else {
              // Other errors - log but continue (don't stop the entire import)
              if (errors < 30) {
                console.error(`  ❌ Error: ${errorMsg.substring(0, 150)}`);
              }
              errors++;
              success = true; // Continue instead of stopping
              
              // Only stop if we have too many errors
              if (errors > 500) {
                throw new Error(`Too many errors (${errors}). Stopping import.`);
              }
            }
          }
        }
      }
      
      executed += batchExecuted;
      
      // Progress indicator
      const currentProgress = i + batchSize;
      const totalStatements = statements.length;
      const progressPercent = Math.min((currentProgress / totalStatements) * 100, 100).toFixed(1);
      
      // Show progress every 50 batches or at milestones
      if ((i + batchSize) % (batchSize * 50) === 0 || 
          currentProgress >= totalStatements ||
          progressPercent % 10 < 1) {
        const elapsed = process.uptime();
        const rate = currentProgress / elapsed;
        const remaining = (totalStatements - currentProgress) / rate;
        const remainingMin = Math.floor(remaining / 60);
        const remainingSec = Math.floor(remaining % 60);
        
        console.log(`  ⏳ Progress: ${Math.min(currentProgress, totalStatements)}/${totalStatements} statements (${progressPercent}%) | ETA: ~${remainingMin}m ${remainingSec}s`);
      }
      
      // Note: Individual statement errors are handled in the inner loop above
      // Connection termination errors are retried automatically
    }

    console.log('\n✅ Import completed!');
    console.log(`   ✓ Executed: ${executed} statements`);
    if (connectionRetries > 0) {
      console.log(`   🔄 Connection retries: ${connectionRetries}`);
    }
    if (errors > 0) {
      console.log(`   ⚠️  Warnings/Errors: ${errors}`);
    }
    console.log('\n');

    // Verify import
    console.log('🔍 Verifying import...\n');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`📋 Found ${tables.length} tables in database:`);
    
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}";`);
        const rowCount = parseInt(countResult.rows[0].count);
        console.log(`  ✓ ${table}: ${rowCount} rows`);
      } catch (error) {
        console.log(`  ⚠️  ${table}: Could not count rows`);
      }
    }

    console.log('\n✅ Verification completed!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    throw error;
  } finally {
    await pool.end();
    rl.close();
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Supabase Backup Import Tool (Connection Pooler / IPv4 Compatible)\n');
  console.log('This version uses the connection pooler which supports IPv4.\n');

  try {
    // Find backup files
    const backupsDir = path.join(__dirname, '..', '..', 'backups');
    const backupFiles = fs.existsSync(backupsDir) 
      ? fs.readdirSync(backupsDir)
          .filter(f => f.endsWith('.sql') && fs.statSync(path.join(backupsDir, f)).size > 0)
          .map(f => ({ name: f, path: path.join(backupsDir, f), size: fs.statSync(path.join(backupsDir, f)).size }))
          .sort((a, b) => b.size - a.size)
      : [];

    if (backupFiles.length === 0) {
      throw new Error('No backup files found in backups/ directory');
    }

    console.log('📁 Available backup files:');
    backupFiles.forEach((file, index) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`   ${index + 1}. ${file.name} (${sizeMB} MB)`);
    });
    console.log();

    // Select backup file
    let selectedFile;
    if (backupFiles.length === 1) {
      selectedFile = backupFiles[0].path;
      console.log(`✅ Using: ${backupFiles[0].name}\n`);
    } else {
      const choice = await question(`Select backup file (1-${backupFiles.length}): `);
      const index = parseInt(choice) - 1;
      if (index < 0 || index >= backupFiles.length) {
        throw new Error('Invalid selection');
      }
      selectedFile = backupFiles[index].path;
      console.log(`✅ Selected: ${backupFiles[index].name}\n`);
    }

    // Get database URL (pooler)
    console.log('📝 New Supabase Database (Destination):');
    console.log('   Use CONNECTION POOLER URL (supports IPv4)');
    console.log('   Get from: Settings → Database → Connection string → Connection Pooling tab');
    console.log('   Format: postgresql://postgres.PROJECT_ID:password@aws-*.pooler.supabase.com:5432/postgres');
    console.log('   ⚠️  IMPORTANT: Username must be "postgres.PROJECT_ID" (not just "postgres")\n');
    const databaseUrl = (await question('Enter DATABASE_URL (pooler connection): ')).trim();
    
    // Validate pooler URL format
    if (databaseUrl && !databaseUrl.includes('pooler.supabase.com')) {
      console.log('\n⚠️  Warning: This doesn\'t look like a pooler URL.');
      console.log('   Pooler URLs should contain "pooler.supabase.com"');
      console.log('   Example: postgresql://postgres.PROJECT_ID:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres\n');
    }
    
    // Check username format
    try {
      const url = new URL(databaseUrl);
      if (url.username && !url.username.includes('.')) {
        console.log('\n⚠️  Warning: Pooler username should be "postgres.PROJECT_ID" format');
        console.log('   Current username:', url.username);
        console.log('   Expected format: postgres.kjqcswjljgavigyfzauj (or your project ID)\n');
      }
    } catch (e) {
      // URL parsing failed, will be caught later
    }

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    // Confirm
    console.log('\n⚠️  WARNING: This will import data to your new database!');
    const confirmInput = await question('Are you sure you want to proceed? (yes/no): ');
    const confirm = String(confirmInput || '').trim();
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Import cancelled.');
      return;
    }

    // Import backup
    await importBackupWithPooler(databaseUrl, selectedFile);

    console.log('✅ Import process completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('  1. Verify your data in Supabase Dashboard');
    console.log('  2. Test your application');
    console.log('  3. Update environment variables with new Supabase credentials');
    console.log('  4. Migrate Supabase Auth users (see migration guide)\n');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Import script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import script failed:', error);
      process.exit(1);
    });
}

module.exports = { importBackupWithPooler };

