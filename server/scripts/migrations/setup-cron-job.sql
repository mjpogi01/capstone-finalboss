-- =====================================================
-- Setup Cron Job for Materialized Views Refresh
-- =====================================================
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- Step 1: Check if pg_cron extension is available
-- (If this returns no rows, pg_cron may not be available on your plan)
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Step 2: Verify the refresh function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'refresh_analytics_views';

-- Step 3: Create the cron job
-- Option A: Refresh every hour (RECOMMENDED)
SELECT cron.schedule(
  'refresh-analytics-views',           -- Job name
  '0 * * * *',                         -- Every hour at minute 0
  'SELECT refresh_analytics_views();'   -- Function to call
);

-- Step 4: Verify the cron job was created
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'refresh-analytics-views';

-- =====================================================
-- ALTERNATIVE SCHEDULES (Choose one)
-- =====================================================

-- Option B: Every 15 minutes during business hours (8 AM - 8 PM)
-- SELECT cron.schedule(
--   'refresh-analytics-views-frequent',
--   '*/15 8-20 * * *',
--   'SELECT refresh_analytics_views();'
-- );

-- Option C: Every 30 minutes
-- SELECT cron.schedule(
--   'refresh-analytics-views-30min',
--   '*/30 * * * *',
--   'SELECT refresh_analytics_views();'
-- );

-- Option D: Every 6 hours
-- SELECT cron.schedule(
--   'refresh-analytics-views-6h',
--   '0 */6 * * *',
--   'SELECT refresh_analytics_views();'
-- );

-- =====================================================
-- TESTING
-- =====================================================

-- Test the refresh function manually
SELECT refresh_analytics_views();

-- Check when materialized views were last refreshed
SELECT 
  schemaname, 
  matviewname, 
  last_refresh 
FROM pg_matviews 
WHERE matviewname LIKE 'mv_%'
ORDER BY last_refresh DESC;

-- =====================================================
-- MONITORING
-- =====================================================

-- View all cron jobs
SELECT * FROM cron.job;

-- View recent job runs (check for errors)
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-analytics-views')
ORDER BY start_time DESC
LIMIT 10;

-- =====================================================
-- MANAGEMENT COMMANDS
-- =====================================================

-- Pause the cron job
-- UPDATE cron.job SET active = false WHERE jobname = 'refresh-analytics-views';

-- Resume the cron job
-- UPDATE cron.job SET active = true WHERE jobname = 'refresh-analytics-views';

-- Delete the cron job
-- SELECT cron.unschedule('refresh-analytics-views');

-- Update the schedule
-- SELECT cron.alter_job(
--   (SELECT jobid FROM cron.job WHERE jobname = 'refresh-analytics-views'),
--   schedule := '*/30 * * * *'  -- New schedule
-- );







