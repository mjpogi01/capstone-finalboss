const { supabase } = require('../lib/db');

// Default reorder level values
const DEFAULT_REORDER_LEVELS = {
  low_stock_threshold: 10,
  sufficient_stock_threshold: 30,
  high_stock_threshold: 50,
  overstock_threshold: 100
};

async function setDefaultReorderLevels() {
  console.log('🔄 Setting default reorder level values for existing products...\n');

  try {
    // First, check if the columns exist by trying to fetch products
    const { data: sampleProducts, error: sampleError } = await supabase
      .from('products')
      .select('id, name, low_stock_threshold, sufficient_stock_threshold, high_stock_threshold, overstock_threshold')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error checking products table:', sampleError);
      console.error('⚠️  Make sure the reorder level columns exist in the products table.');
      return;
    }

    // Get all products that need updating (where any of the thresholds are null or missing)
    const { data: productsToUpdate, error: fetchError } = await supabase
      .from('products')
      .select('id, name, low_stock_threshold, sufficient_stock_threshold, high_stock_threshold, overstock_threshold')
      .or('low_stock_threshold.is.null,sufficient_stock_threshold.is.null,high_stock_threshold.is.null,overstock_threshold.is.null');

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError);
      return;
    }

    if (!productsToUpdate || productsToUpdate.length === 0) {
      console.log('✅ All products already have reorder level values set.');
      return;
    }

    console.log(`📦 Found ${productsToUpdate.length} product(s) that need reorder level values.\n`);

    // Update products in batches to avoid overwhelming the database
    const batchSize = 100;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < productsToUpdate.length; i += batchSize) {
      const batch = productsToUpdate.slice(i, i + batchSize);
      
      console.log(`📝 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} products)...`);

      for (const product of batch) {
        // Only update fields that are null or missing
        const updateData = {};
        
        if (product.low_stock_threshold === null || product.low_stock_threshold === undefined) {
          updateData.low_stock_threshold = DEFAULT_REORDER_LEVELS.low_stock_threshold;
        }
        if (product.sufficient_stock_threshold === null || product.sufficient_stock_threshold === undefined) {
          updateData.sufficient_stock_threshold = DEFAULT_REORDER_LEVELS.sufficient_stock_threshold;
        }
        if (product.high_stock_threshold === null || product.high_stock_threshold === undefined) {
          updateData.high_stock_threshold = DEFAULT_REORDER_LEVELS.high_stock_threshold;
        }
        if (product.overstock_threshold === null || product.overstock_threshold === undefined) {
          updateData.overstock_threshold = DEFAULT_REORDER_LEVELS.overstock_threshold;
        }

        // Only update if there are fields to update
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              ...updateData,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`❌ Error updating product ${product.id} (${product.name}):`, updateError);
            errorCount++;
          } else {
            updatedCount++;
            if (updatedCount % 10 === 0) {
              console.log(`  ✅ Updated ${updatedCount} products...`);
            }
          }
        }
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} product(s) with default reorder level values.`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} product(s) had errors during update.`);
    }

    // Verify the update
    console.log('\n🔍 Verifying update...');
    const { data: verifyProducts, error: verifyError } = await supabase
      .from('products')
      .select('id, name, low_stock_threshold, sufficient_stock_threshold, high_stock_threshold, overstock_threshold')
      .or('low_stock_threshold.is.null,sufficient_stock_threshold.is.null,high_stock_threshold.is.null,overstock_threshold.is.null');

    if (!verifyError) {
      if (verifyProducts && verifyProducts.length === 0) {
        console.log('✅ Verification: All products now have reorder level values set.');
      } else {
        console.log(`⚠️  Verification: ${verifyProducts?.length || 0} product(s) still missing reorder level values.`);
      }
    }

    // Show sample of updated products
    const { data: sampleUpdated, error: sampleError2 } = await supabase
      .from('products')
      .select('id, name, low_stock_threshold, sufficient_stock_threshold, high_stock_threshold, overstock_threshold')
      .not('low_stock_threshold', 'is', null)
      .limit(5);

    if (!sampleError2 && sampleUpdated && sampleUpdated.length > 0) {
      console.log('\n📋 Sample of updated products:');
      sampleUpdated.forEach(product => {
        console.log(`  - ${product.name} (ID: ${product.id})`);
        console.log(`    Low: ${product.low_stock_threshold}, Sufficient: ${product.sufficient_stock_threshold}, High: ${product.high_stock_threshold}, Overstock: ${product.overstock_threshold}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setDefaultReorderLevels();

