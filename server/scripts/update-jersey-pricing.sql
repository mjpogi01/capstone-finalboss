-- Update all existing jersey products with new pricing structure
-- Base prices: Adult full ₱950, shirt ₱500, shorts ₱450; Kids full ₱850, shirt ₱450, shorts ₱400
-- Size surcharge: ₱50 for 2XL-8XL
-- Fabric surcharge: ₱100 for Microcool/Aircool/Drifit/Square Mesh, ₱0 for Polydex
-- Cut type surcharge: ₱100 for NBA Cut, ₱0 for Normal Cut

-- Update jersey_prices for all jersey products
UPDATE products
SET 
  jersey_prices = jsonb_build_object(
    'fullSet', 950,
    'shirtOnly', 500,
    'shortsOnly', 450,
    'fullSetKids', 850,
    'shirtOnlyKids', 450,
    'shortsOnlyKids', 400
  ),
  size_surcharges = jsonb_build_object(
    'adults', jsonb_build_object(
      '2XL', 50,
      '3XL', 50,
      '4XL', 50,
      '5XL', 50,
      '6XL', 50,
      '7XL', 50,
      '8XL', 50
    ),
    'kids', jsonb_build_object()
  ),
  fabric_surcharges = jsonb_build_object(
    'Polydex', 0,
    'Microcool', 100,
    'Aircool', 100,
    'Drifit', 100,
    'Square Mesh', 100
  ),
  cut_type_surcharges = jsonb_build_object(
    'Normal Cut', 0,
    'NBA Cut', 100
  ),
  price = 950, -- Update base price to full set price
  updated_at = NOW()
WHERE 
  category ILIKE '%jersey%'
  AND (jersey_prices IS NULL OR jersey_prices = '{}'::jsonb);

-- Also update products that have existing jersey_prices but need size/fabric/cut_type surcharges
UPDATE products
SET 
  size_surcharges = COALESCE(
    size_surcharges,
    jsonb_build_object(
      'adults', jsonb_build_object(
        '2XL', 50,
        '3XL', 50,
        '4XL', 50,
        '5XL', 50,
        '6XL', 50,
        '7XL', 50,
        '8XL', 50
      ),
      'kids', jsonb_build_object()
    )
  ),
  fabric_surcharges = COALESCE(
    fabric_surcharges,
    jsonb_build_object(
      'Polydex', 0,
      'Microcool', 100,
      'Aircool', 100,
      'Drifit', 100,
      'Square Mesh', 100
    )
  ),
  cut_type_surcharges = COALESCE(
    cut_type_surcharges,
    jsonb_build_object(
      'Normal Cut', 0,
      'NBA Cut', 100
    )
  ),
  updated_at = NOW()
WHERE 
  category ILIKE '%jersey%'
  AND (size_surcharges IS NULL OR fabric_surcharges IS NULL OR cut_type_surcharges IS NULL);

-- Update jersey_prices to new structure if they exist but have old values
UPDATE products
SET 
  jersey_prices = jsonb_build_object(
    'fullSet', COALESCE((jersey_prices->>'fullSet')::numeric, (jersey_prices->>'full_set')::numeric, 950),
    'shirtOnly', COALESCE((jersey_prices->>'shirtOnly')::numeric, (jersey_prices->>'shirt_only')::numeric, 500),
    'shortsOnly', COALESCE((jersey_prices->>'shortsOnly')::numeric, (jersey_prices->>'shorts_only')::numeric, 450),
    'fullSetKids', COALESCE((jersey_prices->>'fullSetKids')::numeric, (jersey_prices->>'full_set_kids')::numeric, 850),
    'shirtOnlyKids', COALESCE((jersey_prices->>'shirtOnlyKids')::numeric, (jersey_prices->>'shirt_only_kids')::numeric, 450),
    'shortsOnlyKids', COALESCE((jersey_prices->>'shortsOnlyKids')::numeric, (jersey_prices->>'shorts_only_kids')::numeric, 400)
  ),
  updated_at = NOW()
WHERE 
  category ILIKE '%jersey%'
  AND jersey_prices IS NOT NULL
  AND jersey_prices != '{}'::jsonb
  AND (
    (jersey_prices->>'fullSet')::numeric != 950 OR
    (jersey_prices->>'shirtOnly')::numeric != 500 OR
    (jersey_prices->>'shortsOnly')::numeric != 450
  );

