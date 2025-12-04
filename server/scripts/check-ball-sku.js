const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBallSKU() {
  console.log('Checking "ball" product SKU...\n');
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, category')
    .ilike('name', '%ball%')
    .eq('category', 'Balls')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} ball products:\n`);
  data.forEach((p, i) => {
    const hasDashes = p.sku && p.sku.includes('-');
    const isUppercase = p.sku && p.sku === p.sku.toUpperCase();
    const status = hasDashes && isUppercase ? '✅' : '❌';
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   SKU: ${p.sku || 'N/A'}`);
    console.log(`   Has dashes: ${hasDashes}, All uppercase: ${isUppercase} ${status}\n`);
  });
}

checkBallSKU()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });




