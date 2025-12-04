const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { generateUniqueSKU, isOnStockCategory } = require('./generate-skus');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Regenerate all SKUs to match new format (10 characters, no product name)
async function regenerateAllSKUs(forceUpdate = false) {
  console.log('🔄 Starting SKU regeneration process...\n');
  console.log(`Mode: ${forceUpdate ? 'FORCE UPDATE (all SKUs will be regenerated)' : 'UPDATE MISSING ONLY (only products without SKUs)'}\n`);
  
  try {
    // Fetch all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }
    
    if (!products || products.length === 0) {
      console.log('ℹ️  No products found to process.');
      return;
    }
    
    console.log(`📦 Found ${products.length} products to process.\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process products
    for (const product of products) {
      try {
        // Skip if SKU already exists and forceUpdate is false
        if (!forceUpdate && product.sku && product.sku.trim() !== '') {
          console.log(`⏭️  Skipping ${product.name || 'Unknown'} (${product.category}) - SKU already exists: ${product.sku}`);
          skippedCount++;
          continue;
        }
        
        // Determine if this is an on-stock product (needs size in SKU)
        const isOnStock = isOnStockCategory(product.category);
        
        // For on-stock products: Include size in SKU
        // For apparel products: Do NOT include size in SKU (one SKU per product)
        let sizeForSKU = null;
        if (isOnStock) {
          // On-stock products: Parse sizes and use first size for SKU
          let sizes = [];
          if (product.size) {
            try {
              if (typeof product.size === 'string') {
                const parsed = JSON.parse(product.size);
                if (Array.isArray(parsed)) {
                  sizes = parsed;
                }
              } else if (Array.isArray(product.size)) {
                sizes = product.size;
              }
            } catch (e) {
              // Not JSON, treat as single size or empty
            }
          }
          
          // Check size_stocks for trophies
          if (sizes.length === 0 && product.size_stocks) {
            try {
              const sizeStocks = typeof product.size_stocks === 'string' 
                ? JSON.parse(product.size_stocks) 
                : product.size_stocks;
              if (sizeStocks && typeof sizeStocks === 'object' && !Array.isArray(sizeStocks)) {
                sizes = Object.keys(sizeStocks);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          
          if (sizes.length > 0) {
            sizeForSKU = sizes[0];
          }
        }
        // For apparel products: sizeForSKU remains null (no size in SKU)
        
        // Generate new SKU (10 characters, no product name)
        const newSKU = await generateUniqueSKU(product, sizeForSKU);
        
        if (!newSKU) {
          console.log(`⏭️  Skipping ${product.name || 'Unknown'} (${product.category}) - SKU generation returned null`);
          skippedCount++;
          continue;
        }
        
        // Update product with new SKU
        const { error: updateError } = await supabase
          .from('products')
          .update({ sku: newSKU })
          .eq('id', product.id);
        
        if (updateError) {
          throw updateError;
        }
        
        const sizeInfo = isOnStock && sizeForSKU ? ` (size: ${sizeForSKU})` : '';
        const oldSKU = product.sku ? ` [OLD: ${product.sku}]` : '';
        console.log(`✅ Updated ${product.name || 'Unknown'} (${product.category}) - NEW SKU: ${newSKU}${sizeInfo}${oldSKU}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error processing product ${product.id} (${product.name || 'Unknown'}):`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SKU Regeneration Summary:');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📦 Total: ${products.length}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Fatal error during SKU regeneration:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  // Check command line arguments
  const args = process.argv.slice(2);
  const forceUpdate = args.includes('--force') || args.includes('-f');
  
  if (forceUpdate) {
    console.log('⚠️  WARNING: You are about to regenerate ALL SKUs, including existing ones.');
    console.log('⚠️  This will overwrite all current SKUs with the new 10-character format.\n');
  }
  
  regenerateAllSKUs(forceUpdate)
    .then(() => {
      console.log('\n✅ SKU regeneration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ SKU regeneration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  regenerateAllSKUs
};




