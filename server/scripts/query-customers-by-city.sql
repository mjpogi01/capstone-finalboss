-- Query to fetch and count customers in different cities
-- This query combines data from user_addresses and orders.delivery_address
-- to get a comprehensive view of customer distribution across cities

WITH customer_cities AS (
  -- Get cities from user_addresses
  SELECT DISTINCT
    ua.user_id,
    COALESCE(ua.city, '') as city,
    COALESCE(ua.province, '') as province
  FROM user_addresses ua
  WHERE ua.city IS NOT NULL 
    AND ua.city != ''
    AND ua.province IN ('Batangas', 'Oriental Mindoro')
  
  UNION
  
  -- Get cities from orders.delivery_address
  SELECT DISTINCT
    o.user_id,
    COALESCE(
      CASE 
        WHEN o.delivery_address->>'city' IS NOT NULL 
        THEN o.delivery_address->>'city'
        ELSE NULL
      END,
      ''
    ) as city,
    COALESCE(
      CASE 
        WHEN o.delivery_address->>'province' IS NOT NULL 
        THEN o.delivery_address->>'province'
        ELSE NULL
      END,
      ''
    ) as province
  FROM orders o
  WHERE o.delivery_address IS NOT NULL
    AND o.delivery_address->>'city' IS NOT NULL
    AND o.delivery_address->>'city' != ''
    AND o.delivery_address->>'province' IN ('Batangas', 'Oriental Mindoro')
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
),
city_stats AS (
  SELECT 
    city,
    province,
    COUNT(DISTINCT user_id)::int as customer_count
  FROM customer_cities
  WHERE city != ''
    AND province != ''
  GROUP BY city, province
)
SELECT 
  cs.city,
  cs.province,
  cs.customer_count,
  -- Get sample customer names (first 5)
  (
    SELECT STRING_AGG(DISTINCT up.full_name, ', ' ORDER BY up.full_name)
    FROM customer_cities cc
    JOIN user_profiles up ON up.user_id = cc.user_id
    WHERE cc.city = cs.city 
      AND cc.province = cs.province
    LIMIT 5
  ) as sample_customers,
  -- Get total orders for this city
  (
    SELECT COUNT(*)::int
    FROM orders o
    WHERE (
      o.delivery_address->>'city' = cs.city
      AND o.delivery_address->>'province' = cs.province
    )
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
  ) as total_orders,
  -- Get total order value for this city
  (
    SELECT COALESCE(SUM(o.total_amount), 0)::numeric(10,2)
    FROM orders o
    WHERE (
      o.delivery_address->>'city' = cs.city
      AND o.delivery_address->>'province' = cs.province
    )
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
  ) as total_order_value
FROM city_stats cs
ORDER BY cs.customer_count DESC, cs.city ASC;



