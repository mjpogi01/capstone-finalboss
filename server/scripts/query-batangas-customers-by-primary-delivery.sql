-- Count customers in Batangas based on their PRIMARY delivery location
-- Uses the province where they have the MOST orders delivered
-- This avoids double-counting customers who order to multiple provinces

WITH customer_province_orders AS (
  -- Count orders per customer per province
  SELECT 
    o.user_id,
    LOWER(TRIM(o.delivery_address->>'province')) as province,
    COUNT(*)::int as order_count
  FROM orders o
  WHERE o.delivery_address IS NOT NULL
    AND o.delivery_address->>'province' IS NOT NULL
    AND o.delivery_address->>'province' IN ('Batangas', 'Oriental Mindoro')
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
  GROUP BY o.user_id, LOWER(TRIM(o.delivery_address->>'province'))
),
customer_primary_province AS (
  -- Determine each customer's primary province (where they have most orders)
  SELECT DISTINCT ON (user_id)
    user_id,
    province as primary_province,
    order_count
  FROM customer_province_orders
  ORDER BY user_id, order_count DESC, province
)
SELECT 
  (SELECT COUNT(DISTINCT user_id)::int 
   FROM customer_primary_province 
   WHERE primary_province = 'batangas') as batangas_customers,
  (SELECT COUNT(DISTINCT user_id)::int 
   FROM customer_primary_province 
   WHERE primary_province = 'oriental mindoro') as mindoro_customers,
  (SELECT COUNT(DISTINCT user_id)::int 
   FROM customer_primary_province) as total_unique_customers;

