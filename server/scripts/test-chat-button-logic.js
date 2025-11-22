const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatButtonLogic() {
  console.log('🧪 Testing Chat Button Logic...\n');

  try {
    // Get orders with custom designs
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, order_items')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return;
    }

    console.log(`📦 Testing ${orders.length} orders:`);
    
    orders.forEach((order, index) => {
      // Test the hasCustomDesign function logic
      const hasDesign = order.order_items && order.order_items.some(item => 
        item.design_images && item.design_images.length > 0
      );
      
      console.log(`\n${index + 1}. Order ${order.order_number}:`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Has Custom Design: ${hasDesign ? '✅ YES' : '❌ NO'}`);
      console.log(`   Should Show Chat Button: ${hasDesign ? '✅ YES' : '❌ NO'}`);
      
      if (hasDesign) {
        console.log(`   🎨 This order should show the "Chat with Artist" button!`);
      }
    });

    // Summary
    const ordersWithDesigns = orders.filter(order => 
      order.order_items && order.order_items.some(item => 
        item.design_images && item.design_images.length > 0
      )
    );

    console.log(`\n📊 Summary:`);
    console.log(`   Total Orders: ${orders.length}`);
    console.log(`   Orders with Custom Designs: ${ordersWithDesigns.length}`);
    console.log(`   Orders that should show Chat Button: ${ordersWithDesigns.length}`);

    if (ordersWithDesigns.length > 0) {
      console.log(`\n🎉 Chat button should appear for these orders:`);
      ordersWithDesigns.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.order_number} (${order.status})`);
      });
    } else {
      console.log(`\n⚠️  No orders with custom designs found. Try placing a custom design order first.`);
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  testChatButtonLogic();
}
