-- Add email column to user_addresses table
-- Run this in Supabase SQL Editor if the column doesn't exist

ALTER TABLE user_addresses 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'user_addresses' AND column_name = 'email';

