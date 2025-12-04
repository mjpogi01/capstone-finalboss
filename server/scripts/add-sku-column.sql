-- ====================================================
-- Add SKU Column to Products Table
-- ====================================================
-- Run this in Supabase SQL Editor to add SKU support

-- Step 1: Add SKU column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Step 2: Add unique constraint on SKU (ensures no duplicate SKUs)
-- Note: We'll create a unique index instead since SKU can be NULL for existing products
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx 
ON products(sku) 
WHERE sku IS NOT NULL;

-- Step 3: Add comment to document the column
COMMENT ON COLUMN products.sku IS 
'SKU (Stock Keeping Unit) - Unique identifier for each product variant. Same product with different sizes has different SKUs. Format: Category prefix + product identifier + size suffix (e.g., TRP-001-13IN, TRP-001-16IN).';

-- Step 4: Verify the column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products' 
AND column_name = 'sku';




