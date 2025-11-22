const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xnuzdzjfqhbpcnsetjif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhudXpkempmcWhicGNuc2V0amlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDExNzMsImV4cCI6MjA3NTA3NzE3M30.eE2cv8WArhcgl64P50B870OXMtLRCwXD5PKkiZQVU5s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateBallCategory() {
  console.log('🔄 Updating "Ball" category to "Balls"...\n');

  try {
    // Update products with category "Ball" to "Balls"
    const { data: updatedProducts, error } = await supabase
      .from('products')
      .update({ category: 'Balls' })
      .eq('category', 'Ball')
      .select();

    if (error) {
      console.error('❌ Error updating products:', error);
      return;
    }

    console.log(`✅ Successfully updated ${updatedProducts?.length || 0} products from "Ball" to "Balls"`);
    
    if (updatedProducts && updatedProducts.length > 0) {
      console.log('\nUpdated products:');
      updatedProducts.forEach(product => {
        console.log(`  - ${product.name} (ID: ${product.id})`);
      });
    } else {
      console.log('ℹ️  No products found with category "Ball"');
    }

    // Verify the update
    const { data: ballsProducts, error: verifyError } = await supabase
      .from('products')
      .select('id, name, category')
      .eq('category', 'Balls');

    if (!verifyError && ballsProducts) {
      console.log(`\n✅ Verification: ${ballsProducts.length} product(s) now have category "Balls"`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateBallCategory();

