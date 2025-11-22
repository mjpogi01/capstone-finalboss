/**
 * Test script to verify reCAPTCHA configuration
 * Run with: node test-recaptcha-verification.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

console.log('🔍 Testing reCAPTCHA Configuration\n');
console.log('='.repeat(50));

// Check if secret key is configured
if (RECAPTCHA_SECRET_KEY) {
  console.log('✅ RECAPTCHA_SECRET_KEY is configured');
  console.log(`   Key: ${RECAPTCHA_SECRET_KEY.substring(0, 20)}... (hidden)`);
  console.log(`   Length: ${RECAPTCHA_SECRET_KEY.length} characters\n`);
} else {
  console.log('❌ RECAPTCHA_SECRET_KEY is NOT configured');
  console.log('   Please add it to server/.env file\n');
  process.exit(1);
}

// Expected secret key
const EXPECTED_KEY = '6LdUzg8sAAAAAIWwmQnZ2dzSVYzFSyHETkBjE6bg';
if (RECAPTCHA_SECRET_KEY === EXPECTED_KEY) {
  console.log('✅ Secret key matches expected value\n');
} else {
  console.log('⚠️  Secret key does NOT match expected value');
  console.log('   Expected: ' + EXPECTED_KEY.substring(0, 20) + '...');
  console.log('   Got:      ' + RECAPTCHA_SECRET_KEY.substring(0, 20) + '...\n');
}

console.log('='.repeat(50));
console.log('\n📝 Next Steps:');
console.log('1. Make sure your server is running');
console.log('2. Test the endpoint: http://localhost:4000/api/auth/verify-recaptcha/test');
console.log('3. Open your app and try signing in with reCAPTCHA');
console.log('4. Check server logs for verification messages');
console.log('\n✅ Configuration test complete!\n');

