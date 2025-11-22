-- ====================================================
-- Fix Email Confirmation for Artist Account
-- ====================================================
-- This will confirm the email for the artist account
-- ====================================================

-- Method 1: Confirm the email for yohannssportwear@gmail.com
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'yohannssportwear@gmail.com';

-- Method 2: Also update the user metadata to artist role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}', 
  '"artist"'::jsonb
)
WHERE email = 'yohannssportwear@gmail.com';

-- Add artist_name
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{artist_name}', 
  '"Yohanns Sportswear Artist"'::jsonb
)
WHERE email = 'yohannssportwear@gmail.com';

-- Add full_name
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

-- Check that the email is now confirmed and role is set
SELECT 
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'artist_name' as artist_name,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users 
WHERE email = 'yohannssportwear@gmail.com';

-- ====================================================
-- ALTERNATIVE: Create New Confirmed Account
-- ====================================================

-- If you prefer to create a fresh test account:

-- Step 1: Create via Supabase Dashboard
-- - Go to Authentication > Users > Add User
-- - Email: testartist@yohanns.com
-- - Password: Test123!
-- - Check "Email Confirmed" checkbox if available

-- Step 2: Update metadata via SQL
-- UPDATE auth.users 
-- SET raw_user_meta_data = '{"role": "artist", "artist_name": "Test Artist", "full_name": "Test Artist"}'::jsonb
-- WHERE email = 'testartist@yohanns.com';

-- ====================================================
-- LOGIN CREDENTIALS AFTER FIX
-- ====================================================

-- After running this SQL, you should be able to login with:
-- Email: yohannssportwear@gmail.com
-- Password: (whatever password was set for this account)
-- 
-- If you don't know the password, reset it via Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Find yohannssportwear@gmail.com
-- 3. Click on the user
-- 4. Click "Reset Password"
-- 5. Set new password: Artist123!
