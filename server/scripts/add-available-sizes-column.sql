-- Add available_sizes column to products table if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS available_sizes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN products.available_sizes IS 'Comma-separated list of available sizes for the product (e.g., "10,12,15" for trophies or "S,M,L" for apparel)';






























