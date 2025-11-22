const { query } = require('../lib/db');
const fs = require('fs');
const path = require('path');

async function createDesignChatSystem() {
  try {
    console.log('💬 Creating Design Chat System...');
    const sqlScriptPath = path.join(__dirname, 'create-design-chat-system.sql');
    const sql = fs.readFileSync(sqlScriptPath, 'utf8');
    
    // Split the SQL into individual statements and execute them
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--')) {
        try {
          console.log(`Executing statement ${i + 1}...`);
          await query(statement);
        } catch (error) {
          console.error(`Error in statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Design Chat System SQL executed successfully!');
  } catch (error) {
    console.error('❌ Error executing Design Chat System SQL:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createDesignChatSystem();
}
