const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestArtist() {
  console.log('🎨 Creating Test Artist Account...\n');

  try {
    const testEmail = 'testartist@yohanns.com';
    const testPassword = 'Test123!';

    // Create user with admin API
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'artist',
        artist_name: 'Test Artist',
        full_name: 'Test Artist'
      }
    });

    if (error) {
      console.error('❌ Error creating user:', error.message);
      
      // If user already exists, try to update it
      if (error.message.includes('already been registered')) {
        console.log('🔄 User already exists, updating...');
        
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          user?.user?.id || 'unknown',
          {
            email_confirm: true,
            user_metadata: {
              role: 'artist',
              artist_name: 'Test Artist',
              full_name: 'Test Artist'
            }
          }
        );

        if (updateError) {
          console.error('❌ Error updating user:', updateError.message);
        } else {
          console.log('✅ User updated successfully');
        }
      }
    } else {
      console.log('✅ Test artist created successfully!');
      console.log(`📧 Email: ${testEmail}`);
      console.log(`🔑 Password: ${testPassword}`);
    }

    // Create artist profile
    if (user?.user?.id) {
      const { data: profile, error: profileError } = await supabase
        .from('artist_profiles')
        .insert({
          user_id: user.user.id,
          artist_name: 'Test Artist',
          bio: 'Test artist for development',
          specialties: ['Layout Design', 'Custom Graphics'],
          commission_rate: 12.00,
          rating: 0.00,
          is_verified: false,
          is_active: true
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError.message);
      } else {
        console.log('✅ Artist profile created successfully!');
      }
    }

    console.log('\n🎯 Test Credentials:');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log('\nTry logging in with these credentials!');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  createTestArtist();
}
