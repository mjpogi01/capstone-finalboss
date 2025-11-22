const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkArtistTasks() {
  console.log('🔍 Checking Artist Tasks in Database...\n');

  try {
    // 1. Check artist_profiles table
    console.log('1️⃣ Checking artist_profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('artist_profiles')
      .select('id, artist_name, is_active')
      .limit(10);

    if (profilesError) {
      console.error('❌ Error fetching artist profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles.length} artist profiles:`);
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.artist_name} (ID: ${profile.id.substring(0, 8)}...) - Active: ${profile.is_active}`);
      });
    }

    // 2. Check artist_tasks table
    console.log('\n2️⃣ Checking artist_tasks...');
    const { data: tasks, error: tasksError } = await supabase
      .from('artist_tasks')
      .select('id, task_title, status, artist_id, order_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tasksError) {
      console.error('❌ Error fetching artist tasks:', tasksError.message);
    } else {
      console.log(`✅ Found ${tasks.length} artist tasks:`);
      if (tasks.length === 0) {
        console.log('   📭 No tasks found in database');
      } else {
        tasks.forEach((task, index) => {
          const artistId = task.artist_id ? task.artist_id.substring(0, 8) + '...' : 'No Artist';
          console.log(`   ${index + 1}. ${task.task_title}`);
          console.log(`      Status: ${task.status} | Type: ${task.order_type} | Artist: ${artistId}`);
          console.log(`      Created: ${task.created_at}`);
        });
      }
    }

    // 3. Check orders table for recent orders
    console.log('\n3️⃣ Checking recent orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, order_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
    } else {
      console.log(`✅ Found ${orders.length} recent orders:`);
      if (orders.length === 0) {
        console.log('   📭 No orders found in database');
      } else {
        orders.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.order_number} - Type: ${order.order_type} - Status: ${order.status}`);
          console.log(`      Created: ${order.created_at}`);
        });
      }
    }

    // 4. Test the task assignment functions
    console.log('\n4️⃣ Testing task assignment functions...');
    
    // Test assign_custom_design_task
    try {
      const { data: testTask1, error: testError1 } = await supabase.rpc('assign_custom_design_task', {
        p_order_id: '00000000-0000-0000-0000-000000000001',
        p_product_name: 'Test Custom Jersey',
        p_quantity: 1,
        p_customer_requirements: 'Test task for verification',
        p_priority: 'medium',
        p_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (testError1) {
        console.error('❌ assign_custom_design_task error:', testError1.message);
      } else {
        console.log('✅ assign_custom_design_task function works!');
        console.log(`   Created task ID: ${testTask1}`);
      }
    } catch (error) {
      console.error('❌ assign_custom_design_task test failed:', error.message);
    }

    // Test assign_regular_order_task
    try {
      const { data: testTask2, error: testError2 } = await supabase.rpc('assign_regular_order_task', {
        p_product_name: 'Test Regular Product',
        p_quantity: 2,
        p_customer_requirements: 'Test regular order',
        p_priority: 'medium',
        p_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (testError2) {
        console.error('❌ assign_regular_order_task error:', testError2.message);
      } else {
        console.log('✅ assign_regular_order_task function works!');
        console.log(`   Created task ID: ${testTask2}`);
      }
    } catch (error) {
      console.error('❌ assign_regular_order_task test failed:', error.message);
    }

    // 5. Check workload summary
    console.log('\n5️⃣ Checking artist workload summary...');
    try {
      const { data: workload, error: workloadError } = await supabase.rpc('get_artist_workload_summary');

      if (workloadError) {
        console.error('❌ get_artist_workload_summary error:', workloadError.message);
      } else {
        console.log('✅ Workload summary:');
        workload.forEach((artist, index) => {
          console.log(`   ${index + 1}. ${artist.artist_name}:`);
          console.log(`      Total Tasks: ${artist.total_tasks}`);
          console.log(`      Pending: ${artist.pending_tasks}`);
          console.log(`      In Progress: ${artist.in_progress_tasks}`);
          console.log(`      Completed: ${artist.completed_tasks}`);
          console.log(`      Custom Orders: ${artist.custom_design_orders}`);
          console.log(`      Regular Orders: ${artist.regular_orders}`);
          console.log(`      Walk-in Orders: ${artist.walk_in_orders}`);
        });
      }
    } catch (error) {
      console.error('❌ Workload summary test failed:', error.message);
    }

    console.log('\n🎉 Database check complete!');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  checkArtistTasks();
}
