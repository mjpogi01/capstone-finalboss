require('dotenv').config({ path: '../.env' });
const { query } = require('../lib/db');

async function fixShippingMethodConstraint() {
  try {
    console.log('🔧 Fixing shipping_method constraint...');
    
    // Drop existing constraint
    await query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shipping_method_check;');
    console.log('✅ Dropped existing constraint');
    
    // Add updated constraint with delivery option
    await query("ALTER TABLE orders ADD CONSTRAINT orders_shipping_method_check CHECK (shipping_method IN ('pickup', 'cod', 'delivery'));");
    console.log('✅ Added updated constraint with delivery option');
    
    console.log('🎉 Shipping method constraint fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error);
  }
}

if (require.main === module) {
  fixShippingMethodConstraint()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixShippingMethodConstraint };
