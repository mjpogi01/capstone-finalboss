const { supabase } = require('./lib/db');
const fs = require('fs');
const path = require('path');

async function runArtistSystemSQL() {
  try {
    console.log('🎨 Starting Artist System Setup...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'scripts', 'create-artist-system-supabase.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('📊 File size:', sqlContent.length, 'characters');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) {
        continue;
      }
      
      try {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   Preview: ${statement.substring(0, 100)}...`);
        
        // Execute the SQL statement using Supabase
        const { data, error } = await supabase.rpc('exec_sql', {
          query_text: statement + ';'
        });
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} completed with note:`, error.message);
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log('   ✅ This is expected (object already exists)');
            successCount++;
          } else {
            console.log('   ❌ Unexpected error:', error.message);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.log(`❌ Error executing statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Artist System Setup Complete!');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎨 All artist tables and functions created successfully!');
      console.log('📋 Next steps:');
      console.log('   1. Check your Supabase dashboard to verify tables were created');
      console.log('   2. Test the workload balancing functions');
      console.log('   3. Start assigning tasks to artists');
    } else {
      console.log('\n⚠️  Some statements had issues. Check the logs above.');
      console.log('💡 Most "already exists" errors are normal and expected.');
    }
    
  } catch (error) {
    console.error('❌ Failed to run Artist System SQL:', error.message);
    console.log('\n🔧 Alternative approach:');
    console.log('   1. Copy the SQL from server/scripts/create-artist-system-supabase.sql');
    console.log('   2. Go to your Supabase Dashboard → SQL Editor');
    console.log('   3. Paste and run the SQL manually');
  }
}

// Run the script
runArtistSystemSQL();
