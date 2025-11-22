const fetch = require('node-fetch');

/**
 * Test the actual API endpoint that the frontend calls
 */
async function testFrontendAPI() {
  try {
    console.log('🧪 Testing Frontend API Endpoint');
    console.log('================================\n');

    // Test the admin users endpoint
    console.log('1️⃣ Testing GET /api/admin/users...');
    const response = await fetch('http://localhost:4000/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This won't have auth headers, so it might fail
        // But we can see if the endpoint is working
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', data);
      console.log('📊 Admin accounts count:', data.length);
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the test
testFrontendAPI().catch(console.error);

