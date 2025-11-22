const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createChatTables() {
  console.log('💬 Creating Chat Tables...\n');

  try {
    // Read the SQL file
    const fs = require('fs');
    const sqlScriptPath = path.join(__dirname, 'create-chat-tables-simple.sql');
    const sql = fs.readFileSync(sqlScriptPath, 'utf8');
    
    // Split into individual statements
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--')) {
        try {
          console.log(`Executing statement ${i + 1}...`);
          const { error } = await supabase.rpc('exec_sql', { query_text: statement });
          
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error.message);
            // Try alternative approach
            console.log('Trying alternative approach...');
            const { error: altError } = await supabase
              .from('design_chat_rooms')
              .select('id')
              .limit(1);
            
            if (altError && altError.message.includes('relation "design_chat_rooms" does not exist')) {
              console.log('Tables need to be created manually in Supabase Dashboard');
              console.log('Please run the SQL script in Supabase SQL Editor');
              break;
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, error.message);
        }
      }
    }
    
    console.log('\n✅ Chat tables creation process completed!');
    console.log('\n📝 If tables weren\'t created automatically, please:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the contents of create-chat-tables-simple.sql');
    console.log('3. Run the SQL script');
    
  } catch (error) {
    console.error('❌ Error creating chat tables:', error);
  }
}

if (require.main === module) {
  createChatTables();
}
