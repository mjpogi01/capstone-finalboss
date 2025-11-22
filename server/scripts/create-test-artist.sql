-- ====================================================
-- Create Test Artist Account - Complete Solution
-- ====================================================
-- This creates a test artist account that will work for authentication
-- ====================================================

-- First, check if the account exists
SELECT 
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users 
WHERE email = 'testartist@yohanns.com';

-- ====================================================
-- METHOD 1: Create Account via Supabase Dashboard (RECOMMENDED)
-- ====================================================

-- Go to Supabase Dashboard → Authentication → Users → Add User
-- Enter:
-- Email: testartist@yohanns.com
-- Password: Test123!
-- Check "Email Confirmed" if available
-- Leave User Metadata empty for now

-- Then run this SQL to update the metadata:
UPDATE auth.users 
SET raw_user_meta_data = '{"role": "artist", "artist_name": "Test Artist", "full_name": "Test Artist"}'::jsonb
WHERE email = 'testartist@yohanns.com';

-- ====================================================
-- METHOD 2: Create Account via SQL (Alternative)
-- ====================================================

-- If Dashboard method doesn't work, try this SQL approach:
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'testartist@yohanns.com',
  crypt('Test123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Test Artist", "full_name": "Test Artist"}'::jsonb
);

-- ====================================================
-- METHOD 3: Use Existing Account
-- ====================================================

-- If you want to use the existing yohannssportwear@gmail.com account:

-- First confirm the email (if not already done):
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'yohannssportwear@gmail.com';

-- Then update the metadata:
UPDATE auth.users 
SET raw_user_meta_data = '{"role": "artist", "artist_name": "Yohanns Sportswear Artist", "full_name": "Yohanns Sportswear Artist"}'::jsonb
WHERE email = 'yohannssportwear@gmail.com';

-- ====================================================
-- VERIFICATION
-- ====================================================

-- Check all artist accounts:
SELECT 
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'artist_name' as artist_name,
  created_at
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'artist'
ORDER BY email;

-- ====================================================
-- LOGIN TEST
-- ====================================================

-- After creating the account, test login with:
-- Email: testartist@yohanns.com
-- Password: Test123!
-- 
-- OR if using existing account:
-- Email: yohannssportwear@gmail.com
-- Password: (reset via Dashboard if needed)
