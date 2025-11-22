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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Import backup SQL file to new Supabase database
 */
async function importBackup(databaseUrl, backupFile) {
  console.log('\n📥 Importing backup to new Supabase database...\n');
  
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  // Validate connection string
  if (!databaseUrl || typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('Invalid DATABASE_URL: URL is empty or invalid');
  }

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('Invalid DATABASE_URL: Must start with postgresql:// or postgres://');
  }

  // Parse URL
  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
    console.log(`📡 Connecting to: ${parsedUrl.hostname}:${parsedUrl.port || 5432}`);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
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

  // Create database connection
  // Note: Connection pooler may be needed if direct connection doesn't support IPv4
  const poolConfig = {
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    max: 1,
    connectionTimeoutMillis: 60000 // Increased timeout for large imports
  };

  // If using connection pooler, adjust settings
  if (databaseUrl.includes('pooler.supabase.com')) {
    console.log('ℹ️  Using connection pooler (IPv4 compatible)...\n');
    // Pooler uses transaction mode by default, which is fine for imports
  } else {
    console.log('ℹ️  Using direct connection...\n');
  }

  const pool = new Pool(poolConfig);

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Connected to database successfully\n');

    // For large files, execute the entire SQL file as a single transaction
    // This is more efficient than splitting into individual statements
    console.log('📝 Preparing to execute SQL backup...');
    console.log('   (Large files are executed as a single transaction for better performance)\n');

    let executed = false;
    let errors = 0;

    console.log('🚀 Starting import (this may take several minutes for large databases)...\n');
    console.log('   ⏳ Please be patient, do not interrupt the process...\n');

    try {
      // Execute the entire SQL file as a single query
      // PostgreSQL can handle large SQL files when executed directly
      await pool.query(backupContent);
      executed = true;
      console.log('✅ All SQL statements executed successfully!\n');
    } catch (error) {
      const errorMsg = error.message || String(error);
      
      // If single transaction fails, try splitting into smaller chunks
      if (errorMsg.includes('too large') || errorMsg.includes('memory') || errorMsg.includes('size')) {
        console.log('⚠️  File too large for single transaction. Splitting into batches...\n');
        
        // Split by semicolons, but be smarter about it
        const statements = [];
        let currentStatement = '';
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < backupContent.length; i++) {
          const char = backupContent[i];
          const nextChar = backupContent[i + 1];
          
          if (!inString && (char === '"' || char === "'")) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && backupContent[i - 1] !== '\\') {
            inString = false;
            stringChar = '';
          }
          
          currentStatement += char;
          
          if (!inString && char === ';') {
            const trimmed = currentStatement.trim();
            if (trimmed.length > 0 && !trimmed.startsWith('--') && trimmed !== 'BEGIN' && trimmed !== 'COMMIT') {
              statements.push(trimmed);
            }
            currentStatement = '';
          }
        }
        
        if (currentStatement.trim().length > 0) {
          statements.push(currentStatement.trim());
        }

        console.log(`📋 Split into ${statements.length} statements. Executing in batches...\n`);

        // Execute in batches
        const batchSize = 50;
        for (let i = 0; i < statements.length; i += batchSize) {
          const batch = statements.slice(i, i + batchSize);
          const batchSQL = batch.join(';\n') + ';';
          
          try {
            await pool.query(batchSQL);
            
            if ((i + batchSize) % 500 === 0 || i + batchSize >= statements.length) {
              const progress = Math.min(((i + batchSize) / statements.length) * 100, 100).toFixed(1);
              console.log(`  ⏳ Progress: ${Math.min(i + batchSize, statements.length)}/${statements.length} statements (${progress}%)`);
            }
          } catch (batchError) {
            errors++;
            const batchErrorMsg = batchError.message || String(batchError);
            
            if (batchErrorMsg.includes('already exists') || batchErrorMsg.includes('duplicate key')) {
              // Expected warnings, continue
            } else {
              console.error(`  ❌ Error in batch ${Math.floor(i / batchSize) + 1}: ${batchErrorMsg.substring(0, 150)}`);
              if (errors > 20) {
                throw new Error(`Too many errors. Stopping import.`);
              }
            }
          }
        }
        
        executed = true;
      } else {
        // Other errors
        throw error;
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`   ✓ Executed: ${executed} statements`);
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
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n💡 Connection issue detected. Check:');
      console.log('   1. Is your Supabase project active (not paused)?');
      console.log('   2. Is the DATABASE_URL correct?');
      console.log('   3. Are you using the direct connection (URI), not connection pooler?');
    }
    throw error;
  } finally {
    await pool.end();
    rl.close();
  }
}

/**
 * Extract schema only (CREATE TABLE statements)
 */
async function extractSchema(backupFile, outputFile) {
  console.log('\n📝 Extracting schema from backup...\n');
  
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  const backupContent = fs.readFileSync(backupFile, 'utf8');
  
  // Extract CREATE TABLE statements
  const createTableRegex = /CREATE TABLE[^;]+;/gi;
  const matches = backupContent.match(createTableRegex) || [];
  
  let schemaContent = `-- Schema extracted from: ${backupFile}
-- Generated: ${new Date().toISOString()}
-- This file contains only CREATE TABLE statements (no data)

BEGIN;

${matches.join('\n\n')}

COMMIT;
`;

  fs.writeFileSync(outputFile, schemaContent, 'utf8');
  
  console.log(`✅ Schema extracted successfully!`);
  console.log(`📊 Found ${matches.length} CREATE TABLE statements`);
  console.log(`💾 Saved to: ${outputFile}\n`);
  
  return outputFile;
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Supabase Backup Import Tool\n');
  console.log('This tool will help you import a backup SQL file to your new Supabase database.\n');

  try {
    // Find backup files
    const backupsDir = path.join(__dirname, '..', '..', 'backups');
    const backupFiles = fs.existsSync(backupsDir) 
      ? fs.readdirSync(backupsDir)
          .filter(f => f.endsWith('.sql') && fs.statSync(path.join(backupsDir, f)).size > 0)
          .map(f => ({ name: f, path: path.join(backupsDir, f), size: fs.statSync(path.join(backupsDir, f)).size }))
          .sort((a, b) => b.size - a.size) // Sort by size, largest first
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

    // Get database URL
    console.log('📝 New Supabase Database (Destination):');
    console.log('   Options:');
    console.log('   1. Direct connection (URI) - Faster but may not support IPv4');
    console.log('   2. Connection pooler - Slower but supports IPv4\n');
    console.log('   Get connection string from: Settings → Database → Connection string\n');
    const databaseUrl = (await question('Enter new DATABASE_URL (postgresql://user:password@host:port/database): ')).trim();

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    // Ask if they want schema only or full import
    console.log('\n📋 Import options:');
    console.log('   1. Full import (schema + data) - Recommended');
    console.log('   2. Schema only (CREATE TABLE statements) - For testing');
    const importTypeInput = await question('Select import type (1 or 2): ');
    const importType = String(importTypeInput || '').trim();

    if (importType === '2') {
      // Extract schema only
      const schemaFile = path.join(backupsDir, `schema-only-${Date.now()}.sql`);
      await extractSchema(selectedFile, schemaFile);
      console.log('✅ Schema extracted! You can now import it manually via Supabase SQL Editor.');
      console.log(`   File: ${schemaFile}\n`);
      return;
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
    await importBackup(databaseUrl, selectedFile);

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

module.exports = { importBackup, extractSchema };

