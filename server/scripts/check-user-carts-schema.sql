-- ====================================================
-- Check and Fix user_carts Table Schema
-- ====================================================
-- This script checks if the user_carts table has all required columns
-- and adds any missing columns to match the application code

-- Check current schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_carts'
ORDER BY ordinal_position;

-- Add size column if it doesn't exist
ALTER TABLE user_carts 
ADD COLUMN IF NOT EXISTS size TEXT;

-- Add ball_details JSONB column if it doesn't exist
ALTER TABLE user_carts 
ADD COLUMN IF NOT EXISTS ball_details JSONB;

-- Add trophy_details JSONB column if it doesn't exist
ALTER TABLE user_carts 
ADD COLUMN IF NOT EXISTS trophy_details JSONB;

-- Remove unique_id column if it exists (not used in Supabase version)
-- Note: Only run this if you're sure you don't need it
-- ALTER TABLE user_carts DROP COLUMN IF EXISTS unique_id;

-- Remove team_name column if it exists (should be in team_members JSONB)
-- Note: Only run this if you're sure you don't need it
-- ALTER TABLE user_carts DROP COLUMN IF EXISTS team_name;

-- Verify foreign key constraint exists
SELECT
    tc.constraint_name,
    tc.table_name,
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
    AND tc.table_name = 'user_carts';

-- Check if products table has category column (should be NOT NULL)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products' 
    AND column_name = 'category';

-- Check for products with NULL categories (shouldn't exist if constraint is correct)
SELECT 
    COUNT(*) as null_category_count
FROM products
WHERE category IS NULL;

