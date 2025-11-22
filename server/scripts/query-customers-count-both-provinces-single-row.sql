-- Count customers in Batangas and Oriental Mindoro (single row output)
-- Uses user_addresses table (customer's registered address)

SELECT 
  (SELECT COUNT(DISTINCT ua.user_id)::int 
   FROM user_addresses ua
   WHERE LOWER(TRIM(ua.province)) = 'batangas'
     AND ua.province IS NOT NULL
     AND TRIM(ua.province) != '') as batangas_customers,
  (SELECT COUNT(DISTINCT ua.user_id)::int 
   FROM user_addresses ua
   WHERE LOWER(TRIM(ua.province)) = 'oriental mindoro'
     AND ua.province IS NOT NULL
     AND TRIM(ua.province) != '') as mindoro_customers,
  (SELECT COUNT(DISTINCT ua.user_id)::int 
   FROM user_addresses ua
   WHERE ua.province IS NOT NULL
     AND TRIM(ua.province) != ''
     AND ua.province IN ('Batangas', 'Oriental Mindoro')) as total_unique_customers;

