const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function runMigration() {
  console.log('🔄 Starting migration: Add product_id to order_reviews table...');
  
  try {
    // Read the migration SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, 'add-product-id-to-reviews.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    console.log('SQL:', sql);
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Result:', data);
    
    // Verify the column was added
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'order_reviews')
      .eq('table_schema', 'public');
    
    if (columnError) {
      console.error('❌ Error verifying columns:', columnError);
      return;
    }
    
    console.log('🔍 Current order_reviews columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    const hasProductId = columns.some(col => col.column_name === 'product_id');
    console.log(hasProductId ? '✅ product_id column exists!' : '❌ product_id column not found');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

runMigration();
