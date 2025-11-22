-- Query to count DISTINCT customers per city (regardless of province)
-- Only checks orders.delivery_address (NOT user_addresses)
-- Groups by city only, not city+province

WITH customer_cities AS (
  -- Get cities from orders.delivery_address only
  SELECT DISTINCT
    o.user_id,
    TRIM(COALESCE(
      CASE 
        WHEN o.delivery_address->>'city' IS NOT NULL 
        THEN o.delivery_address->>'city'
        ELSE NULL
      END,
      ''
    )) as city
  FROM orders o
  WHERE o.delivery_address IS NOT NULL
    AND o.delivery_address->>'city' IS NOT NULL
    AND TRIM(o.delivery_address->>'city') != ''
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
)
SELECT 
  city,
  COUNT(DISTINCT user_id)::int as customer_count
FROM customer_cities
WHERE city != ''
GROUP BY city
ORDER BY customer_count DESC, city ASC;

