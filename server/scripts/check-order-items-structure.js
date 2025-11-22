const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrderItemsStructure() {
  console.log('🔍 Checking Order Items Structure...\n');

  try {
    // Get recent orders with order_items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, order_items, design_files')
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return;
    }

    console.log(`📦 Found ${orders.length} recent orders:`);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ${order.order_number}:`);
      console.log(`   Order Items: ${order.order_items ? JSON.stringify(order.order_items, null, 2) : 'No order_items'}`);
      console.log(`   Design Files: ${order.design_files ? JSON.stringify(order.design_files, null, 2) : 'No design_files'}`);
      
      // Check if order_items has design_images
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach((item, itemIndex) => {
          console.log(`   Item ${itemIndex + 1}:`);
          console.log(`     Name: ${item.name || 'Unknown'}`);
          console.log(`     Design Images: ${item.design_images ? item.design_images.length : 'None'}`);
          if (item.design_images && item.design_images.length > 0) {
            console.log(`     ✅ HAS CUSTOM DESIGN!`);
          }
        });
      }
    });

    // Check for any orders with design_images in order_items
    const { data: allOrders, error: allError } = await supabase
      .from('orders')
      .select('id, order_number, order_items')
      .limit(20);

    if (!allError) {
      const ordersWithDesigns = allOrders.filter(order => 
        order.order_items && order.order_items.some(item => 
          item.design_images && item.design_images.length > 0
        )
      );

      console.log(`\n🎨 Orders with Custom Designs: ${ordersWithDesigns.length}/${allOrders.length}`);
      ordersWithDesigns.forEach((order, index) => {
        console.log(`${index + 1}. ${order.order_number}`);
      });
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  checkOrderItemsStructure();
}
