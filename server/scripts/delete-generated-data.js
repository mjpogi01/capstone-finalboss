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

const HISTORICAL_EMAIL_DOMAIN = '@mail.yohanns.com';

async function deleteGeneratedOrders() {
  console.log('🧹 Deleting orders from generated customers only...');
  
  // First, get all generated customer user IDs (those with @mail.yohanns.com emails)
  const generatedCustomerIds = new Set();
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    const users = data?.users ?? [];
    users.forEach((user) => {
      const email = (user.email || '').toLowerCase();
      if (email.endsWith(HISTORICAL_EMAIL_DOMAIN)) {
        generatedCustomerIds.add(user.id);
      }
    });

    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  console.log(`   📊 Found ${generatedCustomerIds.size} generated customer accounts`);

  if (generatedCustomerIds.size === 0) {
    console.log(`   ⚠️  No generated customers found, skipping order deletion`);
    return;
  }

  // Delete orders in batches to avoid "Request-URI Too Large" error
  const customerIdsArray = Array.from(generatedCustomerIds);
  const batchSize = 500; // Process 500 customer IDs at a time
  let totalDeleted = 0;
  let batchNumber = 1;

  for (let i = 0; i < customerIdsArray.length; i += batchSize) {
    const batch = customerIdsArray.slice(i, i + batchSize);
    console.log(`   📦 Processing batch ${batchNumber} (${batch.length} customers)...`);
    
    const { error, count } = await supabase
      .from('orders')
      .delete({ returning: 'minimal', count: 'exact' })
      .in('user_id', batch);

    if (error) {
      throw new Error(`Failed to delete orders in batch ${batchNumber}: ${error.message}`);
    }

    totalDeleted += (count ?? 0);
    console.log(`   ✅ Batch ${batchNumber}: Deleted ${count ?? 0} orders`);
    batchNumber++;
  }

  console.log(`   ✅ Total: Deleted ${totalDeleted} orders from generated customers`);
}

async function deleteAllGeneratedCustomers() {
  console.log('🧹 Deleting generated customer accounts (only @mail.yohanns.com emails)...');
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
    
    // Only delete users with email ending in @mail.yohanns.com (generated emails)
    // This ensures we only delete generated customers, not real customers
    const candidates = users.filter((user) => {
      const email = (user.email || '').toLowerCase();
      return email.endsWith(HISTORICAL_EMAIL_DOMAIN);
    });

    for (const user of candidates) {
      // Skip admin/owner accounts even if they have generated email (safety check)
      const role = (user.user_metadata?.role || '').toLowerCase();
      if (role === 'admin' || role === 'owner') {
        skipped++;
        console.warn(`   ⚠️ Skipping admin/owner account with generated email: ${user.email}`);
        continue;
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.warn(`   ⚠️ Failed to delete user ${user.email}: ${deleteError.message}`);
      } else {
        deleted += 1;
        if (deleted % 100 === 0) {
          console.log(`   📝 Deleted ${deleted} generated customer accounts...`);
        }
      }
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  console.log(`   ✅ Deleted ${deleted} generated customer accounts`);
  if (skipped > 0) {
    console.log(`   ⚠️ Skipped ${skipped} admin/owner accounts with generated emails`);
  }
}

async function deleteRelatedData() {
  console.log('🧹 Related data (user_profiles, user_addresses) should be automatically deleted via CASCADE when auth users are deleted.');
  console.log('   If you see orphaned records, they can be cleaned up manually or via database constraints.');
}

async function main() {
  console.log('🧹 Deleting generated data only:');
  console.log('   - Orders from generated customers (emails ending in @mail.yohanns.com)');
  console.log('   - Customer accounts with emails ending in @mail.yohanns.com');
  console.log('⚠️  Real customer data will NOT be deleted.\n');
  
  // Uncomment the line below if you want to require confirmation
  // const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  // await new Promise(resolve => readline.question('Type "DELETE GENERATED" to confirm: ', answer => { readline.close(); if (answer !== 'DELETE GENERATED') { console.log('Cancelled.'); process.exit(0); } resolve(); }));

  try {
    await deleteGeneratedOrders();
    await deleteAllGeneratedCustomers();
    await deleteRelatedData();
    console.log('\n✅ Cleanup complete. Only generated data was deleted.');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

main();



