-- SQL Query to add size_stocks column to products table in Supabase
-- This column stores per-size stock quantities as JSONB (used for trophies with sizes)

-- Option 1: Simple ALTER TABLE (use if column definitely doesn't exist)
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_stocks JSONB;

-- Option 2: Safe version with existence check (PostgreSQL DO block)
-- This is safer if you're not sure if the column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'size_stocks'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE products ADD COLUMN size_stocks JSONB;
    RAISE NOTICE 'size_stocks column added successfully';
  ELSE
    RAISE NOTICE 'size_stocks column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products' 
  AND column_name = 'size_stocks'
  AND table_schema = 'public';



