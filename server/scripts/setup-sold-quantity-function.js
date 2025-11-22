const { supabase } = require('../lib/db');
const fs = require('fs');
const path = require('path');

async function setupSoldQuantityFunction() {
  try {
    console.log('🔧 Setting up increment_sold_quantity function...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-increment-sold-quantity-function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error creating function:', error);
      return;
    }
    
    console.log('✅ increment_sold_quantity function created successfully!');
    
    // Test the function
    console.log('🧪 Testing the function...');
    const { error: testError } = await supabase.rpc('increment_sold_quantity', {
      product_id: 'ab3f32ee-8541-48ce-b71b-f4f35dee2fce',
      quantity_to_add: 1
    });
    
    if (testError) {
      console.error('Test failed:', testError);
    } else {
      console.log('✅ Function test successful!');
    }
    
  } catch (error) {
    console.error('❌ Error setting up sold quantity function:', error);
  }
}

// Run if called directly
if (require.main === module) {
  setupSoldQuantityFunction()
    .then(() => {
      console.log('🎉 Setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupSoldQuantityFunction };
