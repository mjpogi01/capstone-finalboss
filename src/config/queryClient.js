import { QueryClient } from 'react-query';

// Create a query client with optimized defaults for analytics
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes (300 seconds)
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (but data is still fresh for 5 minutes)
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect if data is still fresh
      refetchOnReconnect: true,
      // Refetch on mount only if data is stale
      refetchOnMount: true,
    },
  },
});


