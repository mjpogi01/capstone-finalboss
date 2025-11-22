const { query } = require('../lib/db');

async function fixUserCartsForeignKey() {
  console.log('🔧 Fixing user_carts foreign key constraint...');
  
  try {
    // First, let's check if the table exists and what constraints it has
    const { rows: tableInfo } = await query(`
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
        AND tc.table_name = 'user_carts'
        AND kcu.column_name = 'user_id';
    `);

    console.log('Current foreign key constraints:', tableInfo);

    // Drop existing foreign key constraint if it exists
    if (tableInfo.length > 0) {
      console.log('Dropping existing foreign key constraint...');
      await query(`ALTER TABLE user_carts DROP CONSTRAINT IF EXISTS ${tableInfo[0].constraint_name};`);
    }

    // Create the proper foreign key constraint to auth.users
    console.log('Creating foreign key constraint to auth.users...');
    await query(`
      ALTER TABLE user_carts 
      ADD CONSTRAINT user_carts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    `);

    console.log('✅ Foreign key constraint created successfully!');

    // Verify the constraint was created
    const { rows: newConstraints } = await query(`
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
        AND tc.table_name = 'user_carts'
        AND kcu.column_name = 'user_id';
    `);

    console.log('New foreign key constraints:', newConstraints);

  } catch (error) {
    console.error('Error fixing foreign key constraint:', error);
    throw error;
  }
}

// Run the fix if called directly
if (require.main === module) {
  fixUserCartsForeignKey()
    .then(() => {
      console.log('🎉 Foreign key constraint fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Foreign key constraint fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixUserCartsForeignKey };
