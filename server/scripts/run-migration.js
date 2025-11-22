const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function runMigration() {
  console.log('🔄 Adding product_id column to order_reviews table...');
  
  try {
    // Step 1: Add the product_id column
    console.log('📝 Step 1: Adding product_id column...');
    const { error: addColumnError } = await supabase
      .from('order_reviews')
      .select('id')
      .limit(1); // This will fail if column doesn't exist, which is expected
    
    if (addColumnError && addColumnError.code === '42703') {
      console.log('✅ Column does not exist, proceeding with migration...');
      
      // Execute the migration SQL directly
      const migrationSQL = `
        ALTER TABLE order_reviews 
        ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;
        
        ALTER TABLE order_reviews 
        DROP CONSTRAINT IF EXISTS order_reviews_order_id_user_id_key;
        
        ALTER TABLE order_reviews 
        ADD CONSTRAINT order_reviews_order_id_user_id_product_id_key 
        UNIQUE(order_id, user_id, product_id);
        
        CREATE INDEX IF NOT EXISTS idx_order_reviews_product_id ON order_reviews(product_id);
      `;
      
      console.log('🔧 Executing migration SQL...');
      // Note: This might not work with Supabase client, we may need to use the SQL editor
      console.log('⚠️  Please run this SQL in your Supabase SQL editor:');
      console.log(migrationSQL);
      
    } else {
      console.log('✅ product_id column already exists!');
    }
    
    // Step 2: Verify the column exists
    console.log('🔍 Verifying column exists...');
    const { data: testData, error: testError } = await supabase
      .from('order_reviews')
      .select('id, product_id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Column verification failed:', testError);
      console.log('📋 Please run the following SQL in your Supabase SQL editor:');
      console.log(`
        ALTER TABLE order_reviews 
        ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;
        
        ALTER TABLE order_reviews 
        DROP CONSTRAINT IF EXISTS order_reviews_order_id_user_id_key;
        
        ALTER TABLE order_reviews 
        ADD CONSTRAINT order_reviews_order_id_user_id_product_id_key 
        UNIQUE(order_id, user_id, product_id);
        
        CREATE INDEX IF NOT EXISTS idx_order_reviews_product_id ON order_reviews(product_id);
      `);
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('📊 Test query result:', testData);
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.log('📋 Please run the following SQL in your Supabase SQL editor:');
    console.log(`
      ALTER TABLE order_reviews 
      ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;
      
      ALTER TABLE order_reviews 
      DROP CONSTRAINT IF EXISTS order_reviews_order_id_user_id_key;
      
      ALTER TABLE order_reviews 
      ADD CONSTRAINT order_reviews_order_id_user_id_product_id_key 
      UNIQUE(order_id, user_id, product_id);
      
      CREATE INDEX IF NOT EXISTS idx_order_reviews_product_id ON order_reviews(product_id);
    `);
  }
}

runMigration();
