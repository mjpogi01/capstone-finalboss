-- ====================================================
-- Add size and fabric surcharge support to products
-- ====================================================
-- Run this in the Supabase SQL editor or migration tooling.

-- Size surcharges: JSONB storing extra fees by size key.
-- Example:
-- {
--   "adults": { "2XL": 150, "3XL": 200 },
--   "kids": { "S6": 75 }
-- }
ALTER TABLE products
ADD COLUMN IF NOT EXISTS size_surcharges JSONB;

COMMENT ON COLUMN products.size_surcharges IS
'Per-size surcharge amounts. JSON may include nested objects for adults/kids or direct size keys.';

-- Fabric surcharges: JSONB storing extra fees by fabric option.
-- Example:
-- { "DryFit Elite": 120, "HeavyWeave": 80 }
ALTER TABLE products
ADD COLUMN IF NOT EXISTS fabric_surcharges JSONB;

COMMENT ON COLUMN products.fabric_surcharges IS
'Per-fabric surcharge amounts keyed by fabric option.';

-- Verification query
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('size_surcharges', 'fabric_surcharges');

