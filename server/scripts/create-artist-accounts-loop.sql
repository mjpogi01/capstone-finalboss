-- ====================================================
-- Create Artist Accounts - Loop Version (Simplest)
-- ====================================================
-- This version uses a loop to create all 20 artist accounts
-- Run this AFTER running the main artist system SQL
-- ====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================
-- CREATE ALL 20 ARTIST ACCOUNTS USING LOOP
-- ====================================================

DO $$
DECLARE
  i INTEGER;
  artist_email TEXT;
  artist_name TEXT;
  full_name TEXT;
BEGIN
  FOR i IN 1..20 LOOP
    artist_email := 'artist' || i || '@yohanns.com';
    artist_name := 'Artist ' || i;
    
    -- Create full name based on number
    CASE i
      WHEN 1 THEN full_name := 'Artist One';
      WHEN 2 THEN full_name := 'Artist Two';
      WHEN 3 THEN full_name := 'Artist Three';
      WHEN 4 THEN full_name := 'Artist Four';
      WHEN 5 THEN full_name := 'Artist Five';
      WHEN 6 THEN full_name := 'Artist Six';
      WHEN 7 THEN full_name := 'Artist Seven';
      WHEN 8 THEN full_name := 'Artist Eight';
      WHEN 9 THEN full_name := 'Artist Nine';
      WHEN 10 THEN full_name := 'Artist Ten';
      WHEN 11 THEN full_name := 'Artist Eleven';
      WHEN 12 THEN full_name := 'Artist Twelve';
      WHEN 13 THEN full_name := 'Artist Thirteen';
      WHEN 14 THEN full_name := 'Artist Fourteen';
      WHEN 15 THEN full_name := 'Artist Fifteen';
      WHEN 16 THEN full_name := 'Artist Sixteen';
      WHEN 17 THEN full_name := 'Artist Seventeen';
      WHEN 18 THEN full_name := 'Artist Eighteen';
      WHEN 19 THEN full_name := 'Artist Nineteen';
      WHEN 20 THEN full_name := 'Artist Twenty';
    END CASE;
    
    -- Insert artist account
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
      artist_email,
      crypt('Artist123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object(
        'role', 'artist',
        'artist_name', artist_name,
        'full_name', full_name
      )
    );
    
    RAISE NOTICE 'Created artist account: %', artist_email;
  END LOOP;
  
  RAISE NOTICE 'Successfully created all 20 artist accounts!';
END $$;

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
