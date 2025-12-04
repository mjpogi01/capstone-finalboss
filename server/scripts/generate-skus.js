const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SKU Prefixes by Category
const CATEGORY_PREFIXES = {
  // On-stock / inventory products (with size variations in SKU)
  trophies: 'TRP',
  balls: 'BAL',
  medals: 'MED',

  // Apparel / pre-order products (one SKU per product, no size variation)
  jerseys: 'JRS',
  uniforms: 'UNF',
  't-shirts': 'TSH',
  'long sleeves': 'LGS',
  hoodies: 'HOD',
  jackets: 'JKT',
  accessories: 'ACC',
  hats: 'HAT'
};

// Check if category is on-stock (trophies, balls, medals)
// On-stock products: SKU includes size (different SKU per size)
// Apparel products: SKU does NOT include size (one SKU per product)
function isOnStockCategory(category) {
  if (!category || typeof category !== 'string') {
    return false;
  }
  const normalized = category.toLowerCase().trim();
  return normalized === 'trophies' || normalized === 'balls' || normalized === 'medals';
}

// Generate a category prefix (default to first 3 uppercase letters)
function getCategoryPrefix(category) {
  if (!category || typeof category !== 'string') {
    return 'PRD';
  }
  const normalized = category.toLowerCase().trim();
  return CATEGORY_PREFIXES[normalized] || normalized.slice(0, 3).toUpperCase().padEnd(3, 'X');
}

// Generate a product identifier (4 characters, alphanumeric, uppercase)
// Based on product name + category (NOT branch_id or product.id) to ensure same SKU across branches
// IMPORTANT: Same product in different branches MUST have the same SKU
function generateProductId(product) {
  // Generate hash from product name and category only
  // NOT using product.id (branch-specific UUID) or branch_id to ensure consistency
  const category = (product?.category || 'PRD').toUpperCase().trim();
  const productName = (product?.name || '').trim();
  
  // Create a hash from category and product name (same product = same hash = same SKU across all branches)
  let hash = 0;
  const str = category + productName;
  
  // Use a consistent hashing algorithm
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to alphanumeric (use base 36, then take last 4 chars)
  const hashStr = Math.abs(hash).toString(36).toUpperCase().slice(-4).padStart(4, '0');
  return hashStr;
}

// Generate size suffix for SKU (3 characters, zero-padded for numeric sizes)
function generateSizeSuffix(size) {
  if (!size || size === '' || size === 'N/A') {
    return '000';
  }
  
  // Remove special characters and spaces, keep alphanumeric
  const cleanSize = String(size).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Check if size is purely numeric
  const isNumeric = /^\d+$/.test(cleanSize);
  
  if (isNumeric) {
    // For numeric sizes, pad with leading zeros to 3 digits (e.g., 8 → 008, 10 → 010, 18 → 018)
    const numSize = parseInt(cleanSize, 10);
    return String(numSize).padStart(3, '0');
  } else {
    // For non-numeric sizes (S, SMALL, M, MEDIUM, XL, 3XL, 4XL, etc.)
    // Use first 3 alphanumeric characters, pad with zeros if needed
    if (cleanSize.length >= 3) {
      // Take first 3 characters (e.g., "SMALL" → "SMA", "MEDIUM" → "MED", "3XL" → "3XL")
      return cleanSize.slice(0, 3);
    } else {
      // Pad short sizes with zeros (e.g., "S" → "S00", "M" → "M00", "XL" → "XL0")
      return cleanSize.padEnd(3, '0');
    }
  }
}

// Generate SKU for a product (format: XXX-XXXX-XXX with dashes, all uppercase)
function generateSKU(product, size = null) {
  const categoryPrefix = getCategoryPrefix(product.category).toUpperCase(); // 3 chars
  const productId = generateProductId(product).toUpperCase(); // 4 chars
  
  // On-stock products (trophies, balls, medals): Include size in SKU
  // Apparel products: Do NOT include size in SKU (one SKU per product)
  if (isOnStockCategory(product.category)) {
    // Include size for on-stock products: prefix(3) + ID(4) + size(3) = 10 chars
    const sizeSuffix = size ? generateSizeSuffix(size).toUpperCase() : '000';
    return `${categoryPrefix}-${productId}-${sizeSuffix}`.toUpperCase();
  } else {
    // Apparel products: prefix(3) + ID(4) + padding(3) = 10 chars
    return `${categoryPrefix}-${productId}-000`.toUpperCase();
  }
}

// Check if SKU already exists
async function skuExists(sku, excludeProductId = null) {
  let query = supabase
    .from('products')
    .select('id')
    .eq('sku', sku);
  
  if (excludeProductId) {
    query = query.neq('id', excludeProductId);
  }
  
  const { data, error } = await query.limit(1);
  
  if (error) {
    console.error('Error checking SKU existence:', error);
    return false;
  }
  
  return data && data.length > 0;
}

// Generate unique SKU (with collision handling) - format: XXX-XXXX-XXX
async function generateUniqueSKU(product, size = null, attempt = 1) {
  const baseSKU = generateSKU(product, size);
  
  // If SKU already exists, modify the last part
  let sku = baseSKU;
  const excludeProductId = product && product.id ? product.id : null;
  
  while (await skuExists(sku, excludeProductId) && attempt < 100) {
    // Modify the product ID part for collision handling
    const parts = baseSKU.split('-');
    if (parts.length === 3) {
      // Format: XXX-XXXX-XXX
      const counter = String(attempt).padStart(2, '0').slice(-2);
      // Modify middle part (product ID)
      const modifiedId = (parts[1].slice(0, 2) + counter).toUpperCase();
      sku = `${parts[0]}-${modifiedId}-${parts[2]}`.toUpperCase();
    } else {
      // Fallback if format is wrong
      const counter = String(attempt).padStart(3, '0').slice(-3);
      sku = `${baseSKU}-${counter}`.toUpperCase();
    }
    attempt++;
  }
  
  if (attempt >= 100) {
    console.warn(`⚠️ Could not generate unique SKU for product ${product?.id || 'new'} after 100 attempts`);
    // Fallback: use timestamp
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
    const parts = baseSKU.split('-');
    if (parts.length === 3) {
      const modifiedId = (parts[1].slice(0, 1) + timestamp).toUpperCase();
      sku = `${parts[0]}-${modifiedId}-${parts[2]}`.toUpperCase();
    } else {
      sku = `${baseSKU}-${timestamp}`.toUpperCase();
    }
  }
  
  // Ensure all uppercase and return
  return sku.toUpperCase();
}

// Main function to backfill SKUs
async function backfillSKUs() {
  console.log('🔄 Starting SKU backfill process...\n');
  
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
    
    // Process products in batches
    for (const product of products) {
      try {
        // Skip if SKU already exists
        if (product.sku && product.sku.trim() !== '') {
          console.log(`⏭️  Skipping ${product.name} (${product.category}) - SKU already exists: ${product.sku}`);
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
        
        const sku = await generateUniqueSKU(product, sizeForSKU);
        
        if (!sku) {
          console.log(`⏭️  Skipping ${product.name} (${product.category}) - SKU generation returned null`);
          skippedCount += 1;
          continue;
        }
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ sku })
          .eq('id', product.id);
        
        if (updateError) {
          throw updateError;
        }
        
        const sizeInfo = isOnStock && sizeForSKU ? ` (size: ${sizeForSKU})` : '';
        console.log(`✅ Updated ${product.name} (${product.category}) - SKU: ${sku}${sizeInfo}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error processing product ${product.id} (${product.name}):`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SKU Backfill Summary:');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📦 Total: ${products.length}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Fatal error during SKU backfill:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  backfillSKUs()
    .then(() => {
      console.log('\n✅ SKU backfill completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ SKU backfill failed:', error);
      process.exit(1);
    });
}

module.exports = {
  generateSKU,
  generateUniqueSKU,
  backfillSKUs,
  getCategoryPrefix,
  isOnStockCategory
};

