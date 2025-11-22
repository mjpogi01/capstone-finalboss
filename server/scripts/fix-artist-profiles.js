const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase connection configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkArtistSystemSetup() {
  try {
    console.log('🔍 Checking Artist System Setup...\n');
    
    // Check if artist_profiles table exists
    const { data: profilesTable, error: profilesError } = await supabase
      .from('artist_profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ artist_profiles table does not exist:', profilesError.message);
      console.log('💡 Need to run the artist system setup SQL first');
      return;
    } else {
      console.log('✅ artist_profiles table exists');
    }
    
    // Check if artist_tasks table exists
    const { data: tasksTable, error: tasksError } = await supabase
      .from('artist_tasks')
      .select('*')
      .limit(1);
    
    if (tasksError) {
      console.log('❌ artist_tasks table does not exist:', tasksError.message);
    } else {
      console.log('✅ artist_tasks table exists');
    }
    
    // Check if artist_designs table exists
    const { data: designsTable, error: designsError } = await supabase
      .from('artist_designs')
      .select('*')
      .limit(1);
    
    if (designsError) {
      console.log('❌ artist_designs table does not exist:', designsError.message);
    } else {
      console.log('✅ artist_designs table exists');
    }
    
    // Get existing artist users
    const { data: allUsers, error: allUsersError } = await supabase.auth.admin.listUsers();
    
    if (allUsersError) {
      console.error('❌ Cannot access user data:', allUsersError.message);
      return;
    }
    
    const artistUsers = allUsers.users.filter(user => 
      user.user_metadata?.role === 'artist'
    );
    
    console.log(`\n👥 Found ${artistUsers.length} artist users:`);
    artistUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.user_metadata?.artist_name || 'No name'})`);
    });
    
    // Check existing artist profiles
    const { data: existingProfiles, error: profilesListError } = await supabase
      .from('artist_profiles')
      .select('artist_name, user_id, is_active');
    
    if (profilesListError) {
      console.log('❌ Cannot list artist profiles:', profilesListError.message);
    } else {
      console.log(`\n📋 Found ${existingProfiles.length} artist profiles:`);
      existingProfiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.artist_name} (Active: ${profile.is_active})`);
      });
    }
    
    // Check which users need profiles
    const usersWithProfiles = existingProfiles?.map(p => p.user_id) || [];
    const usersNeedingProfiles = artistUsers.filter(user => 
      !usersWithProfiles.includes(user.id)
    );
    
    console.log(`\n⚠️  Users needing profiles: ${usersNeedingProfiles.length}`);
    usersNeedingProfiles.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.user_metadata?.artist_name || 'No name'})`);
    });
    
    return {
      artistUsers,
      existingProfiles: existingProfiles || [],
      usersNeedingProfiles
    };
    
  } catch (error) {
    console.error('❌ Error checking artist system:', error.message);
    return null;
  }
}

async function createMissingProfiles(usersNeedingProfiles) {
  try {
    console.log(`\n🔧 Creating ${usersNeedingProfiles.length} missing artist profiles...`);
    
    for (const user of usersNeedingProfiles) {
      const artistName = user.user_metadata?.artist_name || `Artist ${user.email.split('@')[0]}`;
      
      const { data, error } = await supabase
        .from('artist_profiles')
        .insert({
          user_id: user.id,
          artist_name: artistName,
          bio: 'Professional design layout specialist',
          specialties: ['Layout Design', 'Custom Graphics', 'Team Jerseys'],
          commission_rate: 12.00,
          rating: 0.00,
          is_verified: false,
          is_active: true
        });
      
      if (error) {
        console.log(`❌ Failed to create profile for ${user.email}:`, error.message);
      } else {
        console.log(`✅ Created profile for ${user.email} (${artistName})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating profiles:', error.message);
  }
}

async function fixArtistSystem() {
  const systemData = await checkArtistSystemSetup();
  
  if (!systemData) {
    console.log('\n💡 Please run the artist system setup SQL first:');
    console.log('   Go to Supabase Dashboard > SQL Editor');
    console.log('   Run the contents of: server/scripts/create-artist-system-supabase.sql');
    return;
  }
  
  const { usersNeedingProfiles } = systemData;
  
  if (usersNeedingProfiles.length > 0) {
    await createMissingProfiles(usersNeedingProfiles);
  } else {
    console.log('\n✅ All artist users have profiles!');
  }
  
  // Final check
  console.log('\n🔍 Final verification...');
  const { data: finalProfiles, error: finalError } = await supabase
    .from('artist_profiles')
    .select('artist_name, is_active');
  
  if (!finalError) {
    console.log(`📊 Total artist profiles: ${finalProfiles.length}`);
    finalProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.artist_name} (Active: ${profile.is_active})`);
    });
  }
}

if (require.main === module) {
  fixArtistSystem();
}

module.exports = { checkArtistSystemSetup, createMissingProfiles, fixArtistSystem };
