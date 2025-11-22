-- Debug query to understand customer distribution
-- Shows breakdown by source (user_addresses vs orders)

WITH user_address_cities AS (
  SELECT DISTINCT
    ua.user_id,
    TRIM(COALESCE(ua.city, '')) as city,
    TRIM(COALESCE(ua.province, '')) as province,
    'user_addresses' as source
  FROM user_addresses ua
  WHERE ua.city IS NOT NULL 
    AND TRIM(ua.city) != ''
    AND ua.province IN ('Batangas', 'Oriental Mindoro')
),
order_cities AS (
  SELECT DISTINCT
    o.user_id,
    TRIM(COALESCE(o.delivery_address->>'city', '')) as city,
    TRIM(COALESCE(o.delivery_address->>'province', '')) as province,
    'orders' as source
  FROM orders o
  WHERE o.delivery_address IS NOT NULL
    AND o.delivery_address->>'city' IS NOT NULL
    AND TRIM(o.delivery_address->>'city') != ''
    AND o.delivery_address->>'province' IN ('Batangas', 'Oriental Mindoro')
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
),
combined AS (
  SELECT * FROM user_address_cities
  UNION
  SELECT * FROM order_cities
)
SELECT 
  city,
  province,
  COUNT(DISTINCT user_id)::int as total_customers,
  COUNT(DISTINCT CASE WHEN source = 'user_addresses' THEN user_id END)::int as from_addresses,
  COUNT(DISTINCT CASE WHEN source = 'orders' THEN user_id END)::int as from_orders,
  COUNT(DISTINCT CASE WHEN user_id IN (
    SELECT user_id FROM user_address_cities
    INTERSECT
    SELECT user_id FROM order_cities WHERE order_cities.city = combined.city AND order_cities.province = combined.province
  ) THEN user_id END)::int as in_both
FROM combined
WHERE city != ''
  AND province != ''
  AND (LOWER(city) = 'balayan' OR LOWER(city) = 'calaca' OR LOWER(city) LIKE '%batangas%')
GROUP BY city, province
ORDER BY total_customers DESC, city ASC;



