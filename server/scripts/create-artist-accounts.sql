-- ====================================================
-- Create Artist Accounts with Login Credentials
-- ====================================================
-- This script creates 20 artist accounts with login credentials
-- Run this AFTER running the main artist system SQL
-- ====================================================

-- Create 20 artist accounts
-- Each artist will have:
-- - Email: artist1@yohanns.com, artist2@yohanns.com, etc.
-- - Password: Artist123! (same for all, artists can change later)
-- - Role: 'artist'
-- - Artist profile will be auto-created by trigger

-- Note: These are temporary credentials for initial setup
-- Artists should change their passwords after first login

-- ====================================================
-- ARTIST ACCOUNTS CREATION
-- ====================================================

-- Artist 1
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist1@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 1", "full_name": "Artist One"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 2
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist2@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 2", "full_name": "Artist Two"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 3
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist3@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 3", "full_name": "Artist Three"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 4
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist4@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 4", "full_name": "Artist Four"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 5
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist5@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 5", "full_name": "Artist Five"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 6
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist6@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 6", "full_name": "Artist Six"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 7
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist7@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 7", "full_name": "Artist Seven"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 8
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist8@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 8", "full_name": "Artist Eight"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 9
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist9@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 9", "full_name": "Artist Nine"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 10
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist10@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 10", "full_name": "Artist Ten"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 11
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist11@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 11", "full_name": "Artist Eleven"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 12
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist12@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 12", "full_name": "Artist Twelve"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 13
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist13@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 13", "full_name": "Artist Thirteen"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 14
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist14@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 14", "full_name": "Artist Fourteen"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 15
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist15@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 15", "full_name": "Artist Fifteen"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 16
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist16@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 16", "full_name": "Artist Sixteen"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 17
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist17@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 17", "full_name": "Artist Seventeen"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 18
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist18@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 18", "full_name": "Artist Eighteen"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 19
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist19@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 19", "full_name": "Artist Nineteen"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Artist 20
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'artist20@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 20", "full_name": "Artist Twenty"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================

-- Check that all artist accounts were created
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'artist_name' as artist_name,
  email_confirmed_at
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'artist'
ORDER BY email;

-- Check that artist profiles were auto-created
SELECT 
  ap.artist_name,
  ap.is_active,
  ap.is_verified,
  ap.commission_rate,
  u.email
FROM artist_profiles ap
JOIN auth.users u ON ap.user_id = u.id
WHERE u.raw_user_meta_data->>'role' = 'artist'
ORDER BY ap.artist_name;

-- ====================================================
-- LOGIN CREDENTIALS SUMMARY
-- ====================================================

-- All artists can login with:
-- Email: artist1@yohanns.com through artist20@yohanns.com
-- Password: Artist123!
-- 
-- IMPORTANT SECURITY NOTES:
-- 1. These are temporary passwords for initial setup
-- 2. Artists should change their passwords after first login
-- 3. Consider implementing password reset functionality
-- 4. Monitor login attempts for security
-- 
-- NEXT STEPS:
-- 1. Test login with one of the accounts
-- 2. Verify artist dashboard access
-- 3. Set up password change functionality
-- 4. Configure email notifications for new tasks
