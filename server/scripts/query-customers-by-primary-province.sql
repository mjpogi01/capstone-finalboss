-- Count customers by their PRIMARY province (user_addresses)
-- This avoids double-counting customers who have orders in multiple provinces
-- Matches the data generation script's approach

SELECT 
  LOWER(TRIM(ua.province)) as province,
  COUNT(DISTINCT ua.user_id)::int as customer_count
FROM user_addresses ua
WHERE ua.province IS NOT NULL
  AND TRIM(ua.province) != ''
  AND ua.province IN ('Batangas', 'Oriental Mindoro')
GROUP BY LOWER(TRIM(ua.province))
ORDER BY province;

-- Total unique customers across both provinces
SELECT 
  COUNT(DISTINCT ua.user_id)::int as total_customers
FROM user_addresses ua
WHERE ua.province IS NOT NULL
  AND TRIM(ua.province) != ''
  AND ua.province IN ('Batangas', 'Oriental Mindoro');

