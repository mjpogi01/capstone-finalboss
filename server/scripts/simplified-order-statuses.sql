-- ====================================================
-- Simplified Order Status System
-- Using production stages directly as order statuses
-- ====================================================

-- Drop existing constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with production stages as statuses
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending',
  'confirmed', 
  'layout',
  'sizing',
  'printing',
  'press',
  'prod',
  'packing_completing',
  'picked_up_delivered',
  'cancelled'
));

-- Remove production_status column if it exists (not needed anymore)
ALTER TABLE orders 
DROP COLUMN IF EXISTS production_status;

-- Success!
-- Order statuses are now:
-- 1. pending - New order
-- 2. confirmed - Design uploaded
-- 3. layout - Layout stage
-- 4. sizing - Sizing stage
-- 5. printing - Printing stage
-- 6. press - Press stage
-- 7. prod - Production stage
-- 8. packing_completing - Packing/Completing stage
-- 9. picked_up_delivered - Final delivery/pickup
-- 10. cancelled - Order cancelled

