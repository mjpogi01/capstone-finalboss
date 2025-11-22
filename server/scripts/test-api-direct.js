const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '../.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Test the exact same logic as the API endpoint
 */
async function testAPILogic() {
  try {
    console.log('🧪 Testing API Logic Directly');
    console.log('==============================\n');

    // Simulate the exact same logic as the API endpoint
    console.log('1️⃣ Fetching users from Supabase...');
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return;
    }

    console.log(`👥 Total users found: ${users.users.length}`);

    // Filter for admin and owner users (exact same logic as API)
    const adminUsers = users.users.filter(user => {
      const role = user.user_metadata?.role;
      return role === 'admin' || role === 'owner';
    });
    
    console.log(`👑 Admin/Owner users found: ${adminUsers.length}`);

    // Get branch information for each user (same as API)
    console.log('\n2️⃣ Processing users with branch information...');
    const usersWithBranches = await Promise.all(
      adminUsers.map(async (user) => {
        let branchName = null;
        if (user.user_metadata?.branch_id) {
          try {
            // This would normally query the database, but we'll skip for now
            branchName = `Branch ${user.user_metadata.branch_id}`;
          } catch (err) {
            console.error('Error fetching branch name:', err);
          }
        }

        return {
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email,
          role: user.user_metadata?.role || 'customer',
          branch_id: user.user_metadata?.branch_id || null,
          contact_number: user.user_metadata?.contact_number || null,
          branch_name: branchName,
          created_at: user.created_at
        };
      })
    );

    console.log('\n📋 Final Admin Users (what API would return):');
    console.log('=============================================');
    usersWithBranches.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Branch: ${user.branch_id} (${user.branch_name || 'N/A'})`);
      console.log('');
    });

    console.log(`📊 Total admin users that would be returned: ${usersWithBranches.length}`);

  } catch (error) {
    console.error('❌ Error in API logic test:', error);
  }
}

// Run the test
testAPILogic().catch(console.error);

