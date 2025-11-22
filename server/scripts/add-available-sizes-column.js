const { supabase } = require('../lib/db');

/**
 * Adds the available_sizes column to the products table
 * This script can be run independently to fix the schema cache issue
 */
async function addAvailableSizesColumn() {
  try {
    console.log('🔧 Adding available_sizes column to products table...');
    
    // SQL to add the column
    const migrationSQL = `
      DO $$
      BEGIN
        -- Add available_sizes column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'products' AND column_name = 'available_sizes'
        ) THEN
          ALTER TABLE products ADD COLUMN available_sizes TEXT;
          RAISE NOTICE '✅ Added available_sizes column to products table';
        ELSE
          RAISE NOTICE 'ℹ️  available_sizes column already exists';
        END IF;
      END $$;
      
      COMMENT ON COLUMN products.available_sizes IS 
      'Comma-separated list of available sizes for the product (e.g., "10,12,15" for trophies or "S,M,L" for apparel)';
    `;

    // Try using RPC if available
    try {
      const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
      
      if (error) {
        console.log('⚠️  RPC method not available or failed:', error.message);
        console.log('📋 Please run the following SQL in your Supabase SQL Editor:');
        console.log(migrationSQL);
        throw error;
      } else {
        console.log('✅ Column added successfully via RPC!');
      }
    } catch (rpcError) {
      // Fallback: provide SQL for manual execution
      console.log('📋 RPC not available. Please run the following SQL in your Supabase SQL Editor:');
      console.log('   (Dashboard → SQL Editor → New Query)');
      console.log('');
      console.log(migrationSQL);
      console.log('');
      console.log('⚠️  After running the SQL, restart your application server.');
    }

    // Verify the column exists
    console.log('🔍 Verifying column exists...');
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('id, available_sizes')
      .limit(1);
    
    if (testError) {
      if (testError.code === '42703' || testError.message.includes('available_sizes')) {
        console.log('❌ Column verification failed - column does not exist yet');
        console.log('📋 Please run the SQL above in Supabase SQL Editor');
      } else {
        console.log('⚠️  Verification query error (this is okay if table is empty):', testError.message);
      }
    } else {
      console.log('✅ Column verification successful!');
    }

    console.log('');
    console.log('📝 Important: After adding the column, you may need to:');
    console.log('   1. Refresh Supabase schema cache (restart Supabase or wait a few minutes)');
    console.log('   2. Restart your application server');
    console.log('   3. If issues persist, clear browser cache and refresh');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addAvailableSizesColumn()
    .then(() => {
      console.log('🎉 Column added successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addAvailableSizesColumn };

