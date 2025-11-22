-- ====================================================
-- Update User Role via SQL (Alternative Method)
-- ====================================================
-- Since you can't edit raw JSON manually, use this SQL approach
-- ====================================================

-- Method 1: Update existing user's role to artist
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}', 
  '"artist"'::jsonb
)
WHERE email = 'yohannssportwear@gmail.com';

-- Method 2: Add artist_name to existing user metadata
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{artist_name}', 
  '"Yohanns Sportswear Artist"'::jsonb
)
WHERE email = 'yohannssportwear@gmail.com';

-- Method 3: Add full_name to existing user metadata
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{full_name}', 
  '"Yohanns Sportswear Artist"'::jsonb
)
WHERE email = 'yohannssportwear@gmail.com';

-- ====================================================
-- VERIFICATION
-- ====================================================

-- Check the updated user metadata
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'artist_name' as artist_name,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'yohannssportwear@gmail.com';

-- ====================================================
-- ALTERNATIVE: Create New Test Account via SQL
-- ====================================================

-- If the above doesn't work, create a completely new test account
-- This uses a different approach that should work with auth

-- First, let's try to create a test account using Supabase's auth functions
-- (This might work better than direct INSERT)

-- Note: You might need to use the Supabase Dashboard "Add User" button
-- and just set the email/password, then run this SQL to update the metadata:

-- For a new account created via Dashboard:
-- UPDATE auth.users 
-- SET raw_user_meta_data = '{"role": "artist", "artist_name": "Test Artist", "full_name": "Test Artist"}'::jsonb
-- WHERE email = 'testartist@yohanns.com';
