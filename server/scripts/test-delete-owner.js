const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '../.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Test deleting the specific owner.test@gmail.com account
 */
async function testDeleteOwner() {
  try {
    console.log('🧪 Testing Delete of owner.test@gmail.com');
    console.log('==========================================\n');

    // First, find the user
    console.log('1️⃣ Finding owner.test@gmail.com...');
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      return;
    }

    const targetUser = users.users.find(u => u.email === 'owner.test@gmail.com');
    if (!targetUser) {
      console.log('❌ owner.test@gmail.com not found');
      return;
    }

    console.log('✅ Found user:', {
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.user_metadata?.role
    });

    // Check if user exists before delete
    console.log('\n2️⃣ Checking user count before delete...');
    console.log(`👥 Total users before: ${users.users.length}`);

    // Attempt to delete
    console.log(`\n3️⃣ Attempting to delete: ${targetUser.email} (ID: ${targetUser.id})`);
    const { data, error } = await supabase.auth.admin.deleteUser(targetUser.id);
    
    console.log('🔍 Supabase delete response:');
    console.log('  Data:', JSON.stringify(data, null, 2));
    console.log('  Error:', error);

    if (error) {
      console.error('❌ Delete failed:', error);
      console.log('❌ Error details:', JSON.stringify(error, null, 2));
      return;
    }

    console.log('✅ Delete command executed without error');

    // Check if user still exists
    console.log('\n4️⃣ Checking if user still exists after delete...');
    const { data: usersAfter, error: fetchErrorAfter } = await supabase.auth.admin.listUsers();
    if (fetchErrorAfter) {
      console.error('❌ Error fetching users after delete:', fetchErrorAfter);
      return;
    }

    console.log(`👥 Total users after: ${usersAfter.users.length}`);
    
    const userStillExists = usersAfter.users.find(u => u.id === targetUser.id);
    if (userStillExists) {
      console.log('❌ User still exists after delete - deletion failed!');
      console.log('❌ User details:', {
        id: userStillExists.id,
        email: userStillExists.email,
        role: userStillExists.user_metadata?.role
      });
    } else {
      console.log('✅ User successfully deleted from Supabase');
    }

    // Show the difference
    console.log(`\n📊 User count change: ${users.users.length} → ${usersAfter.users.length}`);

    // List remaining users
    console.log('\n📋 Remaining users:');
    usersAfter.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.user_metadata?.role || 'customer'})`);
    });

  } catch (error) {
    console.error('❌ Error in delete test:', error);
  }
}

// Run the test
testDeleteOwner().catch(console.error);

