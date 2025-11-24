import { useQuery, useInfiniteQuery } from 'react-query';
import {
  fetchDashboardAnalytics,
  fetchRecentOrders,
  fetchSalesTrends,
  fetchTopCustomers,
  fetchProductStocks
} from '../services/analyticsService';

// Query keys for cache management
export const analyticsKeys = {
  dashboard: (branchId) => ['analytics', 'dashboard', branchId],
  recentOrders: (branchId) => ['analytics', 'recent-orders', branchId],
  salesTrends: (days, branchId) => ['analytics', 'sales-trends', days, branchId],
  topCustomers: (branchId) => ['analytics', 'top-customers', branchId],
  productStocks: (branchId) => ['analytics', 'product-stocks', branchId],
};

/**
 * Hook to fetch dashboard analytics with React Query caching
 * Data is cached for 5 minutes to prevent excessive API calls
 */
export const useDashboardAnalytics = (branchId = null, options = {}) => {
  return useQuery(
    analyticsKeys.dashboard(branchId),
    () => fetchDashboardAnalytics(branchId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus for analytics
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      ...options,
    }
  );
};

/**
 * Hook to fetch paginated recent orders with infinite scroll
 */
export const useRecentOrders = (branchId = null, limit = 50) => {
  return useInfiniteQuery(
    analyticsKeys.recentOrders(branchId),
    ({ pageParam = 0 }) => fetchRecentOrders({ pageParam, branchId, limit }),
    {
      getNextPageParam: (lastPage, pages) => {
        // If last page has more data, return next page number
        if (lastPage.hasMore) {
          return pages.length;
        }
        return undefined;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes for recent orders
      cacheTime: 5 * 60 * 1000,
    }
  );
};

/**
 * Hook to fetch sales trends
 */
export const useSalesTrends = (days = 30, branchId = null, options = {}) => {
  return useQuery(
    analyticsKeys.salesTrends(days, branchId),
    () => fetchSalesTrends(days, branchId),
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      ...options,
    }
  );
};

/**
 * Hook to fetch top customers (paginated)
 */
export const useTopCustomers = (branchId = null, limit = 50) => {
  return useInfiniteQuery(
    analyticsKeys.topCustomers(branchId),
    ({ pageParam = 0 }) => fetchTopCustomers({ pageParam, branchId, limit }),
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.hasMore) {
          return pages.length;
        }
        return undefined;
      },
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );
};

/**
 * Hook to fetch product stocks (paginated)
 */
export const useProductStocks = (branchId = null, limit = 100) => {
  return useInfiniteQuery(
    analyticsKeys.productStocks(branchId),
    ({ pageParam = 0 }) => fetchProductStocks({ pageParam, branchId, limit }),
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.hasMore) {
          return pages.length;
        }
        return undefined;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes for product stocks (changes more frequently)
      cacheTime: 5 * 60 * 1000,
    }
  );
};



