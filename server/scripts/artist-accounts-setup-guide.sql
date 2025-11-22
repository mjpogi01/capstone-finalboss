-- ====================================================
-- QUICK ARTIST ACCOUNT SETUP GUIDE
-- ====================================================
-- Since manual SQL user creation is causing auth issues,
-- here's the recommended approach:
-- ====================================================

-- ====================================================
-- METHOD 1: Use Supabase Dashboard (RECOMMENDED)
-- ====================================================

-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add User" 
-- 4. Create users with these details:

-- Artist 1:
-- Email: artist1@yohanns.com
-- Password: Artist123!
-- User Metadata: {"role": "artist", "artist_name": "Artist 1", "full_name": "Artist One"}

-- Artist 2:
-- Email: artist2@yohanns.com
-- Password: Artist123!
-- User Metadata: {"role": "artist", "artist_name": "Artist 2", "full_name": "Artist Two"}

-- ... and so on for all 20 artists

-- ====================================================
-- METHOD 2: Test with One Account First
-- ====================================================

-- Create just one test artist account to verify the system works:

-- Test Artist Account:
-- Email: testartist@yohanns.com
-- Password: Test123!
-- User Metadata: {"role": "artist", "artist_name": "Test Artist", "full_name": "Test Artist"}

-- ====================================================
-- METHOD 3: Use Frontend Registration (If Available)
-- ====================================================

-- If your app has a registration form, you can:
-- 1. Use the registration form to create artist accounts
-- 2. Then manually update the user metadata in Supabase Dashboard
-- 3. Add {"role": "artist", "artist_name": "Artist Name"} to user_metadata

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================

-- After creating accounts via Supabase Dashboard, verify with:

-- Check artist users
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'artist_name' as artist_name,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'artist'
ORDER BY email;

-- Check artist profiles (should be auto-created by trigger)
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
-- IMPORTANT NOTES:
-- 1. Create accounts via Supabase Dashboard for proper auth setup
-- 2. The trigger will automatically create artist profiles
-- 3. All accounts should be email-confirmed
-- 4. Test with one account first before creating all 20
-- 
-- NEXT STEPS:
-- 1. Create test account via Supabase Dashboard
-- 2. Test login with testartist@yohanns.com / Test123!
-- 3. Verify artist dashboard access works
-- 4. Then create remaining 19 accounts
-- 5. Set up password change functionality
