const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

/**
 * Update a user's role in their user_metadata
 * @param {string} userId - The user's ID
 * @param {string} role - The role to assign ('owner', 'admin', 'customer')
 * @param {number} branchId - Optional branch ID for admin users
 * @returns {Promise<Object>} Updated user info
 */
async function updateUserRole(userId, role, branchId = null) {
  try {
    console.log(`🔐 Updating user ${userId} to role: ${role}`);
    
    // Prepare user metadata
    const userMetadata = { role };
    if (role === 'admin' && branchId) {
      userMetadata.branch_id = branchId;
    }

    // Update user with new role
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: userMetadata
      }
    );

    if (error) {
      console.error('❌ Error updating user role:', error);
      throw error;
    }

    console.log('✅ User role updated successfully:', {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role,
      branch_id: data.user.user_metadata?.branch_id
    });

    return data.user;
  } catch (error) {
    console.error('❌ Failed to update user role:', error.message);
    throw error;
  }
}

/**
 * Create a new user with a specific role
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} role - The role to assign ('owner', 'admin', 'customer')
 * @param {number} branchId - Optional branch ID for admin users
 * @returns {Promise<Object>} Created user info
 */
async function signUpWithRole(email, password, role = 'customer', branchId = null) {
  try {
    console.log(`👤 Creating new user ${email} with role: ${role}`);
    
    // Prepare user metadata
    const userMetadata = { role };
    if (role === 'admin' && branchId) {
      userMetadata.branch_id = branchId;
    }

    // Create user with role
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the user
      user_metadata: userMetadata
    });

    if (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }

    console.log('✅ User created successfully:', {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role,
      branch_id: data.user.user_metadata?.branch_id
    });

    return data.user;
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    throw error;
  }
}

/**
 * Get all users and their roles
 * @returns {Promise<Array>} List of users with their roles
 */
async function listUsersWithRoles() {
  try {
    console.log('📋 Fetching all users...');
    
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      throw error;
    }

    console.log(`\n📊 Found ${data.users.length} users:`);
    data.users.forEach(user => {
      const role = user.user_metadata?.role || 'customer';
      const branchId = user.user_metadata?.branch_id || 'N/A';
      console.log(`  ${user.email} - Role: ${role} - Branch: ${branchId}`);
    });

    return data.users;
  } catch (error) {
    console.error('❌ Failed to list users:', error.message);
    throw error;
  }
}

/**
 * Update user role by email (helper function)
 * @param {string} email - User's email
 * @param {string} role - The role to assign
 * @param {number} branchId - Optional branch ID for admin users
 */
async function updateUserRoleByEmail(email, role, branchId = null) {
  try {
    // First, find the user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      throw fetchError;
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    // Update the user's role
    return await updateUserRole(user.id, role, branchId);
  } catch (error) {
    console.error('❌ Failed to update user role by email:', error.message);
    throw error;
  }
}

// Example usage and main execution
async function main() {
  try {
    console.log('🚀 Supabase User Role Management Script');
    console.log('=====================================\n');

    // Example 1: Update existing users by email
    console.log('1️⃣ Updating existing users by email...');
    await updateUserRoleByEmail('owner@yohanns.com', 'owner');
    await updateUserRoleByEmail('admin@yohanns.com', 'admin', 1);
    await updateUserRoleByEmail('mjmonday01@gmail.com', 'customer');

    // Example 2: Create new users with roles
    console.log('\n2️⃣ Creating new users with roles...');
    // Uncomment these lines to create new users:
    // await signUpWithRole('newowner@yohanns.com', 'password123', 'owner');
    // await signUpWithRole('newadmin@yohanns.com', 'password123', 'admin', 2);
    // await signUpWithRole('newcustomer@yohanns.com', 'password123', 'customer');

    // Example 3: List all users
    console.log('\n3️⃣ Listing all users...');
    await listUsersWithRoles();

    console.log('\n✅ All operations completed successfully!');
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Export functions for use in other modules
module.exports = {
  updateUserRole,
  signUpWithRole,
  updateUserRoleByEmail,
  listUsersWithRoles
};

// Run main function if script is executed directly
if (require.main === module) {
  main();
}
