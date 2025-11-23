-- Query to check products with branch_id and size_stocks
-- This query shows products filtered by branch with their stock information
--
-- IMPORTANT: Run ONE query at a time by selecting only the query you want to execute
-- Do NOT select multiple queries together as they may conflict
--
-- Key Queries:
--   Query 1-8:  Basic product queries with branch filtering
--   Query 9:    Unique products (all categories, deduplicated)
--   Query 10:   Unique BALLS products (aggregated stock)
--   Query 11:   BALLS with branch details (per branch stock)
--   Query 12:   Unique TROPHIES (sample size_stocks)
--   Query 13:   TROPHIES with size_stocks expanded per branch
--   Query 14:   Unique TROPHIES with aggregated size_stocks
--   Query 15-16: Summary queries for balls and trophies
--
-- NOTE: All queries have been updated to avoid using MAX() on JSONB columns.
--       If you see an error about MAX(jsonb), please refresh/restart your SQL client
--       and ensure you're running the latest version of this file.

-- ============================================================
-- Query 1: Get all products with branch_id and size_stocks
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    p.stock_quantity,
    p.size_stocks,
    p.size,
    p.price,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
ORDER BY p.branch_id, p.name;

-- ============================================================
-- Query 2: Get products for a specific branch with size stocks
-- Replace :branch_id with the desired branch ID (e.g., 1, 2, 3)
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    p.stock_quantity,
    p.size_stocks,
    p.size,
    p.price,
    p.created_at
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
WHERE p.branch_id = 1  -- Replace with your desired branch_id
ORDER BY p.name;

-- ============================================================
-- Query 3: Get products with size_stocks (trophies with sizes)
-- Shows only products that have size_stocks defined
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    p.size_stocks,
    p.size,
    jsonb_object_keys(p.size_stocks) AS size_key,
    p.size_stocks->>jsonb_object_keys(p.size_stocks) AS stock_quantity
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
WHERE p.size_stocks IS NOT NULL 
  AND p.size_stocks != 'null'::jsonb
ORDER BY p.branch_id, p.name;

-- ============================================================
-- Query 4: Get products with size_stocks expanded (one row per size)
-- This expands the JSONB size_stocks into separate rows per size
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    p.size,
    size_entry.key AS size_name,
    (size_entry.value)::text::integer AS stock_quantity,
    p.price
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
LEFT JOIN LATERAL jsonb_each(p.size_stocks) AS size_entry ON true
WHERE p.size_stocks IS NOT NULL 
  AND p.size_stocks != 'null'::jsonb
ORDER BY p.branch_id, p.name, size_entry.key;

-- ============================================================
-- Query 5: Get products by branch with aggregated stock information
-- Shows both stock_quantity (simple products) and size_stocks (trophies)
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    CASE 
        WHEN p.size_stocks IS NOT NULL AND p.size_stocks != 'null'::jsonb THEN
            'Has Size Stocks'
        ELSE
            'Simple Stock'
    END AS stock_type,
    COALESCE(p.stock_quantity, 0) AS stock_quantity,
    p.size_stocks,
    (
        SELECT SUM((value)::text::integer)
        FROM jsonb_each(p.size_stocks)
        WHERE p.size_stocks IS NOT NULL 
          AND p.size_stocks != 'null'::jsonb
    ) AS total_size_stocks
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
WHERE p.branch_id = 1  -- Replace with your desired branch_id or remove to get all branches
ORDER BY p.name;

-- ============================================================
-- Query 6: Get low stock products by branch (simple products)
-- Shows products where stock_quantity is below a threshold
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    p.stock_quantity,
    p.size_stocks
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
WHERE p.stock_quantity IS NOT NULL 
  AND p.stock_quantity < 10  -- Adjust threshold as needed
  AND p.branch_id = 1  -- Optional: filter by specific branch
ORDER BY p.stock_quantity ASC, p.name;

-- ============================================================
-- Query 7: Get low stock products by branch (size-based products)
-- Shows products with size_stocks where any size has low stock
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    size_entry.key AS size_name,
    (size_entry.value)::text::integer AS stock_quantity,
    p.size_stocks
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
LEFT JOIN LATERAL jsonb_each(p.size_stocks) AS size_entry ON true
WHERE p.size_stocks IS NOT NULL 
  AND p.size_stocks != 'null'::jsonb
  AND (size_entry.value)::text::integer < 10  -- Adjust threshold as needed
  AND p.branch_id = 1  -- Optional: filter by specific branch
ORDER BY (size_entry.value)::text::integer ASC, p.name, size_entry.key;

-- ============================================================
-- Query 8: Summary of products by branch and stock type
-- Counts products grouped by branch and stock type
-- ============================================================
SELECT 
    p.branch_id,
    b.name AS branch_name,
    COUNT(*) AS total_products,
    COUNT(CASE WHEN p.stock_quantity IS NOT NULL THEN 1 END) AS simple_stock_products,
    COUNT(CASE WHEN p.size_stocks IS NOT NULL AND p.size_stocks != 'null'::jsonb THEN 1 END) AS size_stock_products
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
GROUP BY p.branch_id, b.name
ORDER BY p.branch_id;

-- ============================================================
-- Query 9: Get unique products (deduplicated by name and category)
-- Aggregates stock across all branches, similar to customer-facing display
-- ============================================================
WITH unique_products AS (
    SELECT DISTINCT ON (LOWER(TRIM(p.name)), LOWER(TRIM(p.category)))
        p.*,
        b.name AS branch_name
    FROM products p
    LEFT JOIN branches b ON p.branch_id = b.id
    ORDER BY LOWER(TRIM(p.name)), LOWER(TRIM(p.category)), p.created_at DESC
)
SELECT 
    LOWER(TRIM(up.name)) || '_' || LOWER(TRIM(up.category)) AS product_key,
    up.name,
    up.category,
    (SELECT COUNT(DISTINCT p2.branch_id) 
     FROM products p2 
     WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(up.name)) 
       AND LOWER(TRIM(p2.category)) = LOWER(TRIM(up.category))) AS branch_count,
    (SELECT STRING_AGG(DISTINCT b2.name, ', ' ORDER BY b2.name)
     FROM products p2
     LEFT JOIN branches b2 ON p2.branch_id = b2.id
     WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(up.name)) 
       AND LOWER(TRIM(p2.category)) = LOWER(TRIM(up.category))) AS branches,
    -- Aggregate stock_quantity for simple products (balls, etc.)
    (SELECT SUM(COALESCE(p2.stock_quantity, 0))
     FROM products p2
     WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(up.name)) 
       AND LOWER(TRIM(p2.category)) = LOWER(TRIM(up.category))) AS total_stock_quantity,
    -- Sample fields (should be same across branches)
    up.price,
    up.description,
    up.main_image,
    up.size,
    up.size_stocks AS sample_size_stocks,
    up.trophy_prices AS sample_trophy_prices
FROM unique_products up
ORDER BY up.category, up.name;

-- ============================================================
-- Query 10: Get unique BALLS products (deduplicated across branches)
-- Aggregates stock_quantity for balls across all branches
-- ============================================================
SELECT 
    p.name,
    p.category,
    COUNT(DISTINCT p.branch_id) AS branch_count,
    STRING_AGG(DISTINCT b.name, ', ' ORDER BY b.name) AS branches,
    SUM(COALESCE(p.stock_quantity, 0)) AS total_stock_quantity,
    MAX(p.price) AS price,
    MAX(p.description) AS description,
    MAX(p.main_image) AS main_image,
    MAX(p.created_at) AS created_at
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
WHERE LOWER(p.category) = 'balls'
GROUP BY p.name, p.category
ORDER BY p.name;

-- ============================================================
-- Query 11: Get unique BALLS products with branch details
-- Shows balls with stock per branch (not aggregated)
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    p.stock_quantity,
    p.price,
    p.main_image,
    p.created_at
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
WHERE LOWER(p.category) = 'balls'
ORDER BY p.name, p.branch_id;

-- ============================================================
-- Query 12: Get unique TROPHIES products (deduplicated across branches)
-- Shows one example per unique trophy product
-- Note: For aggregated size_stocks across branches, see Query 14
-- ============================================================
WITH unique_trophies AS (
    SELECT DISTINCT ON (LOWER(TRIM(name)), LOWER(TRIM(category)))
        *
    FROM products
    WHERE LOWER(category) = 'trophies'
      AND size_stocks IS NOT NULL 
      AND size_stocks != 'null'::jsonb
    ORDER BY LOWER(TRIM(name)), LOWER(TRIM(category)), created_at DESC
)
SELECT 
    ut.name,
    ut.category,
    (SELECT COUNT(DISTINCT p.branch_id) 
     FROM products p 
     WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(ut.name)) 
       AND LOWER(TRIM(p.category)) = LOWER(TRIM(ut.category))) AS branch_count,
    (SELECT STRING_AGG(DISTINCT b.name, ', ' ORDER BY b.name)
     FROM products p
     LEFT JOIN branches b ON p.branch_id = b.id
     WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(ut.name)) 
       AND LOWER(TRIM(p.category)) = LOWER(TRIM(ut.category))) AS branches,
    ut.size_stocks AS sample_size_stocks,
    ut.size,
    ut.price,
    ut.trophy_prices,
    ut.description,
    ut.main_image,
    ut.created_at
FROM unique_trophies ut
ORDER BY ut.name;

-- ============================================================
-- Query 13: Get unique TROPHIES with size_stocks expanded per branch
-- Shows trophy stock per size per branch (not aggregated)
-- ============================================================
SELECT 
    p.id,
    p.name,
    p.category,
    p.branch_id,
    b.name AS branch_name,
    size_entry.key AS size_name,
    (size_entry.value)::text::integer AS stock_quantity,
    p.size_stocks,
    p.size,
    p.trophy_prices,
    p.price,
    p.main_image
FROM products p
LEFT JOIN branches b ON p.branch_id = b.id
LEFT JOIN LATERAL jsonb_each(p.size_stocks) AS size_entry ON true
WHERE LOWER(p.category) = 'trophies'
  AND p.size_stocks IS NOT NULL 
  AND p.size_stocks != 'null'::jsonb
ORDER BY p.name, p.branch_id, size_entry.key;

-- ============================================================
-- Query 14: Get unique TROPHIES products - aggregated size stocks view
-- Shows aggregated size stocks summed across all branches
-- ============================================================
WITH trophy_sizes AS (
    SELECT 
        p.name,
        p.category,
        size_entry.key AS size_name,
        SUM((size_entry.value)::text::integer) AS total_stock
    FROM products p
    CROSS JOIN LATERAL jsonb_each(p.size_stocks) AS size_entry
    WHERE LOWER(p.category) = 'trophies'
      AND p.size_stocks IS NOT NULL 
      AND p.size_stocks != 'null'::jsonb
    GROUP BY p.name, p.category, size_entry.key
),
trophy_info AS (
    SELECT DISTINCT ON (LOWER(TRIM(p.name)), LOWER(TRIM(p.category)))
        p.name,
        p.category,
        (SELECT COUNT(DISTINCT p2.branch_id) 
         FROM products p2 
         WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name)) 
           AND LOWER(TRIM(p2.category)) = LOWER(TRIM(p.category))) AS branch_count,
        (SELECT STRING_AGG(DISTINCT b2.name, ', ' ORDER BY b2.name)
         FROM products p2
         LEFT JOIN branches b2 ON p2.branch_id = b2.id
         WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name)) 
           AND LOWER(TRIM(p2.category)) = LOWER(TRIM(p.category))) AS branches,
        p.size,
        p.trophy_prices,
        p.price,
        p.main_image,
        p.description
    FROM products p
    WHERE LOWER(p.category) = 'trophies'
      AND p.size_stocks IS NOT NULL 
      AND p.size_stocks != 'null'::jsonb
    ORDER BY LOWER(TRIM(p.name)), LOWER(TRIM(p.category)), p.created_at DESC
)
SELECT 
    ti.name,
    ti.category,
    ti.branch_count,
    ti.branches,
    jsonb_object_agg(ts.size_name, ts.total_stock ORDER BY ts.size_name) AS aggregated_size_stocks,
    ti.size,
    ti.trophy_prices,
    ti.price,
    ti.main_image,
    ti.description
FROM trophy_info ti
LEFT JOIN trophy_sizes ts ON ti.name = ts.name AND ti.category = ts.category
GROUP BY ti.name, ti.category, ti.branch_count, ti.branches, ti.size, ti.trophy_prices, ti.price, ti.main_image, ti.description
ORDER BY ti.name;

-- ============================================================
-- Query 15: Get unique BALLS and TROPHIES summary
-- Quick overview of unique balls and trophies across all branches
-- ============================================================
SELECT 
    p.category,
    COUNT(DISTINCT LOWER(TRIM(p.name))) AS unique_products,
    COUNT(*) AS total_product_entries,
    COUNT(DISTINCT p.branch_id) AS branches_covered,
    SUM(CASE WHEN LOWER(p.category) = 'balls' THEN COALESCE(p.stock_quantity, 0) ELSE 0 END) AS total_ball_stock,
    COUNT(CASE WHEN LOWER(p.category) = 'trophies' AND p.size_stocks IS NOT NULL THEN 1 END) AS trophy_entries_with_sizes
FROM products p
WHERE LOWER(p.category) IN ('balls', 'trophies')
GROUP BY p.category
ORDER BY p.category;

-- ============================================================
-- Query 16: Get unique products by category with stock summary
-- Shows all unique products grouped by category (balls, trophies, etc.)
-- ============================================================
SELECT 
    p.category,
    p.name,
    COUNT(DISTINCT p.branch_id) AS available_in_branches,
    STRING_AGG(DISTINCT CAST(p.branch_id AS TEXT), ', ' ORDER BY CAST(p.branch_id AS TEXT)) AS branch_ids,
    -- For balls: aggregate stock_quantity
    CASE 
        WHEN LOWER(p.category) = 'balls' THEN 
            CAST(SUM(COALESCE(p.stock_quantity, 0)) AS TEXT)
        ELSE 
            NULL
    END AS total_stock,
    -- For trophies: show if has size_stocks
    CASE 
        WHEN LOWER(p.category) = 'trophies' THEN 
            CASE 
                WHEN COUNT(CASE WHEN p.size_stocks IS NOT NULL AND p.size_stocks != 'null'::jsonb THEN 1 END) > 0 
                THEN 'Has Size Stocks'
                ELSE 'No Size Stocks'
            END
        ELSE 
            NULL
    END AS stock_type,
    MAX(p.price) AS price
FROM products p
WHERE LOWER(p.category) IN ('balls', 'trophies')
GROUP BY p.category, p.name
ORDER BY p.category, p.name;

