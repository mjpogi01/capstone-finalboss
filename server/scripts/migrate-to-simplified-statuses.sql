-- ====================================================
-- Migrate Existing Orders to Simplified Status System
-- ====================================================
-- This migration safely converts old statuses to new ones
-- ====================================================

-- Step 1: Remove old constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 2: Update existing orders to new status values
-- Map old statuses to new production stages

-- 'processing' → 'layout' (start of production)
UPDATE orders 
SET status = 'layout' 
WHERE status = 'processing';

-- 'completed' → 'packing_completing' (near end of production)
UPDATE orders 
SET status = 'packing_completing' 
WHERE status = 'completed';

-- 'delivered' or 'shipped' → 'picked_up_delivered' (final status)
UPDATE orders 
SET status = 'picked_up_delivered' 
WHERE status IN ('delivered', 'shipped');

-- Keep these as-is (they're already correct):
-- 'pending' stays 'pending'
-- 'confirmed' stays 'confirmed'
-- 'cancelled' stays 'cancelled'

-- Step 3: Add new constraint with all valid statuses
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

-- Step 4: Remove production_status column if it exists (not needed)
ALTER TABLE orders 
DROP COLUMN IF EXISTS production_status;

-- Verify the migration
SELECT 
  status, 
  COUNT(*) as order_count 
FROM orders 
GROUP BY status 
ORDER BY status;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Order statuses updated:';
  RAISE NOTICE '  - processing → layout';
  RAISE NOTICE '  - completed → packing_completing';
  RAISE NOTICE '  - delivered/shipped → picked_up_delivered';
  RAISE NOTICE '';
  RAISE NOTICE 'New status flow:';
  RAISE NOTICE '  pending → confirmed → layout → sizing → printing';
  RAISE NOTICE '  → press → prod → packing_completing → picked_up_delivered';
END $$;

