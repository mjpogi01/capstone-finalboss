/**
 * Cleanup Duplicate Products Script
 * 
 * This script identifies and removes duplicate products across all branches.
 * Duplicates are defined as products with the same name, category, and branch_id.
 * 
 * The script keeps the "best" duplicate based on:
 * 1. Products with size_stocks populated (for trophies)
 * 2. Oldest created_at date (if no size_stocks preference)
 * 
 * Usage:
 *   node server/scripts/cleanup-duplicate-products.js [options]
 * 
 * Options:
 *   --dry-run    : Show what would be deleted without actually deleting
 *   --branch-id  : Only clean up duplicates for a specific branch (e.g., --branch-id=2)
 */

const { supabase } = require('../lib/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function findDuplicates(branchId = null) {
  console.log('🔍 Finding duplicate products...\n');
  
  let query = supabase
    .from('products')
    .select('id, name, category, branch_id, size_stocks, created_at, updated_at');
  
  if (branchId) {
    query = query.eq('branch_id', parseInt(branchId));
    console.log(`   Filtering by branch_id: ${branchId}`);
  }
  
  const { data: allProducts, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching products:', error);
    throw error;
  }
  
  if (!allProducts || allProducts.length === 0) {
    console.log('   No products found.');
    return [];
  }
  
  console.log(`   Found ${allProducts.length} total products\n`);
  
  // Group by name, category, and branch_id
  const groups = new Map();
  
  for (const product of allProducts) {
    const key = `${product.name.trim().toLowerCase()}|${product.category.trim().toLowerCase()}|${product.branch_id}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(product);
  }
  
  // Find groups with duplicates
  const duplicates = [];
  
  for (const [key, products] of groups.entries()) {
    if (products.length > 1) {
      // Sort to find the "best" one to keep
      products.sort((a, b) => {
        // Prefer products with size_stocks
        const aHasSizeStocks = a.size_stocks !== null && a.size_stocks !== undefined && a.size_stocks !== 'null';
        const bHasSizeStocks = b.size_stocks !== null && b.size_stocks !== undefined && b.size_stocks !== 'null';
        
        if (aHasSizeStocks && !bHasSizeStocks) return -1;
        if (!aHasSizeStocks && bHasSizeStocks) return 1;
        
        // If both have or don't have size_stocks, prefer older (created_at)
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      const toKeep = products[0];
      const toDelete = products.slice(1);
      
      duplicates.push({
        key,
        name: products[0].name,
        category: products[0].category,
        branch_id: products[0].branch_id,
        count: products.length,
        keep: toKeep,
        delete: toDelete
      });
    }
  }
  
  return duplicates;
}

async function cleanupDuplicates(dryRun = false, branchId = null) {
  console.log('🧹 Cleanup Duplicate Products\n');
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    const duplicates = await findDuplicates(branchId);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate products found!');
      return;
    }
    
    console.log(`\n📊 Found ${duplicates.length} groups of duplicate products:\n`);
    
    let totalToDelete = 0;
    let totalToKeep = 0;
    
    // Display summary
    duplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. ${dup.name} (${dup.category}) - Branch ${dup.branch_id}`);
      console.log(`   Total duplicates: ${dup.count}`);
      console.log(`   ✅ KEEP: ${dup.keep.id}`);
      if (dup.keep.size_stocks) {
        console.log(`      Has size_stocks: ✅`);
      }
      console.log(`      Created: ${dup.keep.created_at}`);
      console.log(`   ❌ DELETE: ${dup.delete.length} product(s)`);
      dup.delete.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.id} (created: ${p.created_at})`);
      });
      console.log('');
      
      totalToKeep += 1;
      totalToDelete += dup.delete.length;
    });
    
    console.log('='.repeat(60));
    console.log(`📈 Summary:`);
    console.log(`   Groups with duplicates: ${duplicates.length}`);
    console.log(`   Products to keep: ${totalToKeep}`);
    console.log(`   Products to delete: ${totalToDelete}`);
    console.log('='.repeat(60));
    
    if (dryRun) {
      console.log('\n🔍 DRY RUN - Would delete the products listed above');
      console.log('   Run without --dry-run to actually delete them');
      return;
    }
    
    // Ask for confirmation (in a real script, you might want to add a prompt)
    console.log('\n⚠️  WARNING: This will permanently delete duplicate products!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete duplicates
    console.log('🗑️  Deleting duplicate products...\n');
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const dup of duplicates) {
      for (const productToDelete of dup.delete) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productToDelete.id);
        
        if (error) {
          console.error(`   ❌ Error deleting ${productToDelete.id}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Deleted ${productToDelete.id} (${dup.name})`);
          deletedCount++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Results:');
    console.log(`   ✅ Successfully deleted: ${deletedCount}`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount}`);
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error(error.stack);
    throw error;
  }
}

// Run the cleanup
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const branchId = args.find(arg => arg.startsWith('--branch-id='))?.split('=')[1];
  
  cleanupDuplicates(dryRun, branchId)
    .then(() => {
      console.log('\n✅ Cleanup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupDuplicates, findDuplicates };





