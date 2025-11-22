const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '../.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Test deleting a specific user
 */
async function testDeleteSpecificUser() {
  try {
    console.log('🧪 Testing Delete Functionality');
    console.log('===============================\n');

    // User to test delete with
    const testUserId = '60fa8934-324d-465e-9be0-45582fc5e7d5'; // admin.test@gmail.com
    const testUserEmail = 'admin.test@gmail.com';

    console.log(`🎯 Testing delete for: ${testUserEmail}`);
    console.log(`🆔 User ID: ${testUserId}\n`);

    // Check if user exists before delete
    console.log('1️⃣ Checking if user exists before delete...');
    const { data: usersBefore, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      return;
    }

    const userBefore = usersBefore.users.find(u => u.id === testUserId);
    if (!userBefore) {
      console.log('❌ User not found before delete test');
      return;
    }
    console.log('✅ User found before delete:', {
      email: userBefore.email,
      role: userBefore.user_metadata?.role
    });

    // Attempt to delete
    console.log('\n2️⃣ Attempting to delete user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(testUserId);
    
    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return;
    }
    console.log('✅ Delete command executed without error');

    // Check if user still exists after delete
    console.log('\n3️⃣ Checking if user still exists after delete...');
    const { data: usersAfter, error: fetchErrorAfter } = await supabase.auth.admin.listUsers();
    if (fetchErrorAfter) {
      console.error('❌ Error fetching users after delete:', fetchErrorAfter);
      return;
    }

    const userAfter = usersAfter.users.find(u => u.id === testUserId);
    if (userAfter) {
      console.log('❌ User still exists after delete - deletion failed!');
      console.log('User details:', {
        email: userAfter.email,
        role: userAfter.user_metadata?.role
      });
    } else {
      console.log('✅ User successfully deleted from database!');
    }

    // Show updated user count
    console.log(`\n📊 User count before: ${usersBefore.users.length}`);
    console.log(`📊 User count after: ${usersAfter.users.length}`);

  } catch (error) {
    console.error('❌ Error in delete test:', error);
  }
}

// Run the test
testDeleteSpecificUser().catch(console.error);

