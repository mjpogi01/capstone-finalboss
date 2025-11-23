/**
 * Backfill Stock Deductions Script
 * 
 * This script processes existing orders that were placed before the stock deduction fix
 * and deducts stock for those orders retroactively.
 * 
 * Usage:
 *   node server/scripts/backfill-stock-deductions.js [options]
 * 
 * Options:
 *   --dry-run    : Show what would be deducted without actually deducting
 *   --order-id   : Process only a specific order ID
 *   --status     : Process only orders with specific status (default: all except cancelled)
 *   --from-date  : Process orders from this date onwards (YYYY-MM-DD)
 *   --to-date    : Process orders up to this date (YYYY-MM-DD)
 */

const { supabase } = require('../lib/db');
const path = require('path');

// Import the stock deduction function from orders.js
// We'll need to copy the logic here or require it
// NOTE: Only balls and trophies have stocks - apparel products are pre-ordered (made to order)
async function deductStockFromOrder(orderItems, pickupBranchId) {
  try {
    console.log('📦 Deducting stock for order items (balls and trophies only)');

    for (const item of orderItems) {
      const category = item.category?.toLowerCase();
      const productName = item.name;
      const quantity = parseInt(item.quantity) || 1;
      
      if (!productName) {
        console.warn(`⚠️ Skipping stock deduction: product name missing for item`);
        continue;
      }

      // Only process balls and trophies - apparel products are pre-ordered (no stock deduction)
      if (category !== 'trophies' && category !== 'balls') {
        console.log(`ℹ️ Skipping ${productName} (${category}) - apparel products are pre-ordered, no stock deduction needed`);
        continue;
      }

      let product = null;
      let branchIdToUse = null;

      // For balls and trophies: Find product in the SELECTED branch
      if (!pickupBranchId) {
        console.warn(`⚠️ No pickup branch ID provided for ${productName}, skipping stock deduction`);
        continue;
      }

      const { data: foundProduct, error: fetchError } = await supabase
        .from('products')
        .select('id, name, category, stock_quantity, size_stocks, branch_id')
        .eq('name', productName)
        .eq('category', item.category)
        .eq('branch_id', pickupBranchId)
        .maybeSingle();

      if (fetchError || !foundProduct) {
        console.error(`❌ Error fetching product ${productName} from branch ${pickupBranchId}:`, fetchError);
        continue;
      }
      product = foundProduct;
      branchIdToUse = pickupBranchId;
      console.log(`📦 Found ${productName} in selected branch ${pickupBranchId}`);
      }

      // Deduct stock for balls (using stock_quantity)
      if (category === 'balls') {
        const currentStock = product.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - quantity);
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`❌ Error updating stock for product ${product.id}:`, updateError);
        } else {
          console.log(`✅ Deducted ${quantity} from ${productName} (${category}) at branch ${branchIdToUse}. Stock: ${currentStock} → ${newStock}`);
        }
      }
      
      // Deduct stock for trophies (size_stocks)
      if (category === 'trophies') {
        let sizeStocks = product.size_stocks;
        
        // Parse size_stocks if it's a string
        if (typeof sizeStocks === 'string') {
          try {
            sizeStocks = JSON.parse(sizeStocks);
          } catch (e) {
            console.error(`❌ Error parsing size_stocks for product ${product.id}:`, e);
            continue;
          }
        }

        if (!sizeStocks || typeof sizeStocks !== 'object') {
          console.error(`❌ Invalid size_stocks for trophy product ${product.id}`);
          continue;
        }

        // Get the size from trophy details
        const trophySize = item.trophyDetails?.size || item.size;
        if (!trophySize) {
          console.warn(`⚠️ Trophy size not specified for product ${productName}`);
          continue;
        }

        const currentStock = sizeStocks[trophySize] || 0;
        const newStock = Math.max(0, currentStock - quantity);
        sizeStocks[trophySize] = newStock;
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            size_stocks: sizeStocks,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`❌ Error updating stock for trophy product ${product.id}:`, updateError);
        } else {
          console.log(`✅ Deducted ${quantity} from ${productName} (${trophySize}) at branch ${branchIdToUse}. Stock: ${currentStock} → ${newStock}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in deductStockFromOrder:', error);
    throw error;
  }
}

async function backfillStockDeductions(options = {}) {
  const {
    dryRun = false,
    orderId = null,
    status = null,
    fromDate = null,
    toDate = null
  } = options;

  console.log('🔄 Starting stock deduction backfill...');
  console.log(`   Dry Run: ${dryRun ? 'YES (no changes will be made)' : 'NO (will deduct stock)'}`);
  if (orderId) console.log(`   Order ID: ${orderId}`);
  if (status) console.log(`   Status Filter: ${status}`);
  if (fromDate) console.log(`   From Date: ${fromDate}`);
  if (toDate) console.log(`   To Date: ${toDate}`);
  console.log('');

  try {
    // Build query
    let query = supabase
      .from('orders')
      .select('id, order_number, status, order_items, pickup_location, pickup_branch_id, created_at')
      .order('created_at', { ascending: true });

    // Apply filters
    if (orderId) {
      query = query.eq('id', orderId);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: exclude cancelled orders
      query = query.neq('status', 'cancelled');
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }

    if (toDate) {
      query = query.lte('created_at', toDate);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log('ℹ️ No orders found matching the criteria.');
      return;
    }

    console.log(`📋 Found ${orders.length} order(s) to process\n`);

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const order of orders) {
      processedCount++;
      console.log(`\n[${processedCount}/${orders.length}] Processing Order: ${order.order_number} (${order.id})`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.created_at}`);
      console.log(`   Items: ${Array.isArray(order.order_items) ? order.order_items.length : 0}`);

      if (!order.order_items || !Array.isArray(order.order_items) || order.order_items.length === 0) {
        console.log('   ⚠️ No order items found, skipping...');
        continue;
      }

      // Get pickup branch ID
      let pickupBranchId = order.pickup_branch_id;
      
      // If no pickup_branch_id, try to resolve from pickup_location
      if (!pickupBranchId && order.pickup_location) {
        try {
          const { data: branchData } = await supabase
            .from('branches')
            .select('id')
            .ilike('name', `%${order.pickup_location}%`)
            .limit(1)
            .maybeSingle();

          if (branchData?.id) {
            pickupBranchId = branchData.id;
            console.log(`   📍 Resolved branch ID from location: ${pickupBranchId}`);
          }
        } catch (branchError) {
          console.warn(`   ⚠️ Could not resolve branch from location: ${branchError.message}`);
        }
      }

      if (dryRun) {
        console.log('   🔍 DRY RUN: Would deduct stock for items:');
        order.order_items.forEach((item, idx) => {
          console.log(`      ${idx + 1}. ${item.name} (${item.category}) x${item.quantity || 1}`);
        });
        successCount++;
      } else {
        try {
          await deductStockFromOrder(order.order_items, pickupBranchId);
          console.log(`   ✅ Stock deducted successfully`);
          successCount++;
        } catch (stockError) {
          console.error(`   ❌ Error deducting stock: ${stockError.message}`);
          errorCount++;
          errors.push({
            order_number: order.order_number,
            order_id: order.id,
            error: stockError.message
          });
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Backfill Summary:');
    console.log(`   Total Orders Processed: ${processedCount}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`   - Order ${err.order_number} (${err.order_id}): ${err.error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️ This was a DRY RUN. No stock was actually deducted.');
      console.log('   Run without --dry-run to actually deduct stock.');
    } else {
      console.log('\n✅ Backfill completed!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    orderId: null,
    status: null,
    fromDate: null,
    toDate: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--order-id' && args[i + 1]) {
      options.orderId = args[i + 1];
      i++;
    } else if (args[i] === '--status' && args[i + 1]) {
      options.status = args[i + 1];
      i++;
    } else if (args[i] === '--from-date' && args[i + 1]) {
      options.fromDate = args[i + 1];
      i++;
    } else if (args[i] === '--to-date' && args[i + 1]) {
      options.toDate = args[i + 1];
      i++;
    }
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  backfillStockDeductions(options)
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillStockDeductions, deductStockFromOrder };

