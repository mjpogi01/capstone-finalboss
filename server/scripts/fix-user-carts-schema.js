const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserCartsSchema() {
  console.log('🔧 Checking and fixing user_carts table schema...\n');

  try {
    // Check if size column exists
    console.log('1️⃣ Checking for size column...');
    const { data: sizeCheck, error: sizeError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'user_carts' AND column_name = 'size'
        ) as exists;
      `
    });

    // Add size column if it doesn't exist
    console.log('2️⃣ Adding size column if missing...');
    const addSize = `
      ALTER TABLE user_carts 
      ADD COLUMN IF NOT EXISTS size TEXT;
    `;
    
    // Note: We'll use Supabase SQL editor for this, but here's the script
    console.log('📝 Run this in Supabase SQL Editor:');
    console.log('ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS size TEXT;');

    // Add ball_details column if it doesn't exist
    console.log('3️⃣ Adding ball_details column if missing...');
    console.log('📝 Run this in Supabase SQL Editor:');
    console.log('ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS ball_details JSONB;');

    // Add trophy_details column if it doesn't exist
    console.log('4️⃣ Adding trophy_details column if missing...');
    console.log('📝 Run this in Supabase SQL Editor:');
    console.log('ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS trophy_details JSONB;');

    // Check products table category column
    console.log('\n5️⃣ Checking products table category column...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category')
      .is('category', null)
      .limit(5);

    if (productsError) {
      console.error('Error checking products:', productsError);
    } else if (products && products.length > 0) {
      console.warn('⚠️  Found products with NULL categories:', products.length);
      console.warn('These products will cause issues when adding to cart!');
    } else {
      console.log('✅ All products have categories');
    }

    console.log('\n✅ Schema check complete!');
    console.log('\n📋 Summary:');
    console.log('   - Categories are stored as TEXT in products table (not a separate table)');
    console.log('   - user_carts needs: size, ball_details, trophy_details columns');
    console.log('   - Run the SQL script in Supabase SQL Editor to fix missing columns');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixUserCartsSchema();

