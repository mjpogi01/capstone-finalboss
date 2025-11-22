-- Analyze customer distribution across provinces to understand the 996 vs 923 discrepancy
-- Check if customers are being counted in multiple provinces

WITH all_customers_by_province AS (
  -- Customers from user_addresses
  SELECT DISTINCT
    ua.user_id,
    LOWER(TRIM(ua.province)) as province,
    'user_addresses' as source
  FROM user_addresses ua
  WHERE ua.province IS NOT NULL
    AND TRIM(ua.province) != ''
    AND ua.province IN ('Batangas', 'Oriental Mindoro')
  
  UNION
  
  -- Customers from orders.delivery_address
  SELECT DISTINCT
    o.user_id,
    LOWER(TRIM(o.delivery_address->>'province')) as province,
    'orders' as source
  FROM orders o
  WHERE o.delivery_address IS NOT NULL
    AND o.delivery_address->>'province' IS NOT NULL
    AND o.delivery_address->>'province' IN ('Batangas', 'Oriental Mindoro')
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
),
province_counts AS (
  SELECT 
    province,
    COUNT(DISTINCT user_id)::int as customer_count
  FROM all_customers_by_province
  GROUP BY province
),
customers_in_both_provinces AS (
  SELECT 
    user_id,
    COUNT(DISTINCT province) as province_count
  FROM all_customers_by_province
  GROUP BY user_id
  HAVING COUNT(DISTINCT province) > 1
),
total_unique_customers AS (
  SELECT COUNT(DISTINCT user_id)::int as total
  FROM all_customers_by_province
)
SELECT 
  (SELECT customer_count FROM province_counts WHERE province = 'batangas') as batangas_customers,
  (SELECT customer_count FROM province_counts WHERE province = 'oriental mindoro') as mindoro_customers,
  (SELECT COUNT(DISTINCT user_id)::int FROM customers_in_both_provinces) as customers_in_both_provinces,
  (SELECT total FROM total_unique_customers) as total_unique_customers_across_both,
  (SELECT customer_count FROM province_counts WHERE province = 'batangas') + 
  (SELECT customer_count FROM province_counts WHERE province = 'oriental mindoro') as sum_of_province_counts;

