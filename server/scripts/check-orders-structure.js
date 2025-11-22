const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrdersStructure() {
  console.log('🔍 Checking Orders Table Structure...\n');

  try {
    // Get recent orders without order_type
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return;
    }

    console.log(`📦 Found ${orders.length} recent orders:`);
    
    if (orders.length > 0) {
      console.log('\n📋 Order Structure:');
      const firstOrder = orders[0];
      Object.keys(firstOrder).forEach(key => {
        console.log(`   ${key}: ${typeof firstOrder[key]}`);
      });

      console.log('\n🔍 Sample Order Data:');
      orders.forEach((order, index) => {
        console.log(`\n${index + 1}. Order ${order.order_number}:`);
        console.log(`   ID: ${order.id}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Items: ${order.items ? JSON.stringify(order.items, null, 2) : 'No items'}`);
        
        // Check if items have design_images
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item, itemIndex) => {
            console.log(`   Item ${itemIndex + 1}:`);
            console.log(`     Name: ${item.name || 'Unknown'}`);
            console.log(`     Design Images: ${item.design_images ? item.design_images.length : 'None'}`);
            if (item.design_images && item.design_images.length > 0) {
              console.log(`     ✅ HAS CUSTOM DESIGN!`);
            }
          });
        }
      });
    }

    // Check for any orders with design_images
    const { data: allOrders, error: allError } = await supabase
      .from('orders')
      .select('id, order_number, items')
      .limit(20);

    if (!allError) {
      const ordersWithDesigns = allOrders.filter(order => 
        order.items && order.items.some(item => 
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
  checkOrdersStructure();
}
