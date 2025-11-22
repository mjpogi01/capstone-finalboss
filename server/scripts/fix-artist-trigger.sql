-- Fix Artist Profile Creation Trigger
-- This SQL should be run in Supabase SQL Editor

-- First, let's check if the trigger function exists
SELECT 
  routine_name, 
  routine_type, 
  routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'create_artist_profile_on_registration';

-- Check if the trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_artist_profile';

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_create_artist_profile ON auth.users;
DROP FUNCTION IF EXISTS create_artist_profile_on_registration();

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION create_artist_profile_on_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has artist role
  IF NEW.raw_user_meta_data->>'role' = 'artist' THEN
    -- Create artist profile with error handling
    BEGIN
      INSERT INTO artist_profiles (
        user_id,
        artist_name,
        bio,
        specialties,
        commission_rate,
        rating,
        is_verified,
        is_active
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'artist_name', 'Artist ' || NEW.id::text),
        'Professional design layout specialist',
        ARRAY['Layout Design', 'Custom Graphics', 'Team Jerseys'],
        12.00,
        0.00,
        false,
        true
      ) ON CONFLICT (user_id) DO NOTHING;
      
      -- Log successful creation
      RAISE NOTICE 'Artist profile created for user: %', NEW.email;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the user creation
      RAISE WARNING 'Failed to create artist profile for user %: %', NEW.email, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_create_artist_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_artist_profile_on_registration();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_artist_profile_on_registration() TO authenticated;
GRANT EXECUTE ON FUNCTION create_artist_profile_on_registration() TO service_role;

-- Test the trigger by checking if it exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_artist_profile';

-- Verify the function exists
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_name = 'create_artist_profile_on_registration';
