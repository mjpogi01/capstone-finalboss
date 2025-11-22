-- ====================================================
-- Add surcharge-related columns to user_carts table
-- ====================================================

ALTER TABLE user_carts
ADD COLUMN IF NOT EXISTS base_price NUMERIC;

ALTER TABLE user_carts
ADD COLUMN IF NOT EXISTS unit_price NUMERIC;

ALTER TABLE user_carts
ADD COLUMN IF NOT EXISTS fabric_option TEXT;

ALTER TABLE user_carts
ADD COLUMN IF NOT EXISTS fabric_surcharge NUMERIC DEFAULT 0;

ALTER TABLE user_carts
ADD COLUMN IF NOT EXISTS size_surcharge NUMERIC DEFAULT 0;

ALTER TABLE user_carts
ADD COLUMN IF NOT EXISTS size_surcharge_total NUMERIC DEFAULT 0;

ALTER TABLE user_carts
ADD COLUMN IF NOT EXISTS surcharge_details JSONB;

COMMENT ON COLUMN user_carts.base_price IS 'Base unit price at time of add-to-cart (before surcharges).';
COMMENT ON COLUMN user_carts.unit_price IS 'Final unit price including surcharges.';
COMMENT ON COLUMN user_carts.fabric_option IS 'Selected fabric/material option.';
COMMENT ON COLUMN user_carts.fabric_surcharge IS 'Additional charge per unit for the fabric option.';
COMMENT ON COLUMN user_carts.size_surcharge IS 'Additional charge per unit for size selection.';
COMMENT ON COLUMN user_carts.size_surcharge_total IS 'Total size surcharge for the cart line (useful for team orders).';
COMMENT ON COLUMN user_carts.surcharge_details IS 'JSON breakdown of applied surcharges.';

