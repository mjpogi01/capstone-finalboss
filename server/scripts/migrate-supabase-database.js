const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

// Load environment variables
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
const serverEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Step 1: Export schema and data from old Supabase database
 */
async function exportOldDatabase(oldDatabaseUrl) {
  console.log('\n📦 Step 1: Exporting from old Supabase database...\n');
  
  // Validate connection string
  if (!oldDatabaseUrl || typeof oldDatabaseUrl !== 'string' || oldDatabaseUrl.trim() === '') {
    throw new Error('Invalid DATABASE_URL: URL is empty or invalid');
  }

  if (!oldDatabaseUrl.startsWith('postgresql://') && !oldDatabaseUrl.startsWith('postgres://')) {
    throw new Error('Invalid DATABASE_URL: Must start with postgresql:// or postgres://');
  }

  const backupsDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(backupsDir, `migration-backup-${timestamp}.sql`);

  // Parse connection string
  let url;
  try {
    url = new URL(oldDatabaseUrl);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}. Expected format: postgresql://user:password@host:port/database`);
  }

  const dbPassword = url.password;
  
  if (!dbPassword) {
    throw new Error('Invalid DATABASE_URL: Password is missing. Format: postgresql://user:password@host:port/database');
  }

  // Check if using connection pooler (pooler.supabase.com)
  const isPooler = oldDatabaseUrl.includes('pooler.supabase.com');
  if (isPooler) {
    console.log('⚠️  Detected connection pooler URL. For best results, use direct connection (db.*.supabase.co:5432)');
    console.log('   Continuing with SQL export method instead of pg_dump...\n');
    return await exportWithSQL(oldDatabaseUrl, backupFile);
  }

  console.log('🔄 Creating backup using pg_dump...');
  console.log('   (If pg_dump is not installed, will automatically fall back to SQL export)\n');
  
  try {
    const env = { ...process.env, PGPASSWORD: dbPassword };
    const dumpCommand = `pg_dump "${oldDatabaseUrl}" --no-owner --no-acl --clean --if-exists -F p > "${backupFile}"`;
    
    await execAsync(dumpCommand, { 
      env,
      shell: true,
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ Backup completed successfully using pg_dump!');
    console.log(`📊 Backup size: ${fileSizeMB} MB`);
    console.log(`💾 File saved to: ${backupFile}\n`);
    
    return backupFile;
  } catch (error) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('not recognized') || errorMsg.includes('command not found')) {
      console.log('ℹ️  pg_dump is not installed on your system.');
      console.log('   Automatically switching to SQL export method...\n');
    } else {
      console.error('❌ pg_dump failed:', error.message);
      console.log('\n⚠️  Trying alternative SQL export method...\n');
    }
    
    // Fallback to SQL export
    return await exportWithSQL(oldDatabaseUrl, backupFile);
  }
}

/**
 * Fallback: Export using SQL queries
 */
async function exportWithSQL(databaseUrl, backupFile) {
  console.log('🔄 Starting SQL export backup (this may take a while for large databases)...\n');
  
  // Parse and validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
    console.log(`📡 Connecting to: ${parsedUrl.hostname}:${parsedUrl.port || 5432}`);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    max: 1, // Use single connection for export
    connectionTimeoutMillis: 30000
  });

  try {
    // Test connection first with better error handling
    console.log('🔌 Testing database connection...');
    try {
      await pool.query('SELECT 1');
      console.log('✅ Connected to database successfully\n');
    } catch (connError) {
      const errorMsg = connError.message || String(connError);
      console.error('\n❌ Connection failed:', errorMsg);
      
      if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
        console.log('\n💡 This usually means:');
        console.log('   1. The hostname in your DATABASE_URL is incorrect');
        console.log('   2. Your Supabase project might be paused');
        console.log('   3. There might be a network/DNS issue\n');
        console.log('🔍 How to fix:');
        console.log('   1. Go to Supabase Dashboard → Your Project');
        console.log('   2. Check if project is paused (resume if needed)');
        console.log('   3. Go to Settings → Database → Connection string');
        console.log('   4. Select "URI" tab (not Connection Pooling)');
        console.log('   5. Copy the exact connection string');
        console.log('   6. Make sure it looks like:');
        console.log('      postgresql://postgres:password@db.PROJECT_ID.supabase.co:5432/postgres');
        console.log('   7. Replace [YOUR-PASSWORD] with your actual database password\n');
        console.log('📋 Your current URL hostname:', parsedUrl.hostname);
        console.log('   Expected format: db.PROJECT_ID.supabase.co\n');
      } else if (errorMsg.includes('password') || errorMsg.includes('authentication')) {
        console.log('\n💡 Password authentication failed:');
        console.log('   1. Check your database password in Supabase Dashboard');
        console.log('   2. Go to Settings → Database → Database password');
        console.log('   3. Reset password if needed');
        console.log('   4. Update DATABASE_URL with the correct password\n');
      } else if (errorMsg.includes('SSL') || errorMsg.includes('certificate')) {
        console.log('\n💡 SSL connection issue (this should be handled automatically)');
      }
      
      throw new Error(`Database connection failed: ${errorMsg}`);
    }

    let backupContent = `-- Supabase Database Migration Backup
-- Generated: ${new Date().toISOString()}
-- Source: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}
-- Method: SQL Export (Node.js)

BEGIN;

`;

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`📋 Found ${tables.length} tables to backup`);

    // Export each table
    for (const table of tables) {
      console.log(`  📦 Exporting table: ${table}`);

      // Get table structure
      const structureResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}";`);
      const rowCount = parseInt(countResult.rows[0].count);

      backupContent += `\n-- Table: ${table} (${rowCount} rows)\n`;
      backupContent += `CREATE TABLE IF NOT EXISTS "${table}" (\n`;

      const columns = structureResult.rows.map((col, idx) => {
        let colDef = `  "${col.column_name}" ${col.data_type}`;
        if (col.character_maximum_length) {
          colDef += `(${col.character_maximum_length})`;
        }
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }
        if (col.column_default) {
          colDef += ` DEFAULT ${col.column_default}`;
        }
        return colDef;
      });

      backupContent += columns.join(',\n') + '\n);\n\n';

      // Export data in batches
      if (rowCount > 0) {
        const batchSize = 1000;
        let offset = 0;
        
        while (offset < rowCount) {
          const dataResult = await pool.query(
            `SELECT * FROM "${table}" ORDER BY (SELECT NULL) LIMIT $1 OFFSET $2;`,
            [batchSize, offset]
          );
          
          for (const row of dataResult.rows) {
            const columns = Object.keys(row);
            const values = columns.map(col => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') {
                return `'${val.replace(/'/g, "''")}'`;
              }
              if (val instanceof Date) {
                return `'${val.toISOString()}'`;
              }
              if (typeof val === 'object') {
                return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              }
              return val;
            });
            
            backupContent += `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          
          offset += batchSize;
        }
      }

      backupContent += '\n';
    }

    backupContent += 'COMMIT;\n';

    // Write to file
    fs.writeFileSync(backupFile, backupContent, 'utf8');

    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ SQL export backup completed!');
    console.log(`📊 Backup size: ${fileSizeMB} MB`);
    console.log(`💾 File saved to: ${backupFile}\n`);

    return backupFile;
  } catch (error) {
    console.error('\n❌ SQL export failed:', error.message);
    if (error.message.includes('pooler') || databaseUrl.includes('pooler')) {
      console.log('\n💡 Tip: Try using the direct connection URL instead of the pooler:');
      console.log('   1. Go to Supabase Dashboard → Settings → Database');
      console.log('   2. Under "Connection string", select "URI" tab');
      console.log('   3. Make sure it says "db.*.supabase.co" (not "pooler.supabase.com")');
      console.log('   4. Copy that connection string and try again\n');
    }
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Step 2: Import schema and data to new Supabase database
 */
async function importToNewDatabase(newDatabaseUrl, backupFile) {
  console.log('\n📥 Step 2: Importing to new Supabase database...\n');
  
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  // Validate and parse connection string
  if (!newDatabaseUrl || typeof newDatabaseUrl !== 'string' || newDatabaseUrl.trim() === '') {
    throw new Error('Invalid DATABASE_URL: URL is empty or invalid');
  }

  if (!newDatabaseUrl.startsWith('postgresql://') && !newDatabaseUrl.startsWith('postgres://')) {
    throw new Error('Invalid DATABASE_URL: Must start with postgresql:// or postgres://');
  }

  let url;
  try {
    url = new URL(newDatabaseUrl);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}. Expected format: postgresql://user:password@host:port/database`);
  }

  const dbPassword = url.password;
  
  if (!dbPassword) {
    throw new Error('Invalid DATABASE_URL: Password is missing. Format: postgresql://user:password@host:port/database');
  }

  console.log('🔄 Restoring backup using psql...');
  
  try {
    const env = { ...process.env, PGPASSWORD: dbPassword };
    const restoreCommand = `psql "${newDatabaseUrl}" < "${backupFile}"`;
    
    await execAsync(restoreCommand, { 
      env,
      shell: true,
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    console.log('✅ Database restore completed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ psql restore failed:', error.message);
    console.log('\n⚠️  You may need to restore manually using Supabase SQL Editor\n');
    console.log('Instructions:');
    console.log('1. Go to your new Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of:', backupFile);
    console.log('4. Run the SQL script\n');
    return false;
  }
}

/**
 * Step 3: Export Supabase Auth users
 */
async function exportAuthUsers(oldSupabaseUrl, oldSupabaseServiceKey) {
  console.log('\n👥 Step 3: Exporting Supabase Auth users...\n');
  
  const oldSupabase = createClient(oldSupabaseUrl, oldSupabaseServiceKey);
  
  try {
    // Note: Supabase Admin API is required to list users
    // This requires using the Management API or Supabase CLI
    console.log('⚠️  Supabase Auth users cannot be exported via JavaScript client.');
    console.log('📋 You need to manually migrate users using one of these methods:\n');
    console.log('Method 1: Supabase Dashboard (Recommended)');
    console.log('  1. Go to old Supabase project → Authentication → Users');
    console.log('  2. Export user list (if available)');
    console.log('  3. Go to new Supabase project → Authentication → Users');
    console.log('  4. Import users or recreate them\n');
    
    console.log('Method 2: Supabase CLI');
    console.log('  supabase db dump --data-only --schema auth > auth-users.sql');
    console.log('  supabase db restore < auth-users.sql\n');
    
    console.log('Method 3: Manual Recreation');
    console.log('  Users will need to sign up again, or you can recreate them manually\n');
    
    return null;
  } catch (error) {
    console.error('❌ Error exporting auth users:', error.message);
    return null;
  }
}

/**
 * Step 4: Verify migration
 */
async function verifyMigration(newDatabaseUrl) {
  console.log('\n✅ Step 4: Verifying migration...\n');
  
  // Validate connection string
  if (!newDatabaseUrl || typeof newDatabaseUrl !== 'string' || newDatabaseUrl.trim() === '') {
    console.error('❌ Invalid DATABASE_URL for verification');
    return false;
  }

  if (!newDatabaseUrl.startsWith('postgresql://') && !newDatabaseUrl.startsWith('postgres://')) {
    console.error('❌ Invalid DATABASE_URL format for verification');
    return false;
  }
  
  const pool = new Pool({
    connectionString: newDatabaseUrl,
    ssl: {
      rejectUnauthorized: false,
      require: true
    }
  });

  try {
    // Check tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`📋 Found ${tables.length} tables in new database:`);
    
    for (const table of tables) {
      const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}";`);
      const rowCount = parseInt(countResult.rows[0].count);
      console.log(`  ✓ ${table}: ${rowCount} rows`);
    }

    console.log('\n✅ Migration verification completed!\n');
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Main migration function
 */
async function migrateDatabase() {
  console.log('\n🚀 Supabase Database Migration Tool\n');
  console.log('This tool will help you migrate from one Supabase database to another.\n');
  console.log('⚠️  IMPORTANT: Make sure you have:');
  console.log('  1. Created a new Supabase project');
  console.log('  2. Backed up your old database');
  console.log('  3. Have both old and new database credentials ready\n');

  try {
    // Get old database credentials
    console.log('📝 Old Supabase Database (Source):');
    console.log('   (Get these from: Settings → API in old Supabase project)\n');
    const oldSupabaseUrl = (await question('Enter old SUPABASE_URL: ')).trim();
    const oldSupabaseServiceKey = (await question('Enter old SUPABASE_SERVICE_ROLE_KEY: ')).trim();
    console.log('\n💡 For DATABASE_URL: Use the "URI" connection string (not Connection Pooling)');
    console.log('   Go to: Settings → Database → Connection string → URI tab\n');
    const oldDatabaseUrl = (await question('Enter old DATABASE_URL (postgresql://user:password@host:port/database): ')).trim();

    // Validate old inputs
    if (!oldSupabaseUrl || !oldSupabaseServiceKey || !oldDatabaseUrl) {
      throw new Error('All old database credentials are required');
    }

    if (!oldDatabaseUrl.startsWith('postgresql://') && !oldDatabaseUrl.startsWith('postgres://')) {
      throw new Error('Old DATABASE_URL must start with postgresql:// or postgres://');
    }

    // Get new database credentials
    console.log('\n📝 New Supabase Database (Destination):');
    console.log('   (Get these from: Settings → API in new Supabase project)\n');
    const newSupabaseUrl = (await question('Enter new SUPABASE_URL: ')).trim();
    const newSupabaseServiceKey = (await question('Enter new SUPABASE_SERVICE_ROLE_KEY: ')).trim();
    console.log('\n💡 For DATABASE_URL: Use the "URI" connection string (not Connection Pooling)');
    console.log('   Go to: Settings → Database → Connection string → URI tab\n');
    const newDatabaseUrl = (await question('Enter new DATABASE_URL (postgresql://user:password@host:port/database): ')).trim();

    // Validate new inputs
    if (!newSupabaseUrl || !newSupabaseServiceKey || !newDatabaseUrl) {
      throw new Error('All new database credentials are required');
    }

    if (!newDatabaseUrl.startsWith('postgresql://') && !newDatabaseUrl.startsWith('postgres://')) {
      throw new Error('New DATABASE_URL must start with postgresql:// or postgres://');
    }

    // Validate URL format
    try {
      const testUrl = new URL(oldDatabaseUrl);
      if (!testUrl.hostname || !testUrl.password) {
        throw new Error('Invalid URL format');
      }
    } catch (error) {
      throw new Error(`Invalid old DATABASE_URL format: ${error.message}. Make sure it includes hostname and password.`);
    }

    try {
      const testUrl = new URL(newDatabaseUrl);
      if (!testUrl.hostname || !testUrl.password) {
        throw new Error('Invalid URL format');
      }
    } catch (error) {
      throw new Error(`Invalid new DATABASE_URL format: ${error.message}. Make sure it includes hostname and password.`);
    }

    // Confirm
    console.log('\n⚠️  WARNING: This will overwrite data in the new database!');
    const confirm = await question('Are you sure you want to proceed? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Migration cancelled.');
      rl.close();
      return;
    }

    // Step 1: Export from old database
    const backupFile = await exportOldDatabase(oldDatabaseUrl);

    // Step 2: Import to new database
    const importSuccess = await importToNewDatabase(newDatabaseUrl, backupFile);

    if (!importSuccess) {
      console.log('⚠️  Automatic import failed. Please import manually using the backup file.');
    }

    // Step 3: Export Auth users (instructions only)
    await exportAuthUsers(oldSupabaseUrl, oldSupabaseServiceKey);

    // Step 4: Verify migration
    await verifyMigration(newDatabaseUrl);

    // Step 5: Generate environment variable update instructions
    console.log('\n📝 Step 5: Update Environment Variables\n');
    console.log('Update your .env files with the new Supabase credentials:\n');
    console.log('OLD VALUES → NEW VALUES:');
    console.log(`SUPABASE_URL=${oldSupabaseUrl}`);
    console.log(`SUPABASE_URL=${newSupabaseUrl}\n`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY=${oldSupabaseServiceKey.substring(0, 20)}...`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY=${newSupabaseServiceKey.substring(0, 20)}...\n`);
    console.log(`SUPABASE_ANON_KEY=<old_anon_key>`);
    console.log(`SUPABASE_ANON_KEY=<new_anon_key>\n`);
    console.log(`DATABASE_URL=${oldDatabaseUrl.substring(0, 50)}...`);
    console.log(`DATABASE_URL=${newDatabaseUrl.substring(0, 50)}...\n`);
    
    console.log('📁 Files to update:');
    console.log('  - .env (root directory)');
    console.log('  - server/.env');
    console.log('  - Render/Railway environment variables (if deployed)');
    console.log('  - Hostinger environment variables (if deployed)\n');

    console.log('✅ Migration process completed!');
    console.log(`💾 Backup file saved at: ${backupFile}`);
    console.log('\n📋 Next Steps:');
    console.log('  1. Update all environment variables with new Supabase credentials');
    console.log('  2. Migrate Supabase Auth users (see instructions above)');
    console.log('  3. Test your application with the new database');
    console.log('  4. Update deployed environments (Render, Hostinger, etc.)');
    console.log('  5. Keep the backup file safe for rollback if needed\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('🎉 Migration script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase, exportOldDatabase, importToNewDatabase };

