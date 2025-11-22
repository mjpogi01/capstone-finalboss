const { supabase } = require('../lib/db');

async function createUserAddressesTable() {
  try {
    console.log('Creating user_addresses table...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_addresses (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          full_name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          street_address TEXT NOT NULL,
          barangay VARCHAR(100) NOT NULL,
          city VARCHAR(100) NOT NULL,
          province VARCHAR(100) NOT NULL,
          postal_code VARCHAR(10) NOT NULL,
          address TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

        -- Create unique constraint to ensure one address per user
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_unique_user ON user_addresses(user_id);
      `
    });

    if (error) {
      throw error;
    }

    console.log('✅ user_addresses table created successfully');
  } catch (error) {
    console.error('❌ Error creating user_addresses table:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createUserAddressesTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createUserAddressesTable;
