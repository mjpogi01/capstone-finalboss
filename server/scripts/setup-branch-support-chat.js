const fs = require('fs');
const path = require('path');
const { query } = require('../lib/db');

async function run() {
  const sqlPath = path.join(__dirname, 'create-branch-support-chat.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  // Execute statements sequentially to avoid transaction issues
  for (const statement of statements) {
    // eslint-disable-next-line no-console
    console.log('Executing SQL statement:', statement.substring(0, 80), '...');
    await query(statement);
  }

  // eslint-disable-next-line no-console
  console.log('✅ Branch support chat tables ensured.');
}

if (require.main === module) {
  run().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to set up branch support chat schema:', error.message);
    process.exit(1);
  });
}

module.exports = { run };


