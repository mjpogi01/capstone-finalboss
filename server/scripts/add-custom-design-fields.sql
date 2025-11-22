-- ====================================================
-- Add Custom Design Fields to Orders Table
-- ====================================================

-- Add custom design specific columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'regular';

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS client_name VARCHAR(100);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS client_email VARCHAR(100);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS client_phone VARCHAR(20);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS team_name VARCHAR(100);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS team_members JSONB;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pickup_branch_id VARCHAR(50);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS design_images JSONB;

-- Update the order_type constraint to include custom_design
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('regular', 'custom_design'));

-- Update shipping_method constraint to include 'delivery'
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_shipping_method_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_shipping_method_check 
CHECK (shipping_method IN ('pickup', 'cod', 'delivery'));

-- Success! Custom design orders can now be stored with:
-- - order_type: 'custom_design'
-- - client_name, client_email, client_phone: Customer details
-- - team_name, team_members: Team information
-- - pickup_branch_id: Branch selection for pickup
-- - design_images: Uploaded design files
