-- Count customers in Batangas and Oriental Mindoro by their registered address
-- Uses user_addresses table (where customer lives)
-- This is the most accurate method as it uses the customer's registered address

SELECT 
  LOWER(TRIM(ua.province)) as province,
  COUNT(DISTINCT ua.user_id)::int as customer_count
FROM user_addresses ua
WHERE ua.province IS NOT NULL
  AND TRIM(ua.province) != ''
  AND ua.province IN ('Batangas', 'Oriental Mindoro')
GROUP BY LOWER(TRIM(ua.province))
ORDER BY 
  CASE LOWER(TRIM(ua.province))
    WHEN 'batangas' THEN 1
    WHEN 'oriental mindoro' THEN 2
    ELSE 3
  END;

