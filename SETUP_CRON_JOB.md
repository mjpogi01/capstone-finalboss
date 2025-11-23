# How to Set Up Cron Job for Materialized Views in Supabase

## Overview

Materialized views need to be refreshed periodically to stay up-to-date. Supabase uses the `pg_cron` extension to schedule these refreshes.

## Step-by-Step Instructions

### Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on **"SQL Editor"** in the left sidebar
   - Or go to: Database → SQL Editor

3. **Enable pg_cron Extension** (if not already enabled)
   ```sql
   -- Check if pg_cron is enabled
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   
   -- If not enabled, run this (requires superuser - may need to contact Supabase support)
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

4. **Create the Cron Job**
   
   **Option A: Refresh Every Hour** (Recommended for most cases)
   ```sql
   SELECT cron.schedule(
     'refresh-analytics-views',           -- Job name (unique identifier)
     '0 * * * *',                         -- Schedule: Every hour at minute 0
     'SELECT refresh_analytics_views();'   -- SQL to execute
   );
   ```

   **Option B: Refresh Every 15 Minutes During Business Hours** (More frequent updates)
   ```sql
   SELECT cron.schedule(
     'refresh-analytics-views-frequent',
     '*/15 8-20 * * *',                   -- Every 15 minutes, 8 AM to 8 PM
     'SELECT refresh_analytics_views();'
   );
   ```

   **Option C: Refresh Every 30 Minutes** (Balanced)
   ```sql
   SELECT cron.schedule(
     'refresh-analytics-views-30min',
     '*/30 * * * *',                      -- Every 30 minutes
     'SELECT refresh_analytics_views();'
   );
   ```

5. **Verify the Cron Job Was Created**
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE '%analytics%';
   ```

6. **Test the Cron Job Manually** (Optional)
   ```sql
   -- Manually trigger the refresh function to test
   SELECT refresh_analytics_views();
   
   -- Check if materialized views were updated
   SELECT schemaname, matviewname, last_refresh 
   FROM pg_matviews 
   WHERE matviewname LIKE 'mv_%';
   ```

### Method 2: Using Supabase CLI

If you prefer using the CLI:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the SQL file
supabase db execute -f server/scripts/migrations/setup-cron.sql
```

## Cron Schedule Syntax

The cron schedule uses standard cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

### Common Schedule Examples

| Schedule | Description | Syntax |
|----------|-------------|--------|
| Every hour | At minute 0 of every hour | `0 * * * *` |
| Every 15 minutes | Every 15 minutes | `*/15 * * * *` |
| Every 30 minutes | Every 30 minutes | `*/30 * * * *` |
| Every day at midnight | At 00:00 daily | `0 0 * * *` |
| Business hours (8 AM - 8 PM) | Every 15 min, 8 AM to 8 PM | `*/15 8-20 * * *` |
| Every 6 hours | At 00:00, 06:00, 12:00, 18:00 | `0 */6 * * *` |
| Weekdays only | Every hour, Mon-Fri | `0 * * * 1-5` |

## Managing Cron Jobs

### View All Cron Jobs
```sql
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job;
```

### View Job Run History
```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-analytics-views')
ORDER BY start_time DESC
LIMIT 10;
```

### Update an Existing Cron Job
```sql
-- Update the schedule
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'refresh-analytics-views'),
  schedule := '*/30 * * * *'  -- New schedule: every 30 minutes
);
```

### Pause a Cron Job
```sql
-- Disable the job
UPDATE cron.job 
SET active = false 
WHERE jobname = 'refresh-analytics-views';
```

### Resume a Cron Job
```sql
-- Enable the job
UPDATE cron.job 
SET active = true 
WHERE jobname = 'refresh-analytics-views';
```

### Delete a Cron Job
```sql
-- Remove the job
SELECT cron.unschedule('refresh-analytics-views');
```

## Troubleshooting

### Issue: "pg_cron extension not available"

**Solution**: 
- On Supabase free tier, `pg_cron` may not be available
- Contact Supabase support or upgrade to a paid plan
- Alternative: Use Supabase Edge Functions with scheduled triggers
- Or manually refresh views when needed

### Issue: "Permission denied"

**Solution**:
- Ensure you're using the service role key or have superuser access
- Some operations require database owner permissions

### Issue: "Cron job not running"

**Check**:
1. Verify the job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'refresh-analytics-views';
   ```

2. Check if job is active:
   ```sql
   SELECT active FROM cron.job WHERE jobname = 'refresh-analytics-views';
   ```

3. Check recent job runs for errors:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-analytics-views')
   ORDER BY start_time DESC 
   LIMIT 5;
   ```

### Issue: "Materialized views not updating"

**Check**:
1. Verify the refresh function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'refresh_analytics_views';
   ```

2. Test the function manually:
   ```sql
   SELECT refresh_analytics_views();
   ```

3. Check for errors in Supabase logs:
   - Go to Dashboard → Logs → Postgres Logs

## Alternative: Manual Refresh

If cron is not available, you can manually refresh views:

```sql
-- Refresh all materialized views
SELECT refresh_analytics_views();

-- Or refresh individually
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_branch_sales;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_status_summary;
```

## Alternative: Supabase Edge Functions (If pg_cron unavailable)

If `pg_cron` is not available, you can use Supabase Edge Functions with external schedulers:

1. Create an Edge Function that calls `refresh_analytics_views()`
2. Use a service like:
   - GitHub Actions (scheduled workflows)
   - Vercel Cron Jobs
   - AWS EventBridge
   - Google Cloud Scheduler

## Recommended Setup

For most use cases, we recommend:

```sql
-- Refresh every hour (good balance of freshness and performance)
SELECT cron.schedule(
  'refresh-analytics-views',
  '0 * * * *',
  'SELECT refresh_analytics_views();'
);
```

This ensures:
- ✅ Analytics data is never more than 1 hour old
- ✅ Minimal database load (only 24 refreshes per day)
- ✅ Good performance for dashboard queries
- ✅ Works well with React Query's 5-minute cache

## Verification Checklist

After setting up cron:

- [ ] Cron job created successfully
- [ ] Job is active (`active = true`)
- [ ] Manual refresh test works
- [ ] Check job run history after first scheduled run
- [ ] Verify materialized views have recent `last_refresh` timestamps
- [ ] Monitor for any errors in job run details

## Next Steps

1. Set up the cron job using one of the methods above
2. Wait for the first scheduled run (or trigger manually)
3. Verify the materialized views are updating
4. Monitor performance and adjust schedule if needed

For questions or issues, check the Supabase documentation on [pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron).


