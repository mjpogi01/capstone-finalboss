-- ====================================================
-- Check Order Statuses in Database
-- ====================================================
-- This query shows what status values actually exist
-- and how many orders have each status
-- ====================================================

-- Show all unique status values and their counts
SELECT 
  status,
  LOWER(status) AS status_lower,
  TRIM(LOWER(status)) AS status_normalized,
  COUNT(*) AS order_count
FROM orders
WHERE status IS NOT NULL
GROUP BY status, LOWER(status), TRIM(LOWER(status))
ORDER BY order_count DESC;

-- Show status categorization
SELECT 
  CASE 
    WHEN LOWER(TRIM(status)) = 'picked_up_delivered' THEN 'COMPLETED'
    WHEN LOWER(TRIM(status)) IN ('confirmed', 'layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing') THEN 'PROCESSING'
    WHEN LOWER(TRIM(status)) = 'pending' THEN 'PENDING'
    WHEN LOWER(TRIM(status)) IN ('cancelled', 'canceled') THEN 'CANCELLED'
    ELSE 'UNKNOWN'
  END AS category,
  status AS raw_status,
  COUNT(*) AS order_count
FROM orders
WHERE status IS NOT NULL
GROUP BY status
ORDER BY category, order_count DESC;

-- Summary by category
SELECT 
  CASE 
    WHEN LOWER(TRIM(status)) = 'picked_up_delivered' THEN 'COMPLETED'
    WHEN LOWER(TRIM(status)) IN ('confirmed', 'layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing') THEN 'PROCESSING'
    WHEN LOWER(TRIM(status)) = 'pending' THEN 'PENDING'
    WHEN LOWER(TRIM(status)) IN ('cancelled', 'canceled') THEN 'CANCELLED'
    ELSE 'UNKNOWN'
  END AS category,
  COUNT(*) AS total_orders
FROM orders
WHERE status IS NOT NULL
GROUP BY category
ORDER BY category;



