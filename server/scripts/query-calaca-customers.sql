-- Query to display customers in Calaca, Batangas
-- This query combines data from user_addresses and orders.delivery_address

WITH calaca_customers AS (
  -- Get customers from user_addresses table
  SELECT DISTINCT
    ua.user_id,
    ua.city,
    ua.province,
    ua.barangay,
    ua.street_address,
    ua.full_name,
    'user_addresses' as source
  FROM user_addresses ua
  WHERE LOWER(TRIM(ua.city)) = 'calaca'
    AND LOWER(TRIM(ua.province)) = 'batangas'
    AND ua.city IS NOT NULL
    AND ua.city != ''
  
  UNION
  
  -- Get customers from orders.delivery_address
  SELECT DISTINCT
    o.user_id,
    o.delivery_address->>'city' as city,
    o.delivery_address->>'province' as province,
    o.delivery_address->>'barangay' as barangay,
    o.delivery_address->>'streetAddress' as street_address,
    NULL as full_name,
    'orders' as source
  FROM orders o
  WHERE o.delivery_address IS NOT NULL
    AND LOWER(TRIM(o.delivery_address->>'city')) = 'calaca'
    AND LOWER(TRIM(o.delivery_address->>'province')) = 'batangas'
    AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
)
SELECT 
  cc.user_id,
  cc.city,
  cc.province,
  cc.barangay,
  cc.street_address,
  cc.full_name,
  cc.source,
  -- Get customer name from user_profiles if available
  up.full_name as profile_name,
  up.phone as phone,
  -- Count orders for this customer
  (SELECT COUNT(*) 
   FROM orders o2 
   WHERE o2.user_id = cc.user_id 
     AND LOWER(o2.status) NOT IN ('cancelled', 'canceled')
  ) as total_orders,
  -- Get total spent
  (SELECT COALESCE(SUM(total_amount), 0)
   FROM orders o3
   WHERE o3.user_id = cc.user_id
     AND LOWER(o3.status) NOT IN ('cancelled', 'canceled')
  ) as total_spent,
  -- Get last order date
  (SELECT MAX(created_at)
   FROM orders o4
   WHERE o4.user_id = cc.user_id
     AND LOWER(o4.status) NOT IN ('cancelled', 'canceled')
  ) as last_order_date
FROM calaca_customers cc
LEFT JOIN user_profiles up ON up.user_id = cc.user_id
ORDER BY total_spent DESC, total_orders DESC, cc.user_id;




