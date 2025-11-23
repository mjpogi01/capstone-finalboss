-- Diagnostic script: Check orders table structure
-- Run this first to see what's wrong with the orders table

-- 1. Check if orders table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders')
    THEN '✅ Orders table exists'
    ELSE '❌ Orders table does NOT exist'
  END AS table_status;

-- 2. Check if orders table has a primary key
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'orders'
        AND con.contype = 'p'
    )
    THEN '✅ Orders table has a primary key'
    ELSE '❌ Orders table does NOT have a primary key'
  END AS primary_key_status;

-- 3. Show all constraints on orders table
SELECT
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    ELSE con.contype::text
  END AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'orders'
ORDER BY con.contype, con.conname;

-- 4. Show columns in orders table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- 5. If no primary key exists, this will show what needs to be done
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'orders'
        AND con.contype = 'p'
    )
    THEN '⚠️ ACTION REQUIRED: Orders table needs a primary key. Run: ALTER TABLE orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);'
    ELSE '✅ No action needed - primary key exists'
  END AS recommendation;


