const { query } = require('../lib/db');

async function verifyForeignKeys() {
  console.log('🔍 Verifying foreign key constraints...');
  
  try {
    // Check user_carts table structure
    console.log('\n📋 user_carts table structure:');
    const { rows: userCartsInfo } = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_carts' 
      ORDER BY ordinal_position;
    `);
    console.log(userCartsInfo);

    // Check user_addresses table structure
    console.log('\n📋 user_addresses table structure:');
    const { rows: userAddressesInfo } = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_addresses' 
      ORDER BY ordinal_position;
    `);
    console.log(userAddressesInfo);

    // Check all foreign key constraints in the database
    console.log('\n🔗 All foreign key constraints:');
    const { rows: allConstraints } = await query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    console.log(allConstraints);

    // Test if we can insert a test record (this will fail if foreign key constraint is working)
    console.log('\n🧪 Testing foreign key constraint...');
    try {
      // This should fail if the foreign key constraint is working
      await query(`
        INSERT INTO user_carts (user_id, product_id, quantity) 
        VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 1)
      `);
      console.log('❌ Foreign key constraint is NOT working - test insert succeeded');
    } catch (error) {
      if (error.message.includes('foreign key') || error.message.includes('violates foreign key')) {
        console.log('✅ Foreign key constraint IS working - test insert failed as expected');
      } else {
        console.log('❓ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.error('Error verifying foreign keys:', error);
    throw error;
  }
}

// Run the verification if called directly
if (require.main === module) {
  verifyForeignKeys()
    .then(() => {
      console.log('🎉 Foreign key verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Foreign key verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyForeignKeys };
