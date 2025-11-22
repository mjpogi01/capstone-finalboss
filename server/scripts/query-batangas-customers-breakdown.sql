-- Breakdown query to understand why Batangas has more than expected customers
-- Shows customers from each source, overlap, and potential mismatches

WITH user_address_customers AS (
  SELECT DISTINCT
    ua.user_id,
    ua.province as user_province,
    'user_addresses' as source
  FROM user_addresses ua
  WHERE LOWER(TRIM(ua.province)) = 'batangas'
    AND ua.province IS NOT NULL
    AND TRIM(ua.province) != ''
),
order_customers AS (
  SELECT DISTINCT
    o.user_id,
    o.delivery_address->>'province' as order_province,
    'orders' as source
  FROM orders o
  WHERE o.delivery_address IS NOT NULL
    AND o.delivery_address->>'province' IS NOT NULL
    AND LOWER(TRIM(o.delivery_address->>'province')) = 'batangas'
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
),
combined AS (
  SELECT user_id, 'user_addresses' as source FROM user_address_customers
  UNION
  SELECT user_id, 'orders' as source FROM order_customers
),
-- Check for customers with mismatched provinces
mismatch_check AS (
  SELECT DISTINCT
    ua.user_id,
    ua.province as user_province,
    o.delivery_address->>'province' as order_province
  FROM user_addresses ua
  JOIN orders o ON ua.user_id = o.user_id
  WHERE ua.province IS NOT NULL
    AND o.delivery_address->>'province' IS NOT NULL
    AND LOWER(TRIM(ua.province)) != LOWER(TRIM(o.delivery_address->>'province'))
    AND (LOWER(TRIM(ua.province)) = 'batangas' OR LOWER(TRIM(o.delivery_address->>'province')) = 'batangas')
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
)
SELECT 
  (SELECT COUNT(DISTINCT user_id)::int FROM user_address_customers) as from_user_addresses,
  (SELECT COUNT(DISTINCT user_id)::int FROM order_customers) as from_orders,
  (SELECT COUNT(DISTINCT user_id)::int 
   FROM user_address_customers uac
   WHERE uac.user_id IN (SELECT user_id FROM order_customers)
  ) as in_both_sources,
  (SELECT COUNT(DISTINCT user_id)::int FROM combined) as total_unique_customers,
  (SELECT COUNT(DISTINCT user_id)::int FROM mismatch_check) as customers_with_mismatched_provinces,
  (SELECT COUNT(DISTINCT user_id)::int 
   FROM orders o
   WHERE o.user_id NOT IN (SELECT user_id FROM user_addresses WHERE LOWER(TRIM(province)) = 'batangas')
     AND o.delivery_address IS NOT NULL
     AND LOWER(TRIM(o.delivery_address->>'province')) = 'batangas'
     AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
  ) as customers_only_in_orders,
  (SELECT COUNT(DISTINCT user_id)::int 
   FROM user_addresses ua
   WHERE LOWER(TRIM(ua.province)) = 'batangas'
     AND ua.user_id NOT IN (
       SELECT DISTINCT o.user_id 
       FROM orders o 
       WHERE o.delivery_address IS NOT NULL
         AND LOWER(TRIM(o.delivery_address->>'province')) = 'batangas'
         AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
     )
  ) as customers_only_in_addresses;

