const { query } = require('../lib/db');

async function checkSupabaseSchema() {
  console.log('🔍 Checking Supabase schema and constraints...');
  
  try {
    // 1. Check if auth.users table exists and is accessible
    console.log('\n1️⃣ Checking auth.users table...');
    try {
      const { rows: authUsers } = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'users'
        ORDER BY ordinal_position;
      `);
      console.log('✅ auth.users table accessible:', authUsers.length > 0 ? 'YES' : 'NO');
      if (authUsers.length > 0) {
        console.log('📋 auth.users columns:', authUsers.map(col => `${col.column_name} (${col.data_type})`).join(', '));
      }
    } catch (error) {
      console.log('❌ Cannot access auth.users:', error.message);
    }

    // 2. Check current schema
    console.log('\n2️⃣ Checking current schema...');
    const { rows: currentSchema } = await query(`SELECT current_schema();`);
    console.log('Current schema:', currentSchema[0].current_schema);

    // 3. Check all schemas
    console.log('\n3️⃣ Checking all schemas...');
    const { rows: schemas } = await query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name;
    `);
    console.log('Available schemas:', schemas.map(s => s.schema_name).join(', '));

    // 4. Check constraints with explicit schema references
    console.log('\n4️⃣ Checking constraints with explicit schema references...');
    try {
      const { rows: constraints } = await query(`
        SELECT 
          tc.constraint_name,
          tc.table_schema,
          tc.table_name,
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
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
          AND (tc.table_name = 'user_carts' OR tc.table_name = 'user_addresses')
        ORDER BY tc.table_schema, tc.table_name, kcu.column_name;
      `);
      console.log('Foreign key constraints found:', constraints.length);
      constraints.forEach(constraint => {
        console.log(`  ${constraint.table_schema}.${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_schema}.${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      });
    } catch (error) {
      console.log('❌ Error checking constraints:', error.message);
    }

    // 5. Check if we can see auth schema constraints
    console.log('\n5️⃣ Checking auth schema constraints...');
    try {
      const { rows: authConstraints } = await query(`
        SELECT 
          tc.constraint_name,
          tc.table_schema,
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'auth'
        ORDER BY tc.table_name, kcu.column_name;
      `);
      console.log('Auth schema foreign key constraints:', authConstraints.length);
      authConstraints.forEach(constraint => {
        console.log(`  ${constraint.table_schema}.${constraint.table_name}.${constraint.column_name}`);
      });
    } catch (error) {
      console.log('❌ Error checking auth constraints:', error.message);
    }

    // 6. Test actual constraint behavior
    console.log('\n6️⃣ Testing constraint behavior...');
    
    // Get a real user ID from auth.users if possible
    let realUserId = null;
    try {
      const { rows: users } = await query(`SELECT id FROM auth.users LIMIT 1;`);
      if (users.length > 0) {
        realUserId = users[0].id;
        console.log('✅ Found real user ID:', realUserId);
      }
    } catch (error) {
      console.log('❌ Cannot access auth.users directly:', error.message);
    }

    // Test with invalid UUID
    console.log('Testing with invalid UUID...');
    try {
      await query(`
        INSERT INTO user_carts (user_id, product_id, quantity) 
        VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 1)
      `);
      console.log('❌ Constraint not working - invalid insert succeeded');
    } catch (error) {
      console.log('✅ Constraint working - invalid insert failed:', error.message);
    }

    // Test with real user ID if available
    if (realUserId) {
      console.log('Testing with real user ID...');
      try {
        await query(`
          INSERT INTO user_carts (user_id, product_id, quantity) 
          VALUES ($1, '00000000-0000-0000-0000-000000000000', 1)
        `, [realUserId]);
        console.log('❌ Constraint not working - real user insert succeeded (should fail due to invalid product_id)');
      } catch (error) {
        if (error.message.includes('product_id')) {
          console.log('✅ Constraint working - real user insert failed due to invalid product_id');
        } else {
          console.log('❓ Unexpected error with real user:', error.message);
        }
      }
    }

  } catch (error) {
    console.error('Error checking Supabase schema:', error);
    throw error;
  }
}

// Run the check if called directly
if (require.main === module) {
  checkSupabaseSchema()
    .then(() => {
      console.log('🎉 Supabase schema check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Supabase schema check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkSupabaseSchema };
