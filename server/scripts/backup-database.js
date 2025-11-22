const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Load environment variables
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
const serverEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}

const connectionString = process.env.DATABASE_URL;

/**
 * Method 1: Using pg_dump (Recommended - fastest and most complete)
 * This creates a SQL dump file that can be restored with psql
 */
async function backupWithPgDump() {
  if (!connectionString) {
    throw new Error('DATABASE_URL not found in environment variables');
  }

  // Parse connection string
  const url = new URL(connectionString);
  const dbHost = url.hostname;
  const dbPort = url.port || 5432;
  const dbName = url.pathname.slice(1) || 'postgres';
  const dbUser = url.username;
  const dbPassword = url.password;

  // Create backups directory if it doesn't exist
  const backupsDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Generate backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(backupsDir, `supabase-backup-${timestamp}.sql`);

  console.log('🔄 Starting database backup with pg_dump...');
  console.log(`📁 Backup location: ${backupFile}`);

  // Set password as environment variable for pg_dump
  const env = { ...process.env, PGPASSWORD: dbPassword };

  // Build pg_dump command
  const dumpCommand = `pg_dump "${connectionString}" --no-owner --no-acl --clean --if-exists -F p > "${backupFile}"`;

  try {
    await execAsync(dumpCommand, { 
      env,
      shell: true,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ Backup completed successfully!');
    console.log(`📊 Backup size: ${fileSizeMB} MB`);
    console.log(`💾 File saved to: ${backupFile}`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ pg_dump failed:', error.message);
    console.log('\n⚠️  Falling back to SQL export method...\n');
    throw error;
  }
}

/**
 * Method 2: Manual SQL export (fallback if pg_dump is not available)
 * Exports schema and data using SQL queries
 */
async function backupWithSQLExport() {
  if (!connectionString) {
    throw new Error('DATABASE_URL not found in environment variables');
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
      require: true
    }
  });

  try {
    // Create backups directory
    const backupsDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(backupsDir, `supabase-backup-${timestamp}.sql`);

    console.log('🔄 Starting SQL export backup...');
    console.log(`📁 Backup location: ${backupFile}`);

    let backupContent = `-- Supabase Database Backup
-- Generated: ${new Date().toISOString()}
-- Connection: ${connectionString.replace(/:[^:@]+@/, ':****@')}

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

      // Export data
      if (rowCount > 0) {
        const dataResult = await pool.query(`SELECT * FROM "${table}";`);
        
        for (const row of dataResult.rows) {
          const columns = Object.keys(row);
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') {
              return `'${val.replace(/'/g, "''")}'`;
            }
            return val;
          });
          
          backupContent += `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
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
    console.log(`💾 File saved to: ${backupFile}`);

    return backupFile;
  } finally {
    await pool.end();
  }
}

/**
 * Main backup function - tries pg_dump first, falls back to SQL export
 */
async function backupDatabase() {
  try {
    console.log('🚀 Starting Supabase database backup...\n');
    
    // Try pg_dump first (faster and more complete)
    try {
      return await backupWithPgDump();
    } catch (error) {
      // If pg_dump fails, use SQL export
      return await backupWithSQLExport();
    }
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase, backupWithPgDump, backupWithSQLExport };



