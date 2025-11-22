const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testArtistTasksQuery() {
  console.log('🧪 Testing Artist Tasks Query...\n');

  try {
    // Get Artist 1's profile ID
    const { data: artistProfile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('id, artist_name')
      .eq('artist_name', 'Artist 1')
      .single();

    if (profileError) {
      console.error('❌ Error fetching artist profile:', profileError.message);
      return;
    }

    console.log(`👤 Found ${artistProfile.artist_name} with ID: ${artistProfile.id}`);

    // Test the fixed query
    const { data: tasks, error: tasksError } = await supabase
      .from('artist_tasks')
      .select(`
        *,
        artist_profiles(artist_name),
        orders(order_number, status)
      `)
      .eq('artist_id', artistProfile.id)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError.message);
    } else {
      console.log(`✅ Found ${tasks.length} tasks for Artist 1:`);
      tasks.forEach((task, index) => {
        console.log(`\n${index + 1}. ${task.task_title}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Type: ${task.order_type}`);
        console.log(`   Created: ${task.created_at}`);
        console.log(`   Artist: ${task.artist_profiles?.artist_name || 'Unknown'}`);
        console.log(`   Order: ${task.orders?.order_number || 'No Order'}`);
      });
    }

    // Also test with Artist 2 (should have 0 tasks)
    console.log('\n🔍 Testing Artist 2 (should have 0 tasks)...');
    const { data: artist2Profile, error: profile2Error } = await supabase
      .from('artist_profiles')
      .select('id, artist_name')
      .eq('artist_name', 'Artist 2')
      .single();

    if (!profile2Error) {
      const { data: tasks2, error: tasks2Error } = await supabase
        .from('artist_tasks')
        .select(`
          *,
          artist_profiles(artist_name),
          orders(order_number, status)
        `)
        .eq('artist_id', artist2Profile.id)
        .order('created_at', { ascending: false });

      if (!tasks2Error) {
        console.log(`✅ Artist 2 has ${tasks2.length} tasks (as expected)`);
      }
    }

    console.log('\n🎉 Query test complete!');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (require.main === module) {
  testArtistTasksQuery();
}
