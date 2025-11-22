require('dotenv').config({ path: '../.env' });
const { query } = require('../lib/db');

async function testSoldQuantity() {
  try {
    console.log('🧪 Testing sold_quantity column...');
    
    // First, let's check if the column exists
    const { rows: columnCheck } = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'sold_quantity'
    `);
    
    console.log('📋 sold_quantity column info:', columnCheck);
    
    if (columnCheck.length === 0) {
      console.log('❌ sold_quantity column does not exist!');
      return;
    }
    
    // Test updating sold_quantity
    const { rows: updateResult } = await query(`
      UPDATE products 
      SET sold_quantity = 999 
      WHERE id = 'ab3f32ee-8541-48ce-b71b-f4f35dee2fce'
      RETURNING id, name, sold_quantity
    `);
    
    console.log('✅ Update result:', updateResult);
    
    // Check the current value
    const { rows: currentValue } = await query(`
      SELECT id, name, sold_quantity 
      FROM products 
      WHERE id = 'ab3f32ee-8541-48ce-b71b-f4f35dee2fce'
    `);
    
    console.log('📊 Current sold_quantity:', currentValue);
    
  } catch (error) {
    console.error('❌ Error testing sold_quantity:', error);
  }
}

if (require.main === module) {
  testSoldQuantity()
    .then(() => {
      console.log('🎉 Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}
