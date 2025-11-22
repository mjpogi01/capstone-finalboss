/**
 * Remove Customer Accounts Without Orders
 * 
 * This script scans all customer accounts and removes those that have no orders.
 * It also cleans up associated user_profiles entries.
 * 
 * Usage:
 *   node server/scripts/remove-orphaned-customers.js --dry-run    # Preview what would be deleted
 *   node server/scripts/remove-orphaned-customers.js --confirm  # Actually delete the accounts
 * 
 * Safety Features:
 *   - Dry-run mode to preview deletions without actually deleting
 *   - Requires --confirm flag to proceed with actual deletion
 *   - Shows preview of customers to be deleted
 *   - Provides detailed statistics and error reporting
 * 
 * Note: This script only removes customers created by the data generation script.
 * Real customers who signed up but haven't placed orders yet will also be removed.
 * Use with caution!
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PAGE_SIZE = 1000;
const REQUEST_DELAY_MS = 50;

// Check for dry-run flag
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-d');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSpinner(initialMessage) {
  const frames = ['|', '/', '-', '\\'];
  let frameIndex = 0;
  let message = initialMessage;
  let interval = null;
  let active = false;

  function render() {
    const frame = frames[frameIndex];
    frameIndex = (frameIndex + 1) % frames.length;
    const output = `${message} ${frame}`;
    const padding = ' '.repeat(Math.max(0, (process.stdout.columns || 80) - output.length));
    process.stdout.write(`\r${output}${padding}`);
  }

  return {
    start(text) {
      if (text) {
        message = text;
      }
      if (interval) {
        return;
      }
      active = true;
      render();
      interval = setInterval(render, 120);
    },
    update(text) {
      if (text) {
        message = text;
        if (active) {
          render();
        }
      }
    },
    stop(finalMessage) {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      active = false;
      const output = finalMessage || `${message} ✓`;
      const padding = ' '.repeat(Math.max(0, (process.stdout.columns || 80) - output.length));
      process.stdout.write(`\r${output}${padding}\n`);
    }
  };
}

async function loadCustomerUsers(spinner) {
  let page = 1;
  const customers = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      throw new Error(`Failed to list users (page ${page}): ${error.message}`);
    }

    const users = data?.users || [];
    users.forEach((user) => {
      if ((user.user_metadata?.role || '').toLowerCase() === 'customer') {
        customers.push({
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || null
        });
      }
    });

    if (spinner) {
      spinner.update(`   Fetching customer accounts (page ${page}, collected ${customers.length})`);
    }

    if (users.length < PAGE_SIZE) {
      break;
    }

    page += 1;
    await delay(REQUEST_DELAY_MS);
  }

  return customers;
}

async function hasOrders(userId) {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to check orders for ${userId}: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

async function removeCustomer(userId) {
  // First, try to delete from user_profiles if it exists
  try {
    await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);
  } catch (profileErr) {
    // Ignore profile deletion errors - user might not have a profile
    // This is not critical, we can still delete the auth user
  }

  // Delete the auth user
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Failed to delete user ${userId}: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Scanning for customer accounts without orders...');

  const loadSpinner = createSpinner('   Fetching customer accounts...');
  loadSpinner.start();
  let customers;
  try {
    customers = await loadCustomerUsers(loadSpinner);
    loadSpinner.stop(`   Loaded ${customers.length} customer accounts.`);
  } catch (error) {
    loadSpinner.stop('   Failed to load customer accounts.');
    throw error;
  }
  console.log(`   Inspecting ${customers.length} customer accounts for order history...`);

  const orphaned = [];
  const errors = [];

  const inspectSpinner = createSpinner('   Checking customer order history...');
  inspectSpinner.start();

  for (let index = 0; index < customers.length; index += 1) {
    const customer = customers[index];
    try {
      const exists = await hasOrders(customer.id);
      if (!exists) {
        orphaned.push(customer);
      }
    } catch (error) {
      errors.push({ customerId: customer.id, reason: error.message });
    }

    if ((index + 1) % 50 === 0 || index === customers.length - 1) {
      inspectSpinner.update(`   Checking customer order history... ${index + 1}/${customers.length}`);
    }
    await delay(REQUEST_DELAY_MS);
  }

  inspectSpinner.stop('   Customer order history check complete.');

  if (!orphaned.length) {
    console.log('✅ No orphaned customer accounts detected.');
    if (errors.length) {
      console.log(`⚠️ Encountered ${errors.length} errors while checking accounts.`);
    }
    return;
  }

  // Show preview of customers to be deleted
  console.log(`\n📋 Found ${orphaned.length} customer accounts without orders:`);
  if (orphaned.length <= 10) {
    orphaned.forEach((customer, idx) => {
      console.log(`   ${idx + 1}. ${customer.email || customer.id} (${customer.fullName || 'No name'})`);
    });
  } else {
    orphaned.slice(0, 5).forEach((customer, idx) => {
      console.log(`   ${idx + 1}. ${customer.email || customer.id} (${customer.fullName || 'No name'})`);
    });
    console.log(`   ... and ${orphaned.length - 5} more customers`);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No customers will be deleted.');
    console.log(`   Would remove ${orphaned.length} customer accounts.`);
    console.log('\n   To actually remove these customers, run the script without --dry-run flag.');
    return;
  }

  // Confirmation prompt
  console.log(`\n⚠️  WARNING: This will permanently delete ${orphaned.length} customer accounts!`);
  console.log('   This action cannot be undone.');
  console.log('\n   To proceed, run the script with --confirm flag:');
  console.log('   node server/scripts/remove-orphaned-customers.js --confirm');
  console.log('\n   Or use --dry-run to see what would be deleted without actually deleting.');
  
  if (!process.argv.includes('--confirm')) {
    console.log('\n❌ Aborted. Use --confirm flag to proceed with deletion.');
    return;
  }

  console.log(`\n🧹 Removing ${orphaned.length} customer accounts with zero orders...`);

  const failedDeletes = [];
  const removalSpinner = createSpinner('   Removing orphaned customer accounts...');
  removalSpinner.start();

  for (let index = 0; index < orphaned.length; index += 1) {
    const customer = orphaned[index];
    try {
      await removeCustomer(customer.id);
    } catch (error) {
      failedDeletes.push({ customerId: customer.id, reason: error.message });
    }
    if ((index + 1) % 20 === 0 || index === orphaned.length - 1) {
      removalSpinner.update(`   Removing orphaned customer accounts... ${index + 1}/${orphaned.length}`);
    }
    await delay(REQUEST_DELAY_MS);
  }

  removalSpinner.stop('   Removal pass complete.');

  const removedCount = orphaned.length - failedDeletes.length;
  console.log(`\n✅ Successfully removed ${removedCount} orphaned customer accounts.`);

  // Summary statistics
  console.log('\n📊 Summary:');
  console.log(`   • Total customer accounts scanned: ${customers.length}`);
  console.log(`   • Customers with orders: ${customers.length - orphaned.length}`);
  console.log(`   • Customers without orders: ${orphaned.length}`);
  console.log(`   • Successfully removed: ${removedCount}`);
  if (failedDeletes.length > 0) {
    console.log(`   • Failed to remove: ${failedDeletes.length}`);
  }

  if (failedDeletes.length) {
    console.log(`\n⚠️ Failed to remove ${failedDeletes.length} customers:`);
    failedDeletes.slice(0, 10).forEach((failure) => {
      console.log(`   • ${failure.customerId}: ${failure.reason}`);
    });
    if (failedDeletes.length > 10) {
      console.log(`   • ... and ${failedDeletes.length - 10} more failures`);
    }
  }

  if (errors.length) {
    console.log(`\n⚠️ Encountered ${errors.length} errors while checking for orders:`);
    errors.slice(0, 10).forEach((failure) => {
      console.log(`   • ${failure.customerId}: ${failure.reason}`);
    });
    if (errors.length > 10) {
      console.log(`   • ... and ${errors.length - 10} more errors`);
    }
  }

  console.log('\n✨ Cleanup complete!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

