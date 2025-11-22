-- ====================================================
-- Update Order Type Constraint to Include 'walk_in'
-- ====================================================

-- Update the order_type constraint to include walk_in
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('regular', 'custom_design', 'walk_in'));

-- Success! Orders can now have order_type: 'regular', 'custom_design', or 'walk_in'



