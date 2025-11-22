-- ====================================================
-- Check Existing Users and Fix Authentication
-- ====================================================

-- First, let's see what users exist
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any artist accounts already
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'artist_name' as artist_name
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'artist'
ORDER BY email;

-- ====================================================
-- SOLUTION: Delete manually created accounts and use proper method
-- ====================================================

-- Delete any manually created artist accounts (they won't work for auth)
DELETE FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'artist' 
AND email LIKE 'artist%@yohanns.com';

-- ====================================================
-- VERIFICATION
-- ====================================================

-- Check that artist accounts were removed
SELECT 
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'artist';

-- ====================================================
-- NEXT STEPS
-- ====================================================

-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" 
-- 3. Create test account:
--    Email: testartist@yohanns.com
--    Password: Test123!
--    User Metadata: {"role": "artist", "artist_name": "Test Artist", "full_name": "Test Artist"}
-- 4. Test login in your app
-- 5. If it works, create the remaining 19 accounts
