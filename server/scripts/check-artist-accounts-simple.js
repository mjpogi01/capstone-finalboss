const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase connection configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkArtistAccounts() {
  try {
    console.log('🎨 Checking Artist Accounts in Database...\n');
    
    // Check auth.users table for artist role using Supabase client
    const { data: artistUsers, error: usersError } = await supabase
      .from('auth.users')
      .select('email, raw_user_meta_data, email_confirmed_at, created_at')
      .like('raw_user_meta_data->role', '%artist%');
    
    if (usersError) {
      console.log('⚠️  Cannot access auth.users directly, trying alternative method...');
      
      // Alternative: Check if we can query through a view or function
      const { data: allUsers, error: allUsersError } = await supabase.auth.admin.listUsers();
      
      if (allUsersError) {
        console.error('❌ Cannot access user data:', allUsersError.message);
        return;
      }
      
      const artistUsers = allUsers.users.filter(user => 
        user.user_metadata?.role === 'artist'
      );
      
      console.log(`📊 Found ${artistUsers.length} artist users in auth.users:`);
      artistUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.user_metadata?.artist_name || 'No name'}) - ${user.email_confirmed_at ? 'Confirmed' : 'Not Confirmed'}`);
      });
      
      // Check artist_profiles table
      const { data: artistProfiles, error: profilesError } = await supabase
        .from('artist_profiles')
        .select('artist_name, is_active, is_verified, commission_rate, user_id');
      
      if (profilesError) {
        console.log('⚠️  Cannot access artist_profiles table:', profilesError.message);
      } else {
        console.log(`\n📋 Found ${artistProfiles.length} artist profiles:`);
        artistProfiles.forEach((profile, index) => {
          console.log(`${index + 1}. ${profile.artist_name} - Active: ${profile.is_active}, Verified: ${profile.is_verified}`);
        });
      }
      
      // Summary
      console.log(`\n📈 SUMMARY:`);
      console.log(`- Artist Users: ${artistUsers.length}/20`);
      console.log(`- Artist Profiles: ${artistProfiles?.length || 0}/20`);
      console.log(`- Confirmed Emails: ${artistUsers.filter(u => u.email_confirmed_at).length}/${artistUsers.length}`);
      
      if (artistUsers.length < 20) {
        console.log(`\n⚠️  Missing ${20 - artistUsers.length} artist accounts!`);
        console.log(`💡 Use Supabase Dashboard to create the remaining accounts.`);
        console.log(`📝 Recommended approach:`);
        console.log(`   1. Go to Supabase Dashboard > Authentication > Users`);
        console.log(`   2. Click "Add User"`);
        console.log(`   3. Create users with emails: artist1@yohanns.com through artist20@yohanns.com`);
        console.log(`   4. Password: Artist123!`);
        console.log(`   5. User Metadata: {"role": "artist", "artist_name": "Artist X", "full_name": "Artist X"}`);
      } else {
        console.log(`\n✅ All 20 artist accounts are present!`);
      }
      
    } else {
      console.log(`📊 Found ${artistUsers.length} artist users in auth.users:`);
      artistUsers.forEach((user, index) => {
        const metadata = user.raw_user_meta_data;
        console.log(`${index + 1}. ${user.email} (${metadata?.artist_name || 'No name'}) - ${user.email_confirmed_at ? 'Confirmed' : 'Not Confirmed'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking artist accounts:', error.message);
  }
}

if (require.main === module) {
  checkArtistAccounts();
}

module.exports = checkArtistAccounts;
