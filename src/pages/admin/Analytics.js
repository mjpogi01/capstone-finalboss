import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { FaSearch, FaFilter, FaStore, FaClipboardList, FaTshirt, FaMap, FaChartLine, FaChartArea, FaUsers, FaUserPlus, FaShoppingCart, FaMoneyBillWave, FaRobot, FaBox } from 'react-icons/fa';
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
  restOfYear: 'Rest of Year',
  nextYear: 'Next 12 Months'
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
  const { user } = useAuth();
  const isOwner = user?.user_metadata?.role === 'owner';
  
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
  const [salesForecastRange, setSalesForecastRange] = useState('restOfYear');
  const [customerLocationsData, setCustomerLocationsData] = useState({
    points: [],
    cityStats: [],
    summary: null
  });
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [salesTrendsLoading, setSalesTrendsLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    timeRange: 'all',
    branch: 'all',
    orderStatus: 'all',
    yearStart: '',
    yearEnd: ''
  });
  const [branches, setBranches] = useState([]);
  const [totalSalesLoading, setTotalSalesLoading] = useState(true);
  const filterRef = useRef(null);
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
      map: `${pickHeight({ xl: 500, lg: 460, md: 420, sm: 360, xs: 300 })}px`
    };
  }, [viewportWidth]);


  useEffect(() => {
    fetchAnalyticsData();

    const runDeferredFetches = () => {
      fetchSalesTrends();
      fetchCustomerAnalytics();
      fetchProductStocks();
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
  }, []);

  useEffect(() => {
    if (rawData) {
      applyFilters();
    }
  }, [filters, rawData]);

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
  }, [isOwner, user]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

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
        
        console.log('Analytics API Response:', result);
        
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
      isGeneralConversation: useGeneralConversation
    }));

    const chartRange = nexusContext.range || salesForecastRange;
    const chartData = nexusContext.chartData || (resolvedChartId === 'salesForecast' ? salesForecast : null);

    fetchNexusResponse(
      resolvedChartId || null,
      nextConversation,
      nexusContext.filters,
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
    try {
      setSalesTrendsLoading(true);
      const response = await authFetch(`${API_URL}/api/analytics/sales-trends?period=30`);
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
    try {
      setCustomerLoading(true);
      const response = await authFetch(`${API_URL}/api/analytics/customer-analytics`);
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
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      setCustomerSummary(null);
      setTopCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  const fetchProductStocks = async () => {
    try {
      setProductStocksLoading(true);
      const response = await authFetch(`${API_URL}/api/products`);
      const products = await response.json();
      
      if (Array.isArray(products)) {
        // Filter products with stock_quantity and group by product name
        const onHandCategories = ['balls', 'trophies', 'medals'];
        const stockData = products
          .filter(product => {
            const hasStockQuantity = product.stock_quantity !== null && product.stock_quantity !== undefined;
            const category = product.category?.toLowerCase();
            return hasStockQuantity && onHandCategories.includes(category);
          })
          .reduce((acc, product) => {
            const key = product.name?.toLowerCase() || 'unknown';
            if (!acc[key]) {
              acc[key] = {
                name: product.name,
                category: product.category,
                totalStock: 0,
                branches: []
              };
            }
            acc[key].totalStock += product.stock_quantity || 0;
            if (product.branch_name) {
              acc[key].branches.push({
                branch: product.branch_name,
                stock: product.stock_quantity || 0
              });
            }
            return acc;
          }, {});
        
        const stockArray = Object.values(stockData)
          .sort((a, b) => b.totalStock - a.totalStock)
          .slice(0, 20); // Top 20 products by stock
        
        setProductStocks(stockArray);
      } else {
        setProductStocks([]);
      }
    } catch (error) {
      console.error('Error fetching product stocks:', error);
      setProductStocks([]);
    } finally {
      setProductStocksLoading(false);
    }
  };

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
    setFilters({
      timeRange: 'all',
      branch: 'all',
      orderStatus: 'all',
      yearStart: '',
      yearEnd: ''
    });
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

    const appliedFilters = context.filters || filters;
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
    return filters.timeRange !== 'all' || 
           filters.branch !== 'all' || 
           filters.orderStatus !== 'all' ||
           filters.yearStart !== '' ||
           filters.yearEnd !== '';
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

    const now = new Date();
    if (baseGranularity === 'monthly') {
      switch (filters.timeRange) {
        case 'today': {
          const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          selectedSales = selectedSales.filter(item => item.date && new Date(item.date) >= startDate);
          break;
        }
        case 'week': {
          const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          selectedSales = selectedSales.filter(item => item.date && new Date(item.date) >= startDate);
          break;
        }
        case 'month': {
          selectedSales = selectedSales.slice(-12);
          break;
        }
        case 'quarter': {
          const quarter = Math.floor(now.getMonth() / 3);
          const startDate = new Date(now.getFullYear(), quarter * 3, 1);
          selectedSales = selectedSales.filter(item => item.date && new Date(item.date) >= startDate);
          break;
        }
        case 'all':
        default:
          // Keep full series
          break;
      }
    }

    if (filters.yearStart || filters.yearEnd) {
      const startYear = filters.yearStart ? parseInt(filters.yearStart, 10) : 2000;
      const endYear = filters.yearEnd ? parseInt(filters.yearEnd, 10) : 2100;
      selectedSales = selectedSales.filter(item => {
        const itemYear = item.year ?? (item.date ? new Date(item.date).getFullYear() : undefined);
        if (itemYear === undefined) {
          return true;
        }
        return itemYear >= startYear && itemYear <= endYear;
      });
    }

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

    if (filters.orderStatus !== 'all' && orderStatus) {
      const selectedStatus = filters.orderStatus;
      const statusData = orderStatus[selectedStatus];
      if (statusData) {
        orderStatus = {
          [selectedStatus]: { ...statusData },
          total: statusData.count
        };
      }
    }

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
        axisPointer: { type: 'line' },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        textStyle: { color: '#f9fafb' },
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
          lineStyle: { width: 3, color: '#8b5cf6' },
          areaStyle: { color: 'rgba(139, 92, 246, 0.15)' },
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
    const colors = ['#8b5cf6', '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#f97316', '#84cc16'];

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
              color: item.color || colors[index % colors.length],
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
            return {
              name: label,
              value: entry.count || 0,
              percentage
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
        textStyle: { color: '#f9fafb' },
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
        axisPointer: { type: 'cross' },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        textStyle: { color: '#f9fafb' },
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
          lineStyle: { width: 3, color: '#6366f1' },
          areaStyle: { color: 'rgba(99, 102, 241, 0.15)' },
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
          lineStyle: { width: 2, color: '#f97316', type: 'dashed' },
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
      { offset: 0, color: '#c084fc' },
      { offset: 0.45, color: '#a855f7' },
      { offset: 1, color: '#6366f1' }
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
          color: '#4338ca',
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
            color: 'rgba(99, 102, 241, 0.08)',
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
                  { offset: 0, color: '#a855f7' },
                  { offset: 1, color: '#4c1d95' }
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
    const stocks = Array.isArray(productStocks) ? productStocks.slice(0, 15) : [];
    const values = stocks.map(item => Number(item.totalStock || 0));
    const hasData = stocks.length > 0 && values.some(value => value > 0);
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
            if (isNaN(dataIndex) || dataIndex < 0 || dataIndex >= stocks.length) return '';
            const stock = stocks[dataIndex];
            if (!stock) return '';
            const axisLabel = bar.axisValueLabel || bar.axisValue || '';
            const lines = [
              `${axisLabel}`,
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
        data: stocks.map(item => {
          const name = item.name || 'Unknown';
          return name.length > 30 ? name.substring(0, 30) + '...' : name;
        }),
        inverse: true,
        axisLabel: {
          color: '#059669',
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
            color: 'rgba(16, 185, 129, 0.08)',
            borderRadius: [0, 12, 12, 0]
          },
          data: values.map((value) => ({
            value,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, gradientStops),
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowColor: 'rgba(16, 185, 129, 0.35)'
            },
            emphasis: {
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#34d399' },
                  { offset: 1, color: '#047857' }
                ])
              }
            }
          })),
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
            const axisLabel = firstParam.axisValueLabel || firstParam.axisValue || '';
          const lines = params
              .filter(point => point && point.seriesName && point.value !== null && point.value !== undefined)
            .map(point => {
                let line = `${point.marker || ''}${point.seriesName}: ₱${formatNumber(point.value || 0)}`;
              if (point.seriesName === 'Forecast') {
                  const label = point.axisValueLabel || point.axisValue || '';
                  const confidence = confidenceMap.get(String(label));
                if (confidence !== undefined) {
                  line += `<br/>Confidence: ${confidence}%`;
                }
              }
              return line;
            });
            return [axisLabel, ...lines].join('<br/>');
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
      grid: { left: '4%', right: '4%', bottom: '8%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: '#6b7280', interval: 0, rotate: categories.length > 8 ? 30 : 0 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisTick: { alignWithLabel: true }
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
          lineStyle: { width: 3, color: '#3b82f6' },
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
              <span className="filter-count">{
                [
                  filters.timeRange !== 'all',
                  filters.branch !== 'all',
                  filters.orderStatus !== 'all',
                  filters.yearStart !== '' || filters.yearEnd !== ''
                ].filter(Boolean).length
              } filter{[
                filters.timeRange !== 'all',
                filters.branch !== 'all',
                filters.orderStatus !== 'all',
                filters.yearStart !== '' || filters.yearEnd !== ''
              ].filter(Boolean).length !== 1 ? 's' : ''} active</span>
            </div>
          )}
        </div>
        <div className="header-right">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-wrapper" ref={filterRef}>
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''} ${hasActiveFilters() ? 'has-filters' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter className="btn-icon" />
            </button>
            {showFilters && (
              <div className="analytics-filter-dropdown">
                <div className="filter-group">
                  <label>Time Range</label>
                  <select 
                    value={filters.timeRange}
                    onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Branch</label>
                  <select 
                    value={filters.branch}
                    onChange={(e) => handleFilterChange('branch', e.target.value)}
                  >
                    <option value="all">All Branches</option>
                    {branches.length > 0 ? (
                      branches.map(branch => (
                        <option key={branch.id} value={branch.name}>
                          {branch.name}
                        </option>
                      ))
                    ) : (
                      <>
                        {/* Fallback options if branches haven't loaded yet */}
                        <option value="main">Main Branch</option>
                        <option value="sm_city">SM City</option>
                        <option value="ayala">Ayala Mall</option>
                        <option value="robinson">Robinson's</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Order Status</label>
                  <select 
                    value={filters.orderStatus}
                    onChange={(e) => handleFilterChange('orderStatus', e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Custom Year Range</label>
                  <div className="year-range-inputs">
                    <input
                      type="number"
                      placeholder="Start Year"
                      value={filters.yearStart}
                      onChange={(e) => handleFilterChange('yearStart', e.target.value)}
                      min="2000"
                      max="2100"
                      className="year-input"
                    />
                    <span className="year-separator">to</span>
                    <input
                      type="number"
                      placeholder="End Year"
                      value={filters.yearEnd}
                      onChange={(e) => handleFilterChange('yearEnd', e.target.value)}
                      min="2000"
                      max="2100"
                      className="year-input"
                    />
                  </div>
                </div>
                {hasActiveFilters() && (
                  <button className="clear-filters-btn" onClick={clearFilters}>
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
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
                  onClick={() => setActiveSalesChartTab('totalSales')}
                >
                  <span>Total Sales Over Time</span>
                </button>
                <button
                  className={`sales-chart-tab ${activeSalesChartTab === 'dailySales' ? 'active' : ''}`}
                  onClick={() => setActiveSalesChartTab('dailySales')}
                >
                  <span>Daily Sales & Orders</span>
                </button>
                <button
                  className={`sales-chart-tab ${activeSalesChartTab === 'salesByBranch' ? 'active' : ''}`}
                  onClick={() => setActiveSalesChartTab('salesByBranch')}
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
            <div className="analytics-card geo-distribution-card sales-chart-card">
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
        <div className="analytics-card geo-distribution-card sales-chart-card">
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
        <div className="analytics-card geo-distribution-card sales-chart-card">
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
            <div className="analytics-card geo-distribution-card">
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
                  onClick={() => setActiveProductsChartTab('topProducts')}
                >
                  <span>Top Selling Products</span>
                </button>
                <button
                  className={`sales-chart-tab ${activeProductsChartTab === 'productStocks' ? 'active' : ''}`}
                  onClick={() => setActiveProductsChartTab('productStocks')}
                >
                  <span>Products Stocks</span>
                </button>
              </div>
            </div>

            {/* Top Selling Products */}
            {activeProductsChartTab === 'topProducts' && (
              <div className="analytics-card geo-distribution-card sales-chart-card">
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
              <div className="analytics-card geo-distribution-card sales-chart-card">
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
                        style={{ height: chartHeights.tall, width: '100%', minHeight: '200px' }}
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
                  onClick={() => setActiveCustomersChartTab('customerInsights')}
                >
                  <span>Customer Insights</span>
                </button>
                <button
                  className={`sales-chart-tab ${activeCustomersChartTab === 'customerLocations' ? 'active' : ''}`}
                  onClick={() => setActiveCustomersChartTab('customerLocations')}
                >
                  <span>Customer Locations</span>
                </button>
              </div>
            </div>

            {/* Customer Insights */}
            {activeCustomersChartTab === 'customerInsights' && (
            <div className="analytics-card geo-distribution-card sales-chart-card">
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
            <div className="analytics-card geo-distribution-card sales-chart-card">
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
            <div className="analytics-card geo-distribution-card">
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
                className={`time-range-btn ${salesForecastRange === 'restOfYear' ? 'active' : ''}`}
                onClick={() => setSalesForecastRange('restOfYear')}
              >
                Rest of Year
              </button>
              <button
                type="button"
                className={`time-range-btn ${salesForecastRange === 'nextYear' ? 'active' : ''}`}
                onClick={() => setSalesForecastRange('nextYear')}
              >
                Next 12 Months
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

