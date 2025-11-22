const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateArtist1And2() {
  console.log('🔍 Checking Artist 1 and 2 Accounts...\n');

  try {
    // Get all users with artist role
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message);
      return;
    }

    const artistUsers = userData.users.filter(u => 
      u.user_metadata?.role === 'artist' || 
      u.raw_user_meta_data?.role === 'artist'
    );

    console.log(`👥 Found ${artistUsers.length} artist users:`);
    artistUsers.forEach((user, index) => {
      const artistName = user.user_metadata?.artist_name || user.raw_user_meta_data?.artist_name || 'No name';
      console.log(`${index + 1}. ${user.email} (${artistName})`);
    });

    // Check specifically for artist1 and artist2
    const artist1 = artistUsers.find(u => u.email === 'artist1@yohanns.com');
    const artist2 = artistUsers.find(u => u.email === 'artist2@yohanns.com');

    console.log('\n📋 Status Check:');
    console.log(`Artist 1: ${artist1 ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`Artist 2: ${artist2 ? '✅ EXISTS' : '❌ MISSING'}`);

    // Create missing artists
    const artistsToCreate = [];
    if (!artist1) artistsToCreate.push({ email: 'artist1@yohanns.com', name: 'Artist 1' });
    if (!artist2) artistsToCreate.push({ email: 'artist2@yohanns.com', name: 'Artist 2' });

    if (artistsToCreate.length > 0) {
      console.log(`\n🔧 Creating ${artistsToCreate.length} missing artist(s)...`);
      
      for (const artist of artistsToCreate) {
        try {
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: artist.email,
            password: 'Artist123!',
            email_confirm: true,
            user_metadata: {
              role: 'artist',
              artist_name: artist.name,
              full_name: artist.name
            }
          });

          if (createError) {
            console.error(`❌ Failed to create ${artist.email}:`, createError.message);
          } else {
            console.log(`✅ Created ${artist.email} (${artist.name})`);
            
            // Create artist profile
            const { error: profileError } = await supabase
              .from('artist_profiles')
              .insert({
                user_id: newUser.user.id,
                artist_name: artist.name,
                bio: 'Professional design layout specialist',
                specialties: ['Layout Design', 'Custom Graphics', 'Team Jerseys'],
                commission_rate: 12.00,
                rating: 0.00,
                is_verified: false,
                is_active: true,
              });

            if (profileError) {
              console.error(`❌ Failed to create profile for ${artist.email}:`, profileError.message);
            } else {
              console.log(`✅ Created profile for ${artist.email}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error creating ${artist.email}:`, error.message);
        }
      }
    } else {
      console.log('\n✅ Both Artist 1 and Artist 2 already exist!');
    }

    // Final verification
    console.log('\n🔍 Final Verification:');
    const { data: finalUsers, error: finalError } = await supabase.auth.admin.listUsers();
    
    if (!finalError) {
      const finalArtistUsers = finalUsers.users.filter(u => 
        u.user_metadata?.role === 'artist' || 
        u.raw_user_meta_data?.role === 'artist'
      );
      
      console.log(`📊 Total artist users: ${finalArtistUsers.length}`);
      
      const artist1Final = finalArtistUsers.find(u => u.email === 'artist1@yohanns.com');
      const artist2Final = finalArtistUsers.find(u => u.email === 'artist2@yohanns.com');
      
      console.log(`Artist 1: ${artist1Final ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`Artist 2: ${artist2Final ? '✅ EXISTS' : '❌ MISSING'}`);
      
      if (artist1Final) {
        console.log(`   - ID: ${artist1Final.id}`);
        console.log(`   - Confirmed: ${artist1Final.email_confirmed_at ? 'Yes' : 'No'}`);
      }
      if (artist2Final) {
        console.log(`   - ID: ${artist2Final.id}`);
        console.log(`   - Confirmed: ${artist2Final.email_confirmed_at ? 'Yes' : 'No'}`);
      }
    }

    console.log('\n🎉 Artist 1 and 2 setup complete!');
    console.log('📝 Login credentials:');
    console.log('   Email: artist1@yohanns.com, Password: Artist123!');
    console.log('   Email: artist2@yohanns.com, Password: Artist123!');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  checkAndCreateArtist1And2();
}
