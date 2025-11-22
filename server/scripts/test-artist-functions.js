const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testArtistFunctions() {
  console.log('🧪 Testing Artist System Functions...\n');

  try {
    // Test 1: Check if artist_profiles table exists and has data
    console.log('1️⃣ Testing artist_profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('artist_profiles')
      .select('id, artist_name, is_active')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error accessing artist_profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles.length} artist profiles:`);
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.artist_name} (Active: ${profile.is_active})`);
      });
    }

    // Test 2: Check if artist_tasks table exists
    console.log('\n2️⃣ Testing artist_tasks table...');
    const { data: tasks, error: tasksError } = await supabase
      .from('artist_tasks')
      .select('id, task_title, status')
      .limit(5);

    if (tasksError) {
      console.error('❌ Error accessing artist_tasks:', tasksError.message);
    } else {
      console.log(`✅ Found ${tasks.length} artist tasks:`);
      tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.task_title} (Status: ${task.status})`);
      });
    }

    // Test 3: Test assign_custom_design_task function
    console.log('\n3️⃣ Testing assign_custom_design_task function...');
    try {
      const { data: customTaskData, error: customError } = await supabase.rpc('assign_custom_design_task', {
        p_order_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        p_product_name: 'Test Custom Design',
        p_quantity: 1,
        p_customer_requirements: 'Test requirements',
        p_priority: 'medium',
        p_deadline: null,
        p_product_id: null
      });

      if (customError) {
        console.error('❌ assign_custom_design_task function error:', customError.message);
      } else {
        console.log('✅ assign_custom_design_task function works!');
        console.log(`   Returned task ID: ${customTaskData}`);
      }
    } catch (error) {
      console.error('❌ assign_custom_design_task function not found or error:', error.message);
    }

    // Test 4: Test assign_regular_order_task function
    console.log('\n4️⃣ Testing assign_regular_order_task function...');
    try {
      const { data: regularTaskData, error: regularError } = await supabase.rpc('assign_regular_order_task', {
        p_product_name: 'Test Store Product',
        p_quantity: 1,
        p_customer_requirements: 'Test requirements',
        p_priority: 'medium',
        p_deadline: null,
        p_order_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        p_product_id: null,
        p_order_source: 'online'
      });

      if (regularError) {
        console.error('❌ assign_regular_order_task function error:', regularError.message);
      } else {
        console.log('✅ assign_regular_order_task function works!');
        console.log(`   Returned task ID: ${regularTaskData}`);
      }
    } catch (error) {
      console.error('❌ assign_regular_order_task function not found or error:', error.message);
    }

    // Test 5: Test get_artist_workload_summary function
    console.log('\n5️⃣ Testing get_artist_workload_summary function...');
    try {
      const { data: workloadData, error: workloadError } = await supabase.rpc('get_artist_workload_summary');

      if (workloadError) {
        console.error('❌ get_artist_workload_summary function error:', workloadError.message);
      } else {
        console.log('✅ get_artist_workload_summary function works!');
        console.log(`   Found ${workloadData.length} artists in workload summary`);
        workloadData.slice(0, 3).forEach((artist, index) => {
          console.log(`   ${index + 1}. ${artist.artist_name}: ${artist.total_tasks} total tasks`);
        });
      }
    } catch (error) {
      console.error('❌ get_artist_workload_summary function not found or error:', error.message);
    }

    console.log('\n🎯 Summary:');
    console.log('If you see errors above, the artist system functions may not be properly set up.');
    console.log('You may need to run the SQL script manually in Supabase Dashboard.');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  testArtistFunctions();
}
