-- ====================================================
-- Add archived column to products table
-- ====================================================
-- Run this in the Supabase SQL editor or migration tooling.

-- Add archived column: BOOLEAN to track if a product is archived
ALTER TABLE products
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN products.archived IS
'Indicates if the product is archived. Archived products are hidden from the main inventory but can be restored.';

-- Create index for better query performance when filtering archived products
CREATE INDEX IF NOT EXISTS idx_products_archived ON products(archived);

-- Verification query
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name = 'archived';


