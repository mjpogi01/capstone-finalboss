const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '../.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Test the admin users API endpoint logic
 */
async function testAdminUsersEndpoint() {
  try {
    console.log('🧪 Testing Admin Users API Endpoint Logic');
    console.log('==========================================\n');

    // Simulate the same logic as the API endpoint
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (error) {
      console.error('❌ Supabase error fetching users:', error);
      return;
    }

    console.log(`👥 Total users found: ${users.users.length}`);

    // Filter for admin and owner users (same logic as API)
    const adminUsers = users.users.filter(user => {
      const role = user.user_metadata?.role;
      return role === 'admin' || role === 'owner';
    });
    
    console.log(`👑 Admin/Owner users found: ${adminUsers.length}`);

    // Show the filtered users
    console.log('\n📋 Admin/Owner Users:');
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.user_metadata?.role}`);
      console.log(`   Branch: ${user.user_metadata?.branch_id || 'N/A'}`);
      console.log('');
    });

    // Check if admin.test@gmail.com is still in the list
    const deletedUser = adminUsers.find(u => u.email === 'admin.test@gmail.com');
    if (deletedUser) {
      console.log('❌ PROBLEM: admin.test@gmail.com is still in the admin users list!');
    } else {
      console.log('✅ GOOD: admin.test@gmail.com is not in the admin users list (correctly deleted)');
    }

  } catch (error) {
    console.error('❌ Error testing API endpoint:', error);
  }
}

// Run the test
testAdminUsersEndpoint().catch(console.error);

