const { createClient } = require('@supabase/supabase-js');
const path = require('path');
// Try multiple possible .env locations
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../.env.local'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../.env.local'),
  '.env',
  '.env.local'
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    require('dotenv').config({ path: envPath });
    if (process.env.SUPABASE_URL) {
      envLoaded = true;
      console.log(`✅ Loaded .env from: ${envPath}`);
      break;
    }
  } catch (e) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.error('❌ Could not find .env file with SUPABASE_URL');
  console.error('   Tried paths:', envPaths);
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearAllStocks() {
  try {
    console.log('🔄 Starting to clear all stock records...\n');

    // First, get count of products with stock
    const { data: productsWithStock, error: countError } = await supabase
      .from('products')
      .select('id, name, category, branch_id, stock_quantity, size_stocks')
      .or('stock_quantity.gt.0,size_stocks.not.is.null');

    if (countError) {
      console.error('❌ Error fetching products:', countError);
      return;
    }

    const totalProducts = productsWithStock?.length || 0;
    console.log(`📦 Found ${totalProducts} products with stock records\n`);

    if (totalProducts === 0) {
      console.log('✅ No products with stock found. Database is already clear.');
      return;
    }

    // Show summary of what will be cleared
    console.log('📊 Summary of products to clear:');
    const byCategory = {};
    productsWithStock.forEach(p => {
      const cat = p.category || 'unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   - ${cat}: ${count} products`);
    });
    console.log('');

    // Clear stock_quantity for all products
    console.log('🔄 Clearing stock_quantity for all products...');
    const { data: stockUpdate, error: stockError } = await supabase
      .from('products')
      .update({ stock_quantity: 0 })
      .neq('stock_quantity', 0)
      .select('id');

    if (stockError) {
      console.error('❌ Error clearing stock_quantity:', stockError);
    } else {
      console.log(`✅ Cleared stock_quantity for ${stockUpdate?.length || 0} products`);
    }

    // Clear size_stocks for all products (set to null)
    console.log('🔄 Clearing size_stocks for all products...');
    const { data: sizeStocksUpdate, error: sizeStocksError } = await supabase
      .from('products')
      .update({ size_stocks: null })
      .not('size_stocks', 'is', null)
      .select('id');

    if (sizeStocksError) {
      console.error('❌ Error clearing size_stocks:', sizeStocksError);
    } else {
      console.log(`✅ Cleared size_stocks for ${sizeStocksUpdate?.length || 0} products`);
    }

    // Verify all stocks are cleared
    console.log('\n🔍 Verifying all stocks are cleared...');
    const { data: remainingProducts, error: verifyError } = await supabase
      .from('products')
      .select('id, name, category, branch_id, stock_quantity, size_stocks')
      .or('stock_quantity.gt.0,size_stocks.not.is.null');

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
    } else {
      const remaining = remainingProducts?.length || 0;
      if (remaining === 0) {
        console.log('✅ All stock records have been successfully cleared!');
      } else {
        console.log(`⚠️  Warning: ${remaining} products still have stock records:`);
        remainingProducts.forEach(p => {
          console.log(`   - ${p.name} (${p.category}) - Branch ${p.branch_id}: stock=${p.stock_quantity}, size_stocks=${p.size_stocks ? 'exists' : 'null'}`);
        });
      }
    }

    console.log('\n✅ Stock clearing process completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
clearAllStocks()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

