// Quick script to check if environment variables are set correctly
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

console.log('🔍 Checking Environment Variables...\n');

const requiredVars = {
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
};

let allPresent = true;

for (const [varName, varValue] of Object.entries(requiredVars)) {
  if (!varValue) {
    console.error(`❌ ${varName} is MISSING`);
    allPresent = false;
  } else {
    // Mask sensitive values
    const masked = varName.includes('KEY') 
      ? `${varValue.substring(0, 10)}...${varValue.substring(varValue.length - 4)}`
      : varValue;
    console.log(`✅ ${varName} is set: ${masked}`);
  }
}

console.log('\n');

if (!allPresent) {
  console.error('❌ Some required environment variables are missing!');
  console.error('\n📝 To fix this:');
  console.error('1. Check if you have a .env file in the server/ directory');
  console.error('2. Make sure it contains:');
  console.error('   SUPABASE_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('\n3. If running locally, make sure the .env file exists');
  console.error('4. If on Render, check Environment Variables in the dashboard');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are present!');
  console.log('\n🧪 Testing Supabase connection...\n');
  
  // Test Supabase connection
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Try a simple query
  supabase
    .from('products')
    .select('id')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase connection failed:');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
        console.error('   Details:', error.details);
        console.error('\n💡 Possible causes:');
        console.error('   - Invalid SUPABASE_URL');
        console.error('   - Invalid SUPABASE_SERVICE_ROLE_KEY');
        console.error('   - Network connectivity issues');
        console.error('   - Supabase project is paused or deleted');
        process.exit(1);
      } else {
        console.log('✅ Supabase connection successful!');
        console.log('   Database is accessible');
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('❌ Unexpected error testing Supabase:');
      console.error('   Error:', err.message);
      process.exit(1);
    });
}


