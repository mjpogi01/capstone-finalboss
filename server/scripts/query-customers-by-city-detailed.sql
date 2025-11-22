-- Detailed query to fetch customers in different cities with full customer information
-- This query shows all customers per city with their order statistics

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
city_customer_stats AS (
  SELECT 
    cc.city,
    cc.province,
    cc.user_id,
    up.full_name,
    up.phone as phone_number,
    -- Count orders for this customer in this city
    (
      SELECT COUNT(*)::int
      FROM orders o
      WHERE o.user_id = cc.user_id
        AND o.delivery_address->>'city' = cc.city
        AND o.delivery_address->>'province' = cc.province
        AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
    ) as order_count,
    -- Total order value for this customer in this city
    (
      SELECT COALESCE(SUM(o.total_amount), 0)::numeric(10,2)
      FROM orders o
      WHERE o.user_id = cc.user_id
        AND o.delivery_address->>'city' = cc.city
        AND o.delivery_address->>'province' = cc.province
        AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
    ) as total_spent
  FROM customer_cities cc
  LEFT JOIN user_profiles up ON up.user_id = cc.user_id
  WHERE cc.city != ''
    AND cc.province != ''
)
city_aggregated AS (
  SELECT 
    city,
    province,
    COUNT(DISTINCT user_id)::int as customer_count,
    SUM(order_count)::int as total_orders,
    SUM(total_spent)::numeric(10,2) as total_revenue
  FROM city_customer_stats
  GROUP BY city, province
),
city_customers_list AS (
  SELECT 
    city,
    province,
    STRING_AGG(
      customer_info, 
      ', ' 
      ORDER BY customer_info
    ) as customers
  FROM (
    SELECT DISTINCT
      city,
      province,
      full_name || ' (' || COALESCE(phone_number, 'no phone') || ')' as customer_info
    FROM city_customer_stats
  ) distinct_customers
  GROUP BY city, province
)
SELECT 
  ca.city,
  ca.province,
  ca.customer_count,
  ca.total_orders,
  ca.total_revenue,
  COALESCE(ccl.customers, '') as customers
FROM city_aggregated ca
LEFT JOIN city_customers_list ccl 
  ON ccl.city = ca.city 
  AND ccl.province = ca.province
ORDER BY ca.customer_count DESC, ca.city ASC;

