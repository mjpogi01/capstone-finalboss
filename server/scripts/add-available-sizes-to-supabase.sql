-- Add available_sizes column to products table if it doesn't exist
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

DO $$
BEGIN
  -- Add available_sizes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'available_sizes'
  ) THEN
    ALTER TABLE products ADD COLUMN available_sizes TEXT;
    RAISE NOTICE '✅ Added available_sizes column to products table';
  ELSE
    RAISE NOTICE 'ℹ️  available_sizes column already exists';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN products.available_sizes IS 
'Comma-separated list of available sizes for the product (e.g., "10,12,15" for trophies or "S,M,L" for apparel)';



























