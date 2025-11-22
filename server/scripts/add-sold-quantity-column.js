const { query } = require('../lib/db');

async function addSoldQuantityColumn() {
  try {
    console.log('🔄 Adding sold_quantity column to products table...');
    
    // Add the sold_quantity column
    await query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS sold_quantity INTEGER DEFAULT 0
    `);
    
    console.log('✅ sold_quantity column added successfully!');
    
  } catch (error) {
    console.error('❌ Failed to add sold_quantity column:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addSoldQuantityColumn()
    .then(() => {
      console.log('🎉 sold_quantity column added successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to add sold_quantity column:', error);
      process.exit(1);
    });
}

module.exports = { addSoldQuantityColumn };
