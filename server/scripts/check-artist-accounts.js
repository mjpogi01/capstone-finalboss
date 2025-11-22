const { query } = require('../lib/db');

async function checkArtistAccounts() {
  try {
    console.log('🎨 Checking Artist Accounts in Database...\n');
    
    // Check auth.users table for artist role
    const artistUsers = await query(`
      SELECT 
        email,
        raw_user_meta_data->>'role' as role,
        raw_user_meta_data->>'artist_name' as artist_name,
        email_confirmed_at,
        created_at
      FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'artist'
      ORDER BY email;
    `);
    
    console.log(`📊 Found ${artistUsers.length} artist users in auth.users:`);
    artistUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.artist_name}) - ${user.email_confirmed_at ? 'Confirmed' : 'Not Confirmed'}`);
    });
    
    // Check artist_profiles table
    const artistProfiles = await query(`
      SELECT 
        ap.artist_name,
        ap.is_active,
        ap.is_verified,
        ap.commission_rate,
        u.email
      FROM artist_profiles ap
      JOIN auth.users u ON ap.user_id = u.id
      WHERE u.raw_user_meta_data->>'role' = 'artist'
      ORDER BY ap.artist_name;
    `);
    
    console.log(`\n📋 Found ${artistProfiles.length} artist profiles:`);
    artistProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.artist_name} (${profile.email}) - Active: ${profile.is_active}, Verified: ${profile.is_verified}`);
    });
    
    // Summary
    console.log(`\n📈 SUMMARY:`);
    console.log(`- Artist Users: ${artistUsers.length}/20`);
    console.log(`- Artist Profiles: ${artistProfiles.length}/20`);
    console.log(`- Confirmed Emails: ${artistUsers.filter(u => u.email_confirmed_at).length}/${artistUsers.length}`);
    
    if (artistUsers.length < 20) {
      console.log(`\n⚠️  Missing ${20 - artistUsers.length} artist accounts!`);
      console.log(`💡 Use Supabase Dashboard to create the remaining accounts.`);
    } else {
      console.log(`\n✅ All 20 artist accounts are present!`);
    }
    
  } catch (error) {
    console.error('❌ Error checking artist accounts:', error);
  }
}

if (require.main === module) {
  checkArtistAccounts();
}

module.exports = checkArtistAccounts;
