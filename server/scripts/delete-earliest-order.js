const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Error locating earliest order:', error.message);
    process.exit(1);
  }

  if (!data || !data.length) {
    console.log('No orders found.');
    return;
  }

  const earliest = data[0];
  console.log(`Deleting earliest order ${earliest.id} (${earliest.created_at})...`);

  const { error: deleteError } = await supabase
    .from('orders')
    .delete()
    .eq('id', earliest.id);

  if (deleteError) {
    console.error('Failed to delete earliest order:', deleteError.message);
    process.exit(1);
  }

  console.log('Earliest order deleted successfully.');
}

run();


