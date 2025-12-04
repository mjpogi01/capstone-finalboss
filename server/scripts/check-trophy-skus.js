const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTrophySKUs() {
  console.log('Checking Trophy SKUs...\n');
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, sku')
    .eq('category', 'Trophies')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} trophies:\n`);
  data.forEach((p, i) => {
    const skuLength = p.sku ? p.sku.length : 0;
    const status = skuLength === 10 ? '✅' : skuLength === 0 ? '❌ Missing' : '⚠️ Wrong length';
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   SKU: ${p.sku || 'N/A'} (${skuLength} chars) ${status}\n`);
  });
}

checkTrophySKUs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });




