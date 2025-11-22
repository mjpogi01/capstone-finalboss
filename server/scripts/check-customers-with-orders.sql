-- Query to check how many customer accounts have orders
-- This query counts distinct customers who have placed at least one order

-- Option 1: Count all customers with orders (including cancelled orders)
SELECT 
  COUNT(DISTINCT user_id)::int AS total_customers_with_orders
FROM orders;

-- Option 2: Count customers with orders (excluding cancelled orders) - RECOMMENDED
SELECT 
  COUNT(DISTINCT user_id)::int AS total_customers_with_orders
FROM orders
WHERE LOWER(status) NOT IN ('cancelled', 'canceled');

-- Option 3: Count customers with orders, including current month
SELECT 
  COUNT(DISTINCT user_id)::int AS total_customers_with_orders,
  COUNT(*)::int AS total_orders,
  SUM(total_amount)::numeric AS total_revenue
FROM orders
WHERE LOWER(status) NOT IN ('cancelled', 'canceled');

-- Option 4: Count customers with orders AND verify they are customer accounts
SELECT 
  COUNT(DISTINCT o.user_id)::int AS total_customers_with_orders,
  COUNT(*)::int AS total_orders
FROM orders o
INNER JOIN auth.users u ON u.id = o.user_id
WHERE LOWER(o.status) NOT IN ('cancelled', 'canceled')
  AND (u.raw_user_meta_data->>'role' = 'customer' OR u.user_metadata->>'role' = 'customer');

-- Option 5: Detailed breakdown - customers with orders vs total customer accounts
WITH customers_with_orders AS (
  SELECT DISTINCT user_id
  FROM orders
  WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
),
all_customer_accounts AS (
  SELECT id
  FROM auth.users
  WHERE (raw_user_meta_data->>'role' = 'customer' OR user_metadata->>'role' = 'customer')
)
SELECT 
  (SELECT COUNT(*)::int FROM all_customer_accounts) AS total_customer_accounts,
  (SELECT COUNT(*)::int FROM customers_with_orders) AS customer_accounts_with_orders,
  (SELECT COUNT(*)::int FROM all_customer_accounts 
   WHERE id NOT IN (SELECT user_id FROM customers_with_orders)) AS customer_accounts_without_orders;

-- Option 6: Customers with orders by branch (if you want to filter by branch)
SELECT 
  COALESCE(NULLIF(TRIM(pickup_location), ''), 'Unspecified') AS branch,
  COUNT(DISTINCT user_id)::int AS customers_with_orders,
  COUNT(*)::int AS total_orders
FROM orders
WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
GROUP BY branch
ORDER BY customers_with_orders DESC;











