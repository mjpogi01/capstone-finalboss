const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCustomDesignOrders() {
  console.log('🔍 Checking Orders with Custom Designs...\n');

  try {
    // Get recent orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, order_type, status, items, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return;
    }

    console.log(`📦 Found ${orders.length} recent orders:`);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ${order.order_number}:`);
      console.log(`   Type: ${order.order_type}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Items: ${order.items ? order.items.length : 0}`);
      
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, itemIndex) => {
          console.log(`   Item ${itemIndex + 1}: ${item.name || 'Unknown'}`);
          console.log(`     Design Images: ${item.design_images ? item.design_images.length : 0}`);
          if (item.design_images && item.design_images.length > 0) {
            console.log(`     ✅ HAS CUSTOM DESIGN!`);
            item.design_images.forEach((img, imgIndex) => {
              console.log(`       Image ${imgIndex + 1}: ${img.originalname || 'Unknown'}`);
            });
          }
        });
      }
    });

    // Check for orders with custom designs specifically
    const customDesignOrders = orders.filter(order => 
      order.items && order.items.some(item => 
        item.design_images && item.design_images.length > 0
      )
    );

    console.log(`\n🎨 Orders with Custom Designs: ${customDesignOrders.length}`);
    customDesignOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.order_number} (${order.order_type})`);
    });

    // Also check if there are any custom design orders in the database
    const { data: customOrders, error: customError } = await supabase
      .from('orders')
      .select('id, order_number, order_type')
      .eq('order_type', 'custom_design')
      .limit(5);

    if (!customError) {
      console.log(`\n📋 Custom Design Orders by Type: ${customOrders.length}`);
      customOrders.forEach((order, index) => {
        console.log(`${index + 1}. ${order.order_number}`);
      });
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  checkCustomDesignOrders();
}
