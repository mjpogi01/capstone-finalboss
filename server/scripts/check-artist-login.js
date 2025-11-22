const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkArtistAccounts() {
  console.log('🔍 Checking Artist Account Status...\n');

  try {
    // Get all users with artist role
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, email_confirmed_at, raw_user_meta_data')
      .filter('raw_user_meta_data->>role', 'eq', 'artist')
      .limit(10);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }

    console.log(`👥 Found ${users.length} artist users:`);
    users.forEach((user, index) => {
      const artistName = user.raw_user_meta_data?.artist_name || 'No name';
      const isConfirmed = user.email_confirmed_at ? '✅ Confirmed' : '❌ Not Confirmed';
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${artistName}`);
      console.log(`   Status: ${isConfirmed}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

    // Test login for first few accounts
    console.log('🧪 Testing login for first 3 accounts...');
    for (let i = 0; i < Math.min(3, users.length); i++) {
      const user = users[i];
      try {
        console.log(`\n🔐 Testing login for: ${user.email}`);
        
        const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: user.email,
        });

        if (authError) {
          console.error(`❌ Error generating link for ${user.email}:`, authError.message);
        } else {
          console.log(`✅ Magic link generated for ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error testing ${user.email}:`, error.message);
      }
    }

    console.log('\n💡 Login Instructions:');
    console.log('1. Try logging in with: artist1@yohanns.com / Artist123!');
    console.log('2. If that fails, try: yohannssportwear@gmail.com / Test123!');
    console.log('3. If still failing, the account might need email confirmation');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  checkArtistAccounts();
}
