const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 Testing Supabase Configuration...\n');

// Check environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment Variables:');
console.log('  SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ MISSING');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '❌ MISSING');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('❌ SUPABASE_URL format appears incorrect. Should be: https://xxxxx.supabase.co');
  process.exit(1);
}

console.log('✓ URL format looks correct');
console.log('');

// Try to create Supabase client
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✓ Supabase client created successfully');
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error.message);
  process.exit(1);
}

console.log('');

// Test 1: Try to get a user (this will fail without a token, but tests the connection)
console.log('Test 1: Testing Supabase connection...');
supabase.auth.getUser('test-token-that-will-fail')
  .then(({ data, error }) => {
    if (error) {
      // We expect an error, but check the error type
      const errorMsg = error.message || String(error) || '';
      console.log('  Expected error (no valid token):', errorMsg);
      
      if (errorMsg.toLowerCase().includes('tenant') || errorMsg.toLowerCase().includes('invalid api key')) {
        console.log('  ⚠️  This error suggests the SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY might be incorrect');
      } else {
        console.log('  ✓ Connection test passed (got expected authentication error)');
      }
    }
    
    // Test 2: Try to query a table (this tests database access)
    console.log('\nTest 2: Testing database access...');
    return supabase.from('orders').select('id').limit(1);
  })
  .then(({ data, error }) => {
    if (error) {
      console.log('  Database query error:', error.message);
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('  ⚠️  Table might not exist, but connection works');
      } else if (error.message && error.message.includes('JWT')) {
        console.log('  ⚠️  JWT error - this might be normal for service role key');
      } else {
        console.log('  Error details:', error);
      }
    } else {
      console.log('  ✓ Database access works!');
    }
    
    console.log('\n✅ Configuration test complete!');
    console.log('\nSummary:');
    console.log('  - SUPABASE_URL: Set');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY: Set');
    console.log('  - Client creation: Success');
    console.log('\nIf you\'re still getting "Tenant or user not found" errors,');
    console.log('it might be a session/token issue rather than a configuration issue.');
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error during testing:', error);
    console.error('Error stack:', error.stack);
  });

