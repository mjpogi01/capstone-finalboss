const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUserProfile() {
  console.log('🔧 Creating Artist Profile for Test User...\n');

  try {
    // Get the test user's ID
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message);
      return;
    }

    const testUser = userData.users.find(u => u.email === 'testlogin@yohanns.com');
    
    if (!testUser) {
      console.error('❌ Test user not found!');
      return;
    }

    console.log(`👤 Found test user: ${testUser.email} (ID: ${testUser.id})`);

    // Check if profile already exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', testUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking existing profile:', profileError.message);
      return;
    }

    if (existingProfile) {
      console.log('✅ Artist profile already exists!');
      return;
    }

    // Create the artist profile
    const { data: newProfile, error: createError } = await supabase
      .from('artist_profiles')
      .insert({
        user_id: testUser.id,
        artist_name: 'Test Login Artist',
        bio: 'Professional design layout specialist - Test Account',
        specialties: ['Layout Design', 'Custom Graphics', 'Team Jerseys'],
        commission_rate: 12.00,
        rating: 0.00,
        is_verified: false,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating artist profile:', createError.message);
    } else {
      console.log('✅ Artist profile created successfully!');
      console.log(`📋 Profile ID: ${newProfile.id}`);
      console.log(`👤 Artist Name: ${newProfile.artist_name}`);
      console.log('\n🎉 Test user is now ready to use the artist dashboard!');
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  createTestUserProfile();
}
