require('dotenv').config({ path: '../.env' });
const { query } = require('../lib/db');

async function fixSoldQuantity() {
  try {
    console.log('🔧 Fixing sold_quantity column...');
    
    // Add the column if it doesn't exist
    await query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS sold_quantity INTEGER DEFAULT 0
    `);
    
    console.log('✅ sold_quantity column added/verified');
    
    // Test updating a product
    const { rows } = await query(`
      UPDATE products 
      SET sold_quantity = 123 
      WHERE id = 'ab3f32ee-8541-48ce-b71b-f4f35dee2fce'
      RETURNING id, name, sold_quantity
    `);
    
    console.log('✅ Test update result:', rows);
    
    // Check the current value
    const { rows: currentValue } = await query(`
      SELECT id, name, sold_quantity 
      FROM products 
      WHERE id = 'ab3f32ee-8541-48ce-b71b-f4f35dee2fce'
    `);
    
    console.log('📊 Current sold_quantity:', currentValue);
    
  } catch (error) {
    console.error('❌ Error fixing sold_quantity:', error);
  }
}

if (require.main === module) {
  fixSoldQuantity()
    .then(() => {
      console.log('🎉 Fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}
