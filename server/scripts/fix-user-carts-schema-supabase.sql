-- ====================================================
-- Fix user_carts Table Schema for Add to Cart Functionality
-- ====================================================
-- Run this in Supabase SQL Editor to fix missing columns

-- Step 1: Add size column if it doesn't exist
ALTER TABLE user_carts 
ADD COLUMN IF NOT EXISTS size TEXT;

-- Step 2: Add ball_details JSONB column if it doesn't exist
ALTER TABLE user_carts 
ADD COLUMN IF NOT EXISTS ball_details JSONB;

-- Step 3: Add trophy_details JSONB column if it doesn't exist
ALTER TABLE user_carts 
ADD COLUMN IF NOT EXISTS trophy_details JSONB;

-- Step 4: Verify the schema
-- (Run this query to see current columns)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_carts'
ORDER BY ordinal_position;

-- Step 5: Check if any products have NULL categories (shouldn't happen)
-- If this returns any rows, those products need categories added
SELECT 
    id, 
    name, 
    category
FROM products
WHERE category IS NULL OR category = '';

-- Step 6: Verify foreign key constraint exists
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'user_carts'
    AND kcu.column_name = 'product_id';

-- ====================================================
-- NOTES:
-- ====================================================
-- 1. Categories are NOT a separate table - they're stored as TEXT in products.category
-- 2. The add to cart functionality requires:
--    - user_carts.size (TEXT)
--    - user_carts.ball_details (JSONB)
--    - user_carts.trophy_details (JSONB)
-- 3. All products MUST have a category (products.category is NOT NULL)
-- 4. If products have NULL categories, update them:
--    UPDATE products SET category = 'Uncategorized' WHERE category IS NULL;
-- ====================================================

