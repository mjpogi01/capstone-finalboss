import { supabase } from '../lib/supabase';
import { authFetch } from './apiClient';
import { API_URL } from '../config/api';

/**
 * Optimized Analytics Service using React Query
 * All queries are optimized for Supabase Session Pooler
 */

// Get dashboard analytics (uses RPC function)
export const fetchDashboardAnalytics = async (branchId = null) => {
  const params = new URLSearchParams();
  if (branchId) {
    params.append('branch_id', branchId);
  }

  const response = await authFetch(`${API_URL}/api/analytics/dashboard?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch analytics data');
  }
  
  return result.data;
};

// Get paginated recent orders
export const fetchRecentOrders = async ({ pageParam = 0, branchId = null, limit = 50 }) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: (pageParam * limit).toString()
  });
  
  if (branchId) {
    params.append('branch_id', branchId);
  }

  const response = await authFetch(`${API_URL}/api/analytics/recent-orders?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch recent orders: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch recent orders');
  }
  
  return result.data;
};

// Get sales trends (daily sales)
export const fetchSalesTrends = async (days = 30, branchId = null) => {
  const params = new URLSearchParams({
    period: days.toString()
  });
  
  if (branchId) {
    params.append('branch_id', branchId);
  }

  const response = await authFetch(`${API_URL}/api/analytics/sales-trends?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sales trends: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch sales trends');
  }
  
  return result.data;
};

// Get top customers (paginated)
export const fetchTopCustomers = async ({ pageParam = 0, branchId = null, limit = 50 }) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: (pageParam * limit).toString()
  });
  
  if (branchId) {
    params.append('branch_id', branchId);
  }

  const response = await authFetch(`${API_URL}/api/analytics/top-customers?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch top customers: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch top customers');
  }
  
  return result.data;
};

// Get product stocks (paginated)
export const fetchProductStocks = async ({ pageParam = 0, branchId = null, limit = 100 }) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: (pageParam * limit).toString()
  });
  
  if (branchId) {
    params.append('branch_id', branchId);
  }

  const response = await authFetch(`${API_URL}/api/products?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch product stocks: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (!Array.isArray(result)) {
    throw new Error('Invalid response format');
  }
  
  return {
    products: result,
    hasMore: result.length === limit,
    nextPage: result.length === limit ? pageParam + 1 : null
  };
};







