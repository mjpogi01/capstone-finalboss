-- Summary: Total customers per city across both provinces
-- Uses user_addresses table
-- Shows top cities with most customers

SELECT 
  LOWER(TRIM(ua.city)) as city,
  LOWER(TRIM(ua.province)) as province,
  COUNT(DISTINCT ua.user_id)::int as customer_count
FROM user_addresses ua
WHERE ua.city IS NOT NULL
  AND TRIM(ua.city) != ''
  AND ua.province IS NOT NULL
  AND TRIM(ua.province) != ''
  AND ua.province IN ('Batangas', 'Oriental Mindoro')
GROUP BY LOWER(TRIM(ua.city)), LOWER(TRIM(ua.province))
ORDER BY customer_count DESC
LIMIT 20;

