const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function createWishlistTable() {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Missing SUPABASE_DB_URL (or DATABASE_URL) in server/.env');
    console.error('   Please add your Supabase connection string and re-run:');
    console.error('   SUPABASE_DB_URL=postgresql://postgres:password@host:6543/postgres');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  let client;
  try {
    client = await pool.connect();
    console.log('Creating user_wishlist table and policies...');

    // Ensure pgcrypto for gen_random_uuid()
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_wishlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, product_id)
      );
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_id ON public.user_wishlist(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_wishlist_product_id ON public.user_wishlist(product_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_wishlist_created_at ON public.user_wishlist(created_at);`);

    // Trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION public.update_wishlist_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_user_wishlist_updated_at ON public.user_wishlist;
      CREATE TRIGGER update_user_wishlist_updated_at
      BEFORE UPDATE ON public.user_wishlist
      FOR EACH ROW EXECUTE FUNCTION public.update_wishlist_updated_at();
    `);

    // Enable RLS and policies
    await client.query(`ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_wishlist' AND policyname = 'select own wishlist'
        ) THEN
          CREATE POLICY "select own wishlist" ON public.user_wishlist FOR SELECT USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_wishlist' AND policyname = 'insert own wishlist'
        ) THEN
          CREATE POLICY "insert own wishlist" ON public.user_wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_wishlist' AND policyname = 'delete own wishlist'
        ) THEN
          CREATE POLICY "delete own wishlist" ON public.user_wishlist FOR DELETE USING (auth.uid() = user_id);
        END IF;
      END$$;
    `);

    console.log('✅ user_wishlist table, indexes, trigger, and RLS configured.');
  } catch (error) {
    console.error('❌ Error creating wishlist table:', error);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (require.main === module) {
  createWishlistTable()
    .then(() => {
      console.log('🎉 Wishlist table setup completed!');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

module.exports = { createWishlistTable };
