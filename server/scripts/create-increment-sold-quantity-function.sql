-- Create function to increment sold_quantity for a product
CREATE OR REPLACE FUNCTION increment_sold_quantity(
  product_id UUID,
  quantity_to_add INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Update the sold_quantity by adding the quantity_to_add
  UPDATE products 
  SET sold_quantity = COALESCE(sold_quantity, 0) + quantity_to_add,
      updated_at = NOW()
  WHERE id = product_id;
  
  -- Log the update
  RAISE NOTICE 'Updated sold_quantity for product % by %', product_id, quantity_to_add;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_sold_quantity(UUID, INTEGER) TO authenticated;
