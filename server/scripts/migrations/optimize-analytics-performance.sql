-- =====================================================
-- Analytics Performance Optimization
-- Optimized for Supabase Session Pooler
-- =====================================================

-- 1. CREATE ESSENTIAL INDEXES
-- =====================================================

-- Index on orders.created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Index on orders.user_id for customer analytics
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;

-- Index on orders.status for status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status) WHERE LOWER(status) NOT IN ('cancelled', 'canceled');

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC) 
  WHERE LOWER(status) NOT IN ('cancelled', 'canceled');

-- Index on orders.pickup_branch_id for branch filtering
CREATE INDEX IF NOT EXISTS idx_orders_pickup_branch_id ON orders(pickup_branch_id) 
  WHERE pickup_branch_id IS NOT NULL;

-- Index on orders.pickup_location for branch name filtering
CREATE INDEX IF NOT EXISTS idx_orders_pickup_location ON orders(pickup_location) 
  WHERE pickup_location IS NOT NULL;

-- Index on order_items (for JSONB queries)
CREATE INDEX IF NOT EXISTS idx_orders_order_items_gin ON orders USING GIN(order_items);

-- 2. CREATE MATERIALIZED VIEWS
-- =====================================================

-- Daily revenue summary (refreshed via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue,
  COUNT(DISTINCT user_id) AS unique_customers
FROM orders
WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
  AND created_at < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue_date ON mv_daily_revenue(date DESC);

-- Monthly revenue summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_revenue AS
SELECT 
  DATE_TRUNC('month', created_at) AS month_start,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue,
  COUNT(DISTINCT user_id) AS unique_customers,
  AVG(total_amount) AS avg_order_value
FROM orders
WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
  AND created_at < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_revenue_month ON mv_monthly_revenue(month_start DESC);

-- Branch sales summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_branch_sales AS
SELECT 
  COALESCE(pickup_branch_id::text, pickup_location, 'Online Orders') AS branch_key,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue,
  COUNT(DISTINCT user_id) AS unique_customers
FROM orders
WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
  AND created_at < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY COALESCE(pickup_branch_id::text, pickup_location, 'Online Orders');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_branch_sales_key ON mv_branch_sales(branch_key);

-- Order status summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_order_status_summary AS
SELECT 
  LOWER(status) AS status,
  COUNT(*) AS count
FROM orders
WHERE status IS NOT NULL
GROUP BY LOWER(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_order_status_summary_status ON mv_order_status_summary(status);

-- 3. CREATE OPTIMIZED RPC FUNCTIONS
-- =====================================================

-- Main analytics dashboard RPC (combines all queries into one call)
CREATE OR REPLACE FUNCTION get_analytics_dashboard(
  p_branch_id INTEGER DEFAULT NULL,
  p_branch_name TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_branch_filter TEXT := '';
  v_params TEXT[] := ARRAY[]::TEXT[];
  v_param_count INTEGER := 0;
BEGIN
  -- Build branch filter
  IF p_branch_id IS NOT NULL THEN
    v_branch_filter := ' AND (pickup_branch_id = $' || (v_param_count + 1)::TEXT || ')';
    v_params := array_append(v_params, p_branch_id::TEXT);
    v_param_count := v_param_count + 1;
  ELSIF p_branch_name IS NOT NULL THEN
    v_branch_filter := ' AND (pickup_location ILIKE $' || (v_param_count + 1)::TEXT || ')';
    v_params := array_append(v_params, '%' || p_branch_name || '%');
    v_param_count := v_param_count + 1;
  END IF;

  -- Date filters
  IF p_start_date IS NULL THEN
    p_start_date := DATE_TRUNC('month', CURRENT_DATE);
  END IF;
  IF p_end_date IS NULL THEN
    p_end_date := CURRENT_TIMESTAMP;
  END IF;

  -- Execute single query that returns all analytics as JSON
  EXECUTE format('
    SELECT jsonb_build_object(
      ''summary'', (
        SELECT jsonb_build_object(
          ''totalRevenue'', COALESCE(SUM(total_amount), 0),
          ''totalOrders'', COUNT(*),
          ''totalCustomers'', COUNT(DISTINCT user_id),
          ''averageOrderValue'', COALESCE(AVG(total_amount), 0)
        )
        FROM orders
        WHERE LOWER(status) NOT IN (''cancelled'', ''canceled'')
          AND created_at < $%s
          %s
      ),
      ''orderStatus'', (
        SELECT jsonb_build_object(
          ''completed'', jsonb_build_object(
            ''count'', COALESCE(SUM(CASE WHEN LOWER(status) IN (''picked_up_delivered'', ''completed'', ''delivered'', ''picked_up'', ''finished'') THEN 1 ELSE 0 END), 0),
            ''percentage'', CASE 
              WHEN (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s) > 0
              THEN ROUND((SUM(CASE WHEN LOWER(status) IN (''picked_up_delivered'', ''completed'', ''delivered'', ''picked_up'', ''finished'') THEN 1 ELSE 0 END)::numeric / (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s)) * 100)
              ELSE 0
            END
          ),
          ''processing'', jsonb_build_object(
            ''count'', COALESCE(SUM(CASE WHEN LOWER(status) IN (''confirmed'', ''layout'', ''sizing'', ''printing'', ''press'', ''prod'', ''packing_completing'', ''processing'', ''in_production'', ''ready_for_pickup'', ''ready_for_delivery'') THEN 1 ELSE 0 END), 0),
            ''percentage'', CASE 
              WHEN (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s) > 0
              THEN ROUND((SUM(CASE WHEN LOWER(status) IN (''confirmed'', ''layout'', ''sizing'', ''printing'', ''press'', ''prod'', ''packing_completing'', ''processing'', ''in_production'', ''ready_for_pickup'', ''ready_for_delivery'') THEN 1 ELSE 0 END)::numeric / (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s)) * 100)
              ELSE 0
            END
          ),
          ''pending'', jsonb_build_object(
            ''count'', COALESCE(SUM(CASE WHEN LOWER(status) IN (''pending'', ''payment_pending'', ''awaiting_payment'', ''awaiting_confirmation'') THEN 1 ELSE 0 END), 0),
            ''percentage'', CASE 
              WHEN (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s) > 0
              THEN ROUND((SUM(CASE WHEN LOWER(status) IN (''pending'', ''payment_pending'', ''awaiting_payment'', ''awaiting_confirmation'') THEN 1 ELSE 0 END)::numeric / (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s)) * 100)
              ELSE 0
            END
          ),
          ''cancelled'', jsonb_build_object(
            ''count'', COALESCE(SUM(CASE WHEN LOWER(status) IN (''cancelled'', ''canceled'') THEN 1 ELSE 0 END), 0),
            ''percentage'', CASE 
              WHEN (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s) > 0
              THEN ROUND((SUM(CASE WHEN LOWER(status) IN (''cancelled'', ''canceled'') THEN 1 ELSE 0 END)::numeric / (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s)) * 100)
              ELSE 0
            END
          ),
          ''total'', (SELECT COUNT(*) FROM orders WHERE status IS NOT NULL %s)
        )
        FROM orders
        WHERE status IS NOT NULL %s
      ),
      ''monthlySales'', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            ''key'', to_char(month_start, ''YYYY-MM''),
            ''year'', EXTRACT(YEAR FROM month_start)::integer,
            ''month'', EXTRACT(MONTH FROM month_start)::integer,
            ''label'', to_char(month_start, ''Mon YYYY''),
            ''date'', month_start::text,
            ''sales'', ROUND(revenue),
            ''granularity'', ''monthly''
          ) ORDER BY month_start
        ), ''[]''::jsonb)
        FROM mv_monthly_revenue
        WHERE month_start < $%s
      ),
      ''yearlySales'', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            ''year'', year::integer,
            ''label'', year::text,
            ''date'', (year || ''-01-01'')::date::text,
            ''sales'', ROUND(revenue),
            ''granularity'', ''yearly''
          ) ORDER BY year
        ), ''[]''::jsonb)
        FROM (
          SELECT 
            EXTRACT(YEAR FROM month_start)::integer AS year,
            SUM(revenue) AS revenue
          FROM mv_monthly_revenue
          WHERE month_start < $%s
          GROUP BY EXTRACT(YEAR FROM month_start)
        ) yearly
      ),
      ''salesByBranch'', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            ''branch'', branch_key,
            ''sales'', ROUND(revenue)
          ) ORDER BY revenue DESC
        ), ''[]''::jsonb)
        FROM mv_branch_sales
        WHERE %s
      ),
      ''recentOrders'', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            ''id'', id,
            ''order_number'', order_number,
            ''total_amount'', total_amount,
            ''status'', status,
            ''created_at'', created_at::text,
            ''user_id'', user_id
          ) ORDER BY created_at DESC
        ), ''[]''::jsonb)
        FROM (
          SELECT id, order_number, total_amount, status, created_at, user_id
          FROM orders
          WHERE LOWER(status) NOT IN (''cancelled'', ''canceled'')
            AND created_at >= $%s
            %s
          ORDER BY created_at DESC
          LIMIT 50
        ) recent
      )
    )',
    v_param_count + 1, -- $1 for start_date
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_branch_filter,
    v_param_count + 1, -- $1 for start_date (monthly)
    v_param_count + 1, -- $1 for start_date (yearly)
    CASE 
      WHEN p_branch_id IS NOT NULL THEN 'branch_key = $' || (v_param_count + 1)::TEXT
      WHEN p_branch_name IS NOT NULL THEN 'branch_key ILIKE $' || (v_param_count + 1)::TEXT
      ELSE 'TRUE'
    END,
    v_param_count + 2, -- $2 for thirty_days_ago
    v_branch_filter
  )
  USING p_start_date, p_end_date, p_branch_id, p_branch_name
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Get paginated recent orders with customer info
CREATE OR REPLACE FUNCTION get_recent_orders_paginated(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_branch_id INTEGER DEFAULT NULL,
  p_branch_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_branch_filter TEXT := '';
BEGIN
  -- Build branch filter
  IF p_branch_id IS NOT NULL THEN
    v_branch_filter := ' AND pickup_branch_id = ' || p_branch_id::TEXT;
  ELSIF p_branch_name IS NOT NULL THEN
    v_branch_filter := ' AND pickup_location ILIKE ''%' || REPLACE(p_branch_name, '''', '''''') || '%''';
  END IF;

  EXECUTE format('
    SELECT jsonb_build_object(
      ''orders'', COALESCE(jsonb_agg(
        jsonb_build_object(
          ''id'', o.id,
          ''order_number'', o.order_number,
          ''total_amount'', o.total_amount,
          ''status'', o.status,
          ''created_at'', o.created_at::text,
          ''user_id'', o.user_id,
          ''customer_email'', COALESCE(au.email, ''N/A'')
        ) ORDER BY o.created_at DESC
      ), ''[]''::jsonb),
      ''total'', (
        SELECT COUNT(*)
        FROM orders o2
        WHERE LOWER(o2.status) NOT IN (''cancelled'', ''canceled'')
          AND o2.created_at >= CURRENT_DATE - INTERVAL ''30 days''
          %s
      ),
      ''limit'', %s,
      ''offset'', %s
    )
    FROM (
      SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at, o.user_id
      FROM orders o
      WHERE LOWER(o.status) NOT IN (''cancelled'', ''canceled'')
        AND o.created_at >= CURRENT_DATE - INTERVAL ''30 days''
        %s
      ORDER BY o.created_at DESC
      LIMIT %s OFFSET %s
    ) o
    LEFT JOIN auth.users au ON o.user_id = au.id',
    v_branch_filter,
    p_limit,
    p_offset,
    v_branch_filter,
    p_limit,
    p_offset
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Get top products (aggregated from order_items)
CREATE OR REPLACE FUNCTION get_top_products(
  p_limit INTEGER DEFAULT 10,
  p_branch_id INTEGER DEFAULT NULL,
  p_branch_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_branch_filter TEXT := '';
BEGIN
  -- Build branch filter
  IF p_branch_id IS NOT NULL THEN
    v_branch_filter := ' AND o.pickup_branch_id = ' || p_branch_id::TEXT;
  ELSIF p_branch_name IS NOT NULL THEN
    v_branch_filter := ' AND o.pickup_location ILIKE ''%' || REPLACE(p_branch_name, '''', '''''') || '%''';
  END IF;

  EXECUTE format('
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        ''product'', product_group,
        ''quantity'', total_quantity,
        ''orders'', order_count,
        ''revenue'', ROUND(total_revenue)
      ) ORDER BY total_quantity DESC
    ), ''[]''::jsonb)
    FROM (
      SELECT 
        CASE
          WHEN LOWER(item->>''category'') IN (''jerseys'', ''uniforms'', ''t-shirts'', ''long sleeves'', ''hoodies'') THEN ''Apparel''
          WHEN LOWER(item->>''category'') = ''balls'' THEN ''Balls''
          WHEN LOWER(item->>''category'') = ''trophies'' THEN ''Trophies''
          WHEN LOWER(item->>''category'') = ''medals'' THEN ''Medals''
          ELSE ''Other Products''
        END AS product_group,
        SUM((item->>''quantity'')::integer) AS total_quantity,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(((item->>''quantity'')::integer) * COALESCE((item->>''price'')::numeric, 0)) AS total_revenue
      FROM orders o,
      LATERAL jsonb_array_elements(o.order_items) AS item
      WHERE LOWER(o.status) NOT IN (''cancelled'', ''canceled'')
        AND o.created_at < DATE_TRUNC(''month'', CURRENT_DATE)
        %s
      GROUP BY product_group
      ORDER BY total_quantity DESC
      LIMIT %s
    ) top_products',
    v_branch_filter,
    p_limit
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Get top categories
CREATE OR REPLACE FUNCTION get_top_categories(
  p_limit INTEGER DEFAULT 10,
  p_branch_id INTEGER DEFAULT NULL,
  p_branch_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_branch_filter TEXT := '';
BEGIN
  -- Build branch filter
  IF p_branch_id IS NOT NULL THEN
    v_branch_filter := ' AND o.pickup_branch_id = ' || p_branch_id::TEXT;
  ELSIF p_branch_name IS NOT NULL THEN
    v_branch_filter := ' AND o.pickup_location ILIKE ''%' || REPLACE(p_branch_name, '''', '''''') || '%''';
  END IF;

  EXECUTE format('
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        ''category'', category,
        ''quantity'', total_quantity,
        ''orders'', order_count
      ) ORDER BY total_quantity DESC
    ), ''[]''::jsonb)
    FROM (
      SELECT 
        COALESCE(item->>''category'', ''Other'') AS category,
        SUM((item->>''quantity'')::integer) AS total_quantity,
        COUNT(DISTINCT o.id) AS order_count
      FROM orders o,
      LATERAL jsonb_array_elements(o.order_items) AS item
      WHERE LOWER(o.status) NOT IN (''cancelled'', ''canceled'')
        AND o.created_at < DATE_TRUNC(''month'', CURRENT_DATE)
        %s
      GROUP BY category
      ORDER BY total_quantity DESC
      LIMIT %s
    ) top_categories',
    v_branch_filter,
    p_limit
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Refresh materialized views function (to be called by cron)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_branch_sales;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_status_summary;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_analytics_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_orders_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_categories TO authenticated;
GRANT SELECT ON mv_daily_revenue TO authenticated;
GRANT SELECT ON mv_monthly_revenue TO authenticated;
GRANT SELECT ON mv_branch_sales TO authenticated;
GRANT SELECT ON mv_order_status_summary TO authenticated;

-- =====================================================
-- CRON SCHEDULE RECOMMENDATIONS
-- =====================================================
-- Run this in Supabase Dashboard > Database > Cron Jobs:
-- 
-- Refresh materialized views every hour:
-- SELECT cron.schedule('refresh-analytics-views', '0 * * * *', 'SELECT refresh_analytics_views();');
--
-- Or refresh every 15 minutes during business hours:
-- SELECT cron.schedule('refresh-analytics-views-frequent', '*/15 8-20 * * *', 'SELECT refresh_analytics_views();');

