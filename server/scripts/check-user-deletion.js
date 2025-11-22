const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '../.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Check if a specific user exists in Supabase
 */
async function checkUserExists(userId) {
  try {
    console.log(`🔍 Checking if user ${userId} exists...`);
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('❌ Error fetching users:', error);
      return false;
    }

    const user = users.users.find(u => u.id === userId);
    if (user) {
      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role,
        created_at: user.created_at
      });
      return true;
    } else {
      console.log('❌ User not found in database');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking user:', error);
    return false;
  }
}

/**
 * List all users with their roles
 */
async function listAllUsers() {
  try {
    console.log('\n📋 All Users in Database:');
    console.log('========================');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    console.log(`Total users: ${users.users.length}\n`);
    
    users.users.forEach((user, index) => {
      const role = user.user_metadata?.role || 'customer';
      const branchId = user.user_metadata?.branch_id || 'N/A';
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${role}`);
      console.log(`   Branch: ${branchId}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
}

/**
 * Test delete functionality
 */
async function testDeleteUser(userId) {
  try {
    console.log(`🗑️ Testing delete for user: ${userId}`);
    
    // Check if user exists first
    const existsBefore = await checkUserExists(userId);
    if (!existsBefore) {
      console.log('❌ User does not exist, cannot test delete');
      return;
    }

    // Attempt to delete
    console.log('🗑️ Attempting to delete user...');
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('❌ Delete error:', error);
      return;
    }

    console.log('✅ Delete command executed successfully');
    
    // Check if user still exists
    console.log('🔍 Checking if user still exists after delete...');
    const existsAfter = await checkUserExists(userId);
    
    if (existsAfter) {
      console.log('❌ User still exists after delete - deletion failed!');
    } else {
      console.log('✅ User successfully deleted from database');
    }

  } catch (error) {
    console.error('❌ Error testing delete:', error);
  }
}

// Main execution
async function main() {
  console.log('🔍 Supabase User Deletion Checker');
  console.log('==================================\n');

  // List all users first
  await listAllUsers();

  // If you want to test deleting a specific user, uncomment and modify this:
  // await testDeleteUser('USER_ID_HERE');

  console.log('\n✅ Check completed!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkUserExists, listAllUsers, testDeleteUser };

