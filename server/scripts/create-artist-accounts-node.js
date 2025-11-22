const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = 'https://xnuzdzjfqhbpcnsetjif.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createArtistAccounts() {
  console.log('🎨 Creating Artist Accounts...');
  
  const artists = [];
  
  // Generate 20 artist accounts
  for (let i = 1; i <= 20; i++) {
    artists.push({
      email: `artist${i}@yohanns.com`,
      password: 'Artist123!',
      user_metadata: {
        role: 'artist',
        artist_name: `Artist ${i}`,
        full_name: getFullName(i)
      }
    });
  }
  
  console.log(`📝 Creating ${artists.length} artist accounts...`);
  
  for (const artist of artists) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: artist.email,
        password: artist.password,
        user_metadata: artist.user_metadata,
        email_confirm: true // Auto-confirm email
      });
      
      if (error) {
        console.error(`❌ Error creating ${artist.email}:`, error.message);
      } else {
        console.log(`✅ Created artist account: ${artist.email}`);
      }
    } catch (err) {
      console.error(`❌ Error creating ${artist.email}:`, err.message);
    }
  }
  
  console.log('🎉 Artist account creation completed!');
  
  // Verify accounts were created
  console.log('\n🔍 Verifying created accounts...');
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError.message);
  } else {
    const artistUsers = users.users.filter(user => 
      user.user_metadata?.role === 'artist'
    );
    console.log(`✅ Found ${artistUsers.length} artist accounts`);
    
    artistUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.user_metadata?.artist_name})`);
    });
  }
}

function getFullName(number) {
  const names = [
    'Artist One', 'Artist Two', 'Artist Three', 'Artist Four', 'Artist Five',
    'Artist Six', 'Artist Seven', 'Artist Eight', 'Artist Nine', 'Artist Ten',
    'Artist Eleven', 'Artist Twelve', 'Artist Thirteen', 'Artist Fourteen', 'Artist Fifteen',
    'Artist Sixteen', 'Artist Seventeen', 'Artist Eighteen', 'Artist Nineteen', 'Artist Twenty'
  ];
  return names[number - 1] || `Artist ${number}`;
}

// Run the function
if (require.main === module) {
  createArtistAccounts().catch(console.error);
}

module.exports = { createArtistAccounts };
