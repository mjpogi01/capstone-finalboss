const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
require('dotenv').config({ path: '../.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Reset password for a user by email
 */
async function resetPasswordByEmail(email, newPassword) {
  try {
    console.log(`🔐 Resetting password for ${email}...`);
    
    // Find user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) throw fetchError;

    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    // Update user password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword
      }
    );

    if (error) throw error;

    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);

  } catch (error) {
    console.error(`❌ Failed to reset password for ${email}:`, error.message);
  }
}

/**
 * List all users
 */
async function listUsers() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    console.log('\n📋 All Users:');
    data.users.forEach(user => {
      const role = user.user_metadata?.role || 'customer';
      console.log(`  ${user.email} - Role: ${role}`);
    });

  } catch (error) {
    console.error('❌ Failed to list users:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🔐 Resetting Owner Password');
  console.log('==========================\n');

  // Set a new password for the owner account
  const newPassword = 'owner123'; // Change this to whatever you want
  await resetPasswordByEmail('owner@yohanns.com', newPassword);

  // Also reset admin password while we're at it
  await resetPasswordByEmail('admin@yohanns.com', 'admin123');

  // List all users
  await listUsers();

  console.log('\n✅ Password reset completed!');
  console.log('\n📝 Login Credentials:');
  console.log('Owner: owner@yohanns.com / owner123');
  console.log('Admin: admin@yohanns.com / admin123');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resetPasswordByEmail };
