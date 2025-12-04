const { supabase } = require('../lib/db');
const fs = require('fs');
const path = require('path');

async function addReorderLevelColumns() {
  console.log('🔄 Adding reorder level columns to products table...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-reorder-level-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statement(s) to execute.\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // Use Supabase RPC if available, otherwise try direct query
      // Note: Supabase doesn't support direct SQL execution via client
      // We'll need to use a different approach - update products directly
      
      // For ALTER TABLE, we'll need to inform the user to run it manually
      if (statement.toUpperCase().includes('ALTER TABLE')) {
        console.log('⚠️  ALTER TABLE statements need to be run manually in Supabase SQL Editor.');
        console.log('⚠️  Please run the SQL file: add-reorder-level-columns.sql');
        console.log('⚠️  After that, run: set-default-reorder-levels.js\n');
        continue;
      }

      // For UPDATE statements, we can execute them
      if (statement.toUpperCase().includes('UPDATE')) {
        // Parse and execute UPDATE statement
        // This is a simplified approach - for complex SQL, manual execution is recommended
        console.log('ℹ️  UPDATE statements will be handled by set-default-reorder-levels.js');
      }
    }

    console.log('\n✅ Migration script prepared.');
    console.log('⚠️  IMPORTANT: Please run the SQL migration manually in Supabase SQL Editor:');
    console.log('   1. Open your Supabase dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Run the contents of: server/scripts/add-reorder-level-columns.sql');
    console.log('   4. Then run: node server/scripts/set-default-reorder-levels.js\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addReorderLevelColumns();



