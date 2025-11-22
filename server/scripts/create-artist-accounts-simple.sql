-- ====================================================
-- Create Artist Accounts - Alternative Method
-- ====================================================
-- This uses Supabase's built-in functions for user creation
-- Run this AFTER running the main artist system SQL
-- ====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================
-- CREATE ARTIST ACCOUNTS USING SUPABASE FUNCTIONS
-- ====================================================

-- Function to create artist account
CREATE OR REPLACE FUNCTION create_artist_account(
  p_email TEXT,
  p_password TEXT,
  p_artist_name TEXT,
  p_full_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    raw_app_meta_data,
    is_super_admin,
    last_sign_in_at,
    app_metadata,
    user_metadata,
    factors,
    identities,
    recovery_sent_at,
    email_change,
    email_change_sent_at,
    last_sign_in_ip,
    email_change_confirm_status,
    phone_change,
    phone_change_sent_at,
    phone_change_confirm_status,
    confirmed_at,
    email_change_token_current,
    phone_change_token_current,
    email_change_confirm_status_changed_at,
    phone_change_confirm_status_changed_at,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'role', 'artist',
      'artist_name', p_artist_name,
      'full_name', p_full_name
    ),
    '{}',
    false,
    null,
    '{}',
    '{}',
    null,
    null,
    null,
    '',
    0,
    '',
    0,
    now(),
    '',
    '',
    null,
    null,
    null,
    '',
    null,
    null,
    false,
    null,
    false
  ) RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- CREATE ALL 20 ARTIST ACCOUNTS
-- ====================================================

-- Create Artist 1
SELECT create_artist_account(
  'artist1@yohanns.com',
  'Artist123!',
  'Artist 1',
  'Artist One'
);

-- Create Artist 2
SELECT create_artist_account(
  'artist2@yohanns.com',
  'Artist123!',
  'Artist 2',
  'Artist Two'
);

-- Create Artist 3
SELECT create_artist_account(
  'artist3@yohanns.com',
  'Artist123!',
  'Artist 3',
  'Artist Three'
);

-- Create Artist 4
SELECT create_artist_account(
  'artist4@yohanns.com',
  'Artist123!',
  'Artist 4',
  'Artist Four'
);

-- Create Artist 5
SELECT create_artist_account(
  'artist5@yohanns.com',
  'Artist123!',
  'Artist 5',
  'Artist Five'
);

-- Create Artist 6
SELECT create_artist_account(
  'artist6@yohanns.com',
  'Artist123!',
  'Artist 6',
  'Artist Six'
);

-- Create Artist 7
SELECT create_artist_account(
  'artist7@yohanns.com',
  'Artist123!',
  'Artist 7',
  'Artist Seven'
);

-- Create Artist 8
SELECT create_artist_account(
  'artist8@yohanns.com',
  'Artist123!',
  'Artist 8',
  'Artist Eight'
);

-- Create Artist 9
SELECT create_artist_account(
  'artist9@yohanns.com',
  'Artist123!',
  'Artist 9',
  'Artist Nine'
);

-- Create Artist 10
SELECT create_artist_account(
  'artist10@yohanns.com',
  'Artist123!',
  'Artist 10',
  'Artist Ten'
);

-- Create Artist 11
SELECT create_artist_account(
  'artist11@yohanns.com',
  'Artist123!',
  'Artist 11',
  'Artist Eleven'
);

-- Create Artist 12
SELECT create_artist_account(
  'artist12@yohanns.com',
  'Artist123!',
  'Artist 12',
  'Artist Twelve'
);

-- Create Artist 13
SELECT create_artist_account(
  'artist13@yohanns.com',
  'Artist123!',
  'Artist 13',
  'Artist Thirteen'
);

-- Create Artist 14
SELECT create_artist_account(
  'artist14@yohanns.com',
  'Artist123!',
  'Artist 14',
  'Artist Fourteen'
);

-- Create Artist 15
SELECT create_artist_account(
  'artist15@yohanns.com',
  'Artist123!',
  'Artist 15',
  'Artist Fifteen'
);

-- Create Artist 16
SELECT create_artist_account(
  'artist16@yohanns.com',
  'Artist123!',
  'Artist 16',
  'Artist Sixteen'
);

-- Create Artist 17
SELECT create_artist_account(
  'artist17@yohanns.com',
  'Artist123!',
  'Artist 17',
  'Artist Seventeen'
);

-- Create Artist 18
SELECT create_artist_account(
  'artist18@yohanns.com',
  'Artist123!',
  'Artist 18',
  'Artist Eighteen'
);

-- Create Artist 19
SELECT create_artist_account(
  'artist19@yohanns.com',
  'Artist123!',
  'Artist 19',
  'Artist Nineteen'
);

-- Create Artist 20
SELECT create_artist_account(
  'artist20@yohanns.com',
  'Artist123!',
  'Artist 20',
  'Artist Twenty'
);

-- ====================================================
-- VERIFICATION
-- ====================================================

-- Check created accounts
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'artist_name' as artist_name,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'artist'
ORDER BY email;

-- Check artist profiles
SELECT 
  ap.artist_name,
  ap.is_active,
  ap.commission_rate,
  u.email
FROM artist_profiles ap
JOIN auth.users u ON ap.user_id = u.id
WHERE u.raw_user_meta_data->>'role' = 'artist'
ORDER BY ap.artist_name;

-- ====================================================
-- LOGIN CREDENTIALS
-- ====================================================

-- All artists can login with:
-- Email: artist1@yohanns.com through artist20@yohanns.com  
-- Password: Artist123!
--
-- The trigger will automatically create artist profiles
-- when these users are created.
