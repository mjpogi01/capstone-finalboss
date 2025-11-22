const { supabase } = require('../lib/db');

async function updateExistingSoldQuantities() {
  try {
    console.log('🔧 Updating sold quantities for existing completed orders...');
    
    // Get all completed orders
    const { data: completedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, order_items')
      .eq('status', 'picked_up_delivered');
    
    if (ordersError) {
      console.error('Error fetching completed orders:', ordersError);
      return;
    }
    
    console.log(`📊 Found ${completedOrders.length} completed orders`);
    
    // Reset all sold quantities to 0 first
    const { error: resetError } = await supabase
      .from('products')
      .update({ sold_quantity: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This ensures WHERE clause
    
    if (resetError) {
      console.error('Error resetting sold quantities:', resetError);
      return;
    }
    
    console.log('✅ Reset all sold quantities to 0');
    
    // Process each completed order
    for (const order of completedOrders) {
      console.log(`📦 Processing order ${order.order_number}...`);
      
      if (order.order_items && Array.isArray(order.order_items)) {
        for (const item of order.order_items) {
          if (item.id && item.quantity) {
            const quantityToAdd = parseInt(item.quantity) || 1;
            
            // Get current sold_quantity
            const { data: currentProduct, error: fetchError } = await supabase
              .from('products')
              .select('sold_quantity')
              .eq('id', item.id)
              .single();
            
            if (fetchError) {
              console.error(`Error fetching product ${item.id}:`, fetchError);
              continue;
            }
            
            const currentSoldQuantity = currentProduct?.sold_quantity || 0;
            const newSoldQuantity = currentSoldQuantity + quantityToAdd;
            
            // Update sold_quantity
            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                sold_quantity: newSoldQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id);
            
            if (updateError) {
              console.error(`Error updating product ${item.id}:`, updateError);
            } else {
              console.log(`✅ Updated product ${item.id} sold quantity from ${currentSoldQuantity} to ${newSoldQuantity}`);
            }
          }
        }
      }
    }
    
    console.log('🎉 Sold quantities updated successfully!');
    
    // Show final results
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, sold_quantity')
      .gt('sold_quantity', 0)
      .order('sold_quantity', { ascending: false });
    
    if (!productsError && products) {
      console.log('📊 Products with sold quantities:');
      products.forEach(product => {
        console.log(`  - ${product.name}: ${product.sold_quantity} sold`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating sold quantities:', error);
  }
}

// Run if called directly
if (require.main === module) {
  updateExistingSoldQuantities()
    .then(() => {
      console.log('🎉 Update complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateExistingSoldQuantities };
