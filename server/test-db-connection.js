const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const args = new Set(process.argv.slice(2));
const skipDirect = args.has('--pooler-only');
const skipPooler = args.has('--direct-only');

const directUrl =
  (!skipDirect && (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL)) || null;
const poolerUrl =
  (!skipPooler &&
    (process.env.SUPABASE_POOLER_URL ||
      process.env.SUPABASE_DB_POOLER_URL ||
      process.env.DATABASE_POOLER_URL)) ||
  null;

const tests = [
  { label: 'Primary DATABASE_URL', value: directUrl, type: 'direct' },
  { label: 'Supabase Session Pooler URL', value: poolerUrl, type: 'pooler' }
].filter(test => Boolean(test.value));

async function runQuery(client, sql, label) {
  const result = await client.query(sql);
  console.log(`✓ ${label}`);
  return result;
}

async function testConnection({ label, value, type }) {
  console.log(`\n🔍 Testing ${label}`);
  console.log('URL preview:', `${value.substring(0, 50)}...`);

  const pool = new Pool({
    connectionString: value,
    ssl: { rejectUnauthorized: false },
    max: type === 'pooler' ? 1 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true
  });

  const startTime = Date.now();
  let client;

  try {
    client = await pool.connect();
    console.log(`✓ Connected (${((Date.now() - startTime) / 1000).toFixed(2)}s)`);

    await runQuery(
      client,
      'SELECT NOW() as current_time, current_database() as db_name, inet_server_addr() as server_ip',
      'Basic SELECT works'
    );

    await runQuery(
      client,
      "SELECT COUNT(*)::bigint AS total_orders FROM orders WHERE LOWER(status) NOT IN ('cancelled','canceled')",
      '`orders` table accessible'
    );

    console.log('✅ Database connection test passed for this URL!');
    return true;
  } catch (error) {
    console.error('❌ Connection/query failed for this URL');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code || 'N/A');
    const errorMsg = (error.message || String(error) || '').toLowerCase();
    if (errorMsg.includes('tenant') || errorMsg.includes('user not found')) {
      console.error('   Hint: password/user mismatch (check Supabase dashboard > Settings > Database).');
    } else if (errorMsg.includes('timeout')) {
      console.error('   Hint: host not reachable or project asleep (resume project or check firewall).');
    } else if (errorMsg.includes('certificate')) {
      console.error(
        '   Hint: SSL rejection – ensure NODE_TLS_REJECT_UNAUTHORIZED=0 for local dev when using Supabase.'
      );
    }
    return false;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function main() {
  if (tests.length === 0) {
    console.error('❌ No database URLs found in environment variables.');
    console.error(
      '   Set DATABASE_URL for direct connections or SUPABASE_POOLER_URL for session pooler access.'
    );
    process.exit(1);
  }

  let success = false;
  for (const test of tests) {
    // eslint-disable-next-line no-await-in-loop
    const result = await testConnection(test);
    success = success || result;
  }

  if (!success) {
    console.error('\n❌ All database connection attempts failed.');
    process.exit(1);
  }

  console.log('\n🎉 At least one database connection succeeded.');
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error while running test:', err);
  process.exit(1);
});

