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

async function deleteAllOrders() {
  console.log('🧹 Deleting ALL orders from database...');
  
  // First, get count of all orders
  const { count: totalCount, error: countError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new Error(`Failed to count orders: ${countError.message}`);
  }
  
  console.log(`   📊 Found ${totalCount || 0} orders to delete`);
  
  if (totalCount === 0) {
    console.log(`   ✅ No orders to delete`);
    return;
  }
  
  // Delete orders in smaller batches by user_id to avoid constraint issues
  let deleted = 0;
  let page = 1;
  const perPage = 1000;
  const batchSize = 100; // Smaller batches for deletion
  
  // Get all unique user IDs that have orders
  const userIds = new Set();
  while (true) {
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('user_id')
      .limit(perPage)
      .range((page - 1) * perPage, page * perPage - 1);
    
    if (fetchError) {
      throw new Error(`Failed to fetch orders: ${fetchError.message}`);
    }
    
    if (!orders || orders.length === 0) {
      break;
    }
    
    orders.forEach(order => {
      if (order.user_id) {
        userIds.add(order.user_id);
      }
    });
    
    if (orders.length < perPage) {
      break;
    }
    page += 1;
  }
  
  console.log(`   📋 Found ${userIds.size} unique users with orders`);
  
  // Delete orders by user_id in batches
  const userIdsArray = Array.from(userIds);
  let batchNumber = 1;
  
  for (let i = 0; i < userIdsArray.length; i += batchSize) {
    const batch = userIdsArray.slice(i, i + batchSize);
    console.log(`   📦 Processing batch ${batchNumber} (${batch.length} users)...`);
    
    const { error: deleteError, count } = await supabase
      .from('orders')
      .delete({ returning: 'minimal', count: 'exact' })
      .in('user_id', batch);
    
    if (deleteError) {
      throw new Error(`Failed to delete orders batch ${batchNumber}: ${deleteError.message}`);
    }
    
    deleted += (count || 0);
    console.log(`   ✅ Batch ${batchNumber}: Deleted ${count || 0} orders (Total: ${deleted})...`);
    batchNumber++;
  }
  
  console.log(`   ✅ Total: Deleted ${deleted} orders from database`);
}

async function deleteAllCustomerAccounts() {
  console.log('🧹 Deleting ALL customer accounts...');
  let page = 1;
  const perPage = 1000;
  let deleted = 0;
  let skipped = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    const users = data?.users ?? [];
    
    // Only delete customer accounts, skip admin/owner/artist accounts
    const customerUsers = users.filter((user) => {
      const role = (user.user_metadata?.role || '').toLowerCase();
      return role === 'customer';
    });

    for (const user of customerUsers) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.warn(`   ⚠️ Failed to delete user ${user.email}: ${deleteError.message}`);
        skipped++;
      } else {
        deleted += 1;
        if (deleted % 100 === 0) {
          console.log(`   📝 Deleted ${deleted} customer accounts...`);
        }
      }
    }

    // Check for non-customer accounts that should be skipped
    const nonCustomerUsers = users.filter((user) => {
      const role = (user.user_metadata?.role || '').toLowerCase();
      return role !== 'customer';
    });
    
    if (nonCustomerUsers.length > 0) {
      skipped += nonCustomerUsers.length;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  console.log(`   ✅ Deleted ${deleted} customer accounts`);
  if (skipped > 0) {
    console.log(`   ⚠️ Skipped ${skipped} non-customer accounts (admin/owner/artist)`);
  }
}

async function deleteRelatedData() {
  console.log('🧹 Related data (user_profiles, user_addresses) should be automatically deleted via CASCADE when auth users are deleted.');
  console.log('   If you see orphaned records, they can be cleaned up manually or via database constraints.');
}

async function main() {
  console.log('⚠️  WARNING: This will delete ALL customers and ALL orders from the database!');
  console.log('   - All orders will be deleted');
  console.log('   - All customer accounts will be deleted');
  console.log('   - Admin, Owner, and Artist accounts will NOT be deleted');
  console.log('');
  
  // Check if confirmation is provided via command line argument
  const args = process.argv.slice(2);
  const confirmFlag = args.includes('--confirm');
  
  if (!confirmFlag) {
    console.log('❌ This operation requires confirmation.');
    console.log('   Run with --confirm flag to proceed:');
    console.log('   node scripts/delete-all-customers-and-orders.js --confirm');
    process.exit(1);
  }

  try {
    console.log('🗑️  Starting deletion...\n');
    await deleteAllOrders();
    await deleteAllCustomerAccounts();
    await deleteRelatedData();
    console.log('\n✅ Cleanup complete. All customers and orders have been deleted.');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
