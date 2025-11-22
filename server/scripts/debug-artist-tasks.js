const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugArtistTasks() {
  console.log('🔍 Debugging Artist Tasks and Orders...\n');

  try {
    // Get recent artist tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('artist_tasks')
      .select('id, order_id, task_title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError.message);
      return;
    }

    console.log(`📋 Found ${tasks.length} recent artist tasks:`);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.task_title}`);
      console.log(`   Order ID: ${task.order_id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Created: ${task.created_at}`);
      console.log('');
    });

    // Get recent orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return;
    }

    console.log(`📦 Found ${orders.length} recent orders:`);
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.order_number}`);
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.created_at}`);
      console.log('');
    });

    // Check for mismatched order IDs
    const taskOrderIds = new Set(tasks.map(t => t.order_id));
    const orderIds = new Set(orders.map(o => o.id));
    
    console.log('🔍 Checking for mismatched order IDs...');
    const mismatchedTasks = tasks.filter(task => !orderIds.has(task.order_id));
    
    if (mismatchedTasks.length > 0) {
      console.log(`❌ Found ${mismatchedTasks.length} tasks with invalid order IDs:`);
      mismatchedTasks.forEach(task => {
        console.log(`   Task: ${task.task_title}`);
        console.log(`   Invalid Order ID: ${task.order_id}`);
      });
    } else {
      console.log('✅ All task order IDs match existing orders');
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  debugArtistTasks();
}
