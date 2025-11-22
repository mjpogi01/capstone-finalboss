-- Count customers per city in Oriental Mindoro province only
-- Uses user_addresses table

SELECT 
  LOWER(TRIM(ua.city)) as city,
  COUNT(DISTINCT ua.user_id)::int as customer_count
FROM user_addresses ua
WHERE ua.city IS NOT NULL
  AND TRIM(ua.city) != ''
  AND LOWER(TRIM(ua.province)) = 'oriental mindoro'
  AND ua.province IS NOT NULL
  AND TRIM(ua.province) != ''
GROUP BY LOWER(TRIM(ua.city))
ORDER BY customer_count DESC, city;

