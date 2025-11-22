require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const { rows } = await pool.query("select email, raw_user_meta_data from auth.users where email like 'artist%' order by email");
    console.log(rows);
  } catch (error) {
    console.error('query failed', error);
  } finally {
    await pool.end();
  }
})();
