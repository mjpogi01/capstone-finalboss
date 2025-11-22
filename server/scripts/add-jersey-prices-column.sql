-- ====================================================
-- Add Jersey Prices Support to Products Table
-- ====================================================
-- Run this in Supabase SQL Editor to add support for jersey pricing
-- This adds a JSONB column to store full set, shirt only, and shorts only prices

-- Step 1: Add jersey_prices JSONB column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS jersey_prices JSONB;

-- Step 2: Add comment to document the column
COMMENT ON COLUMN products.jersey_prices IS 
'JSON object storing jersey prices: {"fullSet": 1000, "shirtOnly": 600, "shortsOnly": 400}. Only used for Jerseys category products.';

-- Step 3: Verify the column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products' 
AND column_name = 'jersey_prices';

-- ====================================================
-- NOTES:
-- ====================================================
-- 1. For jersey products, prices can be stored in jersey_prices JSONB column
-- 2. The price column will still be used for backward compatibility (full set price)
-- 3. Structure: {"fullSet": 1000, "shirtOnly": 600, "shortsOnly": 400}
-- 4. For non-jersey products, use the regular price column
-- ====================================================















 


















