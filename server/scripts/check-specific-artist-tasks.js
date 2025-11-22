const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSpecificArtistTasks() {
  console.log('🔍 Checking Tasks for Specific Artists...\n');

  try {
    // Get artist profiles with their IDs
    const { data: profiles, error: profilesError } = await supabase
      .from('artist_profiles')
      .select('id, artist_name, user_id')
      .in('artist_name', ['Artist 1', 'Artist 2', 'Artist 3', 'Test Login Artist']);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      return;
    }

    console.log('👥 Artist Profiles Found:');
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.artist_name}`);
      console.log(`   Profile ID: ${profile.id}`);
      console.log(`   User ID: ${profile.user_id}`);
    });

    // Check tasks for each of these artists
    console.log('\n📋 Tasks for Each Artist:');
    for (const profile of profiles) {
      const { data: tasks, error: tasksError } = await supabase
        .from('artist_tasks')
        .select('id, task_title, status, order_type, created_at')
        .eq('artist_id', profile.id);

      if (tasksError) {
        console.error(`❌ Error fetching tasks for ${profile.artist_name}:`, tasksError.message);
      } else {
        console.log(`\n${profile.artist_name}:`);
        if (tasks.length === 0) {
          console.log('   📭 No tasks assigned');
        } else {
          tasks.forEach((task, index) => {
            console.log(`   ${index + 1}. ${task.task_title}`);
            console.log(`      Status: ${task.status} | Type: ${task.order_type}`);
            console.log(`      Created: ${task.created_at}`);
          });
        }
      }
    }

    // Also check which artists actually have tasks
    console.log('\n🎯 Artists with Tasks:');
    const { data: allTasks, error: allTasksError } = await supabase
      .from('artist_tasks')
      .select('artist_id, task_title, status')
      .order('created_at', { ascending: false });

    if (allTasksError) {
      console.error('❌ Error fetching all tasks:', allTasksError.message);
    } else {
      // Group tasks by artist
      const tasksByArtist = {};
      allTasks.forEach(task => {
        if (!tasksByArtist[task.artist_id]) {
          tasksByArtist[task.artist_id] = [];
        }
        tasksByArtist[task.artist_id].push(task);
      });

      // Get artist names for each task group
      for (const [artistId, tasks] of Object.entries(tasksByArtist)) {
        const { data: artistProfile, error: artistError } = await supabase
          .from('artist_profiles')
          .select('artist_name')
          .eq('id', artistId)
          .single();

        if (artistError) {
          console.log(`   Artist ID ${artistId.substring(0, 8)}...: ${tasks.length} tasks`);
        } else {
          console.log(`   ${artistProfile.artist_name}: ${tasks.length} tasks`);
          tasks.forEach((task, index) => {
            console.log(`      ${index + 1}. ${task.task_title} (${task.status})`);
          });
        }
      }
    }

    // Create a test task for Artist 1 to verify the system works
    console.log('\n🧪 Creating Test Task for Artist 1...');
    const artist1Profile = profiles.find(p => p.artist_name === 'Artist 1');
    
    if (artist1Profile) {
      const { data: testTask, error: testError } = await supabase
        .from('artist_tasks')
        .insert({
          artist_id: artist1Profile.id,
          task_title: 'Test Task for Artist 1',
          task_description: 'This is a test task to verify the dashboard works',
          design_requirements: 'Test requirements',
          order_type: 'regular',
          is_custom_order: false,
          order_source: 'online',
          priority: 'medium',
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (testError) {
        console.error('❌ Failed to create test task:', testError.message);
      } else {
        console.log('✅ Test task created for Artist 1!');
        console.log(`   Task ID: ${testTask.id}`);
        console.log(`   Title: ${testTask.task_title}`);
      }
    }

    console.log('\n🎉 Check complete!');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  checkSpecificArtistTasks();
}
