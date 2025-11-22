-- ====================================================
-- Migrate Existing Orders to Simplified Status System
-- (With RLS bypass for migration)
-- ====================================================

-- Temporarily disable RLS for migration
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

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

-- Step 5: Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Verify the migration
SELECT 
  status, 
  COUNT(*) as order_count 
FROM orders 
GROUP BY status 
ORDER BY status;

