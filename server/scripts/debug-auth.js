const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAuth() {
  console.log('🔍 Debugging Authentication...\n');

  try {
    // Test 1: Check if we can access the users table
    console.log('1️⃣ Testing users table access...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, confirmed_at, email_confirmed_at')
      .eq('email', 'artist3@yohanns.com')
      .limit(1);

    if (usersError) {
      console.error('❌ Error accessing users table:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      if (users && users.length > 0) {
        console.log('👤 User found:', users[0]);
      } else {
        console.log('❌ User not found in users table');
      }
    }

    // Test 2: Try to get user by ID using admin API
    console.log('\n2️⃣ Testing admin API...');
    const userId = '0db9b864-51f5-48f8-8b89-abc383275686';
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('❌ Error with admin API:', userError.message);
    } else {
      console.log('✅ Admin API working');
      console.log('👤 User data:', {
        id: userData.user?.id,
        email: userData.user?.email,
        confirmed_at: userData.user?.email_confirmed_at,
        created_at: userData.user?.created_at
      });
    }

    // Test 3: Try to create a completely new test user
    console.log('\n3️⃣ Testing user creation...');
    const testEmail = 'testlogin@yohanns.com';
    const testPassword = 'Test123!';
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        role: 'artist',
        artist_name: 'Test Login',
        full_name: 'Test Login'
      }
    });

    if (createError) {
      console.error('❌ Error creating test user:', createError.message);
    } else {
      console.log('✅ Test user created successfully!');
      console.log(`📧 Email: ${testEmail}`);
      console.log(`🔑 Password: ${testPassword}`);
      console.log('🎯 Try logging in with these credentials!');
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  debugAuth();
}
