-- Migration script to add product_id column to order_reviews table
-- This script adds the product_id column and updates the unique constraint

-- Add the product_id column (nullable to maintain existing data)
ALTER TABLE order_reviews 
ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Update the unique constraint to include product_id
-- First, drop the existing unique constraint
ALTER TABLE order_reviews 
DROP CONSTRAINT IF EXISTS order_reviews_order_id_user_id_key;

-- Add the new unique constraint that includes product_id
ALTER TABLE order_reviews 
ADD CONSTRAINT order_reviews_order_id_user_id_product_id_key 
UNIQUE(order_id, user_id, product_id);

-- Create index for better performance on product_id queries
CREATE INDEX IF NOT EXISTS idx_order_reviews_product_id ON order_reviews(product_id);

-- Add comment to document the column
COMMENT ON COLUMN order_reviews.product_id IS 'Optional product ID for product-specific reviews. NULL for order-level reviews.';
