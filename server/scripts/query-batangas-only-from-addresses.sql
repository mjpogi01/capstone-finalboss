-- Alternative query: Count Batangas customers ONLY from user_addresses
-- This matches the data generation script's approach better
-- (since the script creates customers with addresses, not just orders)

SELECT 
  COUNT(DISTINCT ua.user_id)::int as batangas_customers_from_addresses
FROM user_addresses ua
WHERE LOWER(TRIM(ua.province)) = 'batangas'
  AND ua.province IS NOT NULL
  AND TRIM(ua.province) != '';

