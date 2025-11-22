/**
 * Test script to verify reCAPTCHA endpoint is working
 * Run with: node test-recaptcha-endpoint.js
 */

const http = require('http');

console.log('🔍 Testing reCAPTCHA Verification Endpoint\n');
console.log('='.repeat(50));

// Test the configuration endpoint
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/verify-recaptcha/test',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.configured) {
        console.log('✅ Endpoint is accessible');
        console.log('✅ reCAPTCHA secret key is configured in the server');
        console.log(`   Status: ${response.message}\n`);
      } else {
        console.log('❌ Endpoint is accessible BUT secret key is NOT configured');
        console.log(`   Status: ${response.message}\n`);
      }
      
      console.log('='.repeat(50));
      console.log('\n📝 Response:');
      console.log(JSON.stringify(response, null, 2));
      console.log('\n✅ Endpoint test complete!\n');
    } catch (error) {
      console.log('❌ Failed to parse response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Failed to connect to server');
  console.log('   Error:', error.message);
  console.log('\n⚠️  Make sure your server is running on port 4000');
  console.log('   Run: npm run server or npm run server:dev\n');
  process.exit(1);
});

req.end();

