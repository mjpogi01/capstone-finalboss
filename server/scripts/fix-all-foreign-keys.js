const { query } = require('../lib/db');

async function fixAllForeignKeys() {
  console.log('🔧 Fixing all foreign key constraints...');
  
  try {
    // 1. Fix user_carts.user_id -> auth.users.id
    console.log('\n1️⃣ Fixing user_carts.user_id -> auth.users.id...');
    try {
      await query(`
        ALTER TABLE user_carts 
        ADD CONSTRAINT user_carts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      `);
      console.log('✅ user_carts.user_id foreign key created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ user_carts.user_id foreign key already exists');
      } else {
        console.log('❌ Error creating user_carts.user_id foreign key:', error.message);
      }
    }

    // 2. Fix user_addresses.user_id -> auth.users.id
    console.log('\n2️⃣ Fixing user_addresses.user_id -> auth.users.id...');
    try {
      await query(`
        ALTER TABLE user_addresses 
        ADD CONSTRAINT user_addresses_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      `);
      console.log('✅ user_addresses.user_id foreign key created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ user_addresses.user_id foreign key already exists');
      } else {
        console.log('❌ Error creating user_addresses.user_id foreign key:', error.message);
      }
    }

    // 3. Verify all constraints
    console.log('\n3️⃣ Verifying all foreign key constraints...');
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

    console.log('📋 All foreign key constraints:');
    allConstraints.forEach(constraint => {
      console.log(`  ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });

    // 4. Test the constraints
    console.log('\n4️⃣ Testing foreign key constraints...');
    
    // Test user_carts constraint
    try {
      await query(`
        INSERT INTO user_carts (user_id, product_id, quantity) 
        VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 1)
      `);
      console.log('❌ user_carts foreign key constraint is NOT working');
    } catch (error) {
      if (error.message.includes('foreign key') || error.message.includes('violates foreign key')) {
        console.log('✅ user_carts foreign key constraint IS working');
      } else {
        console.log('❓ user_carts unexpected error:', error.message);
      }
    }

    // Test user_addresses constraint
    try {
      await query(`
        INSERT INTO user_addresses (user_id, full_name, phone, street_address, barangay, city, province, postal_code, address) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'Test', '123', 'Test St', 'Test', 'Test City', 'Test Province', '1234', 'Test Address')
      `);
      console.log('❌ user_addresses foreign key constraint is NOT working');
    } catch (error) {
      if (error.message.includes('foreign key') || error.message.includes('violates foreign key')) {
        console.log('✅ user_addresses foreign key constraint IS working');
      } else {
        console.log('❓ user_addresses unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.error('Error fixing foreign key constraints:', error);
    throw error;
  }
}

// Run the fix if called directly
if (require.main === module) {
  fixAllForeignKeys()
    .then(() => {
      console.log('🎉 All foreign key constraints fixed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Foreign key constraint fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAllForeignKeys };
