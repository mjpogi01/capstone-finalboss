import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { useNavigate } from 'react-router-dom';
import './Dashboard1.css';
import './Analytics.css';
import orderService from '../../services/orderService';
import productService from '../../services/productService';
import EarningsChart from '../../components/admin/EarningsChart';
import AddProductModal from '../../components/admin/AddProductModal';
import { API_URL } from '../../config/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers,
  faShoppingCart,
  faChartLine,
  faSearch,
  faFilter,
  faPlus,
  faBox,
  faUser,
  faFileAlt,
  faCog,
  faChevronUp,
  faChevronDown,
  faEdit,
  faBoxOpen,
  faTrash,
  faTimes,
  faBuilding,
  faStore,
  faUserShield,
  faEye,
  faEyeSlash,
  faComments,
  faClipboardList,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { authFetch } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import branchService from '../../services/branchService';

echarts.use([
  GridComponent,
  TooltipComponent,
  TitleComponent,
  BarChart,
  SVGRenderer
]);

  const Dashboard1 = () => {
  const { user, hasAdminAccess } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.user_metadata?.role === 'owner';
  const isAdmin = user?.user_metadata?.role === 'admin';
  const adminBranchId = isAdmin ? user?.user_metadata?.branch_id : null;
  const canAccessEmailMarketing = hasAdminAccess();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showStockSearch, setShowStockSearch] = useState(false);
  const [stockFilters, setStockFilters] = useState({
    category: '',
    status: ''
  });
  const [showStockFilters, setShowStockFilters] = useState(false);
  const [showAllStockItems, setShowAllStockItems] = useState(false);
  const [stockItemsLoading, setStockItemsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [restockingItem, setRestockingItem] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newStockItem, setNewStockItem] = useState({
    name: '',
    category: '',
    stockQuantity: '',
    reorderLevel: ''
  });
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Branch filter for owners
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  
  // Chart tabs
  const [activeChartTab, setActiveChartTab] = useState('sales');
  
  // Refs to store chart instances for resizing
  const chartRefs = useRef({});

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Global values visibility - controls all values in dashboard
  // Load from localStorage on mount, default to false (hidden)
  const [isAllValuesVisible, setIsAllValuesVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_values_visible');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (error) {
      console.error('Error loading values visibility preference:', error);
      return false;
    }
  });

  // Save to localStorage whenever visibility state changes
  useEffect(() => {
    try {
      localStorage.setItem('dashboard_values_visible', JSON.stringify(isAllValuesVisible));
    } catch (error) {
      console.error('Error saving values visibility preference:', error);
    }
  }, [isAllValuesVisible]);

  // Listen for storage changes to sync across tabs/pages
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'dashboard_values_visible') {
        try {
          const newValue = e.newValue !== null ? JSON.parse(e.newValue) : false;
          setIsAllValuesVisible(newValue);
        } catch (error) {
          console.error('Error parsing storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
  }, [activeChartTab]);

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

  // Dashboard stats with real data from API
  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    totalCustomers: 0,
    totalOrders: 0,
    salesTrend: '+0%',
    customersTrend: '+0%',
    ordersTrend: '+0%'
  });
  const [loadingStats, setLoadingStats] = useState(true);


  const [stockItems, setStockItems] = useState([]);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersSearchTerm, setOrdersSearchTerm] = useState('');
  const [showOrdersSearch, setShowOrdersSearch] = useState(false);
  const [ordersFilterStatus, setOrdersFilterStatus] = useState('all');
  const [showOrdersFilterDropdown, setShowOrdersFilterDropdown] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const INITIAL_DISPLAY_COUNT = 5;

  const getStockStatusColor = (status) => {
    const colors = {
      'In Stock': '#10b981',
      'Low Stock': '#f59e0b',
      'Out of Stock': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getProgressPercentage = (quantity, reorderLevel) => {
    if (quantity === 0) return 0;
    const max = reorderLevel * 5;
    return Math.min((quantity / max) * 100, 100);
  };


  const formatCategory = (category) => {
    if (!category) return '';
    // Format category names for display: "t-shirts" -> "T-Shirts", "long sleeves" -> "Long Sleeves"
    return category
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item });
  };

  const handleRestock = (item) => {
    setRestockingItem(item);
    setRestockQuantity('');
  };

  const handleRestockSubmit = async () => {
    if (!restockQuantity || parseInt(restockQuantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      // Get current product to ensure we're updating the right branch's product
      const currentProduct = stockItems.find(item => item.id === restockingItem.id);
      if (!currentProduct) {
        alert('Product not found');
        return;
      }

      // Calculate new stock quantity
      const quantityToAdd = parseInt(restockQuantity);
      const newQuantity = currentProduct.stockQuantity + quantityToAdd;
      
      // Update product stock in database via API
      const response = await authFetch(`${API_URL}/api/products/${restockingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_quantity: newQuantity,
          // Keep existing branch_id - don't change it when restocking
          branch_id: currentProduct.branchId || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update stock');
      }

      // Update local state after successful API call
      setStockItems(prev => prev.map(item => {
        if (item.id === restockingItem.id) {
          let newStatus = 'In Stock';
          if (newQuantity === 0) {
            newStatus = 'Out of Stock';
          } else if (newQuantity <= item.reorderLevel) {
            newStatus = 'Low Stock';
          }
          
          return {
            ...item,
            stockQuantity: newQuantity,
            status: newStatus,
            lastRestocked: new Date().toISOString().split('T')[0]
          };
        }
        return item;
      }));

      setRestockingItem(null);
      setRestockQuantity('');
      
      // Refresh stock items to ensure data is up to date
      // Trigger useEffect to refetch by toggling a dependency (or just rely on the useEffect dependencies)
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(`Failed to update stock: ${error.message}`);
    }
  };

  const handleDelete = (item) => {
    setDeleteConfirmItem(item);
  };

  const confirmDelete = () => {
    if (deleteConfirmItem) {
      setStockItems(prev => prev.filter(item => item.id !== deleteConfirmItem.id));
      setDeleteConfirmItem(null);
    }
  };

  const handleUpdateItem = async (updatedItem) => {
    try {
      // Get current product to ensure we keep the correct branch_id
      const currentProduct = stockItems.find(item => item.id === updatedItem.id);
      if (!currentProduct) {
        alert('Product not found');
        return;
      }

      // Determine status based on stock quantity
      let status = 'In Stock';
      if (updatedItem.stockQuantity === 0) {
        status = 'Out of Stock';
      } else if (updatedItem.stockQuantity <= updatedItem.reorderLevel) {
        status = 'Low Stock';
      }

      // Update product in database via API
      // Keep existing branch_id - don't allow changing branch when updating stock
      const response = await authFetch(`${API_URL}/api/products/${updatedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedItem.name,
          category: updatedItem.category,
          stock_quantity: updatedItem.stockQuantity,
          reorder_level: updatedItem.reorderLevel,
          // Keep existing branch_id - don't allow changing branch when updating stock
          branch_id: currentProduct.branchId || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }

      // Update local state after successful API call
      setStockItems(prev => prev.map(item => {
        if (item.id === updatedItem.id) {
          return { ...updatedItem, status };
        }
        return item;
      }));
      setEditingItem(null);
      
      // Stock items will refresh automatically via useEffect dependencies
    } catch (error) {
      console.error('Error updating product:', error);
      alert(`Failed to update product: ${error.message}`);
    }
  };

  const handleAddStock = () => {
    setShowAddStockModal(true);
    setNewStockItem({
      name: '',
      category: '',
      stockQuantity: '',
      reorderLevel: ''
    });
  };

  const handleQuickAddProduct = () => {
    setShowAddProductModal(true);
  };

  const handleWalkIn = () => {
    const walkInPath = isOwner ? '/owner/walk-in-orders' : '/admin/walk-in-orders';
    navigate(walkInPath);
  };

  const handleManageAccounts = () => {
    const accountsPath = isOwner ? '/owner/accounts' : '/admin/accounts';
    navigate(accountsPath);
  };

  const handleReadChats = () => {
    const chatsPath = isOwner ? '/owner/support' : '/admin/support';
    navigate(chatsPath);
  };

  const handleViewOrders = () => {
    const ordersPath = isOwner ? '/owner/orders' : '/admin/orders';
    navigate(ordersPath);
  };

  const handleEmailMarketing = () => {
    const emailMarketingPath = isOwner ? '/owner/email-marketing' : '/admin/email-marketing';
    navigate(emailMarketingPath);
  };

  const handleAddProduct = (newProduct) => {
    // Product added successfully, modal will close automatically
    console.log('Product added:', newProduct);
    setShowAddProductModal(false);
  };

  const handleCloseProductModal = () => {
    setShowAddProductModal(false);
  };

  const handleAddStockSubmit = async () => {
    // Validation
    if (!newStockItem.name || !newStockItem.category) {
      alert('Please fill in all required fields (Name, Category)');
      return;
    }

    const stockQuantity = parseInt(newStockItem.stockQuantity) || 0;
    const reorderLevel = parseInt(newStockItem.reorderLevel) || 0;

    if (stockQuantity < 0 || reorderLevel < 0) {
      alert('Stock quantity and reorder level must be non-negative numbers');
      return;
    }

    // Determine branch_id based on user role
    // For admins: use their branch_id from user metadata
    // For owners: use selectedBranchId if not 'all', otherwise require branch selection
    let targetBranchId = null;
    if (isAdmin && adminBranchId) {
      targetBranchId = adminBranchId;
    } else if (isOwner && selectedBranchId && selectedBranchId !== 'all') {
      targetBranchId = parseInt(selectedBranchId);
    } else if (isOwner && selectedBranchId === 'all') {
      alert('Please select a specific branch to add stock');
      return;
    }

    if (!targetBranchId) {
      alert('Unable to determine branch. Please ensure you have a branch assigned.');
      return;
    }

    try {
      // Create new product in database via API
      const productData = {
        name: newStockItem.name,
        category: newStockItem.category,
        price: 0, // Default price, can be updated later
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel,
        branch_id: targetBranchId,
        description: `On-hand product for branch ${targetBranchId}`
      };

      const response = await authFetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      const newProduct = await response.json();
      
      // Refresh stock items to include the new product
      // The useEffect will automatically refetch when dependencies change
      
      // Close modal and reset form
      setShowAddStockModal(false);
      setNewStockItem({
        name: '',
        category: '',
        stockQuantity: '',
        reorderLevel: ''
      });

      // Trigger refetch of stock items
      // Force a refetch by temporarily toggling selectedBranchId (for owners) or relying on useEffect
      // The useEffect will automatically refetch when dependencies change
      // Since we're creating a product for a specific branch, the useEffect should pick it up
      
      // For immediate UI update, we can manually refetch
      // But the useEffect with dependencies should handle it automatically
    } catch (error) {
      console.error('Error creating product:', error);
      alert(`Failed to add stock item: ${error.message}`);
    }
  };

  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !stockFilters.category || item.category === stockFilters.category;
    const matchesStatus = !stockFilters.status || item.status === stockFilters.status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const INITIAL_STOCK_DISPLAY = 5;
  const displayedStockItems = showAllStockItems 
    ? filteredStockItems 
    : filteredStockItems.slice(0, INITIAL_STOCK_DISPLAY);
  const hasMoreStockItems = filteredStockItems.length > INITIAL_STOCK_DISPLAY && !showAllStockItems;

  // Filter low stock items to only show on-hand products (balls, trophies, medals)
  // These are the only products that can be prepared and bought on-branch
  const lowStockItems = useMemo(() => {
    const onHandCategories = ['balls', 'trophies', 'medals'];
    
    return stockItems
      .filter(item => {
        // Only include products that:
        // 1. Have a stock_quantity field (on-hand items)
        // 2. Belong to on-hand categories (balls, trophies, medals)
        const hasStockQuantity = item.stockQuantity !== null && item.stockQuantity !== undefined;
        const category = item.category?.toLowerCase();
        const isOnHandCategory = onHandCategories.includes(category);
        
        return hasStockQuantity && isOnHandCategory;
      })
      .filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock')
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 10);
  }, [stockItems]);

  // Prepare ECharts data for low stock items
  const lowStockChartOption = useMemo(() => {
    if (!lowStockItems || lowStockItems.length === 0) {
      return null;
    }
    
    // Use isAllValuesVisible state
    const showValues = isAllValuesVisible;

    // Limit to top 10 items for chart
    const chartItems = lowStockItems.slice(0, 10);
    
    // Ensure all arrays have the same length
    if (chartItems.length === 0) {
      return null;
    }
    
    const itemNames = chartItems.map(item => {
      const name = item?.name || 'Unknown';
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    });
    const stockQuantities = chartItems.map(item => Number(item?.stockQuantity) || 0);
    const colors = chartItems.map(item => getStockStatusColor(item?.status || 'In Stock'));
    
    // Validate arrays have same length
    if (itemNames.length !== stockQuantities.length) {
      console.warn('Chart data arrays length mismatch');
      return null;
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          if (!showValues) {
            return '';
          }
          
          if (!params || !Array.isArray(params) || params.length === 0) {
            return '';
          }
          
          try {
            // Get the first param which contains the axis data
            const param = params[0];
            if (!param || param.dataIndex === undefined || param.dataIndex === null) {
              return '';
            }
            
            const dataIndex = Number(param.dataIndex);
            
            if (isNaN(dataIndex) || dataIndex < 0 || dataIndex >= chartItems.length) {
              return '';
            }
            
            const item = chartItems[dataIndex];
            if (!item) {
              return '';
            }
            
            // Get stock value - handle both object and primitive values
            let stockValue = item.stockQuantity;
            
            const stockParam = params.find(p => p.seriesName === 'Stock Quantity');
            
            if (stockParam) {
              stockValue = typeof stockParam.value === 'object' && stockParam.value !== null 
                ? stockParam.value.value 
                : stockParam.value;
            }
            
            return `
              <div style="padding: 8px;">
                <div style="font-weight: 600; margin-bottom: 4px;">${item.name || 'Unknown Item'}</div>
                <div>Stock: <strong>${stockValue || 0}</strong> units</div>
                <div>Status: <strong style="color: ${getStockStatusColor(item.status || 'In Stock')}">${item.status || 'Unknown'}</strong></div>
              </div>
            `;
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#1e293b',
          fontSize: 12
        },
        padding: [10, 12]
      },
      grid: {
        left: '10%',
        right: '5%',
        bottom: '20%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: itemNames,
        axisLine: {
          lineStyle: {
            color: '#cbd5e1'
          }
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 9,
          interval: 0,
          rotate: itemNames.length > 6 ? 45 : 0,
          formatter: function(value) {
            if (value.length > 15) {
              return value.substring(0, 15) + '...';
            }
            return value;
          }
        },
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#cbd5e1'
          }
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: showValues ? (value) => {
            if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}k`;
            }
            return `${value}`;
          } : () => '•••'
        },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: 'Stock Quantity',
          type: 'bar',
          data: stockQuantities,
          itemStyle: {
            color: (params) => {
              return colors[params.dataIndex] || '#3b82f6';
            }
          },
          barWidth: '50%',
          label: {
            show: showValues,
            position: 'top',
            formatter: '{c}',
            color: '#1e293b',
            fontSize: 9,
            fontWeight: 500,
            distance: 5
          },
          emphasis: {
            focus: 'series'
          }
        }
      ]
    };
  }, [lowStockItems, isAllValuesVisible]);

  const categories = [...new Set(stockItems.map(item => item.category))];
  const statuses = ['In Stock', 'Low Stock', 'Out of Stock'];
  const suppliers = [...new Set(stockItems.map(item => item.supplier))];
  
  // Available categories for dropdown
  const availableCategories = [
    { value: 'jerseys', label: 'Jerseys' },
    { value: 't-shirts', label: 'T-Shirts' },
    { value: 'long sleeves', label: 'Long Sleeves' },
    { value: 'hoodies', label: 'Hoodies' },
    { value: 'uniforms', label: 'Uniforms' },
    { value: 'balls', label: 'Balls' },
    { value: 'trophies', label: 'Trophies' }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dashboard1-header-actions')) {
        setShowOrdersFilterDropdown(false);
      }
      if (!event.target.closest('.dashboard1-stock-controls')) {
        setShowStockFilters(false);
      }
      if (!event.target.closest('.dashboard1-branch-filter')) {
        setShowBranchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch branches for owners
  useEffect(() => {
    const loadBranches = async () => {
      if (isOwner) {
        try {
          const data = await branchService.getBranches();
          setBranches(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Failed to load branches:', err);
          setBranches([]);
        }
      }
    };
    loadBranches();
  }, [isOwner]);

  // Fetch stock items from products database
  // Only include on-hand products (balls, trophies, medals) that have stock_quantity
  // Filter by branch: admins see only their branch, owners see selected branch or all
  useEffect(() => {
    const fetchStockItems = async () => {
      try {
        setStockItemsLoading(true);
        
        // Determine which products to fetch based on user role and branch selection
        let products = [];
        if (isAdmin && adminBranchId) {
          // Admin: only fetch products from their branch
          products = await productService.getProductsByBranch(adminBranchId);
        } else if (isOwner && selectedBranchId && selectedBranchId !== 'all') {
          // Owner: fetch products from selected branch
          products = await productService.getProductsByBranch(parseInt(selectedBranchId));
        } else {
          // Owner with 'all' selected or no branch filter: fetch all products
          products = await productService.getAllProducts();
        }
        
        // Define on-hand categories (products that can be prepared and bought on-branch)
        const onHandCategories = ['balls', 'trophies', 'medals'];
        
        // Transform products to stock items format
        // Only include products with stock_quantity (on-hand items) in on-hand categories
        const transformedStockItems = products
          .filter(product => {
            // Only include products that:
            // 1. Have a stock_quantity field (on-hand items)
            // 2. Belong to on-hand categories (balls, trophies, medals)
            const hasStockQuantity = product.stock_quantity !== null && product.stock_quantity !== undefined;
            const category = product.category?.toLowerCase();
            const isOnHandCategory = onHandCategories.includes(category);
            
            return hasStockQuantity && isOnHandCategory;
          })
          .map(product => {
            const stockQuantity = product.stock_quantity || 0;
            const reorderLevel = product.reorder_level || 10;
            
            // Determine status based on stock quantity and reorder level
            let status = 'In Stock';
            if (stockQuantity === 0) {
              status = 'Out of Stock';
            } else if (stockQuantity <= reorderLevel) {
              status = 'Low Stock';
            }
            
            return {
              id: product.id,
              name: product.name,
              image: product.main_image || product.additional_images?.[0] || "https://via.placeholder.com/50",
              category: product.category?.toLowerCase() || '',
              stockQuantity: stockQuantity,
              reorderLevel: reorderLevel,
              supplier: product.supplier || 'N/A',
              lastRestocked: product.last_restocked || new Date().toISOString().split('T')[0],
              status: status,
              branchId: product.branch_id || null
            };
          });
        
        setStockItems(transformedStockItems);
      } catch (error) {
        console.error('Error fetching stock items:', error);
        setStockItems([]);
      } finally {
        setStockItemsLoading(false);
      }
    };
    
    fetchStockItems();
  }, [isAdmin, isOwner, adminBranchId, selectedBranchId]);


  const fetchMetricsData = useCallback(async () => {
    try {
      setLoadingStats(true);
      
      // Build query parameters
      // For owners: use selectedBranchId if not 'all'
      // For admins: DON'T pass branch_id - the backend automatically filters by their branch_id from user metadata
      let url = `${API_URL}/api/analytics/dashboard`;
      if (isOwner && selectedBranchId && selectedBranchId !== 'all') {
        url += `?branch_id=${encodeURIComponent(selectedBranchId)}`;
      }
      // Admins: backend automatically filters by req.user.branch_id via resolveBranchContext
      
      console.log('📊 Fetching dashboard metrics:', {
        isOwner,
        isAdmin,
        selectedBranchId,
        adminBranchId,
        url
      });
      
      // Fetch analytics data from API
      const response = await authFetch(url);
      const result = await response.json();
      
      console.log('📊 Dashboard metrics response:', result);
      
      if (result.success && result.data) {
        const data = result.data;
        
        // Calculate metrics from real data
        const totalRevenue = data.summary?.totalRevenue || 0;
        const totalOrders = data.summary?.totalOrders || 0;
        const totalCustomers = data.summary?.totalCustomers || 0;
        
        // Calculate percentage changes (mock calculation for now)
        const revenueChange = totalRevenue > 0 ? '+12%' : '+0%';
        const ordersChange = totalOrders > 0 ? '+8%' : '+0%';
        const customersChange = totalCustomers > 0 ? '+15%' : '+0%';
        
        setDashboardStats({
          totalSales: totalRevenue,
          totalCustomers: totalCustomers,
          totalOrders: totalOrders,
          salesTrend: revenueChange,
          customersTrend: customersChange,
          ordersTrend: ordersChange
        });
      }
    } catch (error) {
      console.error('Error fetching metrics data:', error);
      // Keep default values on error
    } finally {
      setLoadingStats(false);
    }
  }, [isOwner, isAdmin, selectedBranchId, adminBranchId]);

  useEffect(() => {
    fetchMetricsData();
  }, [fetchMetricsData]);

  const fetchRecentOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setOrdersLoading(true);
      }
      
      // Build filters for orders
      const filters = {
        limit: 100,
        dateSort: 'desc'
      };
      
      // For owners: if a specific branch is selected, filter by branch name
      if (isOwner && selectedBranchId && selectedBranchId !== 'all') {
        const selectedBranch = branches.find(b => b.id === parseInt(selectedBranchId));
        if (selectedBranch && selectedBranch.name) {
          filters.pickupBranch = selectedBranch.name;
        }
      }
      // For admins: backend automatically filters by their branch_id from user metadata
      
      const response = await orderService.getAllOrders(filters);
      
      if (response && response.orders && Array.isArray(response.orders)) {
        const formattedOrders = response.orders.map(order => {
          const formattedOrder = order.orderItems ? order : orderService.formatOrderForDisplay(order);
          
          return {
            id: formattedOrder.id,
            email: formattedOrder.customer_email || formattedOrder.customerEmail || order.customer_email || order.email || 'N/A',
            product: getProductName(formattedOrder),
            date: formatOrderDate(formattedOrder.orderDate || formattedOrder.created_at || order.created_at),
            status: formattedOrder.status || order.status || 'pending',
            statusColor: getStatusColor(formattedOrder.status || order.status)
          };
        });
        setOrders(formattedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setOrders([]);
      } finally {
        if (showLoading) {
          setOrdersLoading(false);
        }
      }
    }, [isOwner, selectedBranchId, branches]);

  useEffect(() => {
    fetchRecentOrders(true);
    
    // Refresh orders every 30 seconds to keep data up to date (silently, without loading spinner)
    const refreshInterval = setInterval(() => {
      fetchRecentOrders(false);
    }, 30000);
    
    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, [fetchRecentOrders]); // Refetch when branch selection changes

  const getProductName = (order) => {
    const orderItems = order.order_items || order.orderItems || order.items || [];
    
    if (orderItems && orderItems.length > 0) {
      const productNames = orderItems
        .map(item => {
          const productName = item.name || 
                            item.product_name || 
                            item.productName || 
                            item.product?.name ||
                            null;
          const quantity = parseInt(item.quantity) || 1;
          const size = item.size || item.product_size;
          
          return {
            name: productName,
            quantity: quantity,
            size: size
          };
        })
        .filter(item => item.name && item.name.trim() !== '');
      
      if (productNames.length > 0) {
        const productGroups = {};
        productNames.forEach(item => {
          const key = item.name;
          if (!productGroups[key]) {
            productGroups[key] = {
              name: key,
              totalQuantity: 0,
              sizes: []
            };
          }
          productGroups[key].totalQuantity += item.quantity;
          if (item.size && !productGroups[key].sizes.includes(item.size)) {
            productGroups[key].sizes.push(item.size);
          }
        });
        
        const products = Object.values(productGroups);
        
        if (products.length === 1) {
          const product = products[0];
          const quantityText = product.totalQuantity > 1 ? ` (${product.totalQuantity}x)` : '';
          const sizeText = product.sizes.length > 0 ? ` - Size: ${product.sizes.join(', ')}` : '';
          return `${product.name}${quantityText}${sizeText}`;
        } else if (products.length === 2) {
          return products.map(p => `${p.name} (${p.totalQuantity}x)`).join(', ');
        } else {
          const firstTwo = products.slice(0, 2).map(p => `${p.name} (${p.totalQuantity}x)`).join(', ');
          const remaining = products.length - 2;
          return `${firstTwo} +${remaining} more product${remaining > 1 ? 's' : ''}`;
        }
      }
    }
    
    if (order.product_name) {
      return order.product_name;
    }
    
    return 'No Product Name';
  };

  const formatOrderDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'completed' || 
        statusLower === 'delivered' || 
        statusLower === 'picked_up_delivered' ||
        statusLower === 'picked up delivered') return 'blue';
    if (statusLower === 'processing' || statusLower === 'process') return 'orange';
    if (statusLower === 'pending') return 'red';
    return 'orange';
  };

  const handleOrdersSearch = (e) => {
    setOrdersSearchTerm(e.target.value);
    setShowOrdersFilterDropdown(false);
  };

  const handleOrdersSearchToggle = () => {
    setShowOrdersSearch(!showOrdersSearch);
    if (!showOrdersSearch) {
      setShowOrdersFilterDropdown(false);
    }
    if (showOrdersSearch) {
      setOrdersSearchTerm('');
    }
  };

  const handleOrdersFilterToggle = () => {
    setShowOrdersFilterDropdown(!showOrdersFilterDropdown);
    if (!showOrdersFilterDropdown) {
      setShowOrdersSearch(false);
    }
  };

  const handleOrdersFilterSelect = (status) => {
    setOrdersFilterStatus(status);
    setShowOrdersFilterDropdown(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !ordersSearchTerm || 
      order.email.toLowerCase().includes(ordersSearchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(ordersSearchTerm.toLowerCase()) ||
      order.date.toLowerCase().includes(ordersSearchTerm.toLowerCase());
    
    const orderStatus = (order.status || '').toLowerCase().trim();
    
    let matchesFilter = true;
    if (ordersFilterStatus !== 'all') {
      const filterStatusLower = ordersFilterStatus.toLowerCase();
      
      if (filterStatusLower === 'pending') {
        matchesFilter = orderStatus === 'pending';
      } else if (filterStatusLower === 'processing') {
        // Processing includes: confirmed, layout, sizing, printing, press, prod, packing_completing
        // Exclude pending, cancelled, and delivered statuses
        if (orderStatus === 'pending' || 
            orderStatus === 'cancelled' || 
            orderStatus === 'canceled' ||
            orderStatus === 'delivered' ||
            orderStatus === 'picked_up_delivered' ||
            orderStatus === 'picked up delivered') {
          return false;
        }
        const processingStatuses = [
          'confirmed',
          'layout',
          'sizing',
          'printing',
          'press',
          'prod',
          'packing',
          'packing_completing'
        ];
        matchesFilter = processingStatuses.includes(orderStatus);
      } else if (filterStatusLower === 'delivered') {
        // Delivered includes picked_up_delivered and delivered
        // Exclude pending, cancelled, and processing statuses
        if (orderStatus === 'pending' || 
            orderStatus === 'cancelled' || 
            orderStatus === 'canceled' ||
            orderStatus === 'confirmed' ||
            orderStatus === 'layout' ||
            orderStatus === 'sizing' ||
            orderStatus === 'printing' ||
            orderStatus === 'press' ||
            orderStatus === 'prod' ||
            orderStatus === 'packing' ||
            orderStatus === 'packing_completing') {
          return false;
        }
        matchesFilter = orderStatus === 'delivered' ||
                       orderStatus === 'picked_up_delivered' ||
                       orderStatus === 'picked up delivered';
      } else {
        matchesFilter = orderStatus === filterStatusLower;
      }
    } else {
      if (orderStatus === 'cancelled' || orderStatus === 'canceled') {
        return false;
      }
    }
    
    return matchesSearch && matchesFilter;
  });

  const displayedOrders = showAllOrders ? filteredOrders : filteredOrders.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreOrders = filteredOrders.length > INITIAL_DISPLAY_COUNT && !showAllOrders;

  const getOrdersFilterLabel = () => {
    switch(ordersFilterStatus.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'delivered': return 'Delivered';
      default: return 'All Status';
    }
  };

  const getOrdersFilterIcon = () => {
    return (
      <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format time display
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format date display for user info bar
  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.user_metadata?.full_name || 
           (user.user_metadata?.first_name && user.user_metadata?.last_name 
             ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
             : user.user_metadata?.first_name || 
               user.user_metadata?.last_name || 
               user.email?.split('@')[0] || 
               'User');
  };

  return (
    <div className="dashboard1-container">
      {/* Main Content */}
      <main className="dashboard1-main">
        {/* User Info and Time Display */}
        <div className="dashboard1-user-info-bar">
          <div className="dashboard1-user-info">
            <h1 className="dashboard1-title">
              {isOwner ? 'Owner Dashboard' : 'Admin Dashboard'}
            </h1>
            <div className="dashboard1-welcome">
              Welcome, {getUserDisplayName()}!
            </div>
          </div>
          <div className="dashboard1-separator"></div>
        </div>

        {/* Top Cards Section */}
        <div className="dashboard1-top-cards">
          <div className="dashboard1-stat-card dashboard1-sales-card">
            {/* Show Values Toggle Button - Top Right Corner */}
            <button
              className="dashboard1-sales-toggle-btn"
              onClick={() => setIsAllValuesVisible(!isAllValuesVisible)}
              title={isAllValuesVisible ? 'Hide values' : 'Show values'}
              aria-label={isAllValuesVisible ? 'Hide values' : 'Show values'}
            >
              <FontAwesomeIcon 
                icon={isAllValuesVisible ? faEyeSlash : faEye} 
                className="dashboard1-sales-toggle-icon"
              />
            </button>
            <div className="dashboard1-stat-icon">
              <span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>₱</span>
            </div>
            <div className="dashboard1-stat-content">
              <div className="dashboard1-stat-header">
                <p className="dashboard1-stat-label">Total Sales</p>
              </div>
              <h3 className="dashboard1-stat-value">
                {isAllValuesVisible ? formatCurrency(dashboardStats.totalSales) : '••••••'}
              </h3>
              <div className="dashboard1-stat-trend">
                <FontAwesomeIcon icon={faChevronUp} />
                <span>{dashboardStats.salesTrend}</span>
              </div>
            </div>
          </div>

          <div className="dashboard1-stat-card dashboard1-customers-card">
            <div className="dashboard1-stat-icon">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div className="dashboard1-stat-content">
              <p className="dashboard1-stat-label">Total Customers</p>
              <h3 className="dashboard1-stat-value">{dashboardStats.totalCustomers.toLocaleString()}</h3>
              <div className="dashboard1-stat-trend">
                <FontAwesomeIcon icon={faChevronUp} />
                <span>{dashboardStats.customersTrend}</span>
              </div>
            </div>
          </div>

          <div className="dashboard1-stat-card dashboard1-orders-card">
            <div className="dashboard1-stat-icon">
              <FontAwesomeIcon icon={faShoppingCart} />
            </div>
            <div className="dashboard1-stat-content">
              <p className="dashboard1-stat-label">Total Orders</p>
              <h3 className="dashboard1-stat-value">{dashboardStats.totalOrders.toLocaleString()}</h3>
              <div className="dashboard1-stat-trend">
                <FontAwesomeIcon icon={faChevronUp} />
                <span>{dashboardStats.ordersTrend}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section with Tabs */}
        <div className="dashboard1-chart-section">
          {/* Chart Tabs - Matching Analytics Style */}
          <div className="dashboard1-chart-tabs-container">
            <div className="dashboard1-chart-tabs">
              <button
                className={`dashboard1-chart-tab ${activeChartTab === 'sales' ? 'active' : ''}`}
                onClick={() => setActiveChartTab('sales')}
              >
                <FontAwesomeIcon icon={faChartLine} className="chart-tab-icon" />
                <span>Sales</span>
              </button>
              <button
                className={`dashboard1-chart-tab ${activeChartTab === 'stock' ? 'active' : ''}`}
                onClick={() => setActiveChartTab('stock')}
              >
                <FontAwesomeIcon icon={faBox} className="chart-tab-icon" />
                <span>Stock</span>
              </button>
            </div>
            {/* Global Toggle for All Values */}
            <div className="dashboard1-global-controls">
              <button
                className="dashboard1-chart-toggle-btn"
                onClick={() => setIsAllValuesVisible(!isAllValuesVisible)}
                title={isAllValuesVisible ? 'Hide all values' : 'Show all values'}
                aria-label={isAllValuesVisible ? 'Hide all values' : 'Show all values'}
              >
                <FontAwesomeIcon 
                  icon={isAllValuesVisible ? faEyeSlash : faEye} 
                  className="dashboard1-chart-toggle-icon"
                />
                <span className="toggle-label">{isAllValuesVisible ? 'Hide Values' : 'Show Values'}</span>
              </button>
            </div>
            {/* Branch Filter for Owners - Aligned with Tabs */}
            {isOwner && branches.length > 0 && (
              <div className="dashboard1-branch-filter">
                <div 
                  className="dashboard1-branch-filter-button"
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                >
                  <FontAwesomeIcon icon={faBuilding} className="branch-filter-icon" />
                  <span className="branch-filter-selected-name">
                    {selectedBranchId === 'all' 
                      ? 'All Branches' 
                      : branches.find(b => b.id === parseInt(selectedBranchId))?.name || 'All Branches'}
                  </span>
                  <FontAwesomeIcon 
                    icon={showBranchDropdown ? faChevronUp : faChevronDown} 
                    className="branch-filter-chevron"
                  />
                </div>
                {showBranchDropdown && (
                  <div className="dashboard1-branch-dropdown">
                    <div
                      className={`branch-dropdown-item ${selectedBranchId === 'all' ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedBranchId('all');
                        setShowBranchDropdown(false);
                      }}
                    >
                      <FontAwesomeIcon icon={faBuilding} className="branch-item-icon" />
                      <span>All Branches</span>
                    </div>
                    {branches.map(branch => (
                      <div
                        key={branch.id}
                        className={`branch-dropdown-item ${selectedBranchId === String(branch.id) ? 'selected' : ''}`}
                        onClick={() => {
                          const newBranchId = String(branch.id);
                          setSelectedBranchId(newBranchId);
                          setShowBranchDropdown(false);
                          // Force immediate refresh - fetchMetricsData will be called via useEffect
                        }}
                      >
                        <FontAwesomeIcon icon={faBuilding} className="branch-item-icon" />
                        <span>{branch.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chart Content and Quick Actions Layout */}
          <div className="dashboard1-chart-and-actions-wrapper">
            {/* Chart Content */}
            <div className="dashboard1-chart-content-wrapper">
              {activeChartTab === 'sales' && (
                <div className="dashboard1-chart-wrapper">
                  <EarningsChart 
                    selectedBranchId={
                      // Only pass branch_id for owners selecting a specific branch
                      // For admins, backend automatically filters by their branch_id from user metadata
                      isOwner && selectedBranchId !== 'all' 
                        ? selectedBranchId 
                        : null
                    }
                    isValuesVisible={isAllValuesVisible}
                  />
                </div>
              )}
              
              {activeChartTab === 'stock' && (
                <div className="dashboard1-chart-wrapper">
                  <div className="analytics-card geo-distribution-card">
                    <div className="card-header">
                      <FontAwesomeIcon icon={faBox} className="card-icon" />
                      <h3>Low-Stock Items</h3>
                      <div className="card-controls">
                      </div>
                    </div>
                    <div className="chart-container">
                      {lowStockItems.length === 0 ? (
                        <div className="chart-empty-state">
                          <p>All items well stocked</p>
                        </div>
                      ) : lowStockChartOption ? (
                        <ReactEChartsCore
                          key={`low-stock-chart-${lowStockItems.length}`}
                          echarts={echarts}
                          option={lowStockChartOption}
                          notMerge={true}
                          lazyUpdate={false}
                          opts={{ renderer: 'svg' }}
                          style={{ height: '240px', width: '100%', minHeight: '240px' }}
                          onChartReady={onChartReady('lowStock')}
                        />
                      ) : (
                        <div className="analytics-loading-inline">
                          <div className="loading-spinner"></div>
                          <p>Loading chart...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Buttons - Right Side */}
            <div className="dashboard1-quick-actions-sidebar">
              <div className="dashboard1-quick-actions">
                <button 
                  className="dashboard1-quick-action-btn dashboard1-add-product-btn"
                  onClick={handleQuickAddProduct}
                >
                  <FontAwesomeIcon icon={faPlus} className="quick-action-icon" />
                  <span>Add Product</span>
                </button>
                <button 
                  className="dashboard1-quick-action-btn dashboard1-walkin-btn"
                  onClick={handleWalkIn}
                >
                  <FontAwesomeIcon icon={faStore} className="quick-action-icon" />
                  <span>Walk-in</span>
                </button>
                <button 
                  className="dashboard1-quick-action-btn dashboard1-manage-accounts-btn"
                  onClick={handleManageAccounts}
                >
                  <FontAwesomeIcon icon={faUserShield} className="quick-action-icon" />
                  <span>Manage Accounts</span>
                </button>
                <button 
                  className="dashboard1-quick-action-btn dashboard1-read-chats-btn"
                  onClick={handleReadChats}
                >
                  <FontAwesomeIcon icon={faComments} className="quick-action-icon" />
                  <span>Read Chats</span>
                </button>
                <button 
                  className="dashboard1-quick-action-btn dashboard1-view-orders-btn"
                  onClick={handleViewOrders}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="quick-action-icon" />
                  <span>View Orders</span>
                </button>
                {canAccessEmailMarketing && (
                  <button 
                    className="dashboard1-quick-action-btn dashboard1-email-marketing-btn"
                    onClick={handleEmailMarketing}
                  >
                    <FontAwesomeIcon icon={faEnvelope} className="quick-action-icon" />
                    <span>Email Marketing</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Stock Modal */}
        {editingItem && (
          <div className="dashboard1-modal-overlay" onClick={() => setEditingItem(null)}>
            <div className="dashboard1-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard1-modal-header">
                <h3>Edit Stock Item</h3>
                <button className="dashboard1-modal-close" onClick={() => setEditingItem(null)}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="dashboard1-modal-body">
                <div className="dashboard1-form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="dashboard1-form-input"
                  />
                </div>
                <div className="dashboard1-form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    value={editingItem.stockQuantity}
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 0;
                      setEditingItem({ ...editingItem, stockQuantity: qty });
                    }}
                    className="dashboard1-form-input"
                    min="0"
                  />
                </div>
                <div className="dashboard1-form-group">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    value={editingItem.reorderLevel}
                    onChange={(e) => setEditingItem({ ...editingItem, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="dashboard1-form-input"
                    min="0"
                  />
                </div>
                <div className="dashboard1-form-group">
                  <label>Category</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="dashboard1-form-input"
                  >
                    <option value="jerseys">Jerseys</option>
                    <option value="t-shirts">T-Shirts</option>
                    <option value="long sleeves">Long Sleeves</option>
                    <option value="hoodies">Hoodies</option>
                    <option value="uniforms">Uniforms</option>
                    <option value="balls">Balls</option>
                    <option value="trophies">Trophies</option>
                  </select>
                </div>
              </div>
              <div className="dashboard1-modal-footer">
                <button 
                  className="dashboard1-btn-cancel"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard1-btn-save"
                  onClick={() => handleUpdateItem(editingItem)}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restock Modal */}
        {restockingItem && (
          <div className="dashboard1-modal-overlay" onClick={() => {
            setRestockingItem(null);
            setRestockQuantity('');
          }}>
            <div className="dashboard1-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard1-modal-header">
                <h3>Restock Item</h3>
                <button className="dashboard1-modal-close" onClick={() => {
                  setRestockingItem(null);
                  setRestockQuantity('');
                }}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="dashboard1-modal-body">
                <div className="dashboard1-form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={restockingItem.name}
                    disabled
                    className="dashboard1-form-input"
                  />
                </div>
                <div className="dashboard1-form-group">
                  <label>Current Stock</label>
                  <input
                    type="number"
                    value={restockingItem.stockQuantity}
                    disabled
                    className="dashboard1-form-input"
                  />
                </div>
                <div className="dashboard1-form-group">
                  <label>Quantity to Add</label>
                  <input
                    type="number"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    className="dashboard1-form-input"
                    min="1"
                    placeholder="Enter quantity"
                    autoFocus
                  />
                </div>
                <div className="dashboard1-form-group">
                  <label>New Stock After Restock</label>
                  <input
                    type="number"
                    value={restockingItem.stockQuantity + (parseInt(restockQuantity) || 0)}
                    disabled
                    className="dashboard1-form-input"
                  />
                </div>
              </div>
              <div className="dashboard1-modal-footer">
                <button 
                  className="dashboard1-btn-cancel"
                  onClick={() => {
                    setRestockingItem(null);
                    setRestockQuantity('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard1-btn-save"
                  onClick={handleRestockSubmit}
                >
                  Restock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmItem && (
          <div className="dashboard1-modal-overlay" onClick={() => setDeleteConfirmItem(null)}>
            <div className="dashboard1-modal-content dashboard1-delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard1-modal-header">
                <h3>Delete Stock Item</h3>
                <button className="dashboard1-modal-close" onClick={() => setDeleteConfirmItem(null)}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="dashboard1-modal-body">
                <div className="dashboard1-delete-warning">
                  <p className="dashboard1-delete-message">
                    Are you sure you want to delete <strong>{deleteConfirmItem.name}</strong>?
                  </p>
                  <p className="dashboard1-delete-submessage">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="dashboard1-modal-footer">
                <button 
                  className="dashboard1-btn-cancel"
                  onClick={() => setDeleteConfirmItem(null)}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard1-btn-delete"
                  onClick={confirmDelete}
                >
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Stock Modal */}
        {showAddStockModal && (
          <div className="dashboard1-modal-overlay" onClick={() => {
            setShowAddStockModal(false);
            setNewStockItem({
              name: '',
              category: '',
              stockQuantity: '',
              reorderLevel: ''
            });
          }}>
            <div className="dashboard1-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard1-modal-header">
                <h3>Add New Stock Item</h3>
                <button className="dashboard1-modal-close" onClick={() => {
                  setShowAddStockModal(false);
                  setNewStockItem({
                    name: '',
                    category: '',
                    stockQuantity: '',
                    reorderLevel: ''
                  });
                }}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="dashboard1-modal-body">
                <div className="dashboard1-form-group">
                  <label>Item Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    value={newStockItem.name}
                    onChange={(e) => setNewStockItem({ ...newStockItem, name: e.target.value })}
                    className="dashboard1-form-input"
                    placeholder="Enter item name"
                  />
                </div>
                <div className="dashboard1-form-group">
                  <label>Category <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    value={newStockItem.category}
                    onChange={(e) => setNewStockItem({ ...newStockItem, category: e.target.value })}
                    className="dashboard1-form-input"
                  >
                    <option value="">Select category</option>
                    {availableCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="dashboard1-form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    value={newStockItem.stockQuantity}
                    onChange={(e) => setNewStockItem({ ...newStockItem, stockQuantity: e.target.value })}
                    className="dashboard1-form-input"
                    placeholder="Enter initial stock quantity"
                    min="0"
                  />
                </div>
                <div className="dashboard1-form-group">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    value={newStockItem.reorderLevel}
                    onChange={(e) => setNewStockItem({ ...newStockItem, reorderLevel: e.target.value })}
                    className="dashboard1-form-input"
                    placeholder="Enter reorder level"
                    min="0"
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                    Stock status will be marked as "Low Stock" when quantity reaches this level
                  </small>
                </div>
              </div>
              <div className="dashboard1-modal-footer">
                <button 
                  className="dashboard1-btn-cancel"
                  onClick={() => {
                    setShowAddStockModal(false);
                    setNewStockItem({
                      name: '',
                      category: '',
                      stockQuantity: '',
                      reorderLevel: ''
                    });
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard1-btn-save"
                  onClick={handleAddStockSubmit}
                >
                  Add Stock Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddProductModal && (
          <AddProductModal
            onClose={handleCloseProductModal}
            onAdd={handleAddProduct}
            editingProduct={null}
            isEditMode={false}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard1;

