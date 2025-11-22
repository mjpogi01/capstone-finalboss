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
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Error querying orders:', error.message);
    process.exit(1);
  }

  const earliest = data && data[0] ? data[0].created_at : null;
  console.log(`Earliest order created_at: ${earliest || 'none found'}`);
}

run();

