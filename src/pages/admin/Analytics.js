import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
  DatasetComponent,
  TransformComponent
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import Sidebar from '../../components/admin/Sidebar';
import NexusChatModal from '../../components/admin/NexusChatModal';
import '../admin/AdminDashboard.css';
import './admin-shared.css';
import { API_URL } from '../../config/api';
import { authFetch, authJsonFetch } from '../../services/apiClient';
import branchService from '../../services/branchService';
import productService from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';
import { FaFilter, FaStore, FaClipboardList, FaTshirt, FaMap, FaChartLine, FaChartArea, FaUsers, FaUserPlus, FaShoppingCart, FaMoneyBillWave, FaRobot, FaBox } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import './Analytics.css';
import '../../components/Loading.css';

const BranchMap = lazy(() => import('../../components/admin/BranchMap'));

echarts.use([
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
  DatasetComponent,
  TransformComponent,
  LineChart,
  BarChart,
  PieChart,
  SVGRenderer
]);

const CHART_LABELS = {
  totalSales: 'Total Sales Over Time',
  salesTrends: 'Daily Sales & Orders',
  salesByBranch: 'Sales by Branch',
  orderStatus: 'Order Pipeline Health',
  topProducts: 'Top Product Groups',
  productStocks: 'Products Stocks',
  topCustomers: 'Top Customers',
  customerLocations: 'Customer Locations',
  salesForecast: 'Sales Forecast'
};

const SALES_FORECAST_RANGE_LABELS = {
  nextMonth: 'Next Month',
  nextQuarter: 'Next Quarter',
  nextYear: 'Next Year'
};

const QUESTION_KEYWORDS = [
  { id: 'salesTrends', keywords: ['daily sales', 'sales & orders', 'orders chart', 'daily revenue'] },
  { id: 'totalSales', keywords: ['total sales', 'sales over time', 'monthly revenue', 'revenue trend'] },
  { id: 'salesByBranch', keywords: ['branch', 'pickup location', 'store performance'] },
  { id: 'orderStatus', keywords: ['order status', 'pipeline', 'processing', 'pending'] },
  { id: 'topProducts', keywords: ['product', 'category', 'top selling product'] },
  { id: 'productStocks', keywords: ['product stock', 'inventory', 'stock level', 'product inventory', 'stock quantity', 'products stock'] },
  { id: 'topCustomers', keywords: ['customer', 'buyer', 'best customer'] },
  { id: 'customerLocations', keywords: ['customer location', 'map', 'geo', 'heatmap'] },
  { id: 'salesForecast', keywords: ['forecast', 'projection', 'predict'] }
];

const resolveChartIdFromText = (text = '') => {
  const lower = text.toLowerCase();
  const match = QUESTION_KEYWORDS.find(({ keywords }) =>
    keywords.some((phrase) => lower.includes(phrase))
  );
  return match ? match.id : null;
};

const useViewportWidth = (defaultWidth = 1440) => {
  const getWidth = () => {
    if (typeof window === 'undefined') {
      return defaultWidth;
    }
    return window.innerWidth;
  };

  const [width, setWidth] = useState(getWidth);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let frame = null;

    const handleResize = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(() => {
        setWidth(window.innerWidth);
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return width;
};

const Analytics = () => {
  const { user, isLoading: authLoading } = useAuth();
  const isOwner = user?.user_metadata?.role === 'owner';
  const isAdmin = user?.user_metadata?.role === 'admin';
  
  const [analyticsData, setAnalyticsData] = useState({
    totalSales: [],
    totalSalesMonthly: [],
    totalSalesYearly: [],
    totalSalesGranularity: 'monthly',
    salesByBranch: [],
    orderStatus: {},
    topProducts: [],
    summary: {},
    hasData: false
  });
  const [rawData, setRawData] = useState(null);
  const [salesForecast, setSalesForecast] = useState({ historical: [], forecast: [], combined: [] });
  const [salesTrends, setSalesTrends] = useState([]);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);
  const [productStocks, setProductStocks] = useState([]);
  const [productStocksLoading, setProductStocksLoading] = useState(true);
  const [salesForecastRange, setSalesForecastRange] = useState('nextQuarter');
  const [customerLocationsData, setCustomerLocationsData] = useState({
    points: [],
    cityStats: [],
    summary: null
  });
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [salesTrendsLoading, setSalesTrendsLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(false); // Start as false - lazy load only when needed
  const [filters, setFilters] = useState({
    timeRange: 'all', // Used by chart time-range buttons, not in filter dropdown
    branch: 'all'
  });
  const [branches, setBranches] = useState([]);
  const [totalSalesLoading, setTotalSalesLoading] = useState(true);
  const [isNexusOpen, setIsNexusOpen] = useState(false);
  const [nexusMessages, setNexusMessages] = useState([]);
  const [nexusLoading, setNexusLoading] = useState(false);
  const [nexusError, setNexusError] = useState(null);
  const [nexusContext, setNexusContext] = useState({
    chartId: null,
    filters: null,
    lastSql: null,
    model: null
  });
  const [activeTab, setActiveTab] = useState('sales');
  const [activeSalesChartTab, setActiveSalesChartTab] = useState('totalSales');
  const [activeCustomersChartTab, setActiveCustomersChartTab] = useState('customerInsights');
  const [activeProductsChartTab, setActiveProductsChartTab] = useState('topProducts');
  
  // Refs to store chart instances for resizing
  const chartRefs = useRef({});
  // Ref to track if data has been loaded to prevent refresh on focus/blur
  const dataLoadedRef = useRef(false);
  // Ref to track the user ID to prevent unnecessary re-fetches
  const lastUserIdRef = useRef(null);
  
  // Refs for chart containers to enable auto-scroll
  const chartContainerRefs = useRef({
    totalSales: null,
    dailySales: null,
    salesByBranch: null,
    orderStatus: null,
    topProducts: null,
    productStocks: null,
    customerInsights: null,
    customerLocations: null,
    salesForecast: null
  });
  
  // Function to scroll to and center a chart
  const scrollToChart = (chartId) => {
    const container = chartContainerRefs.current[chartId];
    if (container) {
      setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY + containerRect.top - (windowHeight / 2) + (containerRect.height / 2);
        window.scrollTo({
          top: Math.max(0, scrollY),
          behavior: 'smooth'
        });
      }, 100); // Small delay to ensure chart is rendered
    }
  };
  
  // Chart values visibility for Sales & Revenue tab
  // Load from localStorage on mount, default to true (shared with Dashboard)
  const [isSalesChartValuesVisible, setIsSalesChartValuesVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_values_visible');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (error) {
      console.error('Error loading values visibility preference:', error);
      return true;
    }
  });

  // Save to localStorage whenever visibility state changes
  useEffect(() => {
    try {
      localStorage.setItem('dashboard_values_visible', JSON.stringify(isSalesChartValuesVisible));
    } catch (error) {
      console.error('Error saving values visibility preference:', error);
    }
  }, [isSalesChartValuesVisible]);

  // Listen for storage changes to sync across tabs/pages
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'dashboard_values_visible') {
        try {
          const newValue = e.newValue !== null ? JSON.parse(e.newValue) : true;
          setIsSalesChartValuesVisible(newValue);
        } catch (error) {
          console.error('Error parsing storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const hasCustomerLocationData = useMemo(() => {
    const pointsCount = Array.isArray(customerLocationsData?.points) ? customerLocationsData.points.length : 0;
    const cityCount = Array.isArray(customerLocationsData?.cityStats) ? customerLocationsData.cityStats.length : 0;
    return pointsCount > 0 || cityCount > 0;
  }, [customerLocationsData]);

  const viewportWidth = useViewportWidth();
  const chartHeights = useMemo(() => {
    const pickHeight = ({ xl, lg, md, sm, xs }) => {
      const width = viewportWidth || 0;
      if (width >= 1600) return xl;
      if (width >= 1280) return lg;
      if (width >= 1024) return md;
      if (width >= 768) return sm;
      return xs;
    };

    return {
      compact: `${pickHeight({ xl: 320, lg: 300, md: 270, sm: 240, xs: 210 })}px`,
      base: `${pickHeight({ xl: 340, lg: 320, md: 300, sm: 260, xs: 220 })}px`,
      tall: `${pickHeight({ xl: 420, lg: 380, md: 340, sm: 300, xs: 260 })}px`,
      wide: `${pickHeight({ xl: 380, lg: 360, md: 320, sm: 280, xs: 240 })}px`,
      map: `${pickHeight({ xl: 500, lg: 460, md: 420, sm: 360, xs: 300 })}px`,
      productStocks: `${pickHeight({ xl: 800, lg: 700, md: 600, sm: 550, xs: 500 })}px`
    };
  }, [viewportWidth]);


  useEffect(() => {
    // Wait for auth to stabilize before making API requests
    if (authLoading || !user) {
      return;
    }

    const userId = user?.id;
    
    // Only fetch if user ID changed (new user) or data hasn't been loaded yet
    // This prevents refresh when window regains focus and user object reference changes
    if (dataLoadedRef.current && lastUserIdRef.current === userId) {
      return;
    }

    // Mark data as loaded and track user ID
    dataLoadedRef.current = true;
    lastUserIdRef.current = userId;

    fetchAnalyticsData();
    // Fetch sales trends immediately (same as dashboard) - it's lightweight
    fetchSalesTrends();

    const runDeferredFetches = () => {
      fetchProductStocks();
      // Customer analytics is now loaded lazily when the user views that section
      // This prevents blocking the main analytics page load
    };

    let idleId = null;
    let timeoutId = null;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(runDeferredFetches, { timeout: 500 });
    } else if (typeof window !== 'undefined') {
      timeoutId = window.setTimeout(runDeferredFetches, 120);
    } else {
      runDeferredFetches();
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null && typeof window !== 'undefined') {
        window.clearTimeout(timeoutId);
      }
    };
  }, [authLoading, user?.id]); // Use user?.id instead of user to prevent unnecessary re-renders

  useEffect(() => {
    if (rawData) {
      applyFilters();
    }
  }, [filters, rawData]);


  // Lazy load customer analytics only when customers tab is active
  useEffect(() => {
    if (activeTab === 'customers' && activeCustomersChartTab === 'customerInsights') {
      // Only fetch if not already loading and not already loaded
      if (!customerLoading && !customerSummary && topCustomers.length === 0) {
        fetchCustomerAnalytics();
      }
    }
  }, [activeTab, activeCustomersChartTab, customerLoading, customerSummary, topCustomers.length]);

  // Fetch branches for owners
  useEffect(() => {
    const loadBranches = async () => {
      if (isOwner) {
        try {
          const branchesList = await branchService.getBranches();
          setBranches(Array.isArray(branchesList) ? branchesList : []);
        } catch (err) {
          console.error('Failed to load branches:', err);
          setBranches([]);
        }
      } else {
        // For admins, set their assigned branch if available
        const adminBranchId = user?.user_metadata?.branch_id;
        const adminBranchName = user?.user_metadata?.branch_name;
        if (adminBranchId && adminBranchName) {
          setBranches([{ id: adminBranchId, name: adminBranchName }]);
        } else {
          setBranches([]);
        }
      }
    };
    loadBranches();
  }, [isOwner, user?.id]); // Use user?.id instead of user to prevent unnecessary re-renders


  // Resize charts when tabs change or window resizes
  useEffect(() => {
    const resizeCharts = () => {
      // Small delay to ensure DOM is updated after tab change
      setTimeout(() => {
        Object.values(chartRefs.current).forEach(chartInstance => {
          if (chartInstance && typeof chartInstance.resize === 'function') {
            try {
              chartInstance.resize();
            } catch (error) {
              // Ignore resize errors (chart might not be ready)
            }
          }
        });
      }, 100);
    };

    resizeCharts();

    // Also resize on window resize
    window.addEventListener('resize', resizeCharts);
    return () => window.removeEventListener('resize', resizeCharts);
  }, [activeTab, activeSalesChartTab, activeCustomersChartTab, activeProductsChartTab]);

  // Auto-scroll to chart when tab changes
  useEffect(() => {
    if (activeTab === 'sales') {
      scrollToChart(activeSalesChartTab);
    } else if (activeTab === 'orders') {
      scrollToChart('orderStatus');
    } else if (activeTab === 'products') {
      scrollToChart(activeProductsChartTab);
    } else if (activeTab === 'customers') {
      scrollToChart(activeCustomersChartTab);
    } else if (activeTab === 'forecast') {
      scrollToChart('salesForecast');
    }
  }, [activeTab, activeSalesChartTab, activeProductsChartTab, activeCustomersChartTab]);

  // Helper function to create chart ready callback
  const onChartReady = (chartId) => (chartInstance) => {
    if (chartInstance) {
      chartRefs.current[chartId] = chartInstance;
      // Resize after a short delay to ensure container has dimensions
      setTimeout(() => {
        if (chartInstance.resize) {
          chartInstance.resize();
        }
      }, 50);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real data from API
      try {
        const response = await authFetch(`${API_URL}/api/analytics/dashboard`);
        const result = await response.json();
        
        // Only log warnings if they indicate actual errors (not just missing DATABASE_URL when fallback works)
        if (result.warning) {
          // Suppress DATABASE_URL warning since fallback mechanism works
          if (result.warning.includes('DATABASE_URL not configured')) {
            // Silently handle - fallback mechanism is working
          } else {
            // Log other warnings (connection errors, etc.)
            console.warn('Analytics warning:', result.warning);
          }
        }
        
        if (result.success && result.data) {
          const salesOverTime = result.data.salesOverTime || {};
          const salesOverTimeMonthly = Array.isArray(salesOverTime.monthly) ? salesOverTime.monthly : [];
          const salesOverTimeYearly = Array.isArray(salesOverTime.yearly) ? salesOverTime.yearly : [];
          const initialMonthlySeries = salesOverTimeMonthly.length > 12
            ? salesOverTimeMonthly.slice(-12)
            : salesOverTimeMonthly;
          const hasInitialMonthly = initialMonthlySeries.length > 0;
          const fallbackYearlySeries = salesOverTimeYearly.length > 0 ? salesOverTimeYearly : [];
          const initialSeries = hasInitialMonthly ? initialMonthlySeries : fallbackYearlySeries;
          const initialGranularity = hasInitialMonthly ? 'monthly' : (fallbackYearlySeries.length > 0 ? 'yearly' : 'monthly');
          const topProductsRaw = Array.isArray(result.data.topProducts) ? result.data.topProducts : [];
          // Calculate total quantity for percentage calculation (should add up to 100%)
          const totalTopProductsQuantity = topProductsRaw.reduce((sum, p) => sum + (p.quantity || 0), 0);
          const hasData = initialSeries.length > 0 && initialSeries.some(item => Number(item.sales || item.total || 0) > 0);
          
          // Store raw data for filtering
          setRawData({
            totalSalesMonthly: salesOverTimeMonthly,
            totalSalesYearly: salesOverTimeYearly,
            salesByBranch: result.data.salesByBranch || [],
            orderStatus: result.data.orderStatus || {},
            topProducts: topProductsRaw,
            summary: result.data.summary,
            hasData
          });
          
          // Initial display (no filters applied)
          setAnalyticsData({
            totalSales: initialSeries,
            totalSalesGranularity: initialGranularity,
            totalSalesMonthly: salesOverTimeMonthly,
            totalSalesYearly: salesOverTimeYearly,
            salesByBranch: result.data.salesByBranch || [],
            orderStatus: result.data.orderStatus || {},
            topProducts: hasData && topProductsRaw.length > 0 
              ? topProductsRaw.map(product => ({
                  product: product.product,
                  quantity: product.quantity || 0,
                  orders: product.orders || 0,
                  revenue: product.revenue || 0,
                  percentage: totalTopProductsQuantity > 0
                    ? Math.round(((product.quantity || 0) / totalTopProductsQuantity) * 100)
                    : 0
                }))
              : [],
            summary: result.data.summary,
            hasData
          });
          setLoading(false);
          setTotalSalesLoading(false);
          return;
        }
      } catch (apiError) {
        console.error('API error:', apiError);
        // Don't use mock data, show empty state instead
        setAnalyticsData({
          totalSales: [],
          totalSalesGranularity: 'monthly',
          totalSalesMonthly: [],
          totalSalesYearly: [],
          salesByBranch: [],
          orderStatus: {
            completed: { count: 0, percentage: 0 },
            processing: { count: 0, percentage: 0 },
            pending: { count: 0, percentage: 0 },
            cancelled: { count: 0, percentage: 0 },
            total: 0
          },
          topProducts: [],
          summary: {
            totalRevenue: 0,
            totalOrders: 0,
            averageOrderValue: 0
          },
          hasData: false
        });
        setRawData(null);
        setLoading(false);
        setTotalSalesLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
      setTotalSalesLoading(false);
    }
  };

  // Extract year information from query text
  const extractYearsFromQuery = (queryText) => {
    if (!queryText || typeof queryText !== 'string') {
      return null;
    }

    // Match 4-digit years (1900-2099)
    const yearPattern = /\b(19\d{2}|20[0-9]{2})\b/g;
    const years = [];
    let match;

    while ((match = yearPattern.exec(queryText)) !== null) {
      const year = parseInt(match[1], 10);
      if (year >= 1900 && year <= 2099) {
        years.push(year);
      }
    }

    if (years.length === 0) {
      return null;
    }

    // If multiple years found, use range
    if (years.length >= 2) {
      const sortedYears = [...new Set(years)].sort((a, b) => a - b);
      return {
        yearStart: sortedYears[0],
        yearEnd: sortedYears[sortedYears.length - 1]
      };
    }

    // Single year - set both start and end to the same year
    return {
      yearStart: years[0],
      yearEnd: years[0]
    };
  };

  const handleSendNexusMessage = (messageText) => {
    if (!nexusContext.chartId && !nexusContext.isGeneralConversation) {
      return;
    }

    const trimmed = (messageText || '').trim();
    if (!trimmed) {
      return;
    }

    const resolvedChartId = resolveChartIdFromText(trimmed) || nexusContext.chartId;
    const useGeneralConversation = nexusContext.isGeneralConversation && !resolvedChartId;

    // Extract year information from the query
    const extractedYears = extractYearsFromQuery(trimmed);
    
    // Update filters with extracted year information
    let updatedFilters = { ...(nexusContext.filters || filters || {}) };
    if (extractedYears) {
      updatedFilters = {
        ...updatedFilters,
        yearStart: extractedYears.yearStart.toString(),
        yearEnd: extractedYears.yearEnd.toString()
      };
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed
    };

    const nextConversation = [...nexusMessages, userMessage];
    setNexusMessages(nextConversation);

    setNexusContext((prev) => ({
      ...prev,
      chartId: resolvedChartId || null,
      isGeneralConversation: useGeneralConversation,
      filters: updatedFilters
    }));

    const chartRange = nexusContext.range || salesForecastRange;
    const chartData = nexusContext.chartData || (resolvedChartId === 'salesForecast' ? salesForecast : null);

    fetchNexusResponse(
      resolvedChartId || null,
      nextConversation,
      updatedFilters,
      useGeneralConversation,
      {
        range: chartRange,
        data: chartData
      }
    );
  };

  const handleCloseNexus = () => {
    setIsNexusOpen(false);
    setNexusLoading(false);
  };

  const fetchSalesTrends = async () => {
    // Wait for auth to stabilize before making API requests
    if (authLoading || !user) {
      return;
    }

    try {
      setSalesTrendsLoading(true);
      // Build URL with branch_id if provided (for owners filtering by specific branch)
      let url = `${API_URL}/api/analytics/sales-trends?period=30`;
      
      const response = await authFetch(url);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setSalesTrends(result.data);
      } else {
        setSalesTrends([]);
      }
    } catch (error) {
      console.error('Error fetching sales trends:', error);
      setSalesTrends([]);
    } finally {
      setSalesTrendsLoading(false);
    }
  };

  const fetchCustomerAnalytics = async () => {
    // Skip if already loading or already loaded
    if (customerLoading) {
      return;
    }
    
    try {
      setCustomerLoading(true);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      try {
        const response = await authFetch(`${API_URL}/api/analytics/customer-analytics`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          setCustomerSummary(result.data.summary || null);
          const topCustomersRaw = Array.isArray(result.data.topCustomers) ? result.data.topCustomers : [];
          const formattedTopCustomers = topCustomersRaw.map((customer, index) => ({
            ...customer,
            displayName: getCustomerDisplayName(customer, index)
          }));
          setTopCustomers(formattedTopCustomers);
        } else {
          setCustomerSummary(null);
          setTopCustomers([]);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('⚠️ Customer analytics request timed out');
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error fetching customer analytics (non-blocking):', error.message || error);
      // Don't set error state - just leave it as null/empty so page still works
      setCustomerSummary(null);
      setTopCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  const fetchProductStocks = useCallback(async () => {
    try {
      setProductStocksLoading(true);
      
      // Determine which products to fetch based on user role and branch filter
      let products = [];
      const adminBranchId = isAdmin ? user?.user_metadata?.branch_id : null;
      
      if (isAdmin && adminBranchId) {
        // Admin: only fetch products from their branch
        products = await productService.getProductsByBranch(adminBranchId);
      } else if (isOwner && filters.branch && filters.branch !== 'all') {
        // Owner: fetch products from selected branch
        products = await productService.getProductsByBranch(parseInt(filters.branch));
      } else {
        // Owner with 'all' selected or no branch filter: fetch all products with all=true to include 0 stock items
        // Use the same fetch pattern as Inventory page to ensure all products are fetched
        try {
          const response = await authFetch(`${API_URL}/api/products?all=true`);
          if (response.ok) {
            const data = await response.json();
            // Normalize response like Inventory page does
            if (Array.isArray(data)) {
              products = data;
            } else if (Array.isArray(data?.data)) {
              products = data.data;
            } else if (Array.isArray(data?.products)) {
              products = data.products;
            } else {
              products = [];
            }
          } else {
            // Fallback to regular getAllProducts if API call fails
            products = await productService.getAllProducts();
          }
        } catch (error) {
          console.error('Error fetching all products with all=true:', error);
          // Fallback to regular getAllProducts
          products = await productService.getAllProducts();
        }
      }
      
      // Define on-hand categories (products that can be prepared and bought on-branch)
      const onHandCategories = ['balls', 'trophies', 'medals'];
      
      // Debug: Log raw products before transformation
      console.log(`📦 [Product Stocks] Fetched ${products.length} raw products`);
      const onHandProducts = products.filter(p => {
        const category = p.category?.toLowerCase();
        return ['balls', 'trophies', 'medals'].includes(category);
      });
      console.log(`📦 [Product Stocks] ${onHandProducts.length} products in on-hand categories (balls, trophies, medals)`);
      const zeroStockProducts = onHandProducts.filter(p => {
        const stock = p.stock_quantity !== null && p.stock_quantity !== undefined ? Number(p.stock_quantity) : 0;
        return stock === 0;
      });
      console.log(`📦 [Product Stocks] ${zeroStockProducts.length} products with 0 stock (or null/undefined)`);
      if (products.length > 0) {
        const sampleProducts = products.slice(0, 5);
        sampleProducts.forEach((p, i) => {
          console.log(`  Product ${i + 1}: name="${p.name}", category="${p.category}", branch_id=${p.branch_id}, stock=${p.stock_quantity}`);
        });
      }
      
      // Transform products to stock items format
      // Only include products in on-hand categories (balls, trophies, medals)
      // Include items with 0 stock, null stock, or undefined stock (all treated as 0 stock)
      const transformedStockItems = products
        .filter(product => {
          // Only include products that:
          // 1. Belong to on-hand categories (balls, trophies, medals)
          // 2. Include all products in these categories, regardless of stock_quantity value
          //    (null/undefined will be treated as 0 stock)
          const category = product.category?.toLowerCase();
          const isOnHandCategory = onHandCategories.includes(category);
          
          return isOnHandCategory;
        })
        .map(product => {
          // Explicitly handle 0 stock - preserve 0 values, only default null/undefined to 0
          const stockQuantity = product.stock_quantity !== null && product.stock_quantity !== undefined 
            ? Number(product.stock_quantity) 
            : 0;
          
          // For trophies, include size in the name for better identification
          let displayName = product.name || 'Unknown Product';
          if (product.category?.toLowerCase() === 'trophies') {
            // Parse available sizes - check both size and available_sizes fields
            let sizes = [];
            
            // First, try available_sizes (parsed by productService)
            if (product.available_sizes && Array.isArray(product.available_sizes) && product.available_sizes.length > 0) {
              sizes = product.available_sizes;
            } else if (product.size) {
              // Parse size field if it's a string
              if (typeof product.size === 'string') {
                try {
                  const parsed = JSON.parse(product.size);
                  if (Array.isArray(parsed)) {
                    sizes = parsed;
                  } else if (typeof parsed === 'string') {
                    sizes = [parsed];
                  }
                } catch (e) {
                  // If not JSON, treat as single size string
                  sizes = [product.size];
                }
              } else if (Array.isArray(product.size)) {
                sizes = product.size;
              } else if (product.size) {
                sizes = [product.size];
              }
            }
            
            // If we have sizes, append the first one to the name
            if (sizes.length > 0) {
              if (sizes.length === 1) {
                displayName = `${displayName} (${sizes[0]})`;
              } else {
                // For multiple sizes, show the first one (most common case)
                displayName = `${displayName} (${sizes[0]})`;
              }
            }
          }
          
          // Get reorder level thresholds (with defaults)
          const lowStockThreshold = product.low_stock_threshold ?? 10;
          const sufficientStockThreshold = product.sufficient_stock_threshold ?? 30;
          const highStockThreshold = product.high_stock_threshold ?? 50;
          const overstockThreshold = product.overstock_threshold ?? 100;
          
          // Determine stock status based on thresholds
          let stockStatus = 'overstock';
          if (stockQuantity === 0) {
            stockStatus = 'out_of_stock';
          } else if (stockQuantity <= lowStockThreshold) {
            stockStatus = 'low_stock';
          } else if (stockQuantity <= sufficientStockThreshold) {
            stockStatus = 'sufficient_stock';
          } else if (stockQuantity <= highStockThreshold) {
            stockStatus = 'high_stock';
          }
          
          return {
            id: product.id,
            name: displayName, // For balls/medals: same as originalName. For trophies: includes size
            originalName: product.name || 'Unknown Product', // Keep original name for reference (no modifications)
            category: product.category?.toLowerCase() || '',
            stockQuantity: stockQuantity,
            branchId: product.branch_id || null,
            branchName: product.branch_name || null,
            lowStockThreshold,
            sufficientStockThreshold,
            highStockThreshold,
            overstockThreshold,
            stockStatus
          };
        });
      
      // Group by product name (and size for trophies) and aggregate stock across branches
      // For trophies, the name already includes size, so we use the full name as the key
      // This ensures different sizes of the same trophy are treated as separate products
      // For balls and other single-size products, group by original name + category to avoid duplicates
      const stockData = transformedStockItems.reduce((acc, item) => {
        // Normalize names: trim, lowercase, remove extra spaces, handle null/undefined
        // Also normalize special characters and remove punctuation variations
        const normalizeName = (name) => {
          if (!name) return '';
          return String(name)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')  // Multiple spaces to single space
            .replace(/["'"]/g, '"')  // Normalize quotes
            .replace(/["'"]/g, "'")  // Normalize apostrophes
            .trim();
        };
        
        // Normalize size strings (for trophies) - remove common variations
        const normalizeSize = (sizeStr) => {
          if (!sizeStr) return '';
          return String(sizeStr)
            .toLowerCase()
            .trim()
            .replace(/\s*inch(es)?/gi, 'in')  // "10 inch" -> "10in"
            .replace(/\s*"/g, 'in')  // '10"' -> "10in"
            .replace(/\s+/g, '')  // Remove all spaces
            .trim();
        };
        
        const normalizedOriginalName = normalizeName(item.originalName);
        const normalizedDisplayName = normalizeName(item.name);
        const normalizedCategory = normalizeName(item.category);
        
        // For products with size in name (trophies), extract and normalize the size for consistent grouping
        // For products without size (balls, medals), use original name + category to ensure proper grouping
        let key;
        // Use normalized category for comparison to handle case variations
        if (normalizedCategory === 'trophies') {
          // For trophies, always try to extract size from display name
          // Extract size from display name (format: "Product Name (Size)")
          const sizeMatch = normalizedDisplayName.match(/\(([^)]+)\)$/);
          if (sizeMatch && sizeMatch[1]) {
            const extractedSize = sizeMatch[1].trim();
            const normalizedSize = normalizeSize(extractedSize);
            // Use original name + normalized size as key to ensure same trophy+size from different branches group together
            // This ensures different sizes of the same trophy are treated as separate products
            key = `${normalizedOriginalName}_${normalizedSize}_${normalizedCategory}`;
          } else {
            // No size found in display name - use original name + category
            // This handles trophies that don't have sizes or where size extraction failed
            key = `${normalizedOriginalName}_${normalizedCategory}`;
          }
        } else {
          // Ball, medal, or other product - use original name + category to group properly
          // This ensures products with the same name but different categories are separate
          // Also ensures products from different branches with the same name are grouped together
          key = `${normalizedOriginalName}_${normalizedCategory}`;
        }
        
        // Skip if key is invalid (empty after normalization)
        if (!key || key === '_' || key === '__') {
          console.warn('⚠️ [Product Stocks] Skipping item with invalid key:', item);
          return acc;
        }
        
        if (!acc[key]) {
          // For balls/medals (no size), use originalName as display name
          // For trophies (with size), use the name with size suffix
          const displayName = (normalizedCategory === 'trophies' && normalizedDisplayName !== normalizedOriginalName)
            ? item.name  // Trophy with size - keep the size suffix
            : item.originalName;  // Ball/medal - use original name without any modifications
          
          acc[key] = {
            name: displayName, // Display name (original name for balls/medals, name with size for trophies)
            originalName: item.originalName, // Original name without size
            category: item.category,
            totalStock: 0,
            branches: [],
            // Store thresholds from first item (they should be the same for grouped items)
            lowStockThreshold: item.lowStockThreshold,
            sufficientStockThreshold: item.sufficientStockThreshold,
            highStockThreshold: item.highStockThreshold,
            overstockThreshold: item.overstockThreshold
          };
        }
        
        // Sum stock quantities across all branches
        acc[key].totalStock += item.stockQuantity;
        
        // Track stock by branch (avoid duplicates)
        if (item.branchName) {
          const existingBranch = acc[key].branches.find(b => b.branch === item.branchName);
          if (existingBranch) {
            // If branch already exists, add to its stock (shouldn't happen, but handle it)
            existingBranch.stock += item.stockQuantity;
          } else {
            // Add new branch entry
            acc[key].branches.push({
              branch: item.branchName,
              stock: item.stockQuantity
            });
          }
        }
        
        return acc;
      }, {});
      
      // Debug: Log grouping results to help identify duplicates
      const uniqueKeys = Object.keys(stockData);
      const totalItems = transformedStockItems.length;
      console.log(`📊 [Product Stocks] Grouped ${totalItems} items into ${uniqueKeys.length} unique products`);
      
      // Count zero stock items
      const zeroStockGrouped = Object.values(stockData).filter(item => item.totalStock === 0);
      console.log(`📊 [Product Stocks] ${zeroStockGrouped.length} grouped products with 0 total stock`);
      
      // Log sample of grouped products to verify grouping is working
      if (uniqueKeys.length > 0) {
        const sampleKeys = uniqueKeys.slice(0, 10);
        sampleKeys.forEach(key => {
          const grouped = stockData[key];
          console.log(`📊 [Product Stocks] Key: "${key}" -> Name: "${grouped.name}", Total Stock: ${grouped.totalStock}, Branches: ${grouped.branches.length}`);
        });
      }
      
      // Log all zero stock items
      if (zeroStockGrouped.length > 0) {
        console.log(`📊 [Product Stocks] Zero stock products:`);
        zeroStockGrouped.forEach((item, idx) => {
          console.log(`  ${idx + 1}. "${item.name}" (${item.category}) - Key would be based on: originalName="${item.originalName}"`);
        });
      }
      
      // Check for any items that should have been grouped but weren't
      const keyCounts = {};
      transformedStockItems.forEach(item => {
        // Use the same normalization logic as the grouping
        const normalizeName = (name) => {
          if (!name) return '';
          return String(name)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/["'"]/g, '"')
            .replace(/["'"]/g, "'")
            .trim();
        };
        
        const normalizeSize = (sizeStr) => {
          if (!sizeStr) return '';
          return String(sizeStr)
            .toLowerCase()
            .trim()
            .replace(/\s*inch(es)?/gi, 'in')
            .replace(/\s*"/g, 'in')
            .replace(/\s+/g, '')
            .trim();
        };
        
        const normalizedOriginalName = normalizeName(item.originalName);
        const normalizedDisplayName = normalizeName(item.name);
        const normalizedCategory = normalizeName(item.category);
        let key;
        if (normalizedCategory === 'trophies' && normalizedDisplayName !== normalizedOriginalName) {
          // Extract and normalize size for consistent grouping
          const sizeMatch = normalizedDisplayName.match(/\(([^)]+)\)$/);
          if (sizeMatch && sizeMatch[1]) {
            const normalizedSize = normalizeSize(sizeMatch[1]);
            key = `${normalizedOriginalName}_${normalizedSize}_${normalizedCategory}`;
          } else {
            key = normalizedDisplayName;
          }
        } else {
          key = `${normalizedOriginalName}_${normalizedCategory}`;
        }
        keyCounts[key] = (keyCounts[key] || 0) + 1;
      });
      const duplicateKeys = Object.entries(keyCounts).filter(([key, count]) => count > 1);
      if (duplicateKeys.length > 0) {
        console.log(`📊 [Product Stocks] Found ${duplicateKeys.length} product groups with multiple items:`, duplicateKeys.map(([key, count]) => `${key} (${count} items)`));
      } else {
        console.log('📊 [Product Stocks] No duplicates found - each product appears only once per branch');
      }
      
      // Calculate stock status for each grouped item
      const stockArrayWithStatus = Object.values(stockData).map(item => {
        let stockStatus = 'overstock';
        if (item.totalStock === 0) {
          stockStatus = 'out_of_stock';
        } else if (item.totalStock <= item.lowStockThreshold) {
          stockStatus = 'low_stock';
        } else if (item.totalStock <= item.sufficientStockThreshold) {
          stockStatus = 'sufficient_stock';
        } else if (item.totalStock <= item.highStockThreshold) {
          stockStatus = 'high_stock';
        }
        return { ...item, stockStatus };
      });
      
      // Sort by stock quantity (lowest first to show 0 stock items first), then by name
      // Show ALL items - prioritize 0 stock items first, then show others sorted by stock quantity
      const stockArray = stockArrayWithStatus
        .sort((a, b) => {
          // First, prioritize 0 stock items
          if (a.totalStock === 0 && b.totalStock !== 0) return -1;
          if (a.totalStock !== 0 && b.totalStock === 0) return 1;
          
          // Then sort by stock quantity (lowest first)
          if (a.totalStock !== b.totalStock) {
            return a.totalStock - b.totalStock;
          }
          
          // Then by name
          return (a.name || '').localeCompare(b.name || '');
        });
      // No limit - show all items, especially all 0-stock items
      
      // Final verification: Check for duplicate names in the final array
      const nameCounts = {};
      stockArray.forEach(item => {
        const name = (item.name || '').toLowerCase().trim();
        if (!nameCounts[name]) {
          nameCounts[name] = [];
        }
        nameCounts[name].push({
          name: item.name,
          originalName: item.originalName,
          category: item.category,
          totalStock: item.totalStock,
          branches: item.branches.length
        });
      });
      
      const duplicates = Object.entries(nameCounts).filter(([name, items]) => items.length > 1);
      if (duplicates.length > 0) {
        console.error('❌ [Product Stocks] DUPLICATES FOUND IN FINAL ARRAY:', duplicates);
        duplicates.forEach(([name, items]) => {
          console.error(`  - "${name}": ${items.length} entries`, items);
        });
      } else {
        console.log('✅ [Product Stocks] No duplicates in final array - all products are unique');
      }
      
      const zeroStockInFinal = stockArray.filter(item => item.totalStock === 0);
      console.log(`📊 [Product Stocks] Final array has ${stockArray.length} items (${zeroStockInFinal.length} with 0 stock)`);
      if (zeroStockInFinal.length > 0) {
        console.log(`📊 [Product Stocks] Zero stock items in final array:`);
        zeroStockInFinal.forEach((item, index) => {
          console.log(`  ${index + 1}. "${item.name}" (${item.category}) - Stock: ${item.totalStock}`);
        });
      }
      stockArray.forEach((item, index) => {
        console.log(`  ${index + 1}. "${item.name}" (${item.category}) - Stock: ${item.totalStock}, Branches: ${item.branches.length}`);
      });
      
      setProductStocks(stockArray);
    } catch (error) {
      console.error('Error fetching product stocks:', error);
      setProductStocks([]);
    } finally {
      setProductStocksLoading(false);
    }
  }, [isAdmin, isOwner, filters.branch, user]);

  // Refetch product stocks when branch filter changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchProductStocks();
    }
  }, [fetchProductStocks, authLoading, user]);

  const fetchSalesForecast = useCallback(async (rangeOverride) => {
    const activeRange = rangeOverride || salesForecastRange;
    try {
      setForecastLoading(true);
      const response = await authFetch(`${API_URL}/api/analytics/sales-forecast?range=${encodeURIComponent(activeRange)}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setSalesForecast(result.data);
      } else {
        setSalesForecast({ historical: [], forecast: [], combined: [], summary: null, range: activeRange });
      }
    } catch (error) {
      console.error('Error fetching sales forecast:', error);
      setSalesForecast({ historical: [], forecast: [], combined: [], summary: null, range: activeRange });
    } finally {
      setForecastLoading(false);
    }
  }, [salesForecastRange]);

  useEffect(() => {
    fetchSalesForecast(salesForecastRange);
  }, [salesForecastRange, fetchSalesForecast]);

  const formatNumber = (num) => {
    if (num === null || num === undefined || Number.isNaN(num)) {
      return '0';
    }
    // Always round to whole numbers (no cents for currency, no decimals for counts)
    const roundedNum = Math.round(num);
    if (roundedNum >= 1000000) {
      return `${(roundedNum / 1000000).toFixed(1)}M`;
    }
    if (roundedNum >= 1000) {
      return `${(roundedNum / 1000).toFixed(1)}K`;
    }
    return roundedNum.toLocaleString();
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters(prev => ({
      ...prev,
      branch: 'all'
    }));
  };

  const fetchNexusResponse = async (
    chart,
    conversation,
    appliedFilters,
    isGeneralConversation = false,
    chartContext = {}
  ) => {
    try {
      setNexusLoading(true);
      setNexusError(null);

      // For productStocks, don't pass chartData - backend fetches it from database
      // Only pass chartData for charts that need it (like salesForecast)
      const shouldIncludeChartData = chart === 'salesForecast' && chartContext.data;

      const payload = {
        chartId: chart,
        filters: appliedFilters,
        messages: conversation,
        general: isGeneralConversation,
        range: chartContext.range || null,
        ...(shouldIncludeChartData && { chartData: chartContext.data })
      };

      // Validate payload can be stringified
      let requestBody;
      try {
        requestBody = JSON.stringify({
          ...payload,
          question: conversation[conversation.length - 1]?.content || ''
        });
      } catch (stringifyError) {
        console.error('Error stringifying payload:', stringifyError);
        throw new Error('Failed to prepare request data. Please try again.');
      }

      const response = await authJsonFetch(`${API_URL}/api/ai/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        metadata: {
          sql: response.sql,
          rowCount: response.rowCount,
          rows: response.rows,
          model: response.model
        }
      };

      setNexusMessages((prev) => {
        const cleaned = [...prev];
        while (
          cleaned.length > 0 &&
          cleaned[cleaned.length - 1].role === 'assistant' &&
          cleaned[cleaned.length - 1].metadata?.error
        ) {
          cleaned.pop();
        }
        return [...cleaned, assistantMessage];
      });
      setNexusContext((prev) => ({
        ...prev,
        chartId: chart,
        lastSql: response.sql,
        model: response.model,
        lastRows: response.rows,
        isGeneralConversation
      }));
    } catch (error) {
      console.error('Nexus analysis error:', error);
      setNexusError(error.message || 'Failed to fetch Nexus analysis.');
      setNexusMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Nexus could not complete the analysis.\n\n${error.message || 'Unexpected error occurred.'}`,
          metadata: { error: true }
        }
      ]);
    } finally {
      setNexusLoading(false);
    }
  };

  const handleAnalyzeClick = (chartId, context = {}) => {
    if (!chartId) {
      return;
    }

    let appliedFilters = context.filters || filters;
    const rangeContext = context.range || salesForecastRange;
    const defaultPrompt =
      chartId === 'salesForecast'
        ? `Please analyze the ${CHART_LABELS[chartId] || chartId} chart for the ${SALES_FORECAST_RANGE_LABELS[rangeContext] || rangeContext}. Summarize projected revenue, orders, confidence, and how it compares to the baseline.`
        : chartId === 'productStocks'
        ? `Please analyze the ${CHART_LABELS[chartId] || chartId} chart. Identify products with low stock levels, products that may need restocking, stock distribution across branches, and provide recommendations for inventory management.`
        : `Please analyze the ${CHART_LABELS[chartId] || chartId} chart and highlight the most important insights.`;
    const initialPrompt = typeof context.question === 'string' && context.question.trim().length > 0
      ? context.question.trim()
      : defaultPrompt;

    // Extract year information from the initial prompt/question
    const extractedYears = extractYearsFromQuery(initialPrompt);
    if (extractedYears) {
      appliedFilters = {
        ...appliedFilters,
        yearStart: extractedYears.yearStart.toString(),
        yearEnd: extractedYears.yearEnd.toString()
      };
    }

    const initialUserMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: initialPrompt
    };

    const initialConversation = [initialUserMessage];

    setNexusMessages(initialConversation);
    setNexusContext({
      chartId,
      filters: appliedFilters,
      lastSql: null,
      model: null,
      lastRows: null,
      range: rangeContext,
      chartData: context.data || null
    });
    setIsNexusOpen(true);

    // Only pass data for charts that need it (like salesForecast)
    // For other charts (including productStocks), backend fetches data from database
    const chartContext = chartId === 'salesForecast' 
      ? { range: rangeContext, data: context.data || salesForecast }
      : { range: rangeContext };
    
    fetchNexusResponse(chartId, initialConversation, appliedFilters, false, chartContext);
  };

  const hasActiveFilters = () => {
    return filters.branch !== 'all';
  };

  const applyFilters = () => {
    if (!rawData) return;

    setTotalSalesLoading(true);
    console.log('Applying filters:', filters);

    const monthlySource = Array.isArray(rawData.totalSalesMonthly) ? [...rawData.totalSalesMonthly] : [];
    const yearlySource = Array.isArray(rawData.totalSalesYearly) ? [...rawData.totalSalesYearly] : [];
    const baseGranularity = filters.timeRange === 'year' ? 'yearly' : 'monthly';
    let effectiveGranularity = baseGranularity;
    let selectedSales = effectiveGranularity === 'yearly' ? yearlySource : monthlySource;

    if (effectiveGranularity === 'monthly' && selectedSales.length === 0 && yearlySource.length > 0) {
      effectiveGranularity = 'yearly';
      selectedSales = [...yearlySource];
    } else if (effectiveGranularity === 'yearly' && selectedSales.length === 0 && monthlySource.length > 0) {
      effectiveGranularity = 'monthly';
      selectedSales = [...monthlySource];
    }

    selectedSales = selectedSales
      .filter(item => typeof item === 'object' && item !== null)
      .map(item => ({
        ...item,
        date: item.date || (item.year ? new Date(item.year, (item.month ? item.month - 1 : 0), 1).toISOString() : null),
        label: item.label || item.month || (item.year ? String(item.year) : '')
      }));

    selectedSales.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(a.year || 0, (a.month || 1) - 1, 1);
      const dateB = b.date ? new Date(b.date) : new Date(b.year || 0, (b.month || 1) - 1, 1);
      return dateA - dateB;
    });

    // Time range filtering is handled by chart-specific buttons, not main filter
    // Keep all data for display

    // Handle branch filter - can be 'all' or a branch name
    let salesByBranch = rawData.salesByBranch ? [...rawData.salesByBranch] : [];
    if (filters.branch !== 'all') {
      // Try to find branch by name first
      const selectedBranch = branches.find(b => b.name === filters.branch);
      if (selectedBranch) {
        // Filter by exact branch name
        salesByBranch = salesByBranch.filter(
          item => item.branch && (item.branch === selectedBranch.name || 
                                  item.branch.toLowerCase() === selectedBranch.name.toLowerCase())
        );
      } else {
        // Fallback to old method (normalized name matching) for backward compatibility
        const branchFilter = filters.branch.toLowerCase().replace(/\s+/g, '_');
        salesByBranch = salesByBranch.filter(
          item => item.branch && item.branch.toLowerCase().replace(/\s+/g, '_') === branchFilter
        );
      }
    }

    let orderStatus = rawData.orderStatus
      ? Object.keys(rawData.orderStatus).reduce((acc, key) => {
          const value = rawData.orderStatus[key];
          acc[key] = typeof value === 'object' && value !== null ? { ...value } : value;
          return acc;
        }, {})
      : {};

    let topProducts = rawData.topProducts ? rawData.topProducts.map(product => ({ ...product })) : [];
    if (topProducts.length > 0) {
      // Calculate total quantity for percentage calculation (should add up to 100%)
      const totalQuantity = topProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
      topProducts = topProducts.map(product => ({
        ...product,
        percentage: totalQuantity > 0 ? Math.round(((product.quantity || 0) / totalQuantity) * 100) : 0
      }));
    }

    let summary = rawData.summary ? { ...rawData.summary } : {};
    if (orderStatus && typeof orderStatus === 'object') {
      const total = Object.values(orderStatus)
        .reduce((sum, status) => sum + (typeof status === 'object' ? status.count || 0 : 0), 0);
      summary = {
        ...summary,
        totalOrders: total
      };
    }

    if (selectedSales.length === 0) {
      if (effectiveGranularity === 'monthly' && yearlySource.length > 0) {
        effectiveGranularity = 'yearly';
        selectedSales = [...yearlySource];
      } else if (effectiveGranularity === 'yearly' && monthlySource.length > 0) {
        effectiveGranularity = 'monthly';
        selectedSales = [...monthlySource];
      }
    }

    const filteredData = {
      totalSales: selectedSales,
      totalSalesGranularity: effectiveGranularity,
      totalSalesMonthly: rawData.totalSalesMonthly,
      totalSalesYearly: rawData.totalSalesYearly,
      salesByBranch,
      orderStatus,
      topProducts,
      summary,
      hasData: rawData.hasData
    };

    console.log('Filtered data:', filteredData);
    setAnalyticsData(filteredData);
    setTotalSalesLoading(false);
  };

  const totalSalesChart = useMemo(() => {
    const dataset = Array.isArray(analyticsData?.totalSales) ? analyticsData.totalSales : [];
    const categories = dataset.map(item => item.label || item.month || item.year || item.date || '');
    const values = dataset.map(item => Number(item.sales || item.total || 0));
    const hasData = dataset.length > 0 && values.some(value => value > 0);

    const rotateLabels = categories.length > 12 && analyticsData.totalSalesGranularity !== 'yearly' ? 35 : 0;
    const seriesName = analyticsData.totalSalesGranularity === 'yearly' ? 'Yearly Sales' : 'Monthly Sales';

    const option = {
      animation: hasData,
      animationDuration: hasData ? 600 : 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'line',
          lineStyle: {
            color: '#3b82f6',
            width: 1
          }
        },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        borderWidth: 1,
        textStyle: { color: '#f9fafb' },
        confine: true,
        appendToBody: false,
        enterable: false,
        hideDelay: 100,
        showDelay: 0,
        formatter: (params) => {
          try {
          if (!isSalesChartValuesVisible) return '';
          if (!Array.isArray(params) || !params.length) return '';
          const point = params[0];
            if (!point || point.axisValue === undefined) return '';
          return `${point.axisValue}<br/>${seriesName}: ₱${formatNumber(point.data || 0)}`;
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      grid: { left: '4%', right: '3%', bottom: rotateLabels ? '14%' : '8%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
        axisLabel: { color: '#6b7280', rotate: rotateLabels },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisTick: { alignWithLabel: true }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#6b7280',
          formatter: isSalesChartValuesVisible ? (value) => `₱${formatNumber(value)}` : () => '•••'
        },
        splitLine: { lineStyle: { color: '#e5e7eb' } }
      },
      series: [
        {
          name: seriesName,
          type: 'line',
          smooth: true,
          data: values,
          showSymbol: false,
          lineStyle: { width: 3, color: '#1e3a8a' },
          areaStyle: { color: 'rgba(30, 58, 138, 0.15)' },
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          emphasis: { focus: 'series' }
        }
      ]
    };

    return { option, hasData };
  }, [analyticsData.totalSales, analyticsData.totalSalesGranularity, isSalesChartValuesVisible]);

  const salesByBranchChart = useMemo(() => {
    const branchData = Array.isArray(analyticsData?.salesByBranch) ? analyticsData.salesByBranch : [];
    const values = branchData.map(item => Number(item.sales || 0));
    const hasData = branchData.length > 0 && values.some(value => value > 0);
    // Use vibrant blue color for all bars
    const barColor = '#3b82f6';

    const option = {
      animation: hasData,
      animationDuration: hasData ? 600 : 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(59, 130, 246, 0.1)'
          }
        },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        borderWidth: 1,
        textStyle: { color: '#f9fafb' },
        confine: true,
        appendToBody: false,
        enterable: false,
        hideDelay: 100,
        showDelay: 0,
        formatter: (params) => {
          try {
          if (!isSalesChartValuesVisible) return '';
          if (!Array.isArray(params) || !params.length) return '';
          const bar = params[0];
            if (!bar) return '';
            const axisLabel = bar.axisValueLabel || bar.axisValue || '';
            const value = bar.data?.value ?? bar.data ?? 0;
            return `${axisLabel}<br/>Sales: ₱${formatNumber(value)}`;
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      grid: { left: '6%', right: '4%', bottom: '12%', top: '10%', containLabel: true, show: false },
      xAxis: {
        type: 'category',
        data: branchData.map(item => {
          const branchName = item.branch || '';
          const cleanedName = branchName.replace(/\s*BRANCH\s*/gi, '').trim();
          // Split into words and join with line break for better display
          const words = cleanedName.split(/\s+/);
          if (words.length > 1) {
            // Split into two lines: first word(s) on top, last word on bottom
            const midPoint = Math.ceil(words.length / 2);
            const firstLine = words.slice(0, midPoint).join(' ');
            const secondLine = words.slice(midPoint).join(' ');
            return `${firstLine}\n${secondLine}`;
          }
          return cleanedName;
        }),
        axisLabel: {
          color: '#6b7280',
          interval: 0,
          rotate: 0,
          lineHeight: 16
        },
        axisLine: { show: true, lineStyle: { color: '#d1d5db' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          show: false
        },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          name: 'Branch Sales',
          type: 'bar',
          barMaxWidth: 42,
          data: branchData.map((item, index) => ({
            value: Number(item.sales || 0),
            itemStyle: {
              color: barColor,
              borderRadius: [6, 6, 0, 0]
            }
          })),
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(31, 41, 55, 0.25)' } },
          label: {
            show: isSalesChartValuesVisible,
            position: 'top',
            formatter: ({ value }) => `₱${formatNumber(value)}`,
            color: '#475569',
            fontWeight: 600
          }
        }
      ]
    };

    return { option, hasData };
  }, [analyticsData.salesByBranch, isSalesChartValuesVisible]);

  const orderStatusChart = useMemo(() => {
    const status = analyticsData?.orderStatus;
    const entries = status
      ? ['completed', 'processing', 'pending', 'cancelled']
          .map((key) => {
            const entry = status[key];
            if (!entry || entry.count === undefined) {
              return null;
            }
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            const total = status.total || Object.values(status)
              .filter(val => typeof val === 'object' && val.count !== undefined)
              .reduce((sum, val) => sum + (val.count || 0), 0);
            const percentage = entry.percentage !== undefined
              ? entry.percentage
              : total > 0 ? Math.round(((entry.count || 0) / total) * 100) : 0;
            // Use branch color palette for order status
            const statusColors = {
              'Completed': '#166534',
              'Processing': '#0284c7',
              'Pending': '#0d9488',
              'Cancelled': '#64748b'
            };
            return {
              name: label,
              value: entry.count || 0,
              percentage,
              itemStyle: {
                color: statusColors[label] || '#64748b'
              }
            };
          })
          .filter(Boolean)
      : [];

    const hasData = entries.length > 0 && entries.some(entry => entry.value > 0);

    const option = {
      animation: hasData,
      animationDuration: hasData ? 400 : 0,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        borderWidth: 1,
        textStyle: { color: '#f9fafb' },
        confine: true,
        appendToBody: false,
        enterable: false,
        hideDelay: 100,
        showDelay: 0,
        formatter: (params) => {
          try {
            if (!params) return '';
            // Handle both single object (pie chart) and array
            const param = Array.isArray(params) ? params[0] : params;
            if (!param) return '';
            const name = param.name || '';
            const value = param.value ?? 0;
          return `${name}<br/>${value} orders`;
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'center',
        textStyle: { color: '#4b5563' }
      },
      series: [
        {
          name: 'Order Status',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['38%', '52%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          labelLine: { show: false },
          data: entries.map((entry) => ({
            ...entry,
            value: entry.value,
            name: entry.name
          })),
          animation: hasData,
          animationDuration: hasData ? 400 : 0
        }
      ]
    };

    return { option, hasData };
  }, [analyticsData.orderStatus]);

  const salesTrendsChart = useMemo(() => {
    const trends = Array.isArray(salesTrends) ? salesTrends : [];
    const categories = trends.map(item => {
      const rawDate = item.date || item.day || item.period;
      if (!rawDate) {
        return '';
      }
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) {
        return rawDate;
      }
      return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const salesValues = trends.map(item => Number(item.sales || 0));
    const ordersValues = trends.map(item => Number(item.orders || 0));
    const hasData =
      trends.length > 0 &&
      (salesValues.some(value => value > 0) || ordersValues.some(value => value > 0));

    const option = {
      animation: hasData,
      animationDuration: hasData ? 600 : 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'cross',
          crossStyle: {
            color: '#3b82f6',
            width: 1
          }
        },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        borderWidth: 1,
        textStyle: { color: '#f9fafb' },
        confine: true,
        appendToBody: false,
        enterable: false,
        hideDelay: 100,
        showDelay: 0,
        formatter: (params) => {
          try {
          if (!isSalesChartValuesVisible) return '';
          if (!Array.isArray(params) || !params.length) return '';
            const firstParam = params[0];
            if (!firstParam || firstParam.axisValue === undefined) return '';
            const lines = params
              .filter(point => point && point.seriesName)
              .map(point => {
            if (point.seriesName === 'Sales') {
                  return `${point.marker || ''}${point.seriesName}: ₱${formatNumber(point.data ?? 0)}`;
            }
                return `${point.marker || ''}${point.seriesName}: ${formatNumber(point.data ?? 0)}`;
          });
            return [`${firstParam.axisValue}`, ...lines].join('<br/>');
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      legend: {
        data: ['Sales', 'Orders'],
        top: 0,
        textStyle: { color: '#4b5563' }
      },
      grid: { left: '4%', right: '5%', bottom: '10%', top: '14%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
        axisLabel: { color: '#6b7280' },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisTick: { alignWithLabel: true }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Sales',
          axisLabel: {
            color: '#6b7280',
            formatter: isSalesChartValuesVisible ? (value) => `₱${formatNumber(value)}` : () => '•••'
          },
          splitLine: { lineStyle: { color: '#e5e7eb' } }
        },
        {
          type: 'value',
          name: 'Orders',
          axisLabel: { 
            color: '#6b7280', 
            formatter: isSalesChartValuesVisible ? (value) => formatNumber(value) : () => '•••'
          },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Sales',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: '#0284c7' },
          areaStyle: { color: 'rgba(2, 132, 199, 0.15)' },
          data: salesValues,
          animation: hasData,
          animationDuration: hasData ? 600 : 0
        },
        {
          name: 'Orders',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#0d9488', type: 'dashed' },
          data: ordersValues,
          animation: hasData,
          animationDuration: hasData ? 600 : 0
        }
      ]
    };

    return { option, hasData };
  }, [salesTrends, isSalesChartValuesVisible]);

  const topProductsChart = useMemo(() => {
    const products = Array.isArray(analyticsData?.topProducts) ? analyticsData.topProducts : [];
    const values = products.map(item => Number(item.quantity || 0));
    const hasData = products.length > 0 && values.some(value => value > 0);
    const maxValue = Math.max(0, ...values);
    const paddedMax = maxValue <= 0 ? 10 : Math.ceil(maxValue * 1.1);
    const gradientStops = [
      { offset: 0, color: '#0284c7' },
      { offset: 0.45, color: '#0d9488' },
      { offset: 1, color: '#1e3a8a' }
    ];

    const option = {
      animation: hasData,
      animationDuration: hasData ? 650 : 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        textStyle: { color: '#f9fafb' },
        formatter: (params) => {
          try {
          if (!Array.isArray(params) || !params.length) return '';
          const bar = params[0];
            if (!bar || bar.dataIndex === undefined || bar.dataIndex === null) return '';
            const dataIndex = Number(bar.dataIndex);
            if (isNaN(dataIndex) || dataIndex < 0 || dataIndex >= products.length) return '';
            const product = products[dataIndex];
          if (!product) return '';
          const quantity = product.quantity ?? 0;
          const orders = product.orders ?? 0;
          const share = product.percentage ?? 0;
          const revenue = product.revenue ?? 0;
            const axisLabel = bar.axisValueLabel || bar.axisValue || '';
          const lines = [
              `${axisLabel}`,
            `Quantity: ${formatNumber(quantity)}`,
            `Share: ${share}%`
          ];
          if (orders) {
            lines.push(`Orders: ${formatNumber(orders)}`);
          }
          if (revenue) {
            lines.push(`Revenue: ₱${formatNumber(revenue)}`);
          }
          return lines.join('<br/>');
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      grid: { left: '6%', right: '6%', bottom: '6%', top: '6%', containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        max: paddedMax,
        axisLabel: {
          color: '#6b7280',
          formatter: (value) => formatNumber(value)
        },
        splitLine: { lineStyle: { color: '#e5e7eb' } }
      },
      yAxis: {
        type: 'category',
        data: products.map(item => item.product),
        inverse: true,
        axisLabel: {
          color: '#1e3a8a',
          fontWeight: 600,
          fontSize: 13
        },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [
        {
          type: 'bar',
          barWidth: 28,
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(2, 132, 199, 0.08)',
            borderRadius: [0, 12, 12, 0]
          },
          data: values.map((value, index) => ({
            value,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, gradientStops),
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowColor: 'rgba(99, 102, 241, 0.35)'
            },
            emphasis: {
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#7c3aed' },
                  { offset: 1, color: '#1e3a8a' }
                ])
              }
            }
          })),
          itemStyle: { borderRadius: [0, 12, 12, 0] },
          animation: hasData,
          animationDuration: hasData ? 650 : 0,
          label: {
            show: products.length > 0,
            position: 'right',
            formatter: ({ value, dataIndex }) => {
              if (dataIndex === undefined || dataIndex === null) return '';
              if (isNaN(Number(dataIndex)) || Number(dataIndex) < 0 || Number(dataIndex) >= products.length) return '';
              const share = products[dataIndex]?.percentage ?? 0;
              return `${formatNumber(value ?? 0)} • ${share}%`;
            },
            color: '#312e81',
            fontWeight: 600,
            fontSize: 12
          }
        }
      ]
    };

    return { option, hasData };
  }, [analyticsData.topProducts]);

  const topCustomersChart = useMemo(() => {
    const customers = Array.isArray(topCustomers) ? topCustomers.slice(0, 8) : [];
    const values = customers.map(item => Number(item.totalSpent || item.totalSpentValue || item.total || 0));
    const hasData = customers.length > 0 && values.some(value => value > 0);

    const option = {
      animation: hasData,
      animationDuration: hasData ? 600 : 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        textStyle: { color: '#f9fafb' },
        formatter: (params) => {
          try {
          if (!Array.isArray(params) || !params.length) return '';
          const bar = params[0];
            if (!bar || bar.dataIndex === undefined || bar.dataIndex === null) return '';
            const dataIndex = Number(bar.dataIndex);
            if (isNaN(dataIndex) || dataIndex < 0 || dataIndex >= customers.length) return '';
            const customer = customers[dataIndex];
          if (!customer) return '';
            const name = getCustomerDisplayName(customer, dataIndex);
          const spent = customer.totalSpent || customer.totalSpentValue || customer.total || 0;
          const orderCount = customer.orderCount || customer.order_count || customer.orderCountValue || customer.orders || 0;
          return `${name}<br/>Spent: ₱${formatNumber(spent)}<br/>Orders: ${formatNumber(orderCount)}`;
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      grid: { left: '3%', right: '4%', bottom: '4%', top: '6%', containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        axisLabel: {
          color: '#6b7280',
          formatter: (value) => `₱${formatNumber(value)}`
        },
        splitLine: { lineStyle: { color: '#e5e7eb' } }
      },
      yAxis: {
        type: 'category',
        data: customers.map((customer, index) => getCustomerDisplayName(customer, index)),
        inverse: true,
        axisLabel: { color: '#4b5563' },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [
        {
          type: 'bar',
          barWidth: 18,
          data: values,
          itemStyle: { color: '#10b981', borderRadius: [0, 8, 8, 0] },
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          label: {
            show: customers.length > 0,
            position: 'right',
            formatter: ({ value }) => `₱${formatNumber(value)}`,
            color: '#4b5563',
            fontWeight: 600
          }
        }
      ]
    };

    return { option, hasData };
  }, [topCustomers]);

  const productStocksChart = useMemo(() => {
    const stocks = Array.isArray(productStocks) ? productStocks : [];
    // Preserve 0 values - explicitly handle 0 stock items
    const values = stocks.map(item => {
      const stock = item.totalStock;
      return stock !== null && stock !== undefined ? Number(stock) : 0;
    });
    // Include 0 stock items in the data check
    const hasData = stocks.length > 0;
    const maxValue = Math.max(0, ...values);
    const paddedMax = maxValue <= 0 ? 10 : Math.ceil(maxValue * 1.1);
    const gradientStops = [
      { offset: 0, color: '#10b981' },
      { offset: 0.5, color: '#059669' },
      { offset: 1, color: '#047857' }
    ];

    const option = {
      animation: hasData,
      animationDuration: hasData ? 650 : 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: { 
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(59, 130, 246, 0.1)'
          }
        },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        borderWidth: 1,
        textStyle: { 
          color: '#f9fafb',
          fontSize: 12
        },
        confine: true,
        appendToBody: false,
        enterable: false,
        hideDelay: 100,
        showDelay: 0,
        formatter: (params) => {
          try {
            if (!Array.isArray(params) || !params.length) return '';
            const bar = params[0];
            if (!bar || bar.dataIndex === undefined || bar.dataIndex === null) return '';
            const dataIndex = Number(bar.dataIndex);
            if (isNaN(dataIndex) || dataIndex < 0 || dataIndex >= stocks.length) return '';
            const stock = stocks[dataIndex];
            if (!stock) return '';
            // Use the full name from stock object, not the truncated axis label
            const fullName = stock.name || stock.originalName || bar.axisValueLabel || 'Unknown';
            const lines = [
              `<strong>${fullName}</strong>`,
              `Total Stock: <strong>${formatNumber(stock.totalStock || 0)}</strong>`,
              `Category: ${stock.category || 'N/A'}`
            ];
            if (stock.branches && stock.branches.length > 0) {
              lines.push('<br/>By Branch:');
              stock.branches.forEach(branch => {
                lines.push(`  • ${branch.branch}: ${formatNumber(branch.stock)}`);
              });
            }
            return lines.join('<br/>');
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      grid: { left: '40%', right: '5%', bottom: '5%', top: '5%', containLabel: false },
      xAxis: {
        type: 'value',
        min: 0,
        max: paddedMax,
        axisLabel: {
          color: '#6b7280',
          formatter: (value) => formatNumber(value)
        },
        splitLine: { lineStyle: { color: '#e5e7eb' } }
      },
      yAxis: {
        type: 'category',
        data: stocks.map(item => {
          // With maximized chart size and increased left margin, show full names
          // ECharts will handle truncation with ellipsis if needed based on width setting
          return item.name || 'Unknown';
        }),
        inverse: true,
        axisLabel: {
          color: '#059669',
          fontWeight: 600,
          fontSize: 13,
          width: null, // Let labels use available space in the 40% left area
          overflow: 'break' // Break long names into multiple lines if needed
        },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [
        {
          type: 'bar',
          barWidth: 28,
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(16, 185, 129, 0.08)',
            borderRadius: [0, 12, 12, 0]
          },
          data: values.map((value, index) => {
            const stock = stocks[index];
            const status = stock?.stockStatus || 'high_stock';
            
            // Define colors based on stock status
            let colorStops = [];
            let shadowColor = '';
            let emphasisColor = [];
            
            switch (status) {
              case 'out_of_stock':
                colorStops = [
                  { offset: 0, color: '#ef4444' },
                  { offset: 1, color: '#dc2626' }
                ];
                shadowColor = 'rgba(239, 68, 68, 0.35)';
                emphasisColor = [
                  { offset: 0, color: '#f87171' },
                  { offset: 1, color: '#dc2626' }
                ];
                break;
              case 'low_stock':
                colorStops = [
                  { offset: 0, color: '#f59e0b' },
                  { offset: 1, color: '#d97706' }
                ];
                shadowColor = 'rgba(245, 158, 11, 0.35)';
                emphasisColor = [
                  { offset: 0, color: '#fbbf24' },
                  { offset: 1, color: '#d97706' }
                ];
                break;
              case 'sufficient_stock':
                colorStops = [
                  { offset: 0, color: '#eab308' },
                  { offset: 1, color: '#ca8a04' }
                ];
                shadowColor = 'rgba(234, 179, 8, 0.35)';
                emphasisColor = [
                  { offset: 0, color: '#facc15' },
                  { offset: 1, color: '#ca8a04' }
                ];
                break;
              case 'high_stock':
                colorStops = [
                  { offset: 0, color: '#10b981' },
                  { offset: 1, color: '#059669' }
                ];
                shadowColor = 'rgba(16, 185, 129, 0.35)';
                emphasisColor = [
                  { offset: 0, color: '#34d399' },
                  { offset: 1, color: '#047857' }
                ];
                break;
              case 'overstock':
                colorStops = [
                  { offset: 0, color: '#3b82f6' },
                  { offset: 1, color: '#2563eb' }
                ];
                shadowColor = 'rgba(59, 130, 246, 0.35)';
                emphasisColor = [
                  { offset: 0, color: '#60a5fa' },
                  { offset: 1, color: '#2563eb' }
                ];
                break;
              default:
                colorStops = gradientStops;
                shadowColor = 'rgba(16, 185, 129, 0.35)';
                emphasisColor = [
                  { offset: 0, color: '#34d399' },
                  { offset: 1, color: '#047857' }
                ];
            }
            
            return {
              value,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, colorStops),
                shadowBlur: 6,
                shadowOffsetX: 2,
                shadowColor: shadowColor
              },
              emphasis: {
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 1, 0, emphasisColor)
                }
              }
            };
          }),
          itemStyle: { borderRadius: [0, 12, 12, 0] },
          animation: hasData,
          animationDuration: hasData ? 650 : 0,
          label: {
            show: stocks.length > 0,
            position: 'right',
            formatter: ({ value }) => formatNumber(value),
            color: '#047857',
            fontWeight: 600,
            fontSize: 12
          }
        }
      ]
    };

    return { option, hasData };
  }, [productStocks]);

  const salesForecastChart = useMemo(() => {
    const combined = Array.isArray(salesForecast?.combined) ? salesForecast.combined : [];
    const categories = combined.map(item => item.month || item.label || '');
    const historicalData = combined.map(item => item.type === 'historical' ? Number(item.revenue || 0) : null);
    const forecastData = combined.map(item => item.type === 'forecast' ? Number(item.revenue || 0) : null);
    const confidenceMap = new Map(
      (salesForecast?.forecast || []).map(item => [String(item.month || item.label || ''), item.confidence])
    );
    const hasData = combined.length > 0 && (
      historicalData.some(value => value !== null && value !== undefined && value !== 0) ||
      forecastData.some(value => value !== null && value !== undefined && value !== 0)
    );

    // Format month labels as "Jan 2022" (always include full 4-digit year)
    const formatMonthLabel = (label) => {
      if (!label) return '';
      try {
        const date = new Date(label);
        if (!Number.isNaN(date.getTime())) {
          // Always format as "Jan 2022" with full 4-digit year
          const month = date.toLocaleDateString('en-US', { month: 'short' });
          const year = date.getFullYear();
          return `${month} ${year}`;
        }
      } catch (e) {
        // If parsing fails, try to extract month and year from string
        const monthYearMatch = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})/i);
        if (monthYearMatch) {
          return `${monthYearMatch[1]} ${monthYearMatch[2]}`;
        }
        const monthMatch = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (monthMatch) {
          // Try to extract year from original label or use current year as fallback
          const yearMatch = label.match(/(\d{4})/);
          const year = yearMatch ? yearMatch[1] : new Date().getFullYear();
          return `${monthMatch[1]} ${year}`;
        }
      }
      // Fallback: return as is if we can't parse
      return label;
    };

    const formattedCategories = categories.map(formatMonthLabel);
    const totalMonths = categories.length;
    
    // Create mapping from formatted label to original label for tooltip
    const labelToOriginalMap = new Map();
    categories.forEach((original, index) => {
      labelToOriginalMap.set(formattedCategories[index], original);
    });
    
    // Determine which months to show - only first month of each quarter (Jan, Apr, Jul, Oct)
    // Also show the first and last month for context
    const shouldShowLabel = (index) => {
      if (index === 0 || index === totalMonths - 1) {
        return true; // Always show first and last month
      }
      
      try {
        const originalLabel = categories[index];
        const date = new Date(originalLabel);
        if (!Number.isNaN(date.getTime())) {
          const month = date.getMonth(); // 0 = Jan, 1 = Feb, ..., 11 = Dec
          // Show if it's the first month of a quarter (Jan=0, Apr=3, Jul=6, Oct=9)
          return month % 3 === 0;
        }
      } catch (e) {
        // If we can't parse, show every 3rd month as fallback
        return index % 3 === 0;
      }
      return false;
    };
    
    // Determine if rotation is needed
    const needsRotation = totalMonths > 8;

    const option = {
      animation: hasData,
      animationDuration: hasData ? 600 : 0,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        textStyle: { color: '#f9fafb' },
        formatter: (params) => {
          try {
          if (!Array.isArray(params) || !params.length) return '';
            const firstParam = params[0];
            if (!firstParam) return '';
            const formattedLabel = firstParam.axisValueLabel || firstParam.axisValue || '';
            // Get original label for confidence lookup
            const originalLabel = labelToOriginalMap.get(formattedLabel) || formattedLabel;
            // Format the display label nicely
            const displayLabel = originalLabel ? formatMonthLabel(originalLabel) : formattedLabel;
          const lines = params
              .filter(point => point && point.seriesName && point.value !== null && point.value !== undefined)
            .map(point => {
                let line = `${point.marker || ''}${point.seriesName}: ₱${formatNumber(point.value || 0)}`;
              if (point.seriesName === 'Forecast') {
                  // Use original label for confidence lookup
                  const confidence = confidenceMap.get(String(originalLabel));
                if (confidence !== undefined) {
                  line += `<br/>Confidence: ${confidence}%`;
                }
              }
              return line;
            });
            return [displayLabel, ...lines].join('<br/>');
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      legend: {
        data: ['Historical', 'Forecast'],
        top: 0,
        textStyle: { color: '#4b5563' }
      },
      grid: { 
        left: '4%', 
        right: '4%', 
        bottom: needsRotation ? '12%' : '8%', 
        top: '12%', 
        containLabel: true 
      },
      xAxis: {
        type: 'category',
        data: formattedCategories,
        axisLabel: { 
          color: '#6b7280', 
          interval: 0, // Show all positions
          formatter: (value, index) => {
            // Only show label if it's the first month of a quarter, or first/last month
            return shouldShowLabel(index) ? value : '';
          },
          rotate: needsRotation ? 30 : 0,
          fontSize: 11,
          margin: needsRotation ? 10 : 8
        },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisTick: { 
          alignWithLabel: true,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#6b7280',
          formatter: (value) => `₱${formatNumber(value)}`
        },
        splitLine: { lineStyle: { color: '#e5e7eb' } }
      },
      series: [
        {
          name: 'Historical',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: historicalData,
          lineStyle: { width: 3, color: '#0284c7' },
          areaStyle: { color: 'rgba(59, 130, 246, 0.12)' },
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          emphasis: { focus: 'series' }
        },
        {
          name: 'Forecast',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 7,
          data: forecastData,
          lineStyle: { width: 3, color: '#10b981', type: 'dashed' },
          itemStyle: { color: '#10b981' },
          areaStyle: { color: 'rgba(16, 185, 129, 0.1)' },
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          emphasis: { focus: 'series' }
        }
      ]
    };
    return { option, hasData };
  }, [salesForecast]);

  const { option: salesTrendsOption, hasData: hasSalesTrendsData } = salesTrendsChart;
  const { option: totalSalesOption, hasData: hasTotalSalesData } = totalSalesChart;
  const { option: salesByBranchOption, hasData: hasSalesByBranchData } = salesByBranchChart;
  const { option: orderStatusOption, hasData: hasOrderStatusData } = orderStatusChart;
  const { option: topProductsOption, hasData: hasTopProductsData } = topProductsChart;
  const { option: productStocksOption, hasData: hasProductStocksData } = productStocksChart;
  const { option: topCustomersOption, hasData: hasTopCustomersData } = topCustomersChart;
  const { option: salesForecastOption, hasData: hasSalesForecastData } = salesForecastChart;
  const forecastSummary = salesForecast?.summary || null;

  const handleOpenFloatingChat = () => {
    setNexusMessages([]);
    setNexusContext({
      chartId: null,
      filters,
      lastSql: null,
      model: null,
      lastRows: null,
      isGeneralConversation: true
    });
    setIsNexusOpen(true);
    setNexusError(null);
  };

  function getCustomerDisplayName(customer = {}, index = 0) {
    const candidates = [
      customer.displayName,
      customer.customerName,
      customer.name,
      customer.fullName,
      customer.userName,
      customer.customer_email,
      customer.customerEmail,
      customer.email,
      customer.userEmail,
      customer.user_id,
      customer.userId,
      customer.id
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return `Customer ${index + 1}`;
  }

  // Redirect admins away from analytics page
  if (!authLoading && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin-dashboard">
      <Sidebar 
        activePage={'analytics'} 
        setActivePage={() => {}} 
      />
      <div className="admin-main-content">
        {loading ? (
          <div className="analytics-loading">
            <div className="loading-spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        ) : (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-left">
          <h1>Analytics</h1>
          {hasActiveFilters() && (
            <div className="active-filters-info">
              <span className="filter-count">Branch filter active</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <FaClipboardList />
          </div>
          <div className="summary-content">
            <h3>Total Orders</h3>
            <p className="summary-value">{formatNumber(analyticsData.orderStatus?.total || analyticsData.summary?.totalOrders || 0)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon completed">
            <FaStore />
          </div>
          <div className="summary-content">
            <h3>Completed</h3>
            <p className="summary-value">{formatNumber(analyticsData.orderStatus?.completed?.count || 0)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon processing">
            <FaFilter />
          </div>
          <div className="summary-content">
            <h3>Processing</h3>
            <p className="summary-value">{formatNumber(analyticsData.orderStatus?.processing?.count || 0)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon pending">
            <FaChartLine />
          </div>
          <div className="summary-content">
            <h3>Pending</h3>
            <p className="summary-value">{formatNumber(analyticsData.orderStatus?.pending?.count || 0)}</p>
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="analytics-tabs">
        <button
          className={`analytics-tab ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <FaChartLine className="tab-icon" />
          Sales & Revenue
        </button>
        <button
          className={`analytics-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <FaClipboardList className="tab-icon" />
          Orders
        </button>
        <button
          className={`analytics-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <FaTshirt className="tab-icon" />
          Products
        </button>
        <button
          className={`analytics-tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <FaUsers className="tab-icon" />
          Customers
        </button>
        <button
          className={`analytics-tab ${activeTab === 'forecast' ? 'active' : ''}`}
          onClick={() => setActiveTab('forecast')}
        >
          <FaChartArea className="tab-icon" />
          Forecast
        </button>
      </div>

      {/* Analytics Grid */}
      <div className="analytics-grid">
        {/* Sales & Revenue Tab */}
        {activeTab === 'sales' && (
          <>
            {/* Chart Tabs for Sales & Revenue */}
            <div className="sales-chart-tabs-container">
              <div className="sales-chart-tabs">
                <button
                  className={`sales-chart-tab ${activeSalesChartTab === 'totalSales' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSalesChartTab('totalSales');
                    setTimeout(() => scrollToChart('totalSales'), 150);
                  }}
                >
                  <span>Total Sales Over Time</span>
                </button>
                <button
                  className={`sales-chart-tab ${activeSalesChartTab === 'dailySales' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSalesChartTab('dailySales');
                    setTimeout(() => scrollToChart('dailySales'), 150);
                  }}
                >
                  <span>Daily Sales & Orders</span>
                </button>
                <button
                  className={`sales-chart-tab ${activeSalesChartTab === 'salesByBranch' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSalesChartTab('salesByBranch');
                    setTimeout(() => scrollToChart('salesByBranch'), 150);
                  }}
                >
                  <span>Sales By Branch</span>
                </button>
              </div>
              {/* Single Toggle for All Charts */}
              <div className="sales-chart-global-controls">
                <button
                  className="dashboard1-chart-toggle-btn"
                  onClick={() => setIsSalesChartValuesVisible(!isSalesChartValuesVisible)}
                  title={isSalesChartValuesVisible ? 'Hide all values' : 'Show all values'}
                  aria-label={isSalesChartValuesVisible ? 'Hide all values' : 'Show all values'}
                >
                  <FontAwesomeIcon 
                    icon={isSalesChartValuesVisible ? faEyeSlash : faEye} 
                    className="dashboard1-chart-toggle-icon"
                  />
                  <span className="toggle-label">{isSalesChartValuesVisible ? 'Hide Values' : 'Show Values'}</span>
                </button>
              </div>
            </div>

            {/* Total Sales Over Time */}
            {activeSalesChartTab === 'totalSales' && (
            <div 
              ref={el => chartContainerRefs.current.totalSales = el}
              className="analytics-card geo-distribution-card sales-chart-card"
            >
          <div className="card-header">
            <FaChartLine className="card-icon" />
            <h3>Total Sales Over Time</h3>
            <div className="card-controls">
              <button 
                className={`time-range-btn ${filters.timeRange === 'month' ? 'active' : ''}`}
                onClick={() => {
                  setFilters(prev => ({ ...prev, timeRange: 'month' }));
                }}
              >
                Monthly
              </button>
              <button 
                className={`time-range-btn ${filters.timeRange === 'year' ? 'active' : ''}`}
                onClick={() => {
                  setFilters(prev => ({ ...prev, timeRange: 'year' }));
                }}
              >
                Yearly
              </button>
              <button 
                className={`time-range-btn ${filters.timeRange === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setFilters(prev => ({ ...prev, timeRange: 'all' }));
                }}
              >
                All Time
              </button>
          </div>
            <button
              className="analytics-header-analyze-btn"
              type="button"
              onClick={() => handleAnalyzeClick('totalSales', { data: analyticsData.totalSales, filters })}
          >
              Analyze
            </button>
          </div>
          <div className="chart-container">
            {totalSalesLoading ? (
              <div className="analytics-loading-inline">
                <div className="loading-spinner"></div>
                <p>Loading sales data...</p>
              </div>
            ) : (
              <>
                <ReactEChartsCore
                  echarts={echarts}
                  option={totalSalesOption}
                  notMerge
                  lazyUpdate
                  opts={{ renderer: 'svg' }}
                  style={{ height: chartHeights.base, width: '100%', minHeight: '200px' }}
                  onChartReady={onChartReady('totalSales')}
                />
                {!hasTotalSalesData && (
                  <div className="chart-empty-state">
                    <p>No sales data available</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
            )}

        {/* Daily Sales & Orders */}
        {activeSalesChartTab === 'dailySales' && (
        <div 
          ref={el => chartContainerRefs.current.dailySales = el}
          className="analytics-card geo-distribution-card sales-chart-card"
        >
          <div className="card-header">
            <FaChartArea className="card-icon" />
            <h3>Daily Sales & Orders (Trailing 30 Days)</h3>
            <div className="card-controls">
            </div>
            <button
              className="analytics-header-analyze-btn"
              type="button"
              onClick={() => handleAnalyzeClick('salesTrends', { data: salesTrends })}
            >
              Analyze
            </button>
          </div>
          <div className="chart-container">
            {salesTrendsLoading ? (
              <div className="analytics-loading-inline">
                <div className="loading-spinner"></div>
                <p>Loading daily trends...</p>
              </div>
            ) : (
              <>
                <ReactEChartsCore
                  echarts={echarts}
                  option={salesTrendsOption}
                  notMerge
                  lazyUpdate
                  opts={{ renderer: 'svg' }}
                  style={{ height: chartHeights.base, width: '100%', minHeight: '200px' }}
                  onChartReady={onChartReady('salesTrends')}
                />
                {!hasSalesTrendsData && (
                  <div className="chart-empty-state">
                    <p>No daily trend data available</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        )}

        {/* Sales By Branch */}
        {activeSalesChartTab === 'salesByBranch' && (
        <div 
          ref={el => chartContainerRefs.current.salesByBranch = el}
          className="analytics-card geo-distribution-card sales-chart-card"
        >
          <div className="card-header">
            <FaStore className="card-icon" />
            <h3>Sales By Branch</h3>
            <div className="card-controls">
            </div>
            <button
              className="analytics-header-analyze-btn"
              type="button"
              onClick={() => handleAnalyzeClick('salesByBranch', { data: analyticsData.salesByBranch, filters })}
            >
              Analyze
            </button>
          </div>
          <div className="chart-container">
            <>
              <ReactEChartsCore
                echarts={echarts}
                option={salesByBranchOption}
                notMerge
                lazyUpdate
                opts={{ renderer: 'svg' }}
                style={{ height: chartHeights.base, width: '100%', minHeight: '200px' }}
                onChartReady={onChartReady('salesByBranch')}
              />
              {!hasSalesByBranchData && (
                <div className="chart-empty-state">
                  <p>No branch data available</p>
                </div>
              )}
            </>
          </div>
        </div>
        )}
          </>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <>
            {/* Pending vs Completed Orders */}
            <div 
              ref={el => chartContainerRefs.current.orderStatus = el}
              className="analytics-card geo-distribution-card"
            >
          <div className="card-header">
            <FaClipboardList className="card-icon" />
            <h3>Pending vs. Completed Orders</h3>
                <button
              className="analytics-header-analyze-btn"
                  type="button"
                  onClick={() => handleAnalyzeClick('orderStatus', { data: analyticsData.orderStatus, filters })}
                >
                  Analyze
                </button>
          </div>
          <div className="analytics-summary customer-insights-summary">
            <div className="summary-card">
              <div className="summary-icon pending">
                <FaChartLine />
              </div>
              <div className="summary-content">
                <h3>Pending</h3>
                <p className="summary-value">{formatNumber(analyticsData.orderStatus?.pending?.count || 0)}</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon completed">
                <FaStore />
              </div>
              <div className="summary-content">
                <h3>Completed</h3>
                <p className="summary-value">{formatNumber(analyticsData.orderStatus?.completed?.count || 0)}</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon processing">
                <FaFilter />
              </div>
              <div className="summary-content">
                <h3>Processing</h3>
                <p className="summary-value">{formatNumber(analyticsData.orderStatus?.processing?.count || 0)}</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">
                <FaClipboardList />
              </div>
              <div className="summary-content">
                <h3>Cancelled</h3>
                <p className="summary-value">{formatNumber(analyticsData.orderStatus?.cancelled?.count || 0)}</p>
              </div>
            </div>
          </div>
          <div className="chart-container">
            <>
              <ReactEChartsCore
                echarts={echarts}
                option={orderStatusOption}
                notMerge
                lazyUpdate
                opts={{ renderer: 'svg' }}
                style={{ height: chartHeights.compact, width: '100%', minHeight: '200px' }}
                onChartReady={onChartReady('orderStatus')}
              />
              {!hasOrderStatusData && (
                <div className="chart-empty-state">
                  <p>No order data available</p>
                </div>
              )}
            </>
          </div>
        </div>
          </>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <>
            {/* Chart Tabs for Products */}
            <div className="sales-chart-tabs-container">
              <div className="sales-chart-tabs">
                <button
                  className={`sales-chart-tab ${activeProductsChartTab === 'topProducts' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveProductsChartTab('topProducts');
                    setTimeout(() => scrollToChart('topProducts'), 150);
                  }}
                >
                  <span>Top Selling Products</span>
                </button>
                <button
                  className={`sales-chart-tab ${activeProductsChartTab === 'productStocks' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveProductsChartTab('productStocks');
                    setTimeout(() => scrollToChart('productStocks'), 150);
                  }}
                >
                  <span>Products Stocks</span>
                </button>
              </div>
            </div>

            {/* Top Selling Products */}
            {activeProductsChartTab === 'topProducts' && (
              <div 
                ref={el => chartContainerRefs.current.topProducts = el}
                className="analytics-card geo-distribution-card sales-chart-card"
              >
          <div className="card-header">
            <FaTshirt className="card-icon" />
            <h3>Top Selling Products</h3>
                <button
              className="analytics-header-analyze-btn"
                  type="button"
                  onClick={() => handleAnalyzeClick('topProducts', { data: analyticsData.topProducts, filters })}
                >
                  Analyze
                </button>
          </div>
          <div className="chart-container">
            <>
              <ReactEChartsCore
                echarts={echarts}
                option={topProductsOption}
                notMerge
                lazyUpdate
                opts={{ renderer: 'svg' }}
                style={{ height: chartHeights.tall, width: '100%', minHeight: '200px' }}
                onChartReady={onChartReady('topProducts')}
              />
              {!hasTopProductsData && (
                <div className="chart-empty-state">
                  <p>No product data available</p>
                </div>
              )}
            </>
          </div>
        </div>
            )}

            {/* Products Stocks */}
            {activeProductsChartTab === 'productStocks' && (
              <div 
                ref={el => chartContainerRefs.current.productStocks = el}
                className="analytics-card geo-distribution-card sales-chart-card"
              >
                <div className="card-header">
                  <FaBox className="card-icon" />
                  <h3>Products Stocks</h3>
                  <button
                    className="analytics-header-analyze-btn"
                    type="button"
                    onClick={() => handleAnalyzeClick('productStocks', { data: productStocks })}
                  >
                    Analyze
                  </button>
                </div>
                <div className="chart-container">
                  {productStocksLoading ? (
                    <div className="analytics-loading-inline">
                      <div className="loading-spinner"></div>
                      <p>Loading product stocks...</p>
                    </div>
                  ) : (
                    <>
                      <ReactEChartsCore
                        echarts={echarts}
                        option={productStocksOption}
                        notMerge
                        lazyUpdate
                        opts={{ renderer: 'svg' }}
                        style={{ height: chartHeights.productStocks, width: '100%', minHeight: '500px' }}
                        onChartReady={onChartReady('productStocks')}
                      />
                      {!hasProductStocksData && (
                        <div className="chart-empty-state">
                          <p>No product stock data available</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <>
            {/* Chart Tabs for Customers */}
            <div className="sales-chart-tabs-container">
              <div className="sales-chart-tabs">
                <button
                  className={`sales-chart-tab ${activeCustomersChartTab === 'customerInsights' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCustomersChartTab('customerInsights');
                    setTimeout(() => scrollToChart('customerInsights'), 150);
                  }}
                >
                  <span>Customer Insights</span>
                </button>
                <button
                  className={`sales-chart-tab ${activeCustomersChartTab === 'customerLocations' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCustomersChartTab('customerLocations');
                    setTimeout(() => scrollToChart('customerLocations'), 150);
                  }}
                >
                  <span>Customer Locations</span>
                </button>
              </div>
            </div>

            {/* Customer Insights */}
            {activeCustomersChartTab === 'customerInsights' && (
            <div 
              ref={el => chartContainerRefs.current.customerInsights = el}
              className="analytics-card geo-distribution-card sales-chart-card"
            >
          <div className="card-header">
            <FaUsers className="card-icon" />
            <h3>Customer Insights</h3>
            <button
              className="analytics-header-analyze-btn"
              type="button"
              onClick={() => handleAnalyzeClick('topCustomers', { data: topCustomers })}
            >
              Analyze
            </button>
          </div>
          {customerLoading ? (
            <div className="analytics-loading-inline">
              <div className="loading-spinner"></div>
              <p>Loading customer analytics...</p>
              </div>
          ) : (
            <>
              <div className="analytics-summary customer-insights-summary">
                <div className="summary-card">
                  <div className="summary-icon">
                    <FaUsers />
                        </div>
                  <div className="summary-content">
                    <h3>Total Customers</h3>
                    <p className="summary-value">{formatNumber(customerSummary?.totalCustomers || 0)}</p>
                          </div>
                        </div>
                <div className="summary-card">
                  <div className="summary-icon completed">
                    <FaUserPlus />
                      </div>
                  <div className="summary-content">
                    <h3>New Customers (30d)</h3>
                    <p className="summary-value">{formatNumber(customerSummary?.newCustomers || 0)}</p>
                      </div>
                    </div>
                <div className="summary-card">
                  <div className="summary-icon processing">
                    <FaShoppingCart />
                      </div>
                  <div className="summary-content">
                    <h3>Avg Orders / Customer</h3>
                    <p className="summary-value">
                      {Number(customerSummary?.avgOrdersPerCustomer || 0).toFixed(2)}
                    </p>
                    </div>
                      </div>
                <div className="summary-card">
                  <div className="summary-icon">
                    <FaMoneyBillWave />
                  </div>
                  <div className="summary-content">
                    <h3>Avg Spend / Customer</h3>
                    <p className="summary-value">
                      ₱{Math.round(customerSummary?.avgSpentPerCustomer || 0).toLocaleString()}
                    </p>
              </div>
              </div>
          </div>
              <div className="chart-container">
                <ReactEChartsCore
                  echarts={echarts}
                  option={topCustomersOption}
                  notMerge
                  lazyUpdate
                  opts={{ renderer: 'svg' }}
                  style={{ height: chartHeights.base, width: '100%', minHeight: '200px' }}
                  onChartReady={onChartReady('topCustomers')}
                />
                {!hasTopCustomersData && (
                  <div className="chart-empty-state">
                    <p>No customer spend data available</p>
                  </div>
                )}
              </div>
              </>
            )}
          </div>
            )}

            {/* Customer Locations */}
            {activeCustomersChartTab === 'customerLocations' && (
            <div 
              ref={el => chartContainerRefs.current.customerLocations = el}
              className="analytics-card geo-distribution-card sales-chart-card"
            >
          <div className="card-header">
            <FaMap className="card-icon" />
            <h3>Customer Locations</h3>
            <button
              className="analytics-header-analyze-btn"
              type="button"
              onClick={() => handleAnalyzeClick('customerLocations', { data: customerLocationsData, filters })}
              disabled={!hasCustomerLocationData}
            >
              Analyze
            </button>
          </div>
          <Suspense
            fallback={
              <div className="analytics-loading-inline">
                <div className="loading-spinner"></div>
                <p>Loading map...</p>
              </div>
            }
          >
            <div className="analytics-map-container" style={{ minHeight: chartHeights.map }}>
              <BranchMap onDataLoaded={setCustomerLocationsData} />
            </div>
          </Suspense>
        </div>
            )}
          </>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <>
            {/* Sales Forecast */}
            <div 
              ref={el => chartContainerRefs.current.salesForecast = el}
              className="analytics-card geo-distribution-card"
            >
          <div className="card-header">
            <FaChartArea className="card-icon" />
            <h3>Sales Forecast — {SALES_FORECAST_RANGE_LABELS[salesForecastRange]}</h3>
            <div className="card-controls">
              <button
                type="button"
                className={`time-range-btn ${salesForecastRange === 'nextMonth' ? 'active' : ''}`}
                onClick={() => setSalesForecastRange('nextMonth')}
              >
                Next Month
              </button>
              <button
                type="button"
                className={`time-range-btn ${salesForecastRange === 'nextQuarter' ? 'active' : ''}`}
                onClick={() => setSalesForecastRange('nextQuarter')}
              >
                Next Quarter
              </button>
              <button
                type="button"
                className={`time-range-btn ${salesForecastRange === 'nextYear' ? 'active' : ''}`}
                onClick={() => setSalesForecastRange('nextYear')}
              >
                Next Year
              </button>
            </div>
              <button
              className="analytics-header-analyze-btn"
                type="button"
              onClick={() => handleAnalyzeClick('salesForecast', { data: salesForecast, filters, range: salesForecastRange })}
              >
                Analyze
              </button>
          </div>
          {forecastSummary && hasSalesForecastData && (
            <div className="analytics-summary forecast-summary">
              <div className="summary-card">
                <div className="summary-icon completed">
                  <FaMoneyBillWave />
              </div>
                <div className="summary-content">
                  <h3>Projected Revenue</h3>
                  <p className="summary-value">₱{formatNumber(Math.round(forecastSummary.projectedRevenue || 0))}</p>
                  <p className="summary-percentage">
                    {typeof forecastSummary.expectedGrowthRate === 'number'
                      ? `${forecastSummary.expectedGrowthRate >= 0 ? '+' : ''}${forecastSummary.expectedGrowthRate.toFixed(1)}% vs baseline`
                      : 'Baseline unavailable'}
                  </p>
              </div>
          </div>
              <div className="summary-card">
                <div className="summary-icon processing">
                  <FaShoppingCart />
        </div>
                <div className="summary-content">
                  <h3>Projected Orders</h3>
                  <p className="summary-value">{formatNumber(Math.round(forecastSummary.projectedOrders || 0))}</p>
                  <p className="summary-percentage">
                    Avg monthly ₱{formatNumber(Math.round(forecastSummary.averageMonthlyRevenue || 0))}
                  </p>
          </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon">
                  <FaChartLine />
                        </div>
                <div className="summary-content">
                  <h3>Confidence</h3>
                  <p className="summary-value">
                    {forecastSummary.confidence != null ? `${forecastSummary.confidence}%` : '—'}
                  </p>
                  <p className="summary-percentage">
                    Plan spans {forecastSummary.months || 0} {forecastSummary.months === 1 ? 'month' : 'months'}
                  </p>
                          </div>
                        </div>
              </div>
            )}
          <div className="chart-container">
            <ReactEChartsCore
              echarts={echarts}
              option={salesForecastOption}
              notMerge
              lazyUpdate
              opts={{ renderer: 'svg' }}
              style={{ height: chartHeights.wide, width: '100%', minHeight: '200px' }}
              onChartReady={onChartReady('salesForecast')}
            />
            {forecastLoading ? (
              <div className="chart-empty-state">
                <p>Generating forecast...</p>
              </div>
            ) : !hasSalesForecastData ? (
              <div className="chart-empty-state">
                <p>No forecast data available</p>
              </div>
            ) : null}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
        )}
      </div>
      <NexusChatModal
        open={isNexusOpen}
        onClose={handleCloseNexus}
        messages={nexusMessages}
        loading={nexusLoading}
        error={nexusError}
        onSend={handleSendNexusMessage}
        activeChart={nexusContext.chartId}
        chartTitle={CHART_LABELS[nexusContext.chartId] || nexusContext.chartId}
        lastSql={nexusContext.lastSql}
        model={nexusContext.model}
        isGeneralConversation={nexusContext.isGeneralConversation}
      />
      <button
        type="button"
        className="nexus-floating-button"
        onClick={handleOpenFloatingChat}
        aria-label="Open Nexus AI chat"
      >
        <FaRobot />
        <span>Chat with Nexus</span>
      </button>
    </div>
  );
};

export default Analytics;

