const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

async function addUserRoles() {
  console.log('🔐 Adding roles to Supabase Auth users...');
  
  try {
    // Example: Update a specific user's role
    const userId = 'USER_ID_HERE'; // Replace with actual user ID
    const role = 'owner'; // or 'admin' or 'customer'
    const branchId = 1; // Only needed for admin users
    
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          role: role,
          branch_id: role === 'admin' ? branchId : null,
          first_name: 'John',
          last_name: 'Doe'
        }
      }
    );

    if (error) {
      console.error('Error updating user role:', error);
      return;
    }

    console.log('✅ User role updated successfully:', data);
    
  } catch (error) {
    console.error('Error adding user roles:', error);
  }
}

// Example: Bulk update multiple users
async function bulkUpdateUserRoles() {
  console.log('🔐 Bulk updating user roles...');
  
  try {
    // Get all users
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    console.log(`Found ${users.users.length} users`);

    // Example: Update specific users by email
    const userUpdates = [
      { email: 'owner@yohanns.com', role: 'owner' },
      { email: 'admin@yohanns.com', role: 'admin', branch_id: 1 },
      { email: 'customer@yohanns.com', role: 'customer' }
    ];

    for (const update of userUpdates) {
      const user = users.users.find(u => u.email === update.email);
      
      if (user) {
        const { error } = await supabase.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              role: update.role,
              branch_id: update.branch_id || null
            }
          }
        );

        if (error) {
          console.error(`Error updating ${update.email}:`, error);
        } else {
          console.log(`✅ Updated ${update.email} to ${update.role}`);
        }
      } else {
        console.log(`❌ User not found: ${update.email}`);
      }
    }
    
  } catch (error) {
    console.error('Error in bulk update:', error);
  }
}

// Run the functions if called directly
if (require.main === module) {
  console.log('Choose an option:');
  console.log('1. Update single user role');
  console.log('2. Bulk update user roles');
  console.log('3. List all users');
  
  // For now, let's just show how to list users
  listAllUsers();
}

async function listAllUsers() {
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    console.log('\n📋 All Users:');
    users.users.forEach(user => {
      const role = user.user_metadata?.role || 'customer';
      const branchId = user.user_metadata?.branch_id || 'N/A';
      console.log(`  ${user.email} - Role: ${role} - Branch: ${branchId}`);
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

module.exports = { addUserRoles, bulkUpdateUserRoles, listAllUsers };
