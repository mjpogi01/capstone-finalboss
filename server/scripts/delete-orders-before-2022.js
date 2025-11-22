const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const cutoff = '2022-01-01T00:00:00Z';

  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .lt('created_at', cutoff);

  if (error) {
    console.error('Error scanning orders:', error.message);
    process.exit(1);
  }

  if (!data || !data.length) {
    console.log('No orders found before 2022.');
    return;
  }

  console.log(`Deleting ${data.length} orders created before 2022...`);
  const ids = data.map((row) => row.id);
  const { error: deleteError } = await supabase
    .from('orders')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('Failed to delete orders:', deleteError.message);
    process.exit(1);
  }

  console.log('Orders deleted successfully.');
}

run();


