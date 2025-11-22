const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const start = '2022-01-01T00:00:00.000Z';
  const end = '2022-10-01T00:00:00.000Z';

  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end);

  if (error) {
    console.error('Error querying orders:', error.message);
    process.exit(1);
  }

  console.log(`Orders between Jan 2022 and Sep 2022: ${count}`);
}

run();


