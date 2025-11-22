const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEmail() {
  console.log('🏀 Yohanns Email Setup');
  console.log('======================\n');

  const envPath = path.join(__dirname, '..', '.env');
  
  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found in server directory');
    console.log('Please make sure you have a .env file in the server folder');
    process.exit(1);
  }

  console.log('✅ Found .env file in server directory\n');

  // Read current .env content
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Get email configuration
  console.log('📧 Email Configuration Setup');
  console.log('For Gmail, you need to:');
  console.log('1. Enable 2-Factor Authentication');
  console.log('2. Generate an App Password');
  console.log('3. Use the App Password (not your regular password)\n');

  const emailUser = await question('Enter your Gmail address (e.g., yohanns.orders@gmail.com): ');
  const emailPassword = await question('Enter your Gmail App Password (16 characters): ');

  if (!emailUser || !emailPassword) {
    console.log('❌ Email configuration incomplete');
    process.exit(1);
  }

  // Update .env content
  if (envContent.includes('EMAIL_USER=')) {
    envContent = envContent.replace(/EMAIL_USER=.*/, `EMAIL_USER=${emailUser}`);
  } else {
    envContent += `\nEMAIL_USER=${emailUser}`;
  }

  if (envContent.includes('EMAIL_PASSWORD=')) {
    envContent = envContent.replace(/EMAIL_PASSWORD=.*/, `EMAIL_PASSWORD=${emailPassword}`);
  } else {
    envContent += `\nEMAIL_PASSWORD=${emailPassword}`;
  }

  if (!envContent.includes('CLIENT_URL=')) {
    envContent += `\nCLIENT_URL=http://localhost:3000`;
  }

  // Write updated .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Email configuration updated!');
  console.log(`📧 Email User: ${emailUser}`);
  console.log('🔐 Email Password: [HIDDEN]');
  console.log('🌐 Client URL: http://localhost:3000');

  console.log('\n🧪 Testing email configuration...');

  // Test the configuration
  try {
    require('dotenv').config({ path: envPath });
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      console.log('✅ Environment variables loaded successfully');
      console.log('\n📋 Next steps:');
      console.log('1. Start your server: npm run server');
      console.log('2. Test email service: node server/scripts/test-email.js');
      console.log('3. Update order statuses to trigger emails automatically');
    } else {
      console.log('❌ Failed to load email configuration');
    }
  } catch (error) {
    console.log('❌ Error testing configuration:', error.message);
  }

  rl.close();
}

setupEmail().catch(console.error);












































