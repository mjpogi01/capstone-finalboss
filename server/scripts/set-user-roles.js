const { createClient } = require('@supabase/supabase-js');

// Replace these with your actual Supabase credentials
require('dotenv').config({ path: '../.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Update user role by email
 */
async function updateUserRoleByEmail(email, role, branchId = null) {
  try {
    console.log(`🔐 Updating ${email} to role: ${role}`);
    
    // Find user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) throw fetchError;

    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    // Prepare user metadata
    const userMetadata = { role };
    if (role === 'admin' && branchId) {
      userMetadata.branch_id = branchId;
    }

    // Update user
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: userMetadata }
    );

    if (error) throw error;

    console.log(`✅ Updated ${email} successfully:`, {
      role: data.user.user_metadata?.role,
      branch_id: data.user.user_metadata?.branch_id
    });

  } catch (error) {
    console.error(`❌ Failed to update ${email}:`, error.message);
  }
}

/**
 * List all users and their roles
 */
async function listUsers() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    console.log('\n📋 All Users:');
    data.users.forEach(user => {
      const role = user.user_metadata?.role || 'customer';
      const branchId = user.user_metadata?.branch_id || 'N/A';
      console.log(`  ${user.email} - Role: ${role} - Branch: ${branchId}`);
    });

  } catch (error) {
    console.error('❌ Failed to list users:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Setting User Roles in Supabase');
  console.log('================================\n');

  // Update your users with roles
  await updateUserRoleByEmail('owner@yohanns.com', 'owner');
  await updateUserRoleByEmail('admin@yohanns.com', 'admin', 1);
  await updateUserRoleByEmail('mjmonday01@gmail.com', 'customer');

  // List all users to verify
  await listUsers();

  console.log('\n✅ Role assignment completed!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateUserRoleByEmail, listUsers };
