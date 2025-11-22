# Mock Order Data - Query Reference Guide

## Overview
Quick reference for useful SQL queries to explore and analyze the 5-year mock order dataset.

## Basic Statistics

### Total Orders and Summary
```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(total_amount::numeric) as total_revenue,
  AVG(total_amount::numeric) as avg_order_value,
  COUNT(DISTINCT DATE_TRUNC('month', created_at)) as months_with_data
FROM orders;
```

### Orders by Status
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(total_amount::numeric) as total_revenue,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM orders
GROUP BY status
ORDER BY count DESC;
```

### Orders by Branch
```sql
SELECT 
  pickup_location as branch,
  COUNT(*) as order_count,
  SUM(total_amount::numeric) as total_revenue,
  AVG(total_items) as avg_items_per_order
FROM orders
WHERE pickup_location IS NOT NULL
GROUP BY pickup_location
ORDER BY total_revenue DESC;
```

## Seasonality Analysis

### Monthly Revenue Trend
```sql
SELECT 
  DATE_TRUNC('month', created_at)::date as month,
  COUNT(*) as order_count,
  SUM(total_amount::numeric) as monthly_revenue,
  AVG(total_amount::numeric) as avg_order_value
FROM orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

### Peak vs Off-Season Comparison
```sql
SELECT 
  CASE 
    WHEN EXTRACT(MONTH FROM created_at) BETWEEN 3 AND 8 THEN 'Peak Season (Mar-Aug)'
    ELSE 'Off Season'
  END as season,
  COUNT(*) as order_count,
  SUM(total_amount::numeric) as total_revenue,
  AVG(total_amount::numeric) as avg_order_value,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM orders
GROUP BY season
ORDER BY avg_order_value DESC;
```

### Day of Week Analysis
```sql
SELECT 
  CASE EXTRACT(DOW FROM created_at)
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_of_week,
  COUNT(*) as order_count,
  ROUND(AVG(total_amount::numeric), 2) as avg_order_value
FROM orders
GROUP BY EXTRACT(DOW FROM created_at)
ORDER BY EXTRACT(DOW FROM created_at);
```

## Product Mix Analysis

### Team Orders vs Single Orders
```sql
SELECT 
  CASE 
    WHEN order_items::jsonb->'0'->>'quantity' = '1' THEN 'Single Order'
    ELSE 'Team Order'
  END as order_type,
  COUNT(*) as count,
  SUM(total_amount::numeric) as revenue,
  ROUND(AVG(total_items)) as avg_items
FROM orders
GROUP BY order_type;
```

### Sublimation vs Other Products
```sql
SELECT 
  CASE 
    WHEN order_items::jsonb->'0'->>'category' = 'sublimation' THEN 'Sublimation'
    ELSE 'Other'
  END as product_type,
  COUNT(*) as count,
  SUM(total_amount::numeric) as revenue
FROM orders
GROUP BY product_type;
```

### Product Distribution
```sql
SELECT 
  order_items::jsonb->'0'->>'productName' as product_name,
  COUNT(*) as order_count,
  SUM((order_items::jsonb->'0'->>'quantity')::int) as total_quantity,
  SUM(total_amount::numeric) as total_revenue
FROM orders
GROUP BY product_name
ORDER BY total_revenue DESC;
```

## Year-over-Year Comparison

### Revenue by Year
```sql
SELECT 
  EXTRACT(YEAR FROM created_at)::int as year,
  COUNT(*) as order_count,
  SUM(total_amount::numeric) as annual_revenue,
  ROUND(AVG(total_amount::numeric), 2) as avg_order_value
FROM orders
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year;
```

### Year-over-Year Monthly Growth
```sql
SELECT 
  EXTRACT(MONTH FROM created_at)::int as month,
  EXTRACT(YEAR FROM created_at)::int as year,
  COUNT(*) as order_count,
  SUM(total_amount::numeric) as monthly_revenue
FROM orders
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
ORDER BY month, year;
```

## Cancellation Analysis

### Cancellation Rate by Month
```sql
SELECT 
  DATE_TRUNC('month', created_at)::date as month,
  COUNT(*) as total_orders,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
  ROUND(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as cancellation_rate
FROM orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

### Cancellation Rate by Branch
```sql
SELECT 
  pickup_location as branch,
  COUNT(*) as total_orders,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
  ROUND(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as cancellation_rate
FROM orders
WHERE pickup_location IS NOT NULL
GROUP BY pickup_location
ORDER BY cancellation_rate DESC;
```

## Customer Analysis

### Orders per Customer
```sql
SELECT 
  user_id,
  COUNT(*) as order_count,
  SUM(total_amount::numeric) as total_spent,
  AVG(total_amount::numeric) as avg_order_value,
  MIN(created_at) as first_order,
  MAX(created_at) as last_order
FROM orders
GROUP BY user_id
ORDER BY total_spent DESC
LIMIT 10;
```

### Customer Lifetime Value
```sql
SELECT 
  COUNT(*) as total_customers,
  SUM(order_count)::int as total_orders,
  ROUND(AVG(total_spent), 2) as avg_customer_ltv,
  ROUND(MAX(total_spent), 2) as max_customer_ltv,
  ROUND(MIN(total_spent), 2) as min_customer_ltv
FROM (
  SELECT 
    user_id,
    COUNT(*) as order_count,
    SUM(total_amount::numeric) as total_spent
  FROM orders
  GROUP BY user_id
) customer_stats;
```

## Advanced Analytics

### Top 10 Days by Revenue
```sql
SELECT 
  DATE(created_at) as order_date,
  COUNT(*) as order_count,
  SUM(total_amount::numeric) as daily_revenue
FROM orders
GROUP BY DATE(created_at)
ORDER BY daily_revenue DESC
LIMIT 10;
```

### Average Order Value by Month and Branch
```sql
SELECT 
  DATE_TRUNC('month', created_at)::date as month,
  pickup_location as branch,
  COUNT(*) as order_count,
  ROUND(AVG(total_amount::numeric), 2) as avg_order_value,
  SUM(total_amount::numeric) as total_revenue
FROM orders
WHERE pickup_location IS NOT NULL
GROUP BY DATE_TRUNC('month', created_at), pickup_location
ORDER BY month DESC, total_revenue DESC;
```

### Order Size Distribution
```sql
SELECT 
  CASE 
    WHEN total_items <= 1 THEN 'Single Item'
    WHEN total_items <= 5 THEN '2-5 Items'
    WHEN total_items <= 10 THEN '6-10 Items'
    WHEN total_items <= 15 THEN '11-15 Items'
    ELSE '15+ Items'
  END as order_size,
  COUNT(*) as count,
  ROUND(AVG(total_amount::numeric), 2) as avg_value
FROM orders
GROUP BY order_size
ORDER BY count DESC;
```

## Tips for Dashboard Development

### Real-time Summary Widget
```sql
SELECT 
  COUNT(*) as orders_today,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  SUM(total_amount::numeric) as revenue_today,
  (SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND created_at::date = CURRENT_DATE) as cancelled_today
FROM orders
WHERE created_at::date = CURRENT_DATE;
```

### Performance Metrics
```sql
SELECT 
  ROUND(AVG(total_amount::numeric), 2) as average_order_value,
  ROUND(STDDEV(total_amount::numeric), 2) as order_value_stddev,
  MAX(total_amount::numeric) as highest_order,
  MIN(total_amount::numeric) as lowest_order,
  ROUND(AVG(total_items)) as avg_items_per_order
FROM orders
WHERE status = 'picked_up_delivered';
```

## Notes

- Replace `created_at::date = CURRENT_DATE` with specific dates to test with historical data
- Use `WHERE created_at >= '2020-01-01'` to filter to specific date ranges
- All amounts are stored as numeric in the database
- Use `::numeric` casting for accurate calculations
- `picked_up_delivered` and `cancelled` are the main status values in the mock data
