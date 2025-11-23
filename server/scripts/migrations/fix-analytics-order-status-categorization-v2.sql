-- =====================================================
-- Fix Order Status Categorization in Analytics (V2)
-- =====================================================
-- This updates the RPC function to properly categorize
-- order statuses based on the simplified status system:
-- - Completed: picked_up_delivered only
-- - Processing: confirmed, layout, sizing, printing, press, prod, packing_completing
-- - Pending: pending only
-- =====================================================

-- Drop and recreate the get_analytics_dashboard function with correct status categorization
DROP FUNCTION IF EXISTS get_analytics_dashboard(INTEGER, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

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
  -- FIXED: Properly categorize order statuses based on simplified system
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
        WITH status_counts AS (
          SELECT 
            LOWER(TRIM(status)) AS status_lower,
            COUNT(*)::bigint AS count
          FROM orders
          WHERE status IS NOT NULL %s
          GROUP BY LOWER(TRIM(status))
        ),
        categorized AS (
          SELECT 
            -- Completed: only picked_up_delivered
            SUM(CASE WHEN status_lower = ''picked_up_delivered'' THEN count ELSE 0 END) AS completed_count,
            -- Processing: all production stages between pending and picked_up_delivered
            SUM(CASE WHEN status_lower IN (''confirmed'', ''layout'', ''sizing'', ''printing'', ''press'', ''prod'', ''packing_completing'') THEN count ELSE 0 END) AS processing_count,
            -- Pending: only pending
            SUM(CASE WHEN status_lower = ''pending'' THEN count ELSE 0 END) AS pending_count,
            -- Cancelled: cancelled or canceled
            SUM(CASE WHEN status_lower IN (''cancelled'', ''canceled'') THEN count ELSE 0 END) AS cancelled_count,
            SUM(count) AS total_count
          FROM status_counts
        )
        SELECT jsonb_build_object(
          ''completed'', jsonb_build_object(
            ''count'', COALESCE(completed_count, 0),
            ''percentage'', CASE 
              WHEN total_count > 0 THEN ROUND((completed_count::numeric / total_count) * 100)
              ELSE 0
            END
          ),
          ''processing'', jsonb_build_object(
            ''count'', COALESCE(processing_count, 0),
            ''percentage'', CASE 
              WHEN total_count > 0 THEN ROUND((processing_count::numeric / total_count) * 100)
              ELSE 0
            END
          ),
          ''pending'', jsonb_build_object(
            ''count'', COALESCE(pending_count, 0),
            ''percentage'', CASE 
              WHEN total_count > 0 THEN ROUND((pending_count::numeric / total_count) * 100)
              ELSE 0
            END
          ),
          ''cancelled'', jsonb_build_object(
            ''count'', COALESCE(cancelled_count, 0),
            ''percentage'', CASE 
              WHEN total_count > 0 THEN ROUND((cancelled_count::numeric / total_count) * 100)
              ELSE 0
            END
          ),
          ''total'', COALESCE(total_count, 0)
        )
        FROM categorized
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_analytics_dashboard TO authenticated;

-- Test the function
SELECT get_analytics_dashboard(NULL, NULL, NULL, NULL);

