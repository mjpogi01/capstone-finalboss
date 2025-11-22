-- ====================================================
-- Add Ball and Trophy Details Columns to user_carts Table
-- ====================================================

-- Add ball_details JSONB column to store ball customization details
ALTER TABLE user_carts 
ADD COLUMN IF NOT EXISTS ball_details JSONB;

-- Add trophy_details JSONB column to store trophy customization details
ALTER TABLE user_carts 
ADD COLUMN IF NOT EXISTS trophy_details JSONB;

-- Success! Cart can now store ball and trophy details:
-- - ball_details: { sportType, brand, ballSize, material }
-- - trophy_details: { size, engravingText, occasion }



























