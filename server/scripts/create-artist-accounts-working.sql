-- ====================================================
-- Create Artist Accounts - Working Version
-- ====================================================
-- This version works with Supabase's actual auth.users table structure
-- Run this AFTER running the main artist system SQL
-- ====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================
-- CREATE ARTIST ACCOUNTS - SIMPLE APPROACH
-- ====================================================

-- Create Artist 1
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
  'artist1@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 1", "full_name": "Artist One"}'
);

-- Create Artist 2
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
  'artist2@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 2", "full_name": "Artist Two"}'
);

-- Create Artist 3
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
  'artist3@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 3", "full_name": "Artist Three"}'
);

-- Create Artist 4
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
  'artist4@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 4", "full_name": "Artist Four"}'
);

-- Create Artist 5
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
  'artist5@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 5", "full_name": "Artist Five"}'
);

-- Create Artist 6
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
  'artist6@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 6", "full_name": "Artist Six"}'
);

-- Create Artist 7
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
  'artist7@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 7", "full_name": "Artist Seven"}'
);

-- Create Artist 8
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
  'artist8@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 8", "full_name": "Artist Eight"}'
);

-- Create Artist 9
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
  'artist9@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 9", "full_name": "Artist Nine"}'
);

-- Create Artist 10
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
  'artist10@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 10", "full_name": "Artist Ten"}'
);

-- Create Artist 11
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
  'artist11@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 11", "full_name": "Artist Eleven"}'
);

-- Create Artist 12
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
  'artist12@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 12", "full_name": "Artist Twelve"}'
);

-- Create Artist 13
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
  'artist13@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 13", "full_name": "Artist Thirteen"}'
);

-- Create Artist 14
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
  'artist14@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 14", "full_name": "Artist Fourteen"}'
);

-- Create Artist 15
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
  'artist15@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 15", "full_name": "Artist Fifteen"}'
);

-- Create Artist 16
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
  'artist16@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 16", "full_name": "Artist Sixteen"}'
);

-- Create Artist 17
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
  'artist17@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 17", "full_name": "Artist Seventeen"}'
);

-- Create Artist 18
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
  'artist18@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 18", "full_name": "Artist Eighteen"}'
);

-- Create Artist 19
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
  'artist19@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 19", "full_name": "Artist Nineteen"}'
);

-- Create Artist 20
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
  'artist20@yohanns.com',
  crypt('Artist123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"role": "artist", "artist_name": "Artist 20", "full_name": "Artist Twenty"}'
);

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================

-- Check that all artist accounts were created
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'artist_name' as artist_name,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'artist'
ORDER BY email;

-- Check that artist profiles were auto-created by trigger
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
-- 3. The trigger will automatically create artist profiles
-- 4. All accounts are pre-confirmed and ready to use
-- 
-- NEXT STEPS:
-- 1. Test login with artist1@yohanns.com / Artist123!
-- 2. Verify artist dashboard access
-- 3. Set up password change functionality
-- 4. Configure email notifications for new tasks
