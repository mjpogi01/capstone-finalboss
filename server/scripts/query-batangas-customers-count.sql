-- Query to count distinct customers in Batangas province
-- Uses user_addresses table (customer's registered address)
-- This is the most accurate method as it uses where the customer lives

SELECT 
  COUNT(DISTINCT ua.user_id)::int as total_customers_in_batangas
FROM user_addresses ua
WHERE LOWER(TRIM(ua.province)) = 'batangas'
  AND ua.province IS NOT NULL
  AND TRIM(ua.province) != '';

