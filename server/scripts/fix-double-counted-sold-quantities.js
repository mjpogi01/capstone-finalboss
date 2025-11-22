require('dotenv').config({ path: '../.env' });
const { supabase } = require('../lib/db');

async function fixDoubleCountedSoldQuantities() {
  try {
    console.log('🔧 Fixing double-counted sold quantities...');
    
    // First, reset all sold quantities to 0
    console.log('📊 Resetting all sold quantities to 0...');
    const { error: resetError } = await supabase
      .from('products')
      .update({ sold_quantity: 0 });
    
    if (resetError) {
      console.error('❌ Error resetting sold quantities:', resetError);
      return;
    }
    
    console.log('✅ All sold quantities reset to 0');
    
    // Get all completed orders (picked_up_delivered status)
    console.log('📦 Fetching completed orders...');
    const { data: completedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, order_items')
      .eq('status', 'picked_up_delivered');
    
    if (ordersError) {
      console.error('❌ Error fetching completed orders:', ordersError);
      return;
    }
    
    console.log(`📊 Found ${completedOrders.length} completed orders`);
    
    // Process each completed order to calculate correct sold quantities
    const productSoldCounts = {};
    
    for (const order of completedOrders) {
      console.log(`📦 Processing order ${order.order_number}...`);
      
      if (order.order_items && Array.isArray(order.order_items)) {
        for (const item of order.order_items) {
          if (item.id && item.quantity) {
            const productId = item.id;
            const quantity = parseInt(item.quantity) || 1;
            
            // Skip custom design orders (they don't have real products)
            if (item.product_type === 'custom_design') {
              continue;
            }
            
            if (!productSoldCounts[productId]) {
              productSoldCounts[productId] = 0;
            }
            productSoldCounts[productId] += quantity;
          }
        }
      }
    }
    
    console.log('📊 Updating sold quantities with correct values...');
    
    // Update each product's sold quantity
    for (const [productId, totalSold] of Object.entries(productSoldCounts)) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          sold_quantity: totalSold,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
      
      if (updateError) {
        console.error(`❌ Error updating product ${productId}:`, updateError);
      } else {
        console.log(`✅ Updated product ${productId}: ${totalSold} sold`);
      }
    }
    
    console.log('🎉 Sold quantities fixed successfully!');
    
    // Show final results
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, sold_quantity')
      .gt('sold_quantity', 0)
      .order('sold_quantity', { ascending: false });
    
    if (productsError) {
      console.error('❌ Error fetching final results:', productsError);
      return;
    }
    
    console.log('\n📊 Final sold quantities:');
    products.forEach(p => {
      console.log(`- ${p.name}: ${p.sold_quantity} sold`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing sold quantities:', error);
  }
}

if (require.main === module) {
  fixDoubleCountedSoldQuantities()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixDoubleCountedSoldQuantities };
