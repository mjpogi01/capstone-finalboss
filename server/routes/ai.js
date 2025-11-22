const express = require('express');
const { authenticateSupabaseToken, requireAdminOrOwner } = require('../middleware/supabaseAuth');
const { executeSql } = require('../lib/sqlClient');
const { sanitizeMessages, callGroq } = require('./aiCommon');
const analyticsModule = require('./analytics');
const computeSalesForecast = analyticsModule.computeSalesForecast;
const resolveBranchContextAnalytics = analyticsModule.resolveBranchContext;
const SALES_FORECAST_RANGE_LABELS = analyticsModule.SALES_FORECAST_RANGE_LABELS;

const router = express.Router();

const groqConfigured = Boolean(process.env.GROQ_API_KEY);
if (!groqConfigured) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  GROQ_API_KEY is not set. AI analytics endpoint will be disabled.');
}

const SCHEMA_GUIDE = [
  'Database tables:',
  "orders(id, user_id, order_number, status, shipping_method, pickup_location TEXT, delivery_address JSONB, order_notes, subtotal_amount, shipping_cost, total_amount, total_items, order_items JSONB, created_at, updated_at, design_files)",
  "branches(id, name, address, city, phone, email, is_main_manufacturing, created_at)",
  "user_addresses(user_id, city, province, barangay, street_address, full_name)",
  'There is no branch_id column on orders; use orders.pickup_location (branch name) or join to branches.name when aggregating by branch.',
  'When joining, match upper(trim(pickup_location)) to upper(trim(branches.name)).',
  'Customer location data: orders.delivery_address is a JSONB field containing city, province, barangay, and other address fields. Access with delivery_address->>\'province\', delivery_address->>\'city\', etc.',
  'For customer location queries, check both user_addresses table and orders.delivery_address JSONB field. Use UNION to combine results from both sources.'
].join('\n');

const MAX_SQL_GENERATION_ATTEMPTS = 2;
const MAX_SQL_EXECUTION_ATTEMPTS = 3;

// Test endpoint BEFORE auth to check if route is accessible
router.get('/health', (_req, res) => {
  res.json({ 
    success: true, 
    message: 'AI analytics route is accessible',
    groqConfigured,
    supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Missing',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
  });
});

router.use(authenticateSupabaseToken);
router.use(requireAdminOrOwner);

// Test endpoint to verify route is accessible AFTER auth
router.get('/test', (_req, res) => {
  res.json({ 
    success: true, 
    message: 'AI analytics route is working',
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : null
  });
});

function coerceNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function coerceDate(value) {
  if (!value) {
    return null;
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toISOString();
  } catch (error) {
    return value;
  }
}

function normalizeFilters(rawFilters = {}) {
  const filters = {};
  if (rawFilters.timeRange && typeof rawFilters.timeRange === 'string') {
    filters.timeRange = rawFilters.timeRange.toLowerCase();
  }
  if (rawFilters.branch && typeof rawFilters.branch === 'string' && rawFilters.branch.toLowerCase() !== 'all') {
    filters.branch = rawFilters.branch.toLowerCase();
  }
  if (rawFilters.orderStatus && typeof rawFilters.orderStatus === 'string' && rawFilters.orderStatus.toLowerCase() !== 'all') {
    filters.orderStatus = rawFilters.orderStatus.toLowerCase();
  }
  const yearStart = Number.parseInt(rawFilters.yearStart, 10);
  if (!Number.isNaN(yearStart)) {
    filters.yearStart = yearStart;
  }
  const yearEnd = Number.parseInt(rawFilters.yearEnd, 10);
  if (!Number.isNaN(yearEnd)) {
    filters.yearEnd = yearEnd;
  }
  return filters;
}

function buildWhereClause(filters = {}) {
  const clauses = [];
  const params = [];
  let index = 1;

  if (filters.branchId && Number.isInteger(filters.branchId)) {
    clauses.push(`pickup_branch_id = $${index}`);
    params.push(filters.branchId);
    index += 1;
  }

  if (filters.branchName) {
    clauses.push(`LOWER(TRIM(pickup_location)) = LOWER(TRIM($${index}))`);
    params.push(filters.branchName);
    index += 1;
  }

  if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
    const placeholders = filters.status.map((_, idx) => `$${index + idx}`).join(',');
    clauses.push(`LOWER(status) IN (${placeholders})`);
    params.push(...filters.status.map((status) => status.toLowerCase()));
    index += filters.status.length;
  }

  if (filters.startDate instanceof Date && !Number.isNaN(filters.startDate)) {
    clauses.push(`created_at >= $${index}`);
    params.push(filters.startDate.toISOString());
    index += 1;
  }

  if (filters.endDate instanceof Date && !Number.isNaN(filters.endDate)) {
    clauses.push(`created_at < $${index}`);
    params.push(filters.endDate.toISOString());
    index += 1;
  }

  if (filters.orderStatus && typeof filters.orderStatus === 'string') {
    clauses.push(`LOWER(status) = $${index}`);
    params.push(filters.orderStatus.trim().toLowerCase());
    index += 1;
  }

  const hasExplicitStatusFilter = (
    (Array.isArray(filters.status) && filters.status.length > 0)
    || (typeof filters.orderStatus === 'string' && filters.orderStatus.trim() !== '')
  );

  if (Number.isInteger(filters.yearStart)) {
    clauses.push(`EXTRACT(YEAR FROM created_at) >= $${index}`);
    params.push(filters.yearStart);
    index += 1;
  }

  if (Number.isInteger(filters.yearEnd)) {
    clauses.push(`EXTRACT(YEAR FROM created_at) <= $${index}`);
    params.push(filters.yearEnd);
    index += 1;
  }

  clauses.push("created_at < date_trunc('month', CURRENT_TIMESTAMP)");

  if (!hasExplicitStatusFilter) {
    clauses.push("LOWER(status) NOT IN ('cancelled', 'canceled')");
  }

  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

function parseDeliveryAddress(order = {}) {
  let deliveryAddress = order?.delivery_address ?? order?.deliveryAddress ?? null;

  if (deliveryAddress && typeof deliveryAddress === 'string') {
    try {
      deliveryAddress = JSON.parse(deliveryAddress);
    } catch (error) {
      deliveryAddress = null;
    }
  }

  if (deliveryAddress && (typeof deliveryAddress !== 'object' || Array.isArray(deliveryAddress))) {
    return null;
  }

  return deliveryAddress;
}

function resolveOrderCustomerName(order) {
  if (!order) {
    return null;
  }

  const deliveryAddress = parseDeliveryAddress(order);
  const customerInfo = order?.customer && typeof order.customer === 'object' ? order.customer : null;

  const candidates = [
    order?.display_name,
    order?.customer_display_name,
    order?.customer_name,
    order?.customerName,
    order?.customer_full_name,
    order?.customerFullName,
    order?.user_full_name,
    order?.userFullName,
    customerInfo?.full_name,
    customerInfo?.fullName,
    customerInfo?.name,
    deliveryAddress?.receiver,
    deliveryAddress?.receiver_name,
    deliveryAddress?.full_name,
    deliveryAddress?.fullName,
    deliveryAddress?.name,
    deliveryAddress?.contact_name,
    deliveryAddress?.contactName
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}

function resolveOrderCustomerEmail(order) {
  if (!order) {
    return null;
  }

  const deliveryAddress = parseDeliveryAddress(order);
  const customerInfo = order?.customer && typeof order.customer === 'object' ? order.customer : null;

  const candidates = [
    order?.customer_email,
    order?.customerEmail,
    order?.email,
    order?.user_email,
    order?.userEmail,
    customerInfo?.email,
    deliveryAddress?.email,
    deliveryAddress?.Email,
    deliveryAddress?.contact_email,
    deliveryAddress?.contactEmail
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed.toLowerCase();
      }
    }
  }

  return null;
}

async function enrichTopCustomerRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return rows;
  }

  const uniqueUserIds = Array.from(
    new Set(
      rows
        .map((row) => (row?.user_id ? String(row.user_id).trim() : ''))
        .filter((userId) => userId.length > 0)
    )
  );

  if (uniqueUserIds.length === 0) {
    return rows;
  }

  const placeholders = uniqueUserIds.map((_, index) => `$${index + 1}`).join(', ');
  const detailSql = `
    SELECT DISTINCT ON (user_id) *
    FROM orders
    WHERE user_id IN (${placeholders})
    ORDER BY user_id, created_at DESC
  `;

  const { rows: detailRows } = await executeSql(detailSql, uniqueUserIds);
  const detailsMap = new Map(detailRows.map((row) => [row.user_id, row]));

  return rows.map((row, index) => {
    const details = detailsMap.get(row.user_id);
    const resolvedName = details ? resolveOrderCustomerName(details) : resolveOrderCustomerName(row);
    const resolvedEmail = details ? resolveOrderCustomerEmail(details) : resolveOrderCustomerEmail(row);

    const displayName = resolvedName && resolvedName !== row.user_id
      ? resolvedName
      : `Customer ${index + 1}`;

    return {
      ...row,
      display_name: displayName,
      customer_email: resolvedEmail ?? null
    };
  });
}

async function getChartDataset(chartId, filters = {}, options = {}) {
  const normalizedFilters = normalizeFilters(filters);
  
  // Automatically apply branch filtering for admins (like /customer-analytics does)
  if (options.user) {
    const branchContext = await resolveBranchContextAnalytics(options.user);
    if (branchContext) {
      // Admin user - add branch filtering to filters
      if (branchContext.branchId) {
        normalizedFilters.branchId = branchContext.branchId;
      }
      if (branchContext.branchName) {
        normalizedFilters.branchName = branchContext.branchName;
      }
    }
  }
  
  const where = buildWhereClause(normalizedFilters);

  switch (chartId) {
    case 'totalSales': {
      const sql = `
        SELECT
          date_trunc('month', created_at) AS period_start,
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS period_label,
          SUM(total_amount)::numeric AS total_revenue,
          COUNT(*)::int AS order_count
        FROM orders
        ${where.clause}
        GROUP BY period_start, period_label
        ORDER BY period_start DESC
        LIMIT 18;
      `;
      const { rows } = await executeSql(sql, where.params);
      const formattedRows = rows.map((row) => ({
        period_start: coerceDate(row.period_start),
        period_label: row.period_label,
        total_revenue: coerceNumber(row.total_revenue),
        order_count: coerceNumber(row.order_count)
      }));
      return { sql, rows: formattedRows };
    }
    case 'salesTrends': {
      const sql = `
        SELECT
          date_trunc('day', created_at)::date AS day,
          SUM(total_amount)::numeric AS total_revenue,
          COUNT(*)::int AS order_count
        FROM orders
        ${where.clause}
        GROUP BY day
        ORDER BY day DESC
        LIMIT 35;
      `;
      const { rows } = await executeSql(sql, where.params);
      const formattedRows = rows.map((row) => ({
        day: coerceDate(row.day),
        total_revenue: coerceNumber(row.total_revenue),
        order_count: coerceNumber(row.order_count)
      }));
      return { sql, rows: formattedRows };
    }
    case 'salesByBranch': {
      const sql = `
        SELECT
          COALESCE(NULLIF(TRIM(pickup_location), ''), 'Unspecified') AS branch_label,
          SUM(total_amount)::numeric AS total_revenue,
          COUNT(*)::int AS order_count
        FROM orders
        ${where.clause}
        GROUP BY branch_label
        ORDER BY total_revenue DESC
        LIMIT 12;
      `;
      const { rows } = await executeSql(sql, where.params);
      const formattedRows = rows.map((row) => ({
        branch_label: row.branch_label,
        total_revenue: coerceNumber(row.total_revenue),
        order_count: coerceNumber(row.order_count)
      }));
      return { sql, rows: formattedRows };
    }
    case 'orderStatus': {
      const sql = `
        SELECT
          LOWER(status) AS status_key,
          COUNT(*)::int AS total_orders,
          SUM(total_amount)::numeric AS total_revenue
        FROM orders
        ${where.clause}
        GROUP BY status_key
        ORDER BY total_orders DESC;
      `;
      const { rows } = await executeSql(sql, where.params);
      const formattedRows = rows.map((row) => ({
        status_key: row.status_key,
        total_orders: coerceNumber(row.total_orders),
        total_revenue: coerceNumber(row.total_revenue)
      }));
      return { sql, rows: formattedRows };
    }
    case 'topProducts': {
      // Match the determineProductGroup logic from analytics.js
      // This ensures consistency between regular analytics and AI analytics
      const allProductsSql = `
        WITH expanded AS (
          SELECT
            CASE
              -- Check apparel_type first (for custom design orders)
              WHEN LOWER(COALESCE(item.value->>'apparel_type', '')) = 'basketball_jersey' THEN 'Basketball Jerseys'
              WHEN LOWER(COALESCE(item.value->>'apparel_type', '')) = 'volleyball_jersey' THEN 'Volleyball Jerseys'
              WHEN LOWER(COALESCE(item.value->>'apparel_type', '')) = 'hoodie' THEN 'Hoodies'
              WHEN LOWER(COALESCE(item.value->>'apparel_type', '')) = 'tshirt' THEN 'T-shirts'
              WHEN LOWER(COALESCE(item.value->>'apparel_type', '')) = 'longsleeves' THEN 'Long Sleeves'
              WHEN LOWER(COALESCE(item.value->>'apparel_type', '')) = 'uniforms' THEN 'Uniforms'
              
              -- Check for T-shirts (handle various formats)
              WHEN LOWER(COALESCE(item.value->>'category', '')) LIKE '%t-shirt%' OR LOWER(COALESCE(item.value->>'category', '')) LIKE '%tshirt%' THEN 'T-shirts'
              WHEN LOWER(COALESCE(item.value->>'name', '')) LIKE '%t-shirt%' OR LOWER(COALESCE(item.value->>'name', '')) LIKE '%tshirt%' THEN 'T-shirts'
              WHEN LOWER(COALESCE(item.value->>'cut_type', '')) LIKE '%t-shirt%' THEN 'T-shirts'
              WHEN LOWER(COALESCE(item.value->>'fabric_option', '')) LIKE '%t-shirt%' THEN 'T-shirts'
              
              -- Check for Long Sleeves
              WHEN LOWER(COALESCE(item.value->>'category', '')) LIKE '%long sleeve%' OR LOWER(COALESCE(item.value->>'category', '')) LIKE '%longsleeve%' THEN 'Long Sleeves'
              WHEN LOWER(COALESCE(item.value->>'name', '')) LIKE '%long sleeve%' OR LOWER(COALESCE(item.value->>'name', '')) LIKE '%longsleeve%' THEN 'Long Sleeves'
              WHEN LOWER(COALESCE(item.value->>'cut_type', '')) LIKE '%long sleeve%' THEN 'Long Sleeves'
              WHEN LOWER(COALESCE(item.value->>'fabric_option', '')) LIKE '%long sleeve%' THEN 'Long Sleeves'
              
              -- Check for Uniforms
              WHEN LOWER(COALESCE(item.value->>'category', '')) LIKE '%uniform%' THEN 'Uniforms'
              WHEN LOWER(COALESCE(item.value->>'name', '')) LIKE '%uniform%' THEN 'Uniforms'
              WHEN LOWER(COALESCE(item.value->>'cut_type', '')) LIKE '%uniform%' THEN 'Uniforms'
              WHEN LOWER(COALESCE(item.value->>'fabric_option', '')) LIKE '%uniform%' THEN 'Uniforms'
              
              -- Check for Hoodies
              WHEN LOWER(COALESCE(item.value->>'category', '')) LIKE '%hoodie%' THEN 'Hoodies'
              WHEN LOWER(COALESCE(item.value->>'name', '')) LIKE '%hoodie%' THEN 'Hoodies'
              
              -- For jersey category, check sport field and other fields to differentiate basketball vs volleyball
              WHEN LOWER(COALESCE(item.value->>'category', '')) = 'jerseys' OR LOWER(COALESCE(item.value->>'category', '')) = 'jersey' THEN
                CASE
                  WHEN LOWER(COALESCE(item.value->>'sport', '')) = 'basketball' OR 
                       LOWER(COALESCE(item.value->>'name', '')) LIKE '%basketball%' OR
                       LOWER(COALESCE(item.value->>'cut_type', '')) LIKE '%basketball%' OR
                       LOWER(COALESCE(item.value->>'fabric_option', '')) LIKE '%basketball%' THEN 'Basketball Jerseys'
                  WHEN LOWER(COALESCE(item.value->>'sport', '')) = 'volleyball' OR 
                       LOWER(COALESCE(item.value->>'name', '')) LIKE '%volleyball%' OR
                       LOWER(COALESCE(item.value->>'cut_type', '')) LIKE '%volleyball%' OR
                       LOWER(COALESCE(item.value->>'fabric_option', '')) LIKE '%volleyball%' THEN 'Volleyball Jerseys'
                  ELSE 'Custom Jerseys'
                END
              
              -- Check combined text for basketball/volleyball (check all fields)
              WHEN LOWER(CONCAT(
                COALESCE(item.value->>'category', ''), ' ',
                COALESCE(item.value->>'name', ''), ' ',
                COALESCE(item.value->>'cut_type', ''), ' ',
                COALESCE(item.value->>'fabric_option', ''), ' ',
                COALESCE(item.value->>'sport', '')
              )) LIKE '%basketball%' THEN 'Basketball Jerseys'
              
              WHEN LOWER(CONCAT(
                COALESCE(item.value->>'category', ''), ' ',
                COALESCE(item.value->>'name', ''), ' ',
                COALESCE(item.value->>'cut_type', ''), ' ',
                COALESCE(item.value->>'fabric_option', ''), ' ',
                COALESCE(item.value->>'sport', '')
              )) LIKE '%volleyball%' THEN 'Volleyball Jerseys'
              
              -- Check for jersey (generic)
              WHEN LOWER(COALESCE(item.value->>'category', '')) LIKE '%jersey%' OR LOWER(COALESCE(item.value->>'name', '')) LIKE '%jersey%' THEN 'Custom Jerseys'
              
              -- Check for Sports Balls
              WHEN LOWER(COALESCE(item.value->>'category', '')) LIKE 'ball%' OR LOWER(COALESCE(item.value->>'name', '')) LIKE '%ball%' THEN 'Sports Balls'
              
              -- Check for Trophies
              WHEN LOWER(COALESCE(item.value->>'category', '')) LIKE 'troph%' OR LOWER(COALESCE(item.value->>'name', '')) LIKE '%trophy%' THEN 'Trophies'
              
              -- Check for Medals
              WHEN LOWER(COALESCE(item.value->>'category', '')) LIKE 'medal%' OR LOWER(COALESCE(item.value->>'name', '')) LIKE '%medal%' THEN 'Medals'
              
              -- If none match, still categorize as a known group rather than "Other Products"
              -- This ensures all products are properly categorized
              ELSE 'Custom Jerseys'
            END AS product_group,
            (item.value->>'quantity')::numeric AS quantity,
            COALESCE(
              (item.value->>'price')::numeric,
              (item.value->>'pricePerUnit')::numeric,
              CASE 
                WHEN (item.value->>'quantity')::numeric > 0 
                THEN (item.value->>'totalPrice')::numeric / (item.value->>'quantity')::numeric
                ELSE 0
              END,
              0
            ) AS unit_price,
            o.id AS order_id
          FROM orders o
          CROSS JOIN LATERAL jsonb_array_elements(o.order_items) AS item(value)
          ${where.clause}
        )
        SELECT
          product_group,
          SUM(quantity)::numeric AS total_quantity,
          SUM(quantity * unit_price)::numeric AS total_revenue,
          COUNT(DISTINCT order_id)::int AS order_count
        FROM expanded
        WHERE product_group IS NOT NULL
        GROUP BY product_group
        ORDER BY total_quantity DESC
        LIMIT 10;
      `;
      const { rows: allRows } = await executeSql(allProductsSql, where.params);
      
      // Format the rows (no need to handle "Other Products" anymore)
      const formattedRows = allRows.map((row) => ({
        product_group: row.product_group,
        total_quantity: coerceNumber(row.total_quantity),
        total_revenue: coerceNumber(row.total_revenue),
        order_count: coerceNumber(row.order_count)
      }));
      
      return { sql: allProductsSql, rows: formattedRows };
    }
    case 'productStocks': {
      // Get product stock levels for on-hand products (balls, trophies, medals)
      // Use COALESCE for optional columns that might not exist
      const productStocksSql = `
        SELECT
          p.name AS product_name,
          p.category,
          COALESCE(p.stock_quantity, 0)::numeric AS stock_quantity,
          COALESCE(b.name, 'Unspecified') AS branch_name,
          COALESCE(p.reorder_level, 10)::numeric AS reorder_level,
          p.last_restocked
        FROM products p
        LEFT JOIN branches b ON p.branch_id = b.id
        WHERE p.stock_quantity IS NOT NULL
          AND LOWER(COALESCE(p.category, '')) IN ('balls', 'trophies', 'medals')
        ORDER BY p.stock_quantity DESC, p.name ASC
        LIMIT 50;
      `;
      try {
        const { rows } = await executeSql(productStocksSql, []);
        const formattedRows = rows.map((row) => ({
          product_name: row.product_name || 'Unknown',
          category: row.category || 'Unknown',
          stock_quantity: coerceNumber(row.stock_quantity) || 0,
          branch_name: row.branch_name || 'Unspecified',
          reorder_level: coerceNumber(row.reorder_level) || 10,
          last_restocked: row.last_restocked ? coerceDate(row.last_restocked) : null
        }));
        return { sql: productStocksSql, rows: formattedRows };
      } catch (error) {
        console.error('Error fetching product stocks:', error);
        // If columns don't exist, try a simpler query without optional columns
        const simpleProductStocksSql = `
          SELECT
            p.name AS product_name,
            p.category,
            COALESCE(p.stock_quantity, 0)::numeric AS stock_quantity,
            COALESCE(b.name, 'Unspecified') AS branch_name
          FROM products p
          LEFT JOIN branches b ON p.branch_id = b.id
          WHERE p.stock_quantity IS NOT NULL
            AND LOWER(COALESCE(p.category, '')) IN ('balls', 'trophies', 'medals')
          ORDER BY p.stock_quantity DESC, p.name ASC
          LIMIT 50;
        `;
        const { rows } = await executeSql(simpleProductStocksSql, []);
        const formattedRows = rows.map((row) => ({
          product_name: row.product_name || 'Unknown',
          category: row.category || 'Unknown',
          stock_quantity: coerceNumber(row.stock_quantity) || 0,
          branch_name: row.branch_name || 'Unspecified',
          reorder_level: 10,
          last_restocked: null
        }));
        return { sql: simpleProductStocksSql, rows: formattedRows };
      }
    }
    case 'topCustomers': {
      // For customer insights, we need to process ALL orders (including current month)
      // to get accurate customer counts, but still exclude cancelled orders
      // Remove the current month exclusion from where clause for customer counting
      let customerWhereClause = where.clause;
      let customerParams = [...where.params];
      
      // Remove current month exclusion for customer counting
      customerWhereClause = customerWhereClause.replace(/\s+AND\s+created_at < date_trunc\('month', CURRENT_TIMESTAMP\)/gi, '');
      customerWhereClause = customerWhereClause.replace(/created_at < date_trunc\('month', CURRENT_TIMESTAMP\)\s+AND\s+/gi, '');
      customerWhereClause = customerWhereClause.trim();
      
      // Ensure cancelled orders are excluded
      if (!customerWhereClause.includes('cancelled') && !customerWhereClause.includes('canceled')) {
        if (customerWhereClause && customerWhereClause.startsWith('WHERE')) {
          customerWhereClause += " AND LOWER(status) NOT IN ('cancelled', 'canceled')";
        } else {
          customerWhereClause = "WHERE LOWER(status) NOT IN ('cancelled', 'canceled')";
        }
      }
      
      // Get top customers query
      const topCustomersSql = `
        SELECT
          user_id,
          COUNT(*)::int AS order_count,
          SUM(total_amount)::numeric AS total_spent,
          MAX(created_at) AS last_order,
          MIN(created_at) AS first_order
        FROM orders
        ${customerWhereClause}
        GROUP BY user_id
        ORDER BY total_spent DESC
        LIMIT 10;
      `;
      
      // Get total customers count
      const totalCustomersSql = `
        SELECT COUNT(DISTINCT user_id)::int AS total_customers
        FROM orders
        ${customerWhereClause}
      `;
      
      // Get new customers count (first order within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newCustomersParams = [...customerParams, thirtyDaysAgo.toISOString()];
      const newCustomersSql = `
        WITH customer_first_orders AS (
          SELECT user_id, MIN(created_at) AS first_order_date
          FROM orders
          ${customerWhereClause}
          GROUP BY user_id
        )
        SELECT COUNT(*)::int AS new_customers
        FROM customer_first_orders
        WHERE first_order_date >= $${newCustomersParams.length}
      `;
      
      // Get total orders and revenue for average calculations
      const allCustomersMetricsSql = `
        SELECT
          COUNT(DISTINCT user_id)::int AS total_customers,
          COUNT(*)::int AS total_orders,
          SUM(total_amount)::numeric AS total_revenue
        FROM orders
        ${customerWhereClause}
      `;
      
      const [topCustomersResult, totalCustomersResult, newCustomersResult, allCustomersMetricsResult] = await Promise.all([
        executeSql(topCustomersSql, customerParams),
        executeSql(totalCustomersSql, customerParams),
        executeSql(newCustomersSql, newCustomersParams),
        executeSql(allCustomersMetricsSql, customerParams)
      ]);
      
      const allCustomersMetrics = allCustomersMetricsResult?.rows?.[0] || {};
      const totalCustomers = coerceNumber(allCustomersMetrics.total_customers) || 0;
      const newCustomers = coerceNumber(newCustomersResult?.rows?.[0]?.new_customers) || 0;
      const totalOrders = coerceNumber(allCustomersMetrics.total_orders) || 0;
      const totalRevenue = coerceNumber(allCustomersMetrics.total_revenue) || 0;
      
      const avgOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
      const avgSpentPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
      
      const formattedRows = topCustomersResult.rows.map((row) => ({
        user_id: row.user_id,
        order_count: coerceNumber(row.order_count),
        total_spent: coerceNumber(row.total_spent),
        last_order: coerceDate(row.last_order),
        first_order: coerceDate(row.first_order)
      }));
      
      const enrichedRows = await enrichTopCustomerRows(formattedRows);
      
      // Add summary metadata
      return {
        sql: topCustomersSql,
        rows: enrichedRows,
        metadata: {
          summary: {
            totalCustomers,
            newCustomers,
            avgOrdersPerCustomer: parseFloat(avgOrdersPerCustomer.toFixed(2)),
            avgSpentPerCustomer: Math.round(avgSpentPerCustomer)
          }
        }
      };
    }
    case 'customerLocations': {
      // Use user_addresses as primary source, join with orders for order statistics
      // Apply filters to orders in the JOIN condition
      const orderFilterClause = where.clause ? where.clause.replace(/^WHERE\s+/i, 'AND ') : '';
      const sql = `
        WITH customer_cities AS (
          SELECT DISTINCT
            ua.user_id,
            TRIM(ua.city) AS city,
            TRIM(ua.province) AS province
          FROM user_addresses ua
          WHERE ua.city IS NOT NULL
            AND TRIM(ua.city) != ''
            AND ua.province IS NOT NULL
            AND TRIM(ua.province) != ''
            AND ua.province IN ('Batangas', 'Oriental Mindoro')
        )
        SELECT
          cc.city,
          cc.province,
          COUNT(DISTINCT cc.user_id)::int AS customers,
          COUNT(DISTINCT o.id)::int AS orders,
          COALESCE(SUM(o.total_amount), 0)::numeric AS total_revenue,
          COALESCE(AVG(o.total_amount), 0)::numeric AS average_order_value,
          MAX(o.created_at) AS last_order
        FROM customer_cities cc
        LEFT JOIN orders o ON o.user_id = cc.user_id
          AND LOWER(o.status) NOT IN ('cancelled', 'canceled')
          ${orderFilterClause}
        GROUP BY cc.city, cc.province
        ORDER BY customers DESC, orders DESC
        LIMIT 25;
      `;
      const { rows } = await executeSql(sql, where.params);
      const formattedRows = rows.map((row) => ({
        city: row.city,
        province: row.province,
        orders: coerceNumber(row.orders),
        customers: coerceNumber(row.customers),
        total_revenue: coerceNumber(row.total_revenue),
        average_order_value: coerceNumber(row.average_order_value),
        last_order: coerceDate(row.last_order)
      }));
      return { sql, rows: formattedRows };
    }
    case 'buyingTrends': {
      const sql = `
        SELECT
          TO_CHAR(date_trunc('week', created_at), 'IYYY-"W"IW') AS week_label,
          date_trunc('week', created_at) AS week_start,
          COUNT(*)::int AS orders,
          COUNT(DISTINCT user_id)::int AS customers
        FROM orders
        ${where.clause}
        GROUP BY week_label, week_start
        ORDER BY week_start DESC
        LIMIT 12;
      `;
      const { rows } = await executeSql(sql, where.params);
      const formattedRows = rows.map((row) => ({
        week_label: row.week_label,
        week_start: coerceDate(row.week_start),
        orders: coerceNumber(row.orders),
        customers: coerceNumber(row.customers)
      }));
      return { sql, rows: formattedRows };
    }
    case 'salesForecast': {
      const branchContext = await resolveBranchContextAnalytics(options.user || {});
      const forecastData = await computeSalesForecast({
        requestedRange: options.range || 'restOfYear',
        branchContext
      });
      const rows = Array.isArray(forecastData.forecast) ? forecastData.forecast : [];
      return {
        sql: 'MODEL: weighted_fourier_regression',
        rows,
        metadata: {
          historical: forecastData.historical || [],
          summary: forecastData.summary || null,
          model: forecastData.model || null,
          trainingWindow: forecastData.trainingWindow || null,
          range: forecastData.range || options.range || 'restOfYear',
          rangeLabel: forecastData.rangeLabel || null
        }
      };
    }
    default:
      return { sql: 'N/A', rows: [] };
  }
}

function buildContextMessage(chartId, filters, sql, rows) {
  const previewLimit = 25;
  const previewRows = rows.slice(0, previewLimit);
  return [
    `Chart ID: ${chartId}`,
    filters && Object.keys(filters).length
      ? `Applied filters: ${JSON.stringify(filters)}`
      : 'Applied filters: none',
    `SQL executed:\n${sql.trim()}`,
    `Rows returned: ${rows.length}`,
    `Preview (first ${Math.min(previewLimit, rows.length)} rows):\n${JSON.stringify(previewRows, null, 2)}`
  ].join('\n\n');
}

const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

function formatPeso(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '₱0';
  }
  return pesoFormatter.format(value);
}

function buildForecastMetadataMessage(metadata = {}, chartData = {}) {
  const summary = metadata.summary || chartData.summary;
  if (!summary) {
    return null;
  }

  const modelInfo = metadata.model || chartData.model || {};
  const modelType = modelInfo.type || metadata.modelType || chartData.modelType || 'unknown';
  const trainingWindow = metadata.trainingWindow || chartData.trainingWindow || {};
  
  const rangeLabel = SALES_FORECAST_RANGE_LABELS?.[summary.range] || metadata.rangeLabel || summary.range || 'selected range';
  const lines = [
    `Sales forecast summary for ${rangeLabel}:`,
    `- Projected revenue: ${formatPeso(summary.projectedRevenue)}`,
    `- Projected orders: ${summary.projectedOrders ?? 'n/a'}`,
    `- Baseline revenue: ${formatPeso(summary.baselineRevenue)}`,
    `- Expected growth vs baseline: ${summary.expectedGrowthRate != null ? `${summary.expectedGrowthRate}%` : 'n/a'}`,
    `- Confidence: ${summary.confidence != null ? `${summary.confidence}%` : 'n/a'}`,
    '',
    '**Predictive Model Used:**'
  ];

  // Add detailed model explanation
  if (modelType === 'weighted_fourier_regression') {
    lines.push(
      'The sales forecast uses a **Weighted Fourier Regression** model, a time series forecasting method specifically designed to capture seasonal patterns and trends in revenue data.',
      '',
      '**How the Model Works:**',
      '1. **Seasonal Pattern Detection**: The model uses Fourier series (sine and cosine harmonics) to identify recurring yearly patterns in sales. It employs 6 harmonic pairs to capture complex seasonal variations throughout the year.',
      '2. **Recency Weighting**: Recent months receive higher weights (decay factor: 0.55) to emphasize current trends, while older data still contributes (minimum weight: 0.35) to maintain long-term pattern recognition.',
      '3. **Log-Transform**: Revenue values are log-transformed (log(revenue + 1)) to stabilize variance and ensure all predictions remain positive, which is more suitable for revenue forecasting than linear models.',
      '4. **Regression Analysis**: A weighted linear regression is performed on the Fourier features to learn the relationship between time patterns and revenue, with Ridge regularization to prevent overfitting.',
      '5. **Forecast Generation**: The model projects future revenue by extending the learned seasonal patterns and trends forward in time, with confidence scores that decrease as the forecast horizon extends.',
      '',
      '**Model Parameters:**',
      `- Harmonics (seasonal components): ${modelInfo.harmonics ?? 6}`,
      `- Recency decay factor: ${modelInfo.recencyDecay ?? 0.55} (lower values emphasize recent data more)`,
      `- Minimum weight: ${modelInfo.minWeight ?? 0.35} (prevents old data from being completely ignored)`,
      `- Season length: 12 months (yearly cycle)`
    );
  } else if (modelType === 'seasonal_naive') {
    lines.push(
      'The sales forecast uses a **Seasonal Naïve** model as a fallback when insufficient data is available for regression analysis.',
      '',
      '**How the Model Works:**',
      'This method projects future revenue by mirroring the same months from the previous year. For example, January 2025 would use January 2024\'s revenue. This is a simple but effective approach when historical patterns are the best predictor available.'
    );
  } else {
    lines.push(`Model type: ${modelType}`);
  }

  // Add training information
  if (trainingWindow.start || trainingWindow.end) {
    const startDate = trainingWindow.start ? new Date(trainingWindow.start).toISOString().slice(0, 7) : 'N/A';
    const endDate = trainingWindow.end ? new Date(trainingWindow.end).toISOString().slice(0, 7) : 'N/A';
    lines.push(
      '',
      '**Training Window:**',
      `- Start: ${startDate}`,
      `- End: ${endDate}`,
      `- The model was trained on historical monthly revenue data from ${startDate} to ${endDate}.`
    );
  }

  // Add model performance metrics
  const trainingMape = typeof modelInfo.trainingMape === 'number'
    ? modelInfo.trainingMape
    : typeof metadata.trainingMape === 'number'
      ? metadata.trainingMape
      : typeof chartData.trainingMape === 'number'
        ? chartData.trainingMape
        : null;
  if (trainingMape !== null) {
    lines.push(
      '',
      '**Model Performance:**',
      `- Training MAPE (Mean Absolute Percentage Error): ${trainingMape.toFixed(2)}%`,
      '  (Lower MAPE indicates better accuracy; this represents the average percentage error on historical data)'
    );
  }

  if (modelInfo.fallbackUsed || metadata.fallbackUsed || chartData.fallbackUsed) {
    lines.push(
      '',
      '**Note:** Seasonal naïve fallback was used due to insufficient data for regression analysis. This means the forecast is based on repeating last year\'s pattern rather than the weighted Fourier regression model.'
    );
  }

  // Add usage instructions
  lines.push(
    '',
    '**Using the Forecast:**',
    'The forecast provides projected revenue and order counts for the selected time period. Use these projections to:',
    '- Plan inventory and production capacity',
    '- Set revenue targets and budget allocation',
    '- Identify seasonal opportunities and prepare for peak periods',
    '- Monitor actual performance against projections to assess accuracy',
    '',
    '**Confidence Scores:**',
    'Each forecast month includes a confidence percentage (45-95%) that reflects the model\'s certainty. Higher confidence indicates more reliable projections based on consistent historical patterns.'
  );

  return lines.join('\n');
}

function extractSqlBlock(text = '') {
  const inlineMatch = text.match(/<SQL>([\s\S]*?)<\/SQL>/i);
  if (inlineMatch) {
    return inlineMatch[1].trim();
  }

  const fencedMatch = text.match(/```sql([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return null;
}

function stripSqlBlocks(text = '') {
  return text
    .replace(/<SQL>[\s\S]*?<\/SQL>/gi, '')
    .replace(/<THINK>[\s\S]*?<\/THINK>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<internal>[\s\S]*?<\/internal>/gi, '')
    .trim();
}

function isSelectStatement(sql = '') {
  return /^\s*select\b/i.test(sql);
}

function buildSqlResultSummary(sqlText, result) {
  const sampleLimit = 50;
  const rows = Array.isArray(result?.rows) ? result.rows.slice(0, sampleLimit) : [];
  const duration = typeof result?.durationMs === 'number' ? `${result.durationMs} ms` : 'n/a';
  const columns = Array.isArray(result?.fields) ? result.fields.map((field) => field.name) : [];

  return {
    executedSql: sqlText,
    rowCount: result?.rowCount ?? rows.length,
    durationMs: result?.durationMs ?? null,
    columns,
    sampleRows: rows
  };
}

router.post('/analytics', async (req, res, next) => {
  try {
    // Log request for debugging
    console.log('AI analytics request received:', {
      chartId: req.body?.chartId,
      hasUser: !!req.user,
      userId: req.user?.id,
      userRole: req.user?.role,
      general: req.body?.general
    });

    // Verify user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if GROQ_API_KEY is configured
    if (!groqConfigured) {
      return res.status(503).json({
        success: false,
        error: 'AI analytics service is not available. GROQ_API_KEY is not configured. Please contact the administrator.'
      });
    }

    const {
      question,
      filters,
      messages: conversationMessages,
      general,
      range,
      chartData
    } = req.body || {};

    let { chartId } = req.body || {};
    const isGeneralConversation = Boolean(general);

    const sanitizedMessages = sanitizeMessages(conversationMessages);

    if (!chartId || typeof chartId !== 'string') {
      if (!isGeneralConversation) {
        return res.status(400).json({
          success: false,
          error: 'chartId is required.'
        });
      }
      chartId = null;
    }

    const rawQuestion = typeof question === 'string' ? question.trim() : '';
    const lastUserMessage = [...sanitizedMessages].reverse().find((msg) => msg.role === 'user');
    const lastAssistantMessage = [...sanitizedMessages].reverse().find((msg) => msg.role === 'assistant');
    const lastUserIndex = sanitizedMessages.lastIndexOf(lastUserMessage ?? {});
    const lastAssistantIndex = sanitizedMessages.lastIndexOf(lastAssistantMessage ?? {});
    const greetingRegex = /^(hi|hello|hey|greetings|good (morning|afternoon|evening))\b/i;
    const isGreetingOnly =
      lastUserMessage &&
      greetingRegex.test((lastUserMessage.content || rawQuestion || '').trim()) &&
      (lastAssistantIndex === -1 || lastUserIndex > lastAssistantIndex);
    const helpRegex = /(what\s+can\s+you\s+help|who\s+are\s+you|what\s+do\s+you\s+do|capabilities|how\s+can\s+you\s+assist)/i;
    const isGeneralHelp =
      isGeneralConversation &&
      lastUserMessage &&
      (greetingRegex.test((lastUserMessage.content || rawQuestion || '').trim()) ||
        helpRegex.test((lastUserMessage.content || rawQuestion || '').toLowerCase())) &&
      (lastAssistantIndex === -1 || lastUserIndex > lastAssistantIndex);

    const identityRegex = /(who\s+created\s+you|who\s+built\s+you|who\s+made\s+you|where\s+are\s+you|where\s+do\s+you\s+live|how\s+old\s+are\s+you|your\s+purpose|what\s+is\s+your\s+name|who\s+developed\s+you)/i;
    const isIdentityQuestion =
      isGeneralConversation &&
      lastUserMessage &&
      identityRegex.test((lastUserMessage.content || rawQuestion || '').toLowerCase()) &&
      (lastAssistantIndex === -1 || lastUserIndex > lastAssistantIndex);

    const businessSuggestionReply = `**Executive Summary**\n\nI'm designed to help you explore business metrics in this dashboard. Ask about trends, branches, products, customers, or time periods and I'll analyze the data for you.\n\n**Example Questions**\n- "Which branch led sales in March 2024?"\n- "What were our top 5 products last quarter?"\n- "Show me monthly revenue trends for 2024."\n- "Who are our best customers this year?"`;

    if (isGreetingOnly || isGeneralHelp) {
      const capabilityReply = `**Executive Summary**\n\nI am Nexus, the AI analytics assistant built into this dashboard. I can translate business questions into safe SQL, run the queries on your data, and present the findings in a clear format so you can act quickly.\n\n**What I Can Help With**\n- Summaries of charts or datasets you are viewing\n- Ad-hoc questions such as top branches, products, or time periods\n- Follow-up explorations by generating and executing new SELECT queries\n- Highlighting trends, anomalies, or comparisons you care about\n\nAsk me about any metric, branch, product, or time window and I will fetch the data if it is available.`;
      return res.json({
        success: true,
        reply: capabilityReply,
        sql: null,
        rows: [],
        rowCount: 0,
        chartId: null,
        model: null,
        usage: null
      });
    }

    if (isIdentityQuestion) {
      return res.json({
        success: true,
        reply: businessSuggestionReply,
        sql: null,
        rows: [],
        rowCount: 0,
        chartId: null,
        model: null,
        usage: null
      });
    }
    
    let dataset = null;
    let normalizedFilters = null;
    if (chartId) {
      try {
        dataset = await getChartDataset(chartId, filters, {
          range,
          user: req.user
        });
        if (!dataset || !dataset.rows) {
          throw new Error('Invalid dataset returned from getChartDataset');
        }
        normalizedFilters = normalizeFilters(filters);
      } catch (dbError) {
        console.error('Error fetching chart dataset:', dbError);
        console.error('Database error stack:', dbError.stack);
        return res.status(500).json({
          success: false,
          error: `Failed to fetch chart data: ${dbError.message || 'Unknown database error'}`
        });
      }
    }

    const systemPrompt = [
      'You are Nexus, an AI data analyst embedded in the Yohanns admin analytics suite.',
      'Use the provided SQL output to craft clear, data-driven insights.',
      'Adopt a concise, professional tone—no emojis—and avoid conversational filler.',
      'Begin your response with a bold **Executive Summary** paragraph (1-2 sentences).',
      'Follow with clearly labeled sections such as **Key Metrics** and **Recommended Actions**, using bullet lists when appropriate.',
      'Follow all section headings with bold formatting (e.g., **Key Metrics**).',
      'When listing items, use markdown bullet syntax (`- `) and indent sub-points properly.',
      'Do not prefix bullet items with apostrophes or other decorative characters.',
      'Always explain what the numbers mean for the business, highlight noteworthy changes, and suggest potential follow-up actions.',
      'Unless the user explicitly requests cancelled orders, treat them as excluded from revenue and order counts (status values "cancelled" / "canceled"); do not sum their total_amount.',
      'If the user specifically asks about cancelled orders, centre the analysis on cancellation metrics (counts, rates, branch comparisons) and avoid mixing in unrelated revenue totals unless the user also asks for them.',
      'Branch information is stored in orders.pickup_location (text); there is no branch_id column in orders. Use pickup_location (or join to the branches table by name) when aggregating by branch.',
      'When analyzing top product groups, use the standardized categories returned by the dataset (Basketball Jerseys, Volleyball Jerseys, Hoodies, Uniforms, T-shirts, Long Sleeves, Custom Jerseys, Sports Balls, Trophies, Medals) and discuss them explicitly rather than inventing new groupings.',
      'When analyzing product stocks, focus on on-hand inventory items (balls, trophies, medals) that have stock_quantity. Identify low stock levels, products that may need restocking, stock distribution across branches, and provide actionable inventory management recommendations. Products with stock_quantity at or below reorder_level should be flagged as needing attention.',
      'The business operates in the Philippines; refer to seasons as dry or rainy and never mention winter.',
      'ALWAYS use Philippine Peso (PHP) currency format when mentioning monetary amounts. Use the ₱ symbol (not $) and format amounts as ₱X,XXX or ₱X,XXX.XX (e.g., ₱1,234.56 or ₱50,000). Never use dollar signs ($) or USD. All revenue, prices, and monetary values are in Philippine Pesos.',
      'If the available dataset does not contain the information needed to answer the user question, you MUST respond by proposing a SAFE SELECT query wrapped in <SQL>...</SQL> and wait for the query result before providing conclusions. Do not just suggest a query - actually provide it wrapped in <SQL>...</SQL>.',
      'Location-based questions (province, city, address) require querying user_addresses table and/or orders.delivery_address JSONB field. If the current dataset does not contain location data, generate SQL to fetch it.',
      'If a question cannot be answered with the provided data, generate the appropriate SQL query to fetch the needed data.',
      'When analyzing sales forecasts, always include a brief explanation of the predictive model used (Weighted Fourier Regression or Seasonal Naïve) and how it works, as well as the model\'s confidence scores and training performance metrics. This helps users understand the reliability and methodology behind the projections.',
      'Respond using markdown formatting only.'
    ].join(' ');

    const conversation = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: SCHEMA_GUIDE }
    ];

    if (dataset) {
      conversation.push({
        role: 'system',
        content: buildContextMessage(chartId, normalizedFilters, dataset.sql, dataset.rows)
      });
      
      // Add forecast metadata for sales forecast
      if (chartId === 'salesForecast') {
        const metadataMessage = buildForecastMetadataMessage(dataset.metadata || {}, chartData || {});
        if (metadataMessage) {
          conversation.push({
            role: 'system',
            content: metadataMessage
          });
        }
      }
      
      // Add customer insights summary metadata
      if (chartId === 'topCustomers' && dataset.metadata?.summary) {
        const summary = dataset.metadata.summary;
        const customerInsightsMessage = [
          'Customer Insights Summary:',
          `- Total Customers: ${summary.totalCustomers}`,
          `- New Customers (last 30 days): ${summary.newCustomers}`,
          `- Average Orders per Customer: ${summary.avgOrdersPerCustomer.toFixed(2)}`,
          `- Average Spent per Customer: ${formatPeso(Math.round(summary.avgSpentPerCustomer))}`
        ].join('\n');
        
        conversation.push({
          role: 'system',
          content: customerInsightsMessage
        });
      }
    } else {
      conversation.push({
        role: 'system',
        content: 'General analytics conversation: the user may ask for any metric across the business. Use the schema guide to craft safe SELECT queries when needed.'
      });
    }

    if (sanitizedMessages.length > 0) {
      conversation.push(...sanitizedMessages);
    } else if (rawQuestion) {
      conversation.push({ role: 'user', content: rawQuestion });
    } else {
      conversation.push({ role: 'user', content: 'Please analyze this dataset and highlight the most important business insights.' });
    }

    const hasDataset = dataset && Array.isArray(dataset.rows) && dataset.rows.length > 0;

    if (hasDataset) {
      const datasetAnalysisConversation = [...conversation];
      const lastMessage = datasetAnalysisConversation.pop();

      // Check if the question requires data that might not be in the current dataset
      const questionText = (lastMessage?.content || rawQuestion || '').toLowerCase();
      const requiresLocationData = /(province|city|location|address|where|batangas|calaca|balayan|mindoro)/i.test(questionText);
      const requiresDifferentData = requiresLocationData && 
        (!dataset.rows[0] || (!dataset.rows[0].province && !dataset.rows[0].city && !dataset.rows[0].delivery_address));

      if (requiresDifferentData) {
        // Question needs different data - allow SQL generation
        datasetAnalysisConversation.push({
          role: 'system',
          content: 'The provided dataset does not contain the information needed to answer this question. Generate a SAFE SELECT query wrapped in <SQL>...</SQL> to fetch the required data. The dataset context is provided for reference, but you should query the database directly for location/customer data.'
        });
      } else {
        // Dataset should have the needed data
        datasetAnalysisConversation.push({
          role: 'system',
          content: 'The dataset above already contains all values needed. Do not request or generate additional SQL. Provide insights and recommended actions based solely on the provided rows.'
        });
      }

      if (lastMessage) {
        datasetAnalysisConversation.push(lastMessage);
      }

      const analysisResponse = await callGroq(datasetAnalysisConversation, { estimatedTokens: 2500 });
      const cleanedReply = stripSqlBlocks(analysisResponse.reply);
      const proposedSql = extractSqlBlock(analysisResponse.reply);

      // If Nexus proposed SQL because the dataset doesn't have the needed data, execute it
      if (proposedSql && requiresDifferentData && isSelectStatement(proposedSql)) {
        // Continue with SQL execution flow - set up variables for the SQL execution below
        let normalizedSql = proposedSql.replace(/;\s*$/g, '').trim();
        let sqlResult;
        let sqlAttempts = 0;

        while (sqlAttempts < MAX_SQL_EXECUTION_ATTEMPTS) {
          try {
            sqlResult = await executeSql(normalizedSql);
            break;
          } catch (sqlError) {
            console.error('SQL execution error for Nexus location query:', sqlError);
            sqlAttempts += 1;

            if (sqlAttempts >= MAX_SQL_EXECUTION_ATTEMPTS) {
              return res.status(500).json({
                success: false,
                error: `SQL execution failed: ${sqlError.message}`
              });
            }

            datasetAnalysisConversation.push({ role: 'assistant', content: analysisResponse.reply });
            datasetAnalysisConversation.push({
              role: 'user',
              content: `The SQL failed with error: ${sqlError.message}. Provide a corrected SELECT query wrapped in <SQL>...</SQL> with no additional commentary.`
            });

            const retryResponse = await callGroq(datasetAnalysisConversation, { estimatedTokens: 4000 });
            const retrySql = extractSqlBlock(retryResponse.reply);

            if (!retrySql || !isSelectStatement(retrySql.replace(/;\s*$/g, '').trim())) {
              return res.status(400).json({
                success: false,
                error: 'Nexus proposed an unsupported SQL statement after retry. Please adjust the request.'
              });
            }

            normalizedSql = retrySql.replace(/;\s*$/g, '').trim();
          }
        }

        // Execute the SQL and return results
        const sampleLimit = 50;
        const rows = Array.isArray(sqlResult?.rows) ? sqlResult.rows.slice(0, sampleLimit) : [];
        const duration = typeof sqlResult?.durationMs === 'number' ? `${sqlResult.durationMs} ms` : 'n/a';
        const columns = Array.isArray(sqlResult?.fields) ? sqlResult.fields.map((field) => field.name) : [];

        const resultSummaryContent = [
          'SQL query executed successfully.',
          `Rows returned: ${sqlResult?.rowCount ?? rows.length}`,
          `Columns: ${columns.join(', ') || 'n/a'}`,
          `Execution time: ${duration}`,
          `Sample rows:\n${JSON.stringify(rows, null, 2)}`,
          'Provide a single consolidated analysis that incorporates these results. Do not restate prior interim responses, do not produce multiple executive summaries, and respond once using the required bold headings and bullet formatting.'
        ].join('\n\n');

        const followUpMessages = [
          ...datasetAnalysisConversation,
          { role: 'assistant', content: analysisResponse.reply },
          { role: 'user', content: resultSummaryContent }
        ];

        let followUp;
        try {
          followUp = await callGroq(followUpMessages, { estimatedTokens: 3000 });
        } catch (groqError) {
          console.error('Groq API error during follow-up analysis:', groqError);
          return res.status(500).json({
            success: false,
            error: `AI service error: ${groqError.message || 'Failed during follow-up analysis'}`
          });
        }

        const finalReply = stripSqlBlocks(followUp.reply);

        return res.json({
          success: true,
          reply: finalReply,
          sql: normalizedSql,
          rows,
          rowCount: sqlResult?.rowCount ?? rows.length,
          columns,
          durationMs: sqlResult?.durationMs ?? null,
          chartId,
          model: followUp.model,
          usage: followUp.usage || null
        });
      } else {
        // Return dataset analysis
        return res.json({
          success: true,
          reply: cleanedReply,
          sql: dataset.sql,
          rows: dataset.rows,
          rowCount: dataset.rows.length,
          chartId,
          model: analysisResponse.model,
          usage: analysisResponse.usage || null
        });
      }
    }

    let aiResponse;
    let initialReply;
    let proposedSql;
    let draftAttempts = 0;

    while (draftAttempts <= MAX_SQL_GENERATION_ATTEMPTS) {
      aiResponse = await callGroq(conversation, { estimatedTokens: 4000 });
      initialReply = aiResponse.reply;
      proposedSql = extractSqlBlock(initialReply);

      if (proposedSql) {
        break;
      }

      conversation.push({ role: 'assistant', content: initialReply });
      conversation.push({
        role: 'user',
        content: 'You did not provide SQL. Respond with only the SELECT query required, wrapped in <SQL>...</SQL>, with no additional commentary.'
      });

      draftAttempts += 1;
    }

    if (!proposedSql) {
      const cleanedReply = stripSqlBlocks(initialReply);
      return res.json({
        success: true,
        reply: cleanedReply,
        sql: dataset ? dataset.sql : null,
        rows: dataset ? dataset.rows : [],
        rowCount: dataset ? dataset.rows.length : 0,
        chartId,
        model: aiResponse.model,
        usage: aiResponse.usage || null
      });
    }

    let normalizedSql = proposedSql.replace(/;\s*$/g, '').trim();

    if (!isSelectStatement(normalizedSql)) {
      conversation.push({ role: 'assistant', content: initialReply });
      conversation.push({
        role: 'user',
        content: 'You proposed an unsupported statement. Provide only a SELECT query wrapped in <SQL>...</SQL> with no commentary.'
      });

      aiResponse = await callGroq(conversation, { estimatedTokens: 3500 });
      initialReply = aiResponse.reply;
      proposedSql = extractSqlBlock(initialReply);
      normalizedSql = proposedSql ? proposedSql.replace(/;\s*$/g, '').trim() : '';
    }

    if (!proposedSql || !isSelectStatement(normalizedSql)) {
      console.warn('Rejected non-SELECT SQL proposed by Nexus:', normalizedSql);

      if (dataset && Array.isArray(dataset.rows) && dataset.rows.length > 0) {
        conversation.push({ role: 'assistant', content: initialReply });
        conversation.push({
          role: 'user',
          content: 'Use the dataset that was already provided to you and respond with insights only. Do not request or generate any additional SQL.'
        });

        const fallbackResponse = await callGroq(conversation, { estimatedTokens: 2500 });
        const cleanedFallback = stripSqlBlocks(fallbackResponse.reply);

        return res.json({
          success: true,
          reply: cleanedFallback,
          sql: dataset.sql,
          rows: dataset.rows,
          rowCount: dataset.rows.length,
          chartId,
          model: fallbackResponse.model,
          usage: fallbackResponse.usage || null
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Nexus proposed an unsupported SQL statement. Please refine your question to request data (SELECT queries only).'
      });
    }

    let sqlResult;
    let sqlAttempts = 0;

    while (sqlAttempts < MAX_SQL_EXECUTION_ATTEMPTS) {
      try {
        sqlResult = await executeSql(normalizedSql);
        break;
      } catch (sqlError) {
        console.error('SQL execution error for Nexus follow-up query:', sqlError);
        sqlAttempts += 1;

        if (sqlAttempts >= MAX_SQL_EXECUTION_ATTEMPTS) {
          return res.status(500).json({
            success: false,
            error: `SQL execution failed: ${sqlError.message}`
          });
        }

        conversation.push({ role: 'assistant', content: initialReply });
        conversation.push({
          role: 'user',
          content: `The SQL failed with error: ${sqlError.message}. Provide a corrected SELECT query wrapped in <SQL>...</SQL> with no additional commentary.`
        });

        aiResponse = await callGroq(conversation, { estimatedTokens: 4000 });
        initialReply = aiResponse.reply;
        proposedSql = extractSqlBlock(initialReply);

        if (!proposedSql) {
          conversation.push({ role: 'assistant', content: initialReply });
          conversation.push({
            role: 'user',
            content: 'You still have not provided SQL. Respond with only the SELECT query required, wrapped in <SQL>...</SQL>, with no narration.'
          });
          continue;
        }

        normalizedSql = proposedSql.replace(/;\s*$/g, '').trim();

        if (!isSelectStatement(normalizedSql)) {
          console.warn('Rejected non-SELECT SQL after retry:', normalizedSql);
          return res.status(400).json({
            success: false,
            error: 'Nexus proposed an unsupported SQL statement after retry. Please adjust the request.'
          });
        }
      }
    }

    const sampleLimit = 50;
    const rows = Array.isArray(sqlResult?.rows) ? sqlResult.rows.slice(0, sampleLimit) : [];
    const duration = typeof sqlResult?.durationMs === 'number' ? `${sqlResult.durationMs} ms` : 'n/a';
    const columns = Array.isArray(sqlResult?.fields) ? sqlResult.fields.map((field) => field.name) : [];

    const resultSummaryContent = [
      'SQL query executed successfully.',
      `Rows returned: ${sqlResult?.rowCount ?? rows.length}`,
      `Columns: ${columns.join(', ') || 'n/a'}`,
      `Execution time: ${duration}`,
      `Sample rows:\n${JSON.stringify(rows, null, 2)}`,
      'Provide a single consolidated analysis that incorporates these results. Do not restate prior interim responses, do not produce multiple executive summaries, and respond once using the required bold headings and bullet formatting.'
    ].join('\n\n');

    const followUpMessages = [
      ...conversation,
      { role: 'assistant', content: initialReply },
      { role: 'user', content: resultSummaryContent }
    ];

    let followUp;
    try {
      followUp = await callGroq(followUpMessages, { estimatedTokens: 3000 });
    } catch (groqError) {
      console.error('Groq API error during follow-up analysis:', groqError);
      return res.status(500).json({
        success: false,
        error: `AI service error: ${groqError.message || 'Failed during follow-up analysis'}`
      });
    }

    const finalReply = stripSqlBlocks(followUp.reply);

    return res.json({
      success: true,
      reply: finalReply,
      sql: normalizedSql,
      rows,
      rowCount: sqlResult?.rowCount ?? rows.length,
      columns,
      durationMs: sqlResult?.durationMs ?? null,
      chartId,
      model: followUp.model,
      usage: followUp.usage || null
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('AI analytics error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Make sure we haven't already sent a response
    if (res.headersSent) {
      console.error('Response already sent, cannot send error response');
      return;
    }
    
    // Ensure CORS headers are set on error responses
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    // Check for specific error types
    const errorMessage = error.message || String(error) || 'Unknown error';
    const errorLower = errorMessage.toLowerCase();
    
    if (errorLower.includes('tenant') || errorLower.includes('user not found')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Please refresh your session and try again.'
      });
    }
    
    if (errorLower.includes('groq') || errorLower.includes('api key')) {
      return res.status(500).json({
        success: false,
        error: 'AI service error. Please check your GROQ_API_KEY configuration.'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage || 'Failed to process AI analytics request.'
    });
  }
});

module.exports = router;

