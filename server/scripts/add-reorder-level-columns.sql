-- Add reorder level threshold columns to products table
-- These columns will be used for inventory management in the Item Stocks graph

ALTER TABLE products
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS sufficient_stock_threshold INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS high_stock_threshold INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS overstock_threshold INTEGER DEFAULT 100;

-- Set default values for existing products that have NULL values
UPDATE products
SET 
  low_stock_threshold = 10,
  sufficient_stock_threshold = 30,
  high_stock_threshold = 50,
  overstock_threshold = 100
WHERE 
  low_stock_threshold IS NULL 
  OR sufficient_stock_threshold IS NULL 
  OR high_stock_threshold IS NULL 
  OR overstock_threshold IS NULL;

-- Add comments to columns for documentation
COMMENT ON COLUMN products.low_stock_threshold IS 'Stock below this value is considered low stock';
COMMENT ON COLUMN products.sufficient_stock_threshold IS 'Stock between low_stock_threshold and this value is considered sufficient';
COMMENT ON COLUMN products.high_stock_threshold IS 'Stock between sufficient_stock_threshold and this value is considered high stock';
COMMENT ON COLUMN products.overstock_threshold IS 'Stock above this value is considered overstock';



