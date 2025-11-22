const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAllArtistTasks() {
  console.log('🧹 Deleting ALL artist tasks from database...');
  
  // First, get count of all tasks
  const { count: totalCount, error: countError } = await supabase
    .from('artist_tasks')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new Error(`Failed to count artist tasks: ${countError.message}`);
  }
  
  console.log(`   📊 Found ${totalCount || 0} artist tasks to delete`);
  
  if (totalCount === 0) {
    console.log(`   ✅ No artist tasks to delete`);
    return;
  }
  
  // Delete all artist tasks in batches
  let deleted = 0;
  const batchSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    // Fetch a batch of task IDs to delete
    const { data: tasks, error: fetchError } = await supabase
      .from('artist_tasks')
      .select('id')
      .limit(batchSize);
    
    if (fetchError) {
      throw new Error(`Failed to fetch artist tasks: ${fetchError.message}`);
    }
    
    if (!tasks || tasks.length === 0) {
      hasMore = false;
      break;
    }
    
    const taskIds = tasks.map(task => task.id);
    
    // Delete this batch
    const { error: deleteError, count } = await supabase
      .from('artist_tasks')
      .delete({ returning: 'minimal', count: 'exact' })
      .in('id', taskIds);
    
    if (deleteError) {
      throw new Error(`Failed to delete artist tasks batch: ${deleteError.message}`);
    }
    
    deleted += (count || taskIds.length);
    console.log(`   📦 Deleted ${count || taskIds.length} artist tasks (Total: ${deleted})...`);
    
    if (tasks.length < batchSize) {
      hasMore = false;
    }
  }
  
  console.log(`   ✅ Total: Deleted ${deleted} artist tasks from database`);
}

async function verifyDeletion() {
  const { count, error } = await supabase
    .from('artist_tasks')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.warn(`   ⚠️  Could not verify deletion: ${error.message}`);
    return;
  }
  
  if (count === 0) {
    console.log(`   ✅ Verified: All artist tasks have been deleted (0 remaining)`);
  } else {
    console.log(`   ⚠️  Warning: ${count} artist tasks still remain in the database`);
  }
}

async function main() {
  console.log('⚠️  WARNING: This will delete ALL artist tasks from the database!');
  console.log('   - All artist tasks will be permanently deleted');
  console.log('   - Artist profiles and artists will NOT be deleted');
  console.log('');
  
  // Check if confirmation is provided via command line argument
  const args = process.argv.slice(2);
  const confirmFlag = args.includes('--confirm');
  
  if (!confirmFlag) {
    console.log('❌ This operation requires confirmation.');
    console.log('   Run with --confirm flag to proceed:');
    console.log('   node scripts/delete-all-artist-tasks.js --confirm');
    process.exit(1);
  }

  try {
    console.log('🗑️  Starting deletion...\n');
    await deleteAllArtistTasks();
    await verifyDeletion();
    console.log('\n✅ Cleanup complete. All artist tasks have been deleted.');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();










