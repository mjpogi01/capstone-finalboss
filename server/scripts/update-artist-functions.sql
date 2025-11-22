-- ============================================
-- UPDATE ARTIST SYSTEM FUNCTIONS
-- ============================================

-- Function to assign custom design order tasks (custom designs)
CREATE OR REPLACE FUNCTION assign_custom_design_task(
  p_order_id UUID,
  p_product_name VARCHAR(255),
  p_quantity INTEGER,
  p_customer_requirements TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'medium',
  p_deadline TIMESTAMPTZ DEFAULT now() + INTERVAL '3 days',
  p_product_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Assign to least busy artist with custom design order type
  SELECT assign_task_to_least_busy_artist(
    'Custom Design: ' || p_product_name,
    'Create custom design layout. Quantity: ' || p_quantity || ' units' || 
    CASE WHEN p_customer_requirements IS NOT NULL THEN '. Requirements: ' || p_customer_requirements ELSE '' END,
    'Custom design creation. Quantity: ' || p_quantity || '. Product: ' || p_product_name,
    p_priority,
    COALESCE(p_deadline, now() + INTERVAL '3 days'),
    p_order_id,
    p_product_id,
    'custom_design',
    true,
    'online'
  ) INTO v_task_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign regular order tasks (products from store catalog)
CREATE OR REPLACE FUNCTION assign_regular_order_task(
  p_product_name VARCHAR(255),
  p_quantity INTEGER,
  p_customer_requirements TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'medium',
  p_deadline TIMESTAMPTZ DEFAULT now() + INTERVAL '2 days',
  p_order_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_order_source VARCHAR(50) DEFAULT 'online'
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Assign to least busy artist with regular order type
  SELECT assign_task_to_least_busy_artist(
    'Layout Store Product: ' || p_product_name,
    'Prepare layout for store product.' ||
    CASE WHEN p_customer_requirements IS NOT NULL THEN E'\n' || p_customer_requirements ELSE '' END,
    'Store product layout. Quantity: ' || p_quantity || '. Product: ' || p_product_name,
    p_priority,
    COALESCE(p_deadline, now() + INTERVAL '2 days'),
    p_order_id,
    p_product_id,
    'regular',
    false,
    p_order_source
  ) INTO v_task_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign walk-in order tasks (in-person orders)
CREATE OR REPLACE FUNCTION assign_walk_in_order_task(
  p_product_name VARCHAR(255),
  p_quantity INTEGER,
  p_customer_requirements TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'high', -- Walk-ins usually higher priority
  p_deadline TIMESTAMPTZ DEFAULT now() + INTERVAL '1 day', -- Faster turnaround
  p_order_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Assign to least busy artist with walk-in order type
  SELECT assign_task_to_least_busy_artist(
    'Walk-in Order: ' || p_product_name,
    'Process walk-in order. Quantity: ' || p_quantity || ' units' || 
    CASE WHEN p_customer_requirements IS NOT NULL THEN '. Customer notes: ' || p_customer_requirements ELSE '' END,
    'Walk-in order processing. Quantity: ' || p_quantity || '. Product: ' || p_product_name,
    p_priority,
    COALESCE(p_deadline, now() + INTERVAL '1 day'),
    p_order_id,
    p_product_id,
    'walk_in',
    false,
    'walk_in'
  ) INTO v_task_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION assign_custom_design_task TO authenticated;
GRANT EXECUTE ON FUNCTION assign_regular_order_task TO authenticated;
GRANT EXECUTE ON FUNCTION assign_walk_in_order_task TO authenticated;
