const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const { rows: beforeRows } = await pool.query(
      "SELECT id, name FROM branches WHERE LOWER(name) LIKE 'batangas city%';"
    );
    console.log('Branches matching "Batangas City" before delete:');
    console.table(beforeRows);

    const { rowCount } = await pool.query(
      "DELETE FROM branches WHERE LOWER(name) = 'batangas city';"
    );
    console.log(`Deleted rows: ${rowCount}`);

    const { rows: afterRows } = await pool.query(
      "SELECT id, name FROM branches WHERE LOWER(name) LIKE 'batangas city%';"
    );
    console.log('Branches matching "Batangas City" after delete:');
    console.table(afterRows);
  } catch (error) {
    console.error('Error removing duplicate branch:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
