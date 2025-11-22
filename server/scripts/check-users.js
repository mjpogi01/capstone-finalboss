const { supabase } = require('../lib/db');

async function checkUsers() {
  try {
    console.log('👤 Checking users in database...');
    
    // Check auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
    } else {
      console.log('📋 Auth users found:', authUsers.users.length);
      authUsers.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.id} - ${user.email}`);
      });
    }
    
    // Check if we can use a specific user ID
    const testUserId = '00000000-0000-0000-0000-000000000001';
    console.log(`\n🔍 Testing user ID: ${testUserId}`);
    
    const { data: testUser, error: testError } = await supabase.auth.admin.getUserById(testUserId);
    
    if (testError) {
      console.log('❌ Test user not found:', testError.message);
    } else {
      console.log('✅ Test user found:', testUser.user?.email);
    }
    
    // If no users exist, create a default user for custom design orders
    if (!authUsers.users || authUsers.users.length === 0) {
      console.log('\n🔧 Creating default user for custom design orders...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'custom-design@yohanns.com',
        password: 'CustomDesign123!',
        user_metadata: {
          full_name: 'Custom Design Customer',
          role: 'customer'
        }
      });
      
      if (createError) {
        console.error('❌ Error creating default user:', createError);
      } else {
        console.log('✅ Default user created:', newUser.user.id);
        console.log('📧 Email: custom-design@yohanns.com');
        console.log('🔑 Password: CustomDesign123!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

if (require.main === module) {
  checkUsers();
}

module.exports = { checkUsers };
