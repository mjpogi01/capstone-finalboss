# Analytics Performance Optimization Guide

This guide explains how to apply the analytics performance optimizations for Supabase Session Pooler.

## Overview

The optimizations include:
- **SQL Indexes** for faster queries
- **Materialized Views** for pre-aggregated data
- **RPC Functions** that combine multiple queries into single calls
- **React Query** for client-side caching
- **Virtualization** for large table views
- **Pagination** to limit data transfer

## Step 1: Apply SQL Migrations

Run the SQL migration file in your Supabase SQL Editor:

```bash
# File: server/scripts/migrations/optimize-analytics-performance.sql
```

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `optimize-analytics-performance.sql`
3. Click "Run" to execute

This will create:
- **Indexes** on `orders` table (created_at, user_id, status, etc.)
- **Materialized Views** for daily/monthly revenue, branch sales, order status
- **RPC Functions**: `get_analytics_dashboard`, `get_recent_orders_paginated`, `get_top_products`, `get_top_categories`
- **Refresh Function**: `refresh_analytics_views()`

## Step 2: Set Up Cron Job for Materialized Views

Materialized views need to be refreshed periodically. Set up a cron job in Supabase:

1. Go to Supabase Dashboard → Database → Cron Jobs
2. Create a new cron job with:

```sql
SELECT cron.schedule(
  'refresh-analytics-views',
  '0 * * * *',  -- Every hour
  'SELECT refresh_analytics_views();'
);
```

Or for more frequent updates during business hours:

```sql
SELECT cron.schedule(
  'refresh-analytics-views-frequent',
  '*/15 8-20 * * *',  -- Every 15 minutes, 8 AM to 8 PM
  'SELECT refresh_analytics_views();'
);
```

## Step 3: Install Dependencies

```bash
npm install react-query@^3.39.3 react-window@^1.8.10
```

## Step 4: Backend Changes

The backend route `/api/analytics/dashboard` has been updated to:
1. **First try** using the optimized RPC function `get_analytics_dashboard`
2. **Fallback** to the original implementation if RPC is not available

This ensures backward compatibility while providing performance benefits when RPC functions are available.

## Step 5: Frontend Changes

### React Query Setup

React Query has been added to `App.js` with optimized defaults:
- **staleTime**: 5 minutes (data is fresh for 5 minutes)
- **cacheTime**: 10 minutes (unused data stays in cache)
- **Retry**: 2 attempts with exponential backoff

### Using the Hooks

Replace direct API calls with React Query hooks:

```javascript
import { useDashboardAnalytics, useRecentOrders } from '../hooks/useAnalytics';

// In your component
const { data, isLoading, error } = useDashboardAnalytics(branchId);
```

### Virtualized Tables

For large datasets, use the `VirtualizedTable` component:

```javascript
import VirtualizedTable from '../components/admin/VirtualizedTable';

<VirtualizedTable
  data={orders}
  columns={[
    { key: 'order_number', header: 'Order #', width: '20%' },
    { key: 'total_amount', header: 'Amount', width: '15%', render: (row) => `₱${row.total_amount}` },
    { key: 'status', header: 'Status', width: '15%' },
    { key: 'created_at', header: 'Date', width: '20%' },
  ]}
  height={400}
  rowHeight={50}
/>
```

## Performance Benefits

### Before Optimization
- **7,000+ orders** loaded directly into React
- **Multiple separate queries** (6+ database calls)
- **No caching** - refetches on every page load
- **Full table rendering** - all rows in DOM

### After Optimization
- **Aggregated data only** - minimal rows returned
- **Single RPC call** - combines all queries
- **5-minute caching** - reduces API calls by ~90%
- **Virtualized rendering** - only visible rows in DOM
- **Pagination** - loads 50-100 rows at a time

## Expected Performance Improvements

- **Initial Load**: 80-90% faster (from ~3-5s to ~0.5-1s)
- **Subsequent Loads**: 95% faster (cached data, ~50ms)
- **Database Load**: 70-80% reduction (materialized views + caching)
- **Memory Usage**: 60-70% reduction (virtualization)
- **Network Transfer**: 85-90% reduction (aggregated data)

## Monitoring

Check materialized view refresh status:

```sql
SELECT schemaname, matviewname, last_refresh 
FROM pg_matviews 
WHERE matviewname LIKE 'mv_%';
```

Check RPC function usage:

```sql
SELECT * FROM pg_stat_user_functions 
WHERE funcname LIKE 'get_analytics%';
```

## Troubleshooting

### RPC Functions Not Found
If you see errors about RPC functions not existing:
1. Verify the SQL migration ran successfully
2. Check function permissions: `GRANT EXECUTE ON FUNCTION get_analytics_dashboard TO authenticated;`

### Materialized Views Not Updating
1. Check cron job is running: `SELECT * FROM cron.job;`
2. Manually refresh: `SELECT refresh_analytics_views();`
3. Check for errors in Supabase logs

### React Query Not Caching
1. Verify `QueryClientProvider` is in `App.js`
2. Check browser DevTools → Network tab (should see cached requests)
3. Verify `staleTime` is set correctly in hooks

## Rollback

If you need to rollback:

1. **Remove RPC functions** (optional - backend will fallback automatically):
```sql
DROP FUNCTION IF EXISTS get_analytics_dashboard;
DROP FUNCTION IF EXISTS get_recent_orders_paginated;
DROP FUNCTION IF EXISTS get_top_products;
DROP FUNCTION IF EXISTS get_top_categories;
DROP FUNCTION IF EXISTS refresh_analytics_views;
```

2. **Remove materialized views** (optional):
```sql
DROP MATERIALIZED VIEW IF EXISTS mv_daily_revenue;
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_revenue;
DROP MATERIALIZED VIEW IF EXISTS mv_branch_sales;
DROP MATERIALIZED VIEW IF EXISTS mv_order_status_summary;
```

3. **Remove indexes** (optional - they don't hurt performance):
```sql
-- Keep indexes - they improve performance even without materialized views
```

4. **Frontend**: The React Query hooks are backward compatible - they'll work with the old API endpoints.

## Next Steps

1. Monitor performance in production
2. Adjust `staleTime` based on your needs (more frequent updates = lower staleTime)
3. Consider adding more materialized views for other analytics queries
4. Set up alerts for materialized view refresh failures



