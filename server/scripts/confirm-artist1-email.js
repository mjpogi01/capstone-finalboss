const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function confirmArtist1Email() {
  console.log('📧 Confirming Artist 1 Email...\n');

  try {
    // Get artist1 user
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message);
      return;
    }

    const artist1User = userData.users.find(u => u.email === 'artist1@yohanns.com');
    
    if (!artist1User) {
      console.error('❌ Artist 1 not found!');
      return;
    }

    console.log(`👤 Found Artist 1: ${artist1User.email}`);
    console.log(`📅 Current confirmation status: ${artist1User.email_confirmed_at ? 'Confirmed' : 'Not Confirmed'}`);

    if (!artist1User.email_confirmed_at) {
      console.log('🔧 Confirming email...');
      
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        artist1User.id,
        {
          email_confirm: true
        }
      );

      if (confirmError) {
        console.error('❌ Failed to confirm email:', confirmError.message);
      } else {
        console.log('✅ Email confirmed successfully!');
      }
    } else {
      console.log('✅ Email already confirmed!');
    }

    // Also ensure the password is correct
    console.log('🔧 Resetting password to ensure it works...');
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      artist1User.id,
      {
        password: 'Artist123!'
      }
    );

    if (passwordError) {
      console.error('❌ Failed to reset password:', passwordError.message);
    } else {
      console.log('✅ Password reset successfully!');
    }

    console.log('\n🎉 Artist 1 is now fully ready!');
    console.log('📝 Login credentials:');
    console.log('   Email: artist1@yohanns.com');
    console.log('   Password: Artist123!');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  confirmArtist1Email();
}
