-- Simple query to fetch and count DISTINCT customers in different cities
-- Shows only city, province, and customer count
-- Uses TRIM to handle whitespace issues and ensures accurate counting

WITH customer_cities AS (
  -- Get cities from user_addresses
  SELECT DISTINCT
    ua.user_id,
    TRIM(COALESCE(ua.city, '')) as city,
    TRIM(COALESCE(ua.province, '')) as province
  FROM user_addresses ua
  WHERE ua.city IS NOT NULL 
    AND TRIM(ua.city) != ''
    AND ua.province IN ('Batangas', 'Oriental Mindoro')
  
  UNION
  
  -- Get cities from orders.delivery_address
  SELECT DISTINCT
    o.user_id,
    TRIM(COALESCE(
      CASE 
        WHEN o.delivery_address->>'city' IS NOT NULL 
        THEN o.delivery_address->>'city'
        ELSE NULL
      END,
      ''
    )) as city,
    TRIM(COALESCE(
      CASE 
        WHEN o.delivery_address->>'province' IS NOT NULL 
        THEN o.delivery_address->>'province'
        ELSE NULL
      END,
      ''
    )) as province
  FROM orders o
  WHERE o.delivery_address IS NOT NULL
    AND o.delivery_address->>'city' IS NOT NULL
    AND TRIM(o.delivery_address->>'city') != ''
    AND o.delivery_address->>'province' IN ('Batangas', 'Oriental Mindoro')
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
)
SELECT 
  city,
  province,
  COUNT(DISTINCT user_id)::int as customer_count
FROM customer_cities
WHERE city != ''
  AND province != ''
GROUP BY city, province
ORDER BY customer_count DESC, city ASC;

