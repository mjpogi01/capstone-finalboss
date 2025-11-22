const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findArtist1() {
  console.log('🔍 Searching for Artist 1...\n');

  try {
    // Get ALL users (not just artists)
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message);
      return;
    }

    console.log(`👥 Total users in database: ${userData.users.length}`);

    // Look for artist1 specifically
    const artist1User = userData.users.find(u => u.email === 'artist1@yohanns.com');
    
    if (artist1User) {
      console.log('✅ Found artist1@yohanns.com!');
      console.log(`📧 Email: ${artist1User.email}`);
      console.log(`🆔 ID: ${artist1User.id}`);
      console.log(`📅 Created: ${artist1User.created_at}`);
      console.log(`✅ Confirmed: ${artist1User.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`👤 User Metadata:`, artist1User.user_metadata);
      console.log(`📋 Raw Metadata:`, artist1User.raw_user_meta_data);
      
      // Check if they have an artist profile
      const { data: profile, error: profileError } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', artist1User.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('❌ No artist profile found');
          
          // Create the profile
          console.log('🔧 Creating artist profile...');
          const { error: createError } = await supabase
            .from('artist_profiles')
            .insert({
              user_id: artist1User.id,
              artist_name: 'Artist 1',
              bio: 'Professional design layout specialist',
              specialties: ['Layout Design', 'Custom Graphics', 'Team Jerseys'],
              commission_rate: 12.00,
              rating: 0.00,
              is_verified: false,
              is_active: true,
            });

          if (createError) {
            console.error('❌ Failed to create profile:', createError.message);
          } else {
            console.log('✅ Artist profile created successfully!');
          }
        } else {
          console.error('❌ Error checking profile:', profileError.message);
        }
      } else {
        console.log('✅ Artist profile exists:', profile.artist_name);
      }

      // Update user metadata to ensure artist role
      if (!artist1User.user_metadata?.role || artist1User.user_metadata.role !== 'artist') {
        console.log('🔧 Updating user metadata to artist role...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          artist1User.id,
          {
            user_metadata: {
              ...artist1User.user_metadata,
              role: 'artist',
              artist_name: 'Artist 1',
              full_name: 'Artist 1'
            }
          }
        );

        if (updateError) {
          console.error('❌ Failed to update metadata:', updateError.message);
        } else {
          console.log('✅ User metadata updated to artist role!');
        }
      }

    } else {
      console.log('❌ artist1@yohanns.com not found in database');
      
      // Try to create it
      console.log('🔧 Attempting to create artist1@yohanns.com...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'artist1@yohanns.com',
        password: 'Artist123!',
        email_confirm: true,
        user_metadata: {
          role: 'artist',
          artist_name: 'Artist 1',
          full_name: 'Artist 1'
        }
      });

      if (createError) {
        console.error('❌ Failed to create:', createError.message);
      } else {
        console.log('✅ Created artist1@yohanns.com successfully!');
        
        // Create profile
        const { error: profileError } = await supabase
          .from('artist_profiles')
          .insert({
            user_id: newUser.user.id,
            artist_name: 'Artist 1',
            bio: 'Professional design layout specialist',
            specialties: ['Layout Design', 'Custom Graphics', 'Team Jerseys'],
            commission_rate: 12.00,
            rating: 0.00,
            is_verified: false,
            is_active: true,
          });

        if (profileError) {
          console.error('❌ Failed to create profile:', profileError.message);
        } else {
          console.log('✅ Artist profile created!');
        }
      }
    }

    // Also check artist2 to make sure it has a profile
    console.log('\n🔍 Checking Artist 2...');
    const artist2User = userData.users.find(u => u.email === 'artist2@yohanns.com');
    
    if (artist2User) {
      const { data: profile2, error: profile2Error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', artist2User.id)
        .single();

      if (profile2Error && profile2Error.code === 'PGRST116') {
        console.log('❌ Artist 2 missing profile, creating...');
        const { error: createError } = await supabase
          .from('artist_profiles')
          .insert({
            user_id: artist2User.id,
            artist_name: 'Artist 2',
            bio: 'Professional design layout specialist',
            specialties: ['Layout Design', 'Custom Graphics', 'Team Jerseys'],
            commission_rate: 12.00,
            rating: 0.00,
            is_verified: false,
            is_active: true,
          });

        if (createError) {
          console.error('❌ Failed to create Artist 2 profile:', createError.message);
        } else {
          console.log('✅ Artist 2 profile created!');
        }
      } else if (profile2) {
        console.log('✅ Artist 2 profile exists:', profile2.artist_name);
      }
    }

    console.log('\n🎉 Artist 1 and 2 verification complete!');
    console.log('📝 Login credentials:');
    console.log('   Email: artist1@yohanns.com, Password: Artist123!');
    console.log('   Email: artist2@yohanns.com, Password: Artist123!');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  findArtist1();
}
