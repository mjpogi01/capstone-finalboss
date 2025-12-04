-- ====================================================
-- Add Brand Column to Products Table
-- ====================================================
-- Run this in Supabase SQL Editor to add brand support

-- Step 1: Add brand column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand TEXT;

-- Step 2: Set default brand "Yohann's" for all apparel products
UPDATE products 
SET brand = 'Yohann''s'
WHERE category IN ('jerseys', 'uniforms', 't-shirts', 'long sleeves', 'hoodies', 'jackets', 'accessories', 'hats')
  AND (brand IS NULL OR brand = '');

-- Step 3: Add comment to document the column
COMMENT ON COLUMN products.brand IS 
'Product brand name. Defaults to "Yohann''s" for apparel products. Can be set for balls and trophies (e.g., "Molten", "Mikasa", "Spalding", etc.)';

-- Step 4: Verify the column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products' 
AND column_name = 'brand';




