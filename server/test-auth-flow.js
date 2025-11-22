const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Authentication Flow...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test with an invalid token (simulating what might happen)
console.log('Test 1: Testing with invalid token...');
const invalidToken = 'invalid.token.here';
supabase.auth.getUser(invalidToken)
  .then(({ data, error }) => {
    if (error) {
      console.log('  Error message:', error.message);
      console.log('  Error status:', error.status);
      console.log('  Full error:', JSON.stringify(error, null, 2));
      
      const errorMsg = (error.message || String(error) || '').toLowerCase();
      if (errorMsg.includes('tenant')) {
        console.log('\n  ⚠️  "Tenant" error detected!');
        console.log('  This usually means:');
        console.log('    1. The token is for a different Supabase project');
        console.log('    2. The SUPABASE_URL doesn\'t match the token\'s project');
        console.log('    3. The token is completely malformed');
      } else if (errorMsg.includes('jwt') || errorMsg.includes('invalid')) {
        console.log('\n  ✓ Got expected JWT/invalid token error (this is normal)');
      }
    }
    
    console.log('\n✅ Test complete!');
    console.log('\nIf you see "Tenant" errors, it means:');
    console.log('  - Your session token might be from a different Supabase project');
    console.log('  - Or your session has expired and needs to be refreshed');
    console.log('\nSolution: Refresh your browser session (log out and log back in)');
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
  });

