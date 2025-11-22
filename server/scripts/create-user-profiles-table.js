const { query } = require('../lib/db');

async function createUserProfilesTable() {
  try {
    console.log('👤 Creating user_profiles table...');

    // Create user_profiles table
    await query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name VARCHAR(255),
        phone VARCHAR(20),
        gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
        date_of_birth DATE,
        address TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `);

    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);`);

    // Create trigger to update updated_at timestamp
    await query(`
      CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await query(`
      CREATE TRIGGER update_user_profiles_updated_at
        BEFORE UPDATE ON user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_user_profiles_updated_at();
    `);

    console.log('✅ user_profiles table created successfully!');
    console.log('✅ Indexes created successfully!');
    console.log('✅ Triggers created successfully!');

  } catch (error) {
    console.error('❌ Error creating user_profiles table:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createUserProfilesTable()
    .then(() => {
      console.log('🎉 User profiles table setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createUserProfilesTable };
