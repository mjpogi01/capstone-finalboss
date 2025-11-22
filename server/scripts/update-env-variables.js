const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Update environment variables in .env files
 */
async function updateEnvVariables() {
  console.log('\n🔧 Supabase Environment Variables Updater\n');
  console.log('This tool will help you update Supabase credentials in your .env files.\n');

  try {
    // Get new credentials
    console.log('📝 Enter New Supabase Credentials:');
    const newSupabaseUrl = await question('New SUPABASE_URL: ');
    const newSupabaseServiceKey = await question('New SUPABASE_SERVICE_ROLE_KEY: ');
    const newSupabaseAnonKey = await question('New SUPABASE_ANON_KEY: ');
    const newDatabaseUrl = await question('New DATABASE_URL (postgresql://...): ');

    // Find all .env files
    const rootEnvPath = path.join(__dirname, '..', '..', '.env');
    const serverEnvPath = path.join(__dirname, '..', '.env');
    const envFiles = [];

    if (fs.existsSync(rootEnvPath)) {
      envFiles.push({ path: rootEnvPath, name: 'root .env' });
    }
    if (fs.existsSync(serverEnvPath)) {
      envFiles.push({ path: serverEnvPath, name: 'server/.env' });
    }

    if (envFiles.length === 0) {
      console.log('\n⚠️  No .env files found. Creating new ones...\n');
      envFiles.push({ path: rootEnvPath, name: 'root .env' });
      envFiles.push({ path: serverEnvPath, name: 'server/.env' });
    }

    console.log(`\n📁 Found ${envFiles.length} .env file(s) to update:\n`);

    // Update each .env file
    for (const envFile of envFiles) {
      let envContent = '';
      
      // Read existing content if file exists
      if (fs.existsSync(envFile.path)) {
        envContent = fs.readFileSync(envFile.path, 'utf8');
      }

      // Update or add each variable
      const updates = [
        { key: 'SUPABASE_URL', value: newSupabaseUrl },
        { key: 'SUPABASE_SERVICE_ROLE_KEY', value: newSupabaseServiceKey },
        { key: 'SUPABASE_ANON_KEY', value: newSupabaseAnonKey },
        { key: 'DATABASE_URL', value: newDatabaseUrl }
      ];

      for (const update of updates) {
        const regex = new RegExp(`^${update.key}=.*$`, 'm');
        if (regex.test(envContent)) {
          // Update existing variable
          envContent = envContent.replace(regex, `${update.key}=${update.value}`);
          console.log(`  ✓ Updated ${update.key} in ${envFile.name}`);
        } else {
          // Add new variable
          if (envContent && !envContent.endsWith('\n')) {
            envContent += '\n';
          }
          envContent += `${update.key}=${update.value}\n`;
          console.log(`  ✓ Added ${update.key} to ${envFile.name}`);
        }
      }

      // Ensure directory exists
      const dir = path.dirname(envFile.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write updated content
      fs.writeFileSync(envFile.path, envContent, 'utf8');
      console.log(`  ✅ Updated ${envFile.name}\n`);
    }

    console.log('✅ Environment variables updated successfully!\n');
    console.log('📋 Next Steps:');
    console.log('  1. Restart your development server');
    console.log('  2. Update environment variables in deployment platforms:');
    console.log('     - Render Dashboard → Environment Variables');
    console.log('     - Railway Dashboard → Environment Variables');
    console.log('     - Hostinger (if applicable)');
    console.log('  3. Redeploy or restart services after updating\n');

  } catch (error) {
    console.error('\n❌ Error updating environment variables:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  updateEnvVariables()
    .then(() => {
      console.log('🎉 Environment variables update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Environment variables update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateEnvVariables };











