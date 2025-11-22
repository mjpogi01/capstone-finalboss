const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetArtistPassword() {
  console.log('🔐 Resetting Artist3 Password...\n');

  try {
    const email = 'artist3@yohanns.com';
    const userId = '0db9b864-51f5-48f8-8b89-abc383275686'; // From the user data you provided
    const newPassword = 'Artist123!';

    console.log(`👤 Using user ID: ${userId}`);

    // Update password using admin API
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message);
    } else {
      console.log('✅ Password updated successfully!');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 New Password: ${newPassword}`);
      console.log('\n🎯 Try logging in with these credentials now!');
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  resetArtistPassword();
}
