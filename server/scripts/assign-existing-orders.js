const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignExistingOrders() {
  console.log('🎨 Assigning Artist Tasks to Existing Orders...\n');

  try {
    // Get all orders that are in layout status or beyond but don't have artist tasks
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, order_type, order_items, total_items, order_notes, status')
      .in('status', ['layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing'])
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return;
    }

    console.log(`📋 Found ${orders.length} existing orders in layout+ status`);

    // Check which orders already have artist tasks
    const { data: existingTasks, error: tasksError } = await supabase
      .from('artist_tasks')
      .select('order_id');

    if (tasksError) {
      console.error('❌ Error fetching existing tasks:', tasksError.message);
      return;
    }

    const existingOrderIds = new Set(existingTasks.map(task => task.order_id));
    const ordersNeedingTasks = orders.filter(order => !existingOrderIds.has(order.id));

    console.log(`🎯 ${ordersNeedingTasks.length} orders need artist task assignments`);

    if (ordersNeedingTasks.length === 0) {
      console.log('✅ All existing orders already have artist tasks assigned!');
      return;
    }

    // Assign tasks to orders that need them
    for (const order of ordersNeedingTasks) {
      try {
        console.log(`\n📝 Processing order: ${order.order_number} (${order.status})`);
        
        let taskId = null;
        
        if (order.order_type === 'custom_design') {
          // Custom design order
          const { data: customTaskData, error: customError } = await supabase.rpc('assign_custom_design_task', {
            p_order_id: order.id,
            p_product_name: order.order_items?.[0]?.name || 'Custom Design',
            p_quantity: order.total_items || 1,
            p_customer_requirements: order.order_notes || null,
            p_priority: 'medium',
            p_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            p_product_id: order.order_items?.[0]?.id || null
          });
          
          if (customError) {
            console.error(`❌ Error assigning custom design task for ${order.order_number}:`, customError.message);
          } else {
            taskId = customTaskData;
            console.log(`✅ Custom design task assigned: ${taskId}`);
          }
        } else if (order.order_number?.startsWith('WALKIN-')) {
          // Walk-in order
          const { data: walkInTaskData, error: walkInError } = await supabase.rpc('assign_walk_in_order_task', {
            p_product_name: order.order_items?.[0]?.name || 'Walk-in Product',
            p_quantity: order.total_items || 1,
            p_customer_requirements: order.order_notes || null,
            p_priority: 'high',
            p_deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            p_order_id: order.id,
            p_product_id: order.order_items?.[0]?.id || null
          });
          
          if (walkInError) {
            console.error(`❌ Error assigning walk-in order task for ${order.order_number}:`, walkInError.message);
          } else {
            taskId = walkInTaskData;
            console.log(`✅ Walk-in order task assigned: ${taskId}`);
          }
        } else {
          // Regular order (store products)
          const { data: regularTaskData, error: regularError } = await supabase.rpc('assign_regular_order_task', {
            p_product_name: order.order_items?.[0]?.name || 'Store Product',
            p_quantity: order.total_items || 1,
            p_customer_requirements: order.order_notes || null,
            p_priority: 'medium',
            p_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            p_order_id: order.id,
            p_product_id: order.order_items?.[0]?.id || null,
            p_order_source: 'online'
          });
          
          if (regularError) {
            console.error(`❌ Error assigning regular order task for ${order.order_number}:`, regularError.message);
          } else {
            taskId = regularTaskData;
            console.log(`✅ Regular order task assigned: ${taskId}`);
          }
        }
        
        if (taskId) {
          console.log(`🎨 Successfully assigned task ${taskId} to order ${order.order_number}`);
        } else {
          console.warn(`⚠️ Failed to assign task to order ${order.order_number}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing order ${order.order_number}:`, error.message);
      }
    }

    console.log('\n🎉 Existing order assignment complete!');
    console.log('📊 Summary:');
    console.log(`   - Total orders checked: ${orders.length}`);
    console.log(`   - Orders needing tasks: ${ordersNeedingTasks.length}`);
    console.log(`   - Tasks assigned: ${ordersNeedingTasks.filter(o => o.taskId).length}`);

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  assignExistingOrders();
}
