-- ====================================================
-- Update Order Status Constraint
-- ====================================================
-- Ensures all order statuses are supported including 'confirmed'
-- ====================================================

-- Drop existing constraint if it exists
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add updated constraint with all statuses
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'delivered', 'cancelled', 'shipped'));

-- Note: 'shipped' is included for backwards compatibility but 'delivered' is the preferred final status

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'orders_status_check';

