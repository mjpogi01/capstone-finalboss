/**
 * Test Stock Deduction Script
 * 
 * This script tests if stock deduction is working correctly when orders are placed.
 * It finds a recent order with balls/trophies, checks stock before/after, and tests the deduction.
 * 
 * Usage:
 *   node server/scripts/test-stock-deduction.js [options]
 * 
 * Options:
 *   --order-id      : Test a specific order ID
 *   --order-number  : Test a specific order number
 *   --product-id    : Test a specific product ID (fetches product and creates test)
 *   --find-stock    : Find products with stock and test one
 *   --dry-run       : Show what would happen without actually deducting
 */

const { supabase } = require('../lib/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Copy of the deduction function from orders.js
async function deductStockFromOrder(orderItems, pickupBranchId) {
  try {
    console.log('📦 Deducting stock for order items (balls and trophies only)');
    // Note: pickupBranchId is only used for pickup location, not for stock deduction
    // Each item has its own branchId (set in product modal) which indicates which branch has the stock

    const results = [];

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

      // Use the branchId from the item (set in product modal when user selected branch with stock)
      const itemBranchId = item.branchId || item.branch_id;
      
      if (!itemBranchId) {
        const error = `⚠️ No branchId found for ${productName} - cannot deduct stock. Item should have branchId set from product modal.`;
        console.warn(error);
        results.push({ item: productName, success: false, error });
        continue;
      }

      // Find product in the branch specified by the item's branchId
      // Use case-insensitive category matching and prefer products with size_stocks populated
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, name, category, stock_quantity, size_stocks, branch_id')
        .eq('name', productName)
        .ilike('category', item.category) // Case-insensitive match
        .eq('branch_id', itemBranchId);
      
      // If multiple products found, prefer one with size_stocks populated
      let foundProduct = null;
      if (products && products.length > 0) {
        if (products.length > 1) {
          console.log(`⚠️ [DEBUG] Found ${products.length} products with same name/category/branch. Products:`, 
            products.map(p => ({ id: p.id, size_stocks: p.size_stocks })));
        }
        // First, try to find one with non-null size_stocks
        foundProduct = products.find(p => {
          const ss = p.size_stocks;
          return ss !== null && ss !== undefined && ss !== 'null' && (typeof ss === 'object' || (typeof ss === 'string' && ss.trim() !== '' && ss.trim() !== 'null'));
        }) || products[0];
        console.log(`🔍 [DEBUG] Selected product:`, { id: foundProduct.id, size_stocks: foundProduct.size_stocks });
      }

      if (fetchError || !foundProduct) {
        const error = `❌ Error fetching product ${productName} from branch ${itemBranchId}: ${fetchError?.message || 'Product not found'}`;
        console.error(error);
        results.push({ item: productName, success: false, error });
        continue;
      }
      
      // Debug: Log the full product object
      console.log(`🔍 [DEBUG] Found product:`, JSON.stringify(foundProduct, null, 2));
      console.log(`📦 Deducting ${productName} from branch ${itemBranchId} (selected in product modal)`);

      // Deduct stock for balls (using stock_quantity)
      if (category === 'balls') {
        const currentStock = foundProduct.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - quantity);
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', foundProduct.id);
        
        if (updateError) {
          const error = `❌ Error updating stock for ball product ${foundProduct.id}: ${updateError.message}`;
          console.error(error);
          results.push({ item: productName, success: false, error, branchId: itemBranchId, currentStock, newStock });
        } else {
          console.log(`✅ Deducted ${quantity} from ${productName} (balls) at branch ${itemBranchId}. Stock: ${currentStock} → ${newStock}`);
          results.push({ item: productName, success: true, branchId: itemBranchId, currentStock, newStock, quantity });
        }
      }
      
      // Deduct stock for trophies (size_stocks) - using size from item
      if (category === 'trophies') {
        let sizeStocks = foundProduct.size_stocks;
        
        // Debug: Log what we received
        console.log(`🔍 [DEBUG] Product ${foundProduct.id} size_stocks type:`, typeof sizeStocks);
        console.log(`🔍 [DEBUG] Product ${foundProduct.id} size_stocks value:`, sizeStocks);
        console.log(`🔍 [DEBUG] Product ${foundProduct.id} size_stocks is null:`, sizeStocks === null);
        console.log(`🔍 [DEBUG] Product ${foundProduct.id} size_stocks is undefined:`, sizeStocks === undefined);
        
        // If size_stocks is null, check if other products with same name have it set
        if (sizeStocks === null || sizeStocks === undefined) {
          console.log(`\n🔍 [DEBUG] Checking if other products with name "${productName}" have size_stocks...`);
          const { data: allProductsWithName } = await supabase
            .from('products')
            .select('id, name, branch_id, size_stocks')
            .eq('name', productName)
            .ilike('category', item.category);
          
          if (allProductsWithName && allProductsWithName.length > 0) {
            const productsWithSizeStocks = allProductsWithName.filter(p => {
              const ss = p.size_stocks;
              return ss !== null && ss !== undefined && ss !== 'null' && (typeof ss === 'object' || (typeof ss === 'string' && ss.trim() !== '' && ss.trim() !== 'null'));
            });
            
            console.log(`   Found ${productsWithSizeStocks.length} product(s) with size_stocks out of ${allProductsWithName.length} total:`);
            if (productsWithSizeStocks.length > 0) {
              productsWithSizeStocks.forEach(p => {
                console.log(`   ✅ ID: ${p.id}, Branch: ${p.branch_id}, size_stocks: ${JSON.stringify(p.size_stocks)}`);
              });
              console.log(`   ⚠️  Current product ${foundProduct.id} (Branch ${foundProduct.branch_id}) does NOT have size_stocks, but other products with the same name do.`);
            } else {
              console.log(`   ❌ None of the ${allProductsWithName.length} products with name "${productName}" have size_stocks populated.`);
            }
          }
          console.log('');
        }
        
        // Parse size_stocks if it's a string
        if (typeof sizeStocks === 'string') {
          try {
            sizeStocks = JSON.parse(sizeStocks);
            console.log(`🔍 [DEBUG] Parsed size_stocks:`, sizeStocks);
          } catch (e) {
            const error = `❌ Error parsing size_stocks for product ${foundProduct.id}: ${e.message}`;
            console.error(error);
            results.push({ item: productName, success: false, error });
            continue;
          }
        }

        // Improved validation: check for null explicitly, and ensure it's an object (not array)
        if (sizeStocks === null || sizeStocks === undefined || typeof sizeStocks !== 'object' || Array.isArray(sizeStocks)) {
          const error = `❌ Invalid size_stocks for trophy product ${foundProduct.id}. Value: ${JSON.stringify(sizeStocks)}, Type: ${typeof sizeStocks}, IsNull: ${sizeStocks === null}, IsArray: ${Array.isArray(sizeStocks)}`;
          console.error(error);
          console.error(`\n💡 EXPLANATION: The product record in the database has size_stocks set to NULL.`);
          console.error(`   This means the product was created without initializing size_stocks, or it was never set.`);
          console.error(`   To fix this, you need to update the product in the database to have size_stocks initialized.`);
          console.error(`   Example: UPDATE products SET size_stocks = '{"12": 0, "14": 0, "16": 0, "18": 0}'::jsonb WHERE id = '${foundProduct.id}';`);
          console.error(`   Or update it through the admin panel/product management interface.\n`);
          results.push({ item: productName, success: false, error });
          continue;
        }

        // Get the size from trophy details
        const trophySize = item.trophyDetails?.size || item.trophyDetails?.trophySize || item.size;
        if (!trophySize) {
          const error = `⚠️ Trophy size not specified for product ${productName}`;
          console.warn(error);
          results.push({ item: productName, success: false, error });
          continue;
        }

        console.log(`📏 Deducting stock for trophy size: ${trophySize} (type: ${typeof trophySize})`);
        console.log(`🔍 [DEBUG] Available size_stocks keys:`, Object.keys(sizeStocks));

        // JSONB keys are always strings, so convert trophySize to string for lookup
        // Also try the original value in case it's already a string
        const sizeKey = String(trophySize);
        const currentStock = sizeStocks[sizeKey] ?? sizeStocks[trophySize] ?? 0;
        
        console.log(`🔍 [DEBUG] Looking up size "${sizeKey}" in size_stocks, found:`, currentStock);
        if (currentStock < quantity) {
          console.warn(`⚠️ Insufficient stock for ${productName} size ${trophySize} at branch ${itemBranchId}. Available: ${currentStock}, Required: ${quantity}`);
        }

        const newStock = Math.max(0, currentStock - quantity);
        // Use string key to match JSONB format
        sizeStocks[sizeKey] = newStock;
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            size_stocks: sizeStocks,
            updated_at: new Date().toISOString()
          })
          .eq('id', foundProduct.id);
        
        if (updateError) {
          const error = `❌ Error updating stock for trophy product ${foundProduct.id}: ${updateError.message}`;
          console.error(error);
          results.push({ item: productName, success: false, error, branchId: itemBranchId, size: trophySize, currentStock, newStock });
        } else {
          console.log(`✅ Deducted ${quantity} from ${productName} (${trophySize}) at branch ${itemBranchId}. Stock: ${currentStock} → ${newStock}`);
          results.push({ item: productName, success: true, branchId: itemBranchId, size: trophySize, currentStock, newStock, quantity });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error in deductStockFromOrder:', error);
    throw error;
  }
}

// Function to get stock before deduction
async function getStockBefore(orderItems) {
  const stockBefore = [];
  
  for (const item of orderItems) {
    const category = item.category?.toLowerCase();
    if (category !== 'trophies' && category !== 'balls') {
      continue;
    }

    const itemBranchId = item.branchId || item.branch_id;
    if (!itemBranchId) {
      console.log(`   ⚠️ No branchId for ${item.name}, skipping stock check`);
      continue;
    }

    console.log(`   🔍 Looking for: ${item.name} (${item.category}) in branch ${itemBranchId}`);

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity, size_stocks, branch_id, category')
      .eq('name', item.name)
      .eq('category', item.category)
      .eq('branch_id', itemBranchId);
    
    const product = products && products.length > 0 ? products[0] : null;

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    if (!product) {
      // Try to find product without branch filter to see if it exists
      const { data: anyProduct } = await supabase
        .from('products')
        .select('id, name, branch_id, category')
        .eq('name', item.name)
        .eq('category', item.category)
        .limit(5);
      
      if (anyProduct && anyProduct.length > 0) {
        console.log(`   ⚠️ Product exists but not in branch ${itemBranchId}. Found in branches: ${anyProduct.map(p => p.branch_id).join(', ')}`);
      } else {
        console.log(`   ❌ Product not found at all: ${item.name} (${item.category})`);
      }
      continue;
    }

    console.log(`   ✅ Found product: ${product.id} in branch ${product.branch_id}`);

    if (category === 'balls') {
      stockBefore.push({
        product: item.name,
        branchId: itemBranchId,
        stock: product.stock_quantity || 0,
        type: 'ball',
        productId: product.id
      });
    } else if (category === 'trophies') {
      const trophySize = item.trophyDetails?.size || item.trophyDetails?.trophySize || item.size;
      let sizeStocks = product.size_stocks;
      if (typeof sizeStocks === 'string') {
      try {
        sizeStocks = JSON.parse(sizeStocks);
      } catch (e) {
        sizeStocks = {};
      }
    }
      stockBefore.push({
        product: item.name,
        branchId: itemBranchId,
        size: trophySize,
        stock: sizeStocks && typeof sizeStocks === 'object' ? (sizeStocks[trophySize] || 0) : 0,
        type: 'trophy',
        productId: product.id
      });
    }
  }

  return stockBefore;
}

// Function to get stock after deduction
async function getStockAfter(orderItems) {
  return getStockBefore(orderItems);
}

// Function to find products with actual stock
async function findProductsWithStock() {
  console.log('🔍 Finding products with actual stock...\n');
  
  // Find balls with stock
  const { data: balls, error: ballsError } = await supabase
    .from('products')
    .select('id, name, category, stock_quantity, branch_id')
    .eq('category', 'Balls')
    .gt('stock_quantity', 0)
    .limit(10);

  if (ballsError) {
    console.error('❌ Error fetching balls:', ballsError.message);
  }

  // Find trophies with stock
  const { data: trophies, error: trophiesError } = await supabase
    .from('products')
    .select('id, name, category, size_stocks, branch_id')
    .eq('category', 'Trophies')
    .limit(50);

  if (trophiesError) {
    console.error('❌ Error fetching trophies:', trophiesError.message);
  }

  const trophiesWithStock = [];
  if (trophies) {
    for (const trophy of trophies) {
      let sizeStocks = trophy.size_stocks;
      if (typeof sizeStocks === 'string') {
        try {
          sizeStocks = JSON.parse(sizeStocks);
        } catch (e) {
          continue;
        }
      }
      if (sizeStocks && typeof sizeStocks === 'object') {
        for (const [size, stock] of Object.entries(sizeStocks)) {
          if (parseInt(stock) > 0) {
            trophiesWithStock.push({
              ...trophy,
              size,
              stock: parseInt(stock)
            });
            break; // Just need one size with stock
          }
        }
      }
    }
  }

  return {
    balls: balls || [],
    trophies: trophiesWithStock
  };
}

async function testStockDeduction() {
  console.log('🧪 Testing Stock Deduction\n');
  console.log('=' .repeat(60));

  const args = process.argv.slice(2);
  const orderId = args.find(arg => arg.startsWith('--order-id='))?.split('=')[1];
  const orderNumber = args.find(arg => arg.startsWith('--order-number='))?.split('=')[1];
  const productId = args.find(arg => arg.startsWith('--product-id='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  const findStock = args.includes('--find-stock');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // If --product-id flag, fetch that specific product and test it
    if (productId) {
      console.log(`📋 Fetching product with ID: ${productId}`);
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error(`❌ Error fetching product: ${productError?.message || 'Product not found'}`);
        return;
      }

      console.log(`✅ Found product: ${product.name} (${product.category})`);
      console.log(`   Branch ID: ${product.branch_id}`);
      console.log(`   Size stocks: ${product.size_stocks ? JSON.stringify(product.size_stocks) : 'NULL'}`);

      // Determine the size to use for testing
      let testSize = null;
      if (product.category?.toLowerCase() === 'trophies' && product.size_stocks) {
        let sizeStocks = product.size_stocks;
        if (typeof sizeStocks === 'string') {
          try {
            sizeStocks = JSON.parse(sizeStocks);
          } catch (e) {
            console.error('❌ Error parsing size_stocks:', e.message);
          }
        }
        if (sizeStocks && typeof sizeStocks === 'object') {
          // Use the first size that has stock > 0, or just the first size
          const sizes = Object.keys(sizeStocks);
          testSize = sizes.find(s => parseInt(sizeStocks[s]) > 0) || sizes[0];
          if (testSize) {
            console.log(`   Using size: ${testSize} (stock: ${sizeStocks[testSize]})`);
          }
        }
      }

      // Create test item
      const testItem = {
        name: product.name,
        category: product.category,
        quantity: 1,
        branchId: product.branch_id,
        branch_id: product.branch_id,
        ...(testSize && {
          trophyDetails: { size: testSize },
          size: testSize
        })
      };

      console.log(`\n🔍 Checking stock BEFORE deduction...`);
      const stockBefore = await getStockBefore([testItem]);
      
      console.log('\n📊 Stock Before:');
      stockBefore.forEach(s => {
        if (s.type === 'ball') {
          console.log(`   ${s.product} (Branch ${s.branchId}): ${s.stock} units`);
        } else {
          console.log(`   ${s.product} - ${s.size} (Branch ${s.branchId}): ${s.stock} units`);
        }
      });

      if (dryRun) {
        console.log('\n🔍 DRY RUN - Would deduct stock but not making changes');
        const stockInfo = stockBefore[0];
        if (stockInfo) {
          const newStock = Math.max(0, stockInfo.stock - 1);
          console.log(`\n📊 Expected Stock After:`);
          if (stockInfo.type === 'ball') {
            console.log(`   ${testItem.name} (Branch ${stockInfo.branchId}): ${stockInfo.stock} → ${newStock} (deduct 1)`);
          } else {
            console.log(`   ${testItem.name} - ${stockInfo.size} (Branch ${stockInfo.branchId}): ${stockInfo.stock} → ${newStock} (deduct 1)`);
          }
        }
        return;
      }

      console.log('\n🔄 Running stock deduction...');
      const results = await deductStockFromOrder([testItem], null);

      console.log('\n📊 Deduction Results:');
      results.forEach((result, idx) => {
        if (result.success) {
          console.log(`   ✅ ${result.item}: Successfully deducted ${result.quantity} from branch ${result.branchId}`);
          if (result.size) {
            console.log(`      Size: ${result.size}, Stock: ${result.currentStock} → ${result.newStock}`);
          } else {
            console.log(`      Stock: ${result.currentStock} → ${result.newStock}`);
          }
        } else {
          console.log(`   ❌ ${result.item}: ${result.error}`);
        }
      });

      console.log('\n🔍 Checking stock AFTER deduction...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const stockAfter = await getStockAfter([testItem]);

      console.log('\n📊 Stock After:');
      stockAfter.forEach(s => {
        if (s.type === 'ball') {
          console.log(`   ${s.product} (Branch ${s.branchId}): ${s.stock} units`);
        } else {
          console.log(`   ${s.product} - ${s.size} (Branch ${s.branchId}): ${s.stock} units`);
        }
      });

      // Compare before and after
      console.log('\n📈 Stock Changes:');
      if (stockBefore.length > 0 && stockAfter.length > 0) {
        const before = stockBefore[0];
        const after = stockAfter[0];
        const change = after.stock - before.stock;
        const expectedChange = -1;

        if (change === expectedChange) {
          console.log(`   ✅ ${before.product}${before.size ? ` (${before.size})` : ''}: ${before.stock} → ${after.stock} (deducted ${Math.abs(change)})`);
          console.log('\n' + '='.repeat(60));
          console.log('✅ TEST PASSED: Stock deduction is working correctly!');
          console.log('='.repeat(60));
        } else {
          console.log(`   ❌ ${before.product}${before.size ? ` (${before.size})` : ''}: ${before.stock} → ${after.stock} (expected ${before.stock + expectedChange}, change: ${change})`);
          console.log('\n' + '='.repeat(60));
          console.log('❌ TEST FAILED: Stock deduction did not work as expected');
          console.log('='.repeat(60));
        }
      }
      return;
    }
    // If --find-stock flag, find products with stock and create test
    if (findStock) {
      const productsWithStock = await findProductsWithStock();
      
      console.log('\n📊 Products with Stock Found:');
      console.log(`\n🏀 Balls with stock: ${productsWithStock.balls.length}`);
      productsWithStock.balls.forEach(ball => {
        console.log(`   - ${ball.name} (Branch ${ball.branch_id}): ${ball.stock_quantity} units`);
      });

      console.log(`\n🏆 Trophies with stock: ${productsWithStock.trophies.length}`);
      productsWithStock.trophies.forEach(trophy => {
        console.log(`   - ${trophy.name} - ${trophy.size} (Branch ${trophy.branch_id}): ${trophy.stock} units`);
      });

      if (productsWithStock.balls.length === 0 && productsWithStock.trophies.length === 0) {
        console.log('\n❌ No products with stock found. Cannot test deduction.');
        return;
      }

      // Create a test order item with a product that has stock
      let testItem = null;
      if (productsWithStock.balls.length > 0) {
        const ball = productsWithStock.balls[0];
        testItem = {
          name: ball.name,
          category: ball.category,
          quantity: 1,
          branchId: ball.branch_id,
          branch_id: ball.branch_id
        };
        console.log(`\n🧪 Creating test with: ${ball.name} (Branch ${ball.branch_id}, Stock: ${ball.stock_quantity})`);
      } else if (productsWithStock.trophies.length > 0) {
        const trophy = productsWithStock.trophies[0];
        testItem = {
          name: trophy.name,
          category: trophy.category,
          quantity: 1,
          branchId: trophy.branch_id,
          branch_id: trophy.branch_id,
          trophyDetails: { size: trophy.size },
          size: trophy.size
        };
        console.log(`\n🧪 Creating test with: ${trophy.name} - ${trophy.size} (Branch ${trophy.branch_id}, Stock: ${trophy.stock})`);
      }

      if (testItem) {
        console.log('\n🔍 Checking stock BEFORE deduction...');
        const stockBefore = await getStockBefore([testItem]);
        
        console.log('\n📊 Stock Before:');
        stockBefore.forEach(s => {
          if (s.type === 'ball') {
            console.log(`   ${s.product} (Branch ${s.branchId}): ${s.stock} units`);
          } else {
            console.log(`   ${s.product} - ${s.size} (Branch ${s.branchId}): ${s.stock} units`);
          }
        });

        if (dryRun) {
          console.log('\n🔍 DRY RUN - Would deduct stock but not making changes');
          const stockInfo = stockBefore[0];
          if (stockInfo) {
            const newStock = Math.max(0, stockInfo.stock - 1);
            console.log(`\n📊 Expected Stock After:`);
            if (stockInfo.type === 'ball') {
              console.log(`   ${testItem.name} (Branch ${stockInfo.branchId}): ${stockInfo.stock} → ${newStock} (deduct 1)`);
            } else {
              console.log(`   ${testItem.name} - ${stockInfo.size} (Branch ${stockInfo.branchId}): ${stockInfo.stock} → ${newStock} (deduct 1)`);
            }
          }
          return;
        }

        console.log('\n🔄 Running stock deduction...');
        const results = await deductStockFromOrder([testItem], null);

        console.log('\n📊 Deduction Results:');
        results.forEach((result, idx) => {
          if (result.success) {
            console.log(`   ✅ ${result.item}: Successfully deducted ${result.quantity} from branch ${result.branchId}`);
            if (result.size) {
              console.log(`      Size: ${result.size}, Stock: ${result.currentStock} → ${result.newStock}`);
            } else {
              console.log(`      Stock: ${result.currentStock} → ${result.newStock}`);
            }
          } else {
            console.log(`   ❌ ${result.item}: ${result.error}`);
          }
        });

        console.log('\n🔍 Checking stock AFTER deduction...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const stockAfter = await getStockAfter([testItem]);

        console.log('\n📊 Stock After:');
        stockAfter.forEach(s => {
          if (s.type === 'ball') {
            console.log(`   ${s.product} (Branch ${s.branchId}): ${s.stock} units`);
          } else {
            console.log(`   ${s.product} - ${s.size} (Branch ${s.branchId}): ${s.stock} units`);
          }
        });

        // Compare before and after
        console.log('\n📈 Stock Changes:');
        if (stockBefore.length > 0 && stockAfter.length > 0) {
          const before = stockBefore[0];
          const after = stockAfter[0];
          const change = after.stock - before.stock;
          const expectedChange = -1;

          if (change === expectedChange) {
            console.log(`   ✅ ${before.product}${before.size ? ` (${before.size})` : ''}: ${before.stock} → ${after.stock} (deducted ${Math.abs(change)})`);
            console.log('\n' + '='.repeat(60));
            console.log('✅ TEST PASSED: Stock deduction is working correctly!');
            console.log('='.repeat(60));
          } else {
            console.log(`   ❌ ${before.product}${before.size ? ` (${before.size})` : ''}: ${before.stock} → ${after.stock} (expected ${before.stock + expectedChange}, change: ${change})`);
            console.log('\n' + '='.repeat(60));
            console.log('❌ TEST FAILED: Stock deduction did not work as expected');
            console.log('='.repeat(60));
          }
        }
      }
      return;
    }

    // Find an order to test
    let order = null;

    if (orderId) {
      console.log(`📋 Looking for order with ID: ${orderId}`);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('❌ Error fetching order:', error.message);
        return;
      }
      order = data;
    } else if (orderNumber) {
      console.log(`📋 Looking for order with number: ${orderNumber}`);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single();

      if (error) {
        console.error('❌ Error fetching order:', error.message);
        return;
      }
      order = data;
    } else {
      console.log('📋 Looking for recent order with balls or trophies...');
      // Find recent orders with balls or trophies
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching orders:', error.message);
        return;
      }

      // Find first order with balls or trophies
      for (const o of orders) {
        const orderItems = Array.isArray(o.order_items) ? o.order_items : [];
        const hasBallsOrTrophies = orderItems.some(item => {
          const cat = item.category?.toLowerCase();
          return cat === 'balls' || cat === 'trophies';
        });

        if (hasBallsOrTrophies) {
          order = o;
          break;
        }
      }
    }

    if (!order) {
      console.error('❌ No order found with balls or trophies');
      console.log('\n💡 Try specifying an order:');
      console.log('   node server/scripts/test-stock-deduction.js --order-number=ORD-1234567890');
      return;
    }

    console.log(`\n✅ Found order: ${order.order_number}`);
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Created: ${order.created_at}`);
    console.log(`   Items: ${order.total_items || 0}`);

    const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
    console.log(`\n📦 Order Items:`);
    orderItems.forEach((item, idx) => {
      const cat = item.category?.toLowerCase();
      const branchId = item.branchId || item.branch_id;
      console.log(`   ${idx + 1}. ${item.name} (${item.category})`);
      console.log(`      Quantity: ${item.quantity || 1}`);
      console.log(`      Branch ID: ${branchId || '❌ MISSING'}`);
      if (cat === 'trophies') {
        const size = item.trophyDetails?.size || item.trophyDetails?.trophySize || item.size;
        console.log(`      Size: ${size || '❌ MISSING'}`);
      }
    });

    // Filter to only balls and trophies
    const itemsToTest = orderItems.filter(item => {
      const cat = item.category?.toLowerCase();
      return cat === 'balls' || cat === 'trophies';
    });

    if (itemsToTest.length === 0) {
      console.log('\n⚠️ No balls or trophies in this order to test');
      return;
    }

    console.log(`\n🔍 Checking stock BEFORE deduction...`);
    const stockBefore = await getStockBefore(itemsToTest);
    
    console.log('\n📊 Stock Before:');
    stockBefore.forEach(s => {
      if (s.type === 'ball') {
        console.log(`   ${s.product} (Branch ${s.branchId}): ${s.stock} units`);
      } else {
        console.log(`   ${s.product} - ${s.size} (Branch ${s.branchId}): ${s.stock} units`);
      }
    });

    // Check for missing branchIds
    const missingBranchIds = itemsToTest.filter(item => !(item.branchId || item.branch_id));
    if (missingBranchIds.length > 0) {
      console.log('\n⚠️ WARNING: Some items are missing branchId:');
      missingBranchIds.forEach(item => {
        console.log(`   - ${item.name} (${item.category})`);
      });
      console.log('\n💡 Items need branchId set from product modal to deduct stock');
    }

    if (dryRun) {
      console.log('\n🔍 DRY RUN - Would deduct stock but not making changes');
      console.log('\n📊 Expected Stock After:');
      itemsToTest.forEach(item => {
        const stockInfo = stockBefore.find(s => s.product === item.name && s.branchId === (item.branchId || item.branch_id));
        if (stockInfo) {
          const quantity = parseInt(item.quantity) || 1;
          const newStock = Math.max(0, (stockInfo.stock || 0) - quantity);
          if (stockInfo.type === 'ball') {
            console.log(`   ${item.name} (Branch ${stockInfo.branchId}): ${stockInfo.stock} → ${newStock} (deduct ${quantity})`);
          } else {
            console.log(`   ${item.name} - ${stockInfo.size} (Branch ${stockInfo.branchId}): ${stockInfo.stock} → ${newStock} (deduct ${quantity})`);
          }
        }
      });
      return;
    }

    console.log('\n🔄 Running stock deduction...');
    const pickupBranchId = order.pickup_branch_id || null;
    const results = await deductStockFromOrder(itemsToTest, pickupBranchId);

    console.log('\n📊 Deduction Results:');
    results.forEach((result, idx) => {
      if (result.success) {
        console.log(`   ✅ ${result.item}: Successfully deducted ${result.quantity} from branch ${result.branchId}`);
        if (result.size) {
          console.log(`      Size: ${result.size}, Stock: ${result.currentStock} → ${result.newStock}`);
        } else {
          console.log(`      Stock: ${result.currentStock} → ${result.newStock}`);
        }
      } else {
        console.log(`   ❌ ${result.item}: ${result.error}`);
      }
    });

    console.log('\n🔍 Checking stock AFTER deduction...');
    // Wait a bit for database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    const stockAfter = await getStockAfter(itemsToTest);

    console.log('\n📊 Stock After:');
    stockAfter.forEach(s => {
      if (s.type === 'ball') {
        console.log(`   ${s.product} (Branch ${s.branchId}): ${s.stock} units`);
      } else {
        console.log(`   ${s.product} - ${s.size} (Branch ${s.branchId}): ${s.stock} units`);
      }
    });

    // Compare before and after
    console.log('\n📈 Stock Changes:');
    let allSuccess = true;
    stockBefore.forEach(before => {
      const after = stockAfter.find(a => 
        a.product === before.product && 
        a.branchId === before.branchId &&
        (before.type === 'ball' || a.size === before.size)
      );

      if (after) {
        const change = after.stock - before.stock;
        const item = itemsToTest.find(i => 
          i.name === before.product && 
          (i.branchId || i.branch_id) === before.branchId
        );
        const expectedDeduction = item ? -(parseInt(item.quantity) || 1) : 0;

        if (change === expectedDeduction) {
          console.log(`   ✅ ${before.product}${before.size ? ` (${before.size})` : ''}: ${before.stock} → ${after.stock} (deducted ${Math.abs(change)})`);
        } else {
          console.log(`   ❌ ${before.product}${before.size ? ` (${before.size})` : ''}: ${before.stock} → ${after.stock} (expected ${before.stock + expectedDeduction}, change: ${change})`);
          allSuccess = false;
        }
      } else {
        console.log(`   ⚠️ ${before.product}${before.size ? ` (${before.size})` : ''}: Could not find stock after deduction`);
        allSuccess = false;
      }
    });

    console.log('\n' + '='.repeat(60));
    if (allSuccess) {
      console.log('✅ TEST PASSED: Stock deduction is working correctly!');
    } else {
      console.log('❌ TEST FAILED: Stock deduction did not work as expected');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testStockDeduction()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testStockDeduction, deductStockFromOrder };

