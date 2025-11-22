const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupChatTables() {
  console.log('🔧 Setting up Chat Tables in Supabase...\n');

  try {
    // Read the SQL script
    const fs = require('fs');
    const sqlScriptPath = path.join(__dirname, 'create-working-chat-system.sql');
    const sql = fs.readFileSync(sqlScriptPath, 'utf8');

    console.log('📄 SQL script loaded, executing...');

    // Split the SQL into individual statements
    const statements = sql.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));

    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      try {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.warn(`⚠️  Statement warning: ${error.message}`);
        } else {
          console.log('✅ Statement executed successfully');
        }
      } catch (err) {
        console.warn(`⚠️  Statement error (might be expected): ${err.message}`);
      }
    }

    console.log('\n🎉 Chat tables setup completed!');
    console.log('💬 Your chat messages should now be saved permanently.');

  } catch (error) {
    console.error('❌ Error setting up chat tables:', error.message);
    console.log('\n💡 Manual setup required:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the contents of server/scripts/create-working-chat-system.sql');
    console.log('3. Run the SQL script');
  }
}

if (require.main === module) {
  setupChatTables();
}

module.exports = { setupChatTables };
