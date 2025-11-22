const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '../.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Test Supabase delete functionality
 */
async function testSupabaseDelete() {
  try {
    console.log('🧪 Testing Supabase Delete Functionality');
    console.log('=======================================\n');

    // First, list all users to see what we have
    console.log('1️⃣ Listing all users before delete...');
    const { data: usersBefore, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      return;
    }

    console.log(`👥 Total users before: ${usersBefore.users.length}`);
    usersBefore.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    // Find a test user to delete (not the main owner/admin accounts)
    const testUser = usersBefore.users.find(u => 
      u.email === 'owner.test@gmail.com' || 
      u.email === 'test@yohanns.com'
    );

    if (!testUser) {
      console.log('❌ No test user found to delete');
      return;
    }

    console.log(`\n2️⃣ Attempting to delete: ${testUser.email} (ID: ${testUser.id})`);
    
    // Attempt to delete
    const { data, error } = await supabase.auth.admin.deleteUser(testUser.id);
    
    console.log('🔍 Supabase delete response:');
    console.log('  Data:', data);
    console.log('  Error:', error);

    if (error) {
      console.error('❌ Delete failed:', error);
      return;
    }

    console.log('✅ Delete command executed');

    // Check if user still exists
    console.log('\n3️⃣ Checking if user still exists after delete...');
    const { data: usersAfter, error: fetchErrorAfter } = await supabase.auth.admin.listUsers();
    if (fetchErrorAfter) {
      console.error('❌ Error fetching users after delete:', fetchErrorAfter);
      return;
    }

    console.log(`👥 Total users after: ${usersAfter.users.length}`);
    
    const userStillExists = usersAfter.users.find(u => u.id === testUser.id);
    if (userStillExists) {
      console.log('❌ User still exists after delete - deletion failed!');
    } else {
      console.log('✅ User successfully deleted from Supabase');
    }

    // Show the difference
    console.log(`\n📊 User count change: ${usersBefore.users.length} → ${usersAfter.users.length}`);

  } catch (error) {
    console.error('❌ Error in delete test:', error);
  }
}

// Run the test
testSupabaseDelete().catch(console.error);

