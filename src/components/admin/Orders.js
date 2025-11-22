import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import JSZip from 'jszip';
import { 
  FaShoppingCart, 
  FaEye, 
  FaSort, 
  FaFilter, 
  FaChevronDown, 
  FaChevronUp,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBox,
  FaDollarSign,
  FaClock,
  FaCheck,
  FaTimes,
  FaFileAlt,
  FaPalette,
  FaRuler,
  FaPrint,
  FaCog,
  FaIndustry,
  FaShippingFast,
  FaArrowLeft,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight,
  FaUsers,
  FaCamera,
  FaSearch,
  FaUpload,
  FaDownload
} from 'react-icons/fa';
import './Orders.css';
import './FloatingButton.css';
import './OrderNotification.css';
import './artist-assignment-loading.css';
import orderService from '../../services/orderService';
import { getApparelSizeVisibility } from '../../utils/orderSizing';
import designUploadService from '../../services/designUploadService';
import chatService from '../../services/chatService';
import OrderNotification from './OrderNotification';
import { supabase } from '../../lib/supabase';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'orderDate', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [uploadingDesigns, setUploadingDesigns] = useState({});
  const [notifications, setNotifications] = useState([]);
  const loadingNotificationRef = React.useRef(null);
  const updatingOrdersRef = React.useRef(new Set());
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [orderApprovalStatus, setOrderApprovalStatus] = useState({}); // Track approval status per order
  const [assignedArtists, setAssignedArtists] = useState({}); // Track assigned artists per order
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    inProgress: 0,
    pending: 0
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [revisionDialog, setRevisionDialog] = useState({ show: false, notes: '', orderId: null, submitting: false });
  const [orderDetailsActiveTab, setOrderDetailsActiveTab] = useState('details'); // 'details' | 'status'
  const [showAllDesignFiles, setShowAllDesignFiles] = useState(false);
  const [serverRevisionNotes, setServerRevisionNotes] = useState({}); // { [identifier]: Note[] }
  const [imageGallery, setImageGallery] = useState({ isOpen: false, images: [], currentIndex: 0 }); // Image gallery modal state
  const [artistAssignmentLoading, setArtistAssignmentLoading] = useState({ 
    orderId: null, 
    orderNumber: null, 
    status: 'loading', // 'loading' | 'success' | 'error'
    artistName: null 
  }); // Track artist assignment loading
  
  // Reset "view all" when switching expanded order
  useEffect(() => {
    setShowAllDesignFiles(false);
  }, [expandedOrder]);

  // Image gallery functions
  const openImageGallery = useCallback((images, startIndex = 0) => {
    if (!images || images.length === 0) return;
    setImageGallery({
      isOpen: true,
      images: images.map(img => ({
        url: img.url || img,
        filename: img.filename || img.originalname || `image-${images.indexOf(img) + 1}.jpg`
      })),
      currentIndex: startIndex
    });
  }, []);

  const closeImageGallery = useCallback(() => {
    setImageGallery({ isOpen: false, images: [], currentIndex: 0 });
  }, []);

  const goToNextImage = useCallback(() => {
    setImageGallery(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  }, []);

  const goToPrevImage = useCallback(() => {
    setImageGallery(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  }, []);

  const downloadImage = useCallback((imageUrl, filename) => {
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'image.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Error downloading image:', error);
        // Fallback: open in new tab
        window.open(imageUrl, '_blank');
      });
  }, []);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (!imageGallery.isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeImageGallery();
      if (e.key === 'ArrowLeft') goToPrevImage();
      if (e.key === 'ArrowRight') goToNextImage();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [imageGallery.isOpen, closeImageGallery, goToPrevImage, goToNextImage]);

  // Fetch server-side revision notes for the expanded order (artist_tasks.revision_notes)
  useEffect(() => {
    (async () => {
      try {
        if (!expandedOrder) return;
        const order = orders.find(o => o.id === expandedOrder);
        if (!order) return;
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
        const { data: { session } } = await supabase.auth.getSession();
        const identifier = order.orderNumber || order.id;
        // Dedicated revision-notes endpoint (try id first then orderNumber)
        const idCandidates = [order.id, order.orderNumber].filter(Boolean);
        let res;
        let usedIdentifier = null;
        for (const candidate of idCandidates) {
          try {
            res = await fetch(`${API_BASE_URL}/api/orders/${candidate}/revision-notes`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
              }
            });
            if (res.ok) {
              usedIdentifier = candidate;
              break;
            }
          } catch (_) {
            // ignore and try next candidate
          }
        }
        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          const notes = Array.isArray(data?.notes) ? data.notes : Array.isArray(data) ? data : [];
          try {
            console.log('[Orders] GET revision-notes', { identifier: usedIdentifier, count: notes.length });
          } catch (_) {}
          setServerRevisionNotes(prev => ({ ...prev, [identifier]: notes }));
          return;
        }
        // If no endpoint yet, just record empty for clarity
        setServerRevisionNotes(prev => ({ ...prev, [identifier]: [] }));
      } catch (e) {
        // Silent fail; UI will rely on local fields if any
      }
    })();
  }, [expandedOrder, orders]);
  
  // Filter states
  const [filters, setFilters] = useState({
    pickupBranch: '',
    status: '',
    searchTerm: ''
  });
  const isMetricsFiltered = Boolean(filters.pickupBranch || filters.status || filters.searchTerm);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // First, load page 1 with a smaller limit for fast initial display
        const initialLimit = 20;
        setLoading(true);
        
        console.log('📦 [Orders Component] Loading first page with limit:', initialLimit);
        const firstPageResponse = await orderService.getAllOrders({
          ...filters,
          page: 1,
          limit: initialLimit
        });
        
        console.log('📦 [Orders Component] First page API Response:', firstPageResponse);
        console.log('📦 [Orders Component] First page orders returned:', firstPageResponse.orders?.length);
        console.log('📦 [Orders Component] First page pagination info:', firstPageResponse.pagination);
        
        // Add null check for response.orders
        if (firstPageResponse && firstPageResponse.orders && Array.isArray(firstPageResponse.orders)) {
          const formattedOrders = firstPageResponse.orders.map(order => orderService.formatOrderForDisplay(order));
          console.log('📦 [Orders Component] First page formatted orders:', formattedOrders.length);
          
          // Set first page immediately for fast display
          setOrders(formattedOrders);
          setFilteredOrders(formattedOrders);
          setLoading(false); // Stop loading spinner after first page
          
          if (firstPageResponse.pagination) {
            const paginationInfo = firstPageResponse.pagination;
            setPagination(paginationInfo);
            
            // If there are more pages, load a few more in the background (not all to avoid slow loading)
            // Limit to next 2-3 pages for better performance
            const maxBackgroundPages = 3;
            const pagesToLoad = Math.min(paginationInfo.totalPages - 1, maxBackgroundPages);
            
            if (pagesToLoad > 0) {
              console.log(`📦 [Orders Component] Loading next ${pagesToLoad} pages in background (parallel)...`);
              setIsLoadingMore(true);
              
              // Load next few pages in parallel for faster loading
              const pagePromises = [];
              for (let page = 2; page <= pagesToLoad + 1; page++) {
                pagePromises.push(
                  orderService.getAllOrders({
                    ...filters,
                    page: page,
                    limit: initialLimit
                  }).then(pageResponse => {
                    if (pageResponse && pageResponse.orders && Array.isArray(pageResponse.orders)) {
                      const formattedPageOrders = pageResponse.orders.map(order => orderService.formatOrderForDisplay(order));
                      console.log(`📦 [Orders Component] Loaded page ${page}/${paginationInfo.totalPages}: ${formattedPageOrders.length} orders`);
                      return formattedPageOrders;
                    }
                    return [];
                  }).catch(pageError => {
                    console.error(`Error loading page ${page}:`, pageError);
                    return []; // Return empty array on error
                  })
                );
              }
              
              // Wait for all pages to load in parallel
              Promise.all(pagePromises).then(allPageResults => {
                const remainingPages = allPageResults.flat();
                
                // Append remaining orders to the first page
                if (remainingPages.length > 0) {
                  console.log('📦 [Orders Component] Appending', remainingPages.length, 'orders from background pages');
                  setOrders(prevOrders => {
                    const allOrders = [...prevOrders, ...remainingPages];
                    // Recalculate stats with loaded orders
                    setStats(prevStats => ({
                      ...prevStats,
                      total: firstPageResponse.stats?.total ?? allOrders.length,
                      delivered: allOrders.filter(o => o.status === 'picked_up_delivered').length,
                      inProgress: allOrders.filter(o => ['layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing'].includes(o.status)).length,
                      pending: allOrders.filter(o => o.status === 'pending').length
                    }));
                    return allOrders;
                  });
                  setFilteredOrders(prevOrders => [...prevOrders, ...remainingPages]);
                }
                
                setIsLoadingMore(false);
                console.log('📦 [Orders Component] Finished loading background pages');
              });
            }
          }

          // Update stats with first page data initially
          if (firstPageResponse.stats) {
            setStats({
              total: firstPageResponse.stats.total ?? formattedOrders.length,
              delivered: firstPageResponse.stats.delivered ?? formattedOrders.filter(o => o.status === 'picked_up_delivered').length,
              deliveredOverall: firstPageResponse.stats.deliveredOverall ?? firstPageResponse.stats.delivered ?? formattedOrders.filter(o => o.status === 'picked_up_delivered').length,
              inProgress: firstPageResponse.stats.inProgress ?? formattedOrders.filter(o => ['layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing'].includes(o.status)).length,
              pending: firstPageResponse.stats.pending ?? formattedOrders.filter(o => o.status === 'pending').length
            });
          } else {
            setStats({
              total: formattedOrders.length,
              delivered: formattedOrders.filter(o => o.status === 'picked_up_delivered').length,
              deliveredOverall: formattedOrders.filter(o => o.status === 'picked_up_delivered').length,
              inProgress: formattedOrders.filter(o => ['layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing'].includes(o.status)).length,
              pending: formattedOrders.filter(o => o.status === 'pending').length
            });
          }
          
          // Update stats again after all pages are loaded (if there are more pages)
          if (firstPageResponse.pagination && firstPageResponse.pagination.totalPages > 1) {
            // Stats will be recalculated when remaining pages finish loading
            // The stats are calculated from the final orders array
          }
        } else {
          console.warn('No orders data received or invalid format:', firstPageResponse);
          setOrders([]);
          setFilteredOrders([]);
          setStats({
            total: 0,
            delivered: 0,
            inProgress: 0,
            pending: 0
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
        setFilteredOrders([]);
        setStats({
          total: 0,
          delivered: 0,
          inProgress: 0,
          pending: 0
        });
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    fetchOrders();
  }, [filters.pickupBranch, filters.status, refreshKey]);

  // Fetch assigned artist when order is expanded
  useEffect(() => {
    const fetchArtist = async () => {
      if (expandedOrder) {
        try {
          const orderWithArtist = await orderService.getOrderWithArtist(expandedOrder);
          if (orderWithArtist.assignedArtist) {
            setAssignedArtists(prev => ({
              ...prev,
              [expandedOrder]: orderWithArtist.assignedArtist
            }));
          }
        } catch (error) {
          console.log('No artist assigned to order:', expandedOrder);
          setAssignedArtists(prev => ({
            ...prev,
            [expandedOrder]: null
          }));
        }
      }
    };

    fetchArtist();
  }, [expandedOrder]);

  // Apply filters and sorting
  useEffect(() => {
    // Safety check to ensure orders is always an array
    let filtered = Array.isArray(orders) ? [...orders] : [];

    // Search filter
    if (filters.searchTerm) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Pickup branch filter
    if (filters.pickupBranch) {
      filtered = filtered.filter(order => 
        order.pickupLocation === filters.pickupBranch
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(order => 
        order.status === filters.status
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'orderDate') {
        return sortConfig.direction === 'asc' 
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }
      
      if (sortConfig.key === 'totalAmount') {
        return sortConfig.direction === 'asc' 
          ? (aValue || 0) - (bValue || 0)
          : (bValue || 0) - (aValue || 0);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

    setFilteredOrders(filtered);
  }, [orders, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    // Reset to page 1 when filters change
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const clearFilters = () => {
    setFilters({
      pickupBranch: '',
      status: '',
      searchTerm: ''
    });
    setSortConfig({ key: 'orderDate', direction: 'desc' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'picked_up_delivered': return 'green';
      case 'packing_completing': return 'blue';
      case 'prod': return 'blue';
      case 'press': return 'blue';
      case 'printing': return 'blue';
      case 'sizing': return 'blue';
      case 'layout': return 'blue';
      case 'confirmed': return 'blue';
      case 'pending': return 'red';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusDisplayName = (status) => {
    const displayNames = {
      'pending': 'PENDING',
      'confirmed': 'CONFIRMED',
      'layout': 'LAYOUT',
      'sizing': 'SIZING',
      'printing': 'PRINTING',
      'press': 'PRESS',
      'prod': 'PROD',
      'packing_completing': 'PACKING',
      'picked_up_delivered': 'PICKED UP/DELIVERED',
      'cancelled': 'CANCELLED'
    };
    return displayNames[status] || status.toUpperCase();
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'pending': return 'Awaiting confirmation';
      case 'confirmed': return 'Design upload ready';
      case 'layout': return 'Layout in progress';
      case 'sizing': return 'Sizing stage';
      case 'printing': return 'Printing stage';
      case 'press': return 'Press operations';
      case 'prod': return 'Production stage';
      case 'packing_completing': return 'Packing stage';
      case 'picked_up_delivered': return 'Order picked up or delivered';
      case 'cancelled': return 'Order cancelled';
      default: return 'Unknown status';
    }
  };

  // Helper function to check if an order contains balls or trophies
  const hasBallOrTrophyProducts = (order) => {
    // Check both orderItems (camelCase) and order_items (snake_case)
    const orderItems = order.orderItems || order.order_items;
    if (!orderItems || !Array.isArray(orderItems)) {
      return false;
    }
    
    return orderItems.some(item => {
      const category = (item.category || item.product_type || '').toString().toLowerCase().trim();
      const name = (item.name || '').toString().toLowerCase().trim();
      
      // Check category field for exact matches
      if (category === 'balls' || category === 'trophies') {
        return true;
      }
      
      // Also check name field as fallback (but exclude basketball/volleyball jerseys)
      if (name.includes('ball') && !name.includes('basketball') && !name.includes('volleyball') && !name.includes('jersey')) {
        return true;
      }
      
      if (name.includes('trophy') || name.includes('trophie')) {
        return true;
      }
      
      return false;
    });
  };

  const truncateOrderNumber = (orderNumber) => {
    if (!orderNumber || typeof orderNumber !== 'string') {
      return 'N/A';
    }
    if (orderNumber.length > 12) {
      return orderNumber.substring(0, 8) + '...' + orderNumber.substring(orderNumber.length - 4);
    }
    return orderNumber;
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  // Notification helper functions with deduplication
  const addNotification = (notification) => {
    // Create a unique key for deduplication
    const notificationKey = `${notification.type}-${notification.orderNumber}-${notification.message}`;
    const id = Date.now() + Math.random();
    
    setNotifications(prev => {
      // Remove any existing notifications with the same key to prevent duplicates
      const filtered = prev.filter(n => {
        const existingKey = `${n.type}-${n.orderNumber}-${n.message}`;
        return existingKey !== notificationKey;
      });
      
      // Add the new notification
      const newNotification = {
        id,
        key: notificationKey,
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        orderNumber: notification.orderNumber,
        status: notification.status,
        duration: notification.duration || 5000,
        autoClose: notification.autoClose !== false,
        ...notification
      };
      return [...filtered, newNotification];
    });
    
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Helper function to get readable status name for notifications
  const getNotificationStatusName = (status) => {
    const statusNames = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      layout: 'Layout',
      sizing: 'Sizing',
      printing: 'Printing',
      press: 'Press',
      prod: 'Production',
      packing_completing: 'Packing/Completing',
      picked_up_delivered: 'Picked Up/Delivered',
      cancelled: 'Cancelled'
    };
    return statusNames[status] || status;
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      // Prevent duplicate updates for the same order
      if (updatingOrdersRef.current.has(orderId)) {
        console.log(`⚠️ Order ${orderId} is already being updated, skipping duplicate request`);
        return;
      }
      
      // Mark this order as being updated
      updatingOrdersRef.current.add(orderId);
      
      console.log(`🔄 Frontend: Updating order ${orderId} to status: ${newStatus}`);
      
      // Find the order to get its details
      const order = orders.find(o => o.id === orderId);
      const orderNumber = order?.orderNumber || `#${orderId}`;
      const oldStatus = order?.status || 'unknown';
      
      // Show loading screen when starting layout (artist assignment)
      if (newStatus === 'layout') {
        setArtistAssignmentLoading({ 
          orderId, 
          orderNumber, 
          status: 'loading',
          artistName: null 
        });
      }
      
      // Check role-based restrictions
      const userRole = user?.user_metadata?.role || 'customer';
      
      if (newStatus === 'sizing' && userRole !== 'artist') {
        updatingOrdersRef.current.delete(orderId);
        setArtistAssignmentLoading({ orderId: null, orderNumber: null }); // Clear loading if shown
        addNotification({
          type: 'error',
          title: 'Permission Denied',
          message: 'Only artists can move orders to sizing status',
          orderNumber: orderNumber,
          status: oldStatus,
          duration: 4000
        });
        return;
      }
      
      // Optimistic update - update UI immediately for faster response
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus }
            : order
        )
      );
      setFilteredOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus }
            : order
        )
      );
      
      // Show success notification immediately
      addNotification({
        type: 'success',
        title: 'Order Status Updated',
        message: `Order successfully moved to ${getNotificationStatusName(newStatus)}`,
        orderNumber: orderNumber,
        status: newStatus,
        duration: 3000
      });
      
      // Make API call in background (non-blocking)
      orderService.updateOrderStatus(orderId, newStatus)
        .then((response) => {
          console.log(`✅ Frontend: Order status update successful`);
          updatingOrdersRef.current.delete(orderId);
          
          // Handle artist assignment success for layout status
          if (newStatus === 'layout' && response.artistAssignmentSuccess) {
            // Show success state with artist name
            if (response.artistInfo?.artist_name) {
              setArtistAssignmentLoading(prev => ({
                ...prev,
                status: 'success',
                artistName: response.artistInfo.artist_name
              }));
              
              // Auto-hide after 2.5 seconds
              setTimeout(() => {
                setArtistAssignmentLoading({ 
                  orderId: null, 
                  orderNumber: null, 
                  status: 'loading',
                  artistName: null 
                });
              }, 2500);
            } else {
              // No artist info, just close
              setArtistAssignmentLoading({ 
                orderId: null, 
                orderNumber: null, 
                status: 'loading',
                artistName: null 
              });
            }
          } else if (newStatus === 'layout') {
            // Clear loading screen if not layout or no success flag
            setArtistAssignmentLoading({ 
              orderId: null, 
              orderNumber: null, 
              status: 'loading',
              artistName: null 
            });
          }
        })
        .catch((error) => {
          console.error('Error updating order status:', error);
          
          // Clear loading screen on error
          if (newStatus === 'layout') {
            setArtistAssignmentLoading({ 
              orderId: null, 
              orderNumber: null, 
              status: 'error',
              artistName: null 
            });
            // Hide error state quickly
            setTimeout(() => {
              setArtistAssignmentLoading({ 
                orderId: null, 
                orderNumber: null, 
                status: 'loading',
                artistName: null 
              });
            }, 500);
          }
          
          // Revert optimistic update on error
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? { ...order, status: oldStatus }
                : order
            )
          );
          setFilteredOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? { ...order, status: oldStatus }
                : order
            )
          );
          
          // Handle specific error messages from backend
          let errorTitle = 'Update Failed';
          let errorMessage = error.message || 'Failed to update order status. Please try again.';
          
          // Check if this is an artist assignment error
          // Check both error.artistAssignmentError and error.payload (from authJsonFetch)
          const payload = error.payload || error.response?.data;
          if (error.artistAssignmentError || payload?.artistAssignmentError) {
            const assignmentError = error.assignmentError || payload?.assignmentError;
            errorTitle = 'Artist Assignment Failed';
            errorMessage = assignmentError?.message || payload?.error || error.message || 'Failed to assign artist task. Please ensure at least one active artist is available.';
            
            // Add more specific details if available
            const details = payload?.details || error.response?.data?.details;
            if (details) {
              errorMessage += ` ${details}`;
            }
          } else if (error.message && error.message.includes('Only artists can move orders to sizing status')) {
            errorTitle = 'Permission Denied';
            errorMessage = 'Only artists can move orders to sizing status';
          } else if (error.message && error.message.includes('Design files must be uploaded')) {
            errorTitle = 'Design Files Required';
            errorMessage = 'Design files must be uploaded before moving to sizing status';
          } else if (error.message && error.message.includes('Order must be in layout status')) {
            errorTitle = 'Invalid Status Transition';
            errorMessage = 'Order must be in layout status before moving to sizing';
          } else if (error.message && error.message.includes('No active artists available')) {
            errorTitle = 'No Artists Available';
            errorMessage = 'Cannot assign task: No active artists available. Please ensure at least one artist profile is active.';
          } else if (error.message && error.message.includes('Cannot assign task')) {
            errorTitle = 'Assignment Failed';
            errorMessage = error.message;
          }
          
          addNotification({
            type: 'error',
            title: errorTitle,
            message: errorMessage,
            orderNumber: orderNumber,
            status: oldStatus,
            duration: 5000 // Longer duration for assignment errors
          });
          
          updatingOrdersRef.current.delete(orderId);
        });
    } catch (error) {
      console.error('Unexpected error in handleStatusUpdate:', error);
      updatingOrdersRef.current.delete(orderId);
    }
  };

  // Check if design is approved or review timed out (1 hour)
  const checkDesignApprovalStatus = useCallback(async (orderId) => {
    try {
      // Get chat room for this order
      const chatRoom = await chatService.getChatRoomByOrder(orderId);
      if (!chatRoom) {
        return false; // No chat room means no review request yet
      }

      // Get all messages for the chat room
      const messages = await chatService.getChatRoomMessages(chatRoom.id);
      if (!messages || messages.length === 0) {
        return false;
      }

      // Sort messages by created_at to process in chronological order
      const sortedMessages = [...messages].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );

      // Find the most recent review_request
      const reviewRequests = sortedMessages.filter(msg => 
        msg.message_type === 'review_request' && msg.sender_type === 'artist'
      );

      if (reviewRequests.length === 0) {
        return false; // No review request found
      }

      const mostRecentReviewRequest = reviewRequests[reviewRequests.length - 1];
      const reviewRequestTime = new Date(mostRecentReviewRequest.created_at);
      const now = new Date();
      const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
      const timeSinceRequest = now - reviewRequestTime;

      // Check if there's an approval response after the review request
      const approvalResponse = sortedMessages.find(msg => {
        const msgTime = new Date(msg.created_at);
        return msg.message_type === 'review_response' &&
               msg.sender_type === 'customer' &&
               msgTime > reviewRequestTime &&
               msg.message.toLowerCase().includes('design approved');
      });

      // Return true if:
      // 1. Customer approved the design, OR
      // 2. 1 hour has passed since review request with no response
      const isApproved = !!approvalResponse;
      const isTimedOut = timeSinceRequest >= oneHourInMs && !approvalResponse;

      return isApproved || isTimedOut;
    } catch (error) {
      console.error(`Error checking approval status for order ${orderId}:`, error);
      return false; // Default to false on error
    }
  }, []);

  // Check approval status for all orders when they're loaded
  useEffect(() => {
    const checkAllApprovalStatuses = async () => {
      if (!user || user?.user_metadata?.role !== 'artist') {
        return; // Only check for artists
      }

      const statusMap = {};
      for (const order of filteredOrders) {
        // Only check orders that are in confirmed or layout status
        if (order.status === 'confirmed' || order.status === 'layout') {
          const isApproved = await checkDesignApprovalStatus(order.id);
          statusMap[order.id] = isApproved;
        }
      }
      setOrderApprovalStatus(statusMap);
    };

    if (filteredOrders.length > 0 && !loading) {
      checkAllApprovalStatuses();
    }

    // Set up interval to check every 5 minutes (for 1-hour timeout detection)
    const interval = setInterval(() => {
      if (filteredOrders.length > 0 && !loading && user?.user_metadata?.role === 'artist') {
        checkAllApprovalStatuses();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [filteredOrders, loading, user, checkDesignApprovalStatus]);

  // Handle design file upload
  const handleDownloadDesignFilesAsZip = async (order, designFiles) => {
    try {
      if (!designFiles || designFiles.length === 0) {
        alert('No design files to download');
        return;
      }

      const zip = new JSZip();
      const orderNumber = order.orderNumber || order.order_number || order.id;
      
      // Download each image and add to zip
      for (let i = 0; i < designFiles.length; i++) {
        const file = designFiles[i];
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          
          // Get filename from file object or generate one
          const filename = file.filename || file.originalname || `design_${i + 1}.${file.url.split('.').pop().split('?')[0]}`;
          
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Error downloading file ${i + 1}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order_${orderNumber}_design_files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating zip file:', error);
      alert('Failed to download design files as ZIP. Please try again.');
    }
  };

  const handleDesignUpload = async (orderId, files) => {
    if (!files || files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    const userRole = user?.user_metadata?.role || 'customer';
    if (userRole !== 'artist') {
      alert('❌ Only artists can upload design files');
      return;
    }

    try {
      setUploadingDesigns(prev => ({ ...prev, [orderId]: true }));
      
      console.log(`🎨 Uploading design files for order ${orderId}:`, files.length, 'files');
      
      const result = await designUploadService.uploadDesignFiles(orderId, files);
      
      console.log('🎨 Design upload result:', result);
      
      // Update the order in the state with new design files and status
      const updatedDesignFiles = Array.isArray(result.designFiles) ? result.designFiles : [];

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { 
                ...order, 
                designFiles: updatedDesignFiles,
                design_files: updatedDesignFiles,
                status: result.newStatus || order.status
              }
            : order
        )
      );
      setFilteredOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { 
                ...order, 
                designFiles: updatedDesignFiles,
                design_files: updatedDesignFiles,
                status: result.newStatus || order.status
              }
            : order
        )
      );
      
      // Show success message
      if (result.statusChanged) {
        alert(`✅ Design files uploaded successfully! Order automatically moved to ${result.newStatus} status.`);
      } else {
        alert('✅ Design files uploaded successfully!');
      }
      
    } catch (error) {
      console.error('Error uploading design files:', error);
      alert(`❌ Failed to upload design files: ${error.message}`);
    } finally {
      setUploadingDesigns(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const branchOptions = [
    { label: 'Main (San Pascual)', value: 'SAN PASCUAL (MAIN BRANCH)' },
    { label: 'Muzon', value: 'MUZON BRANCH' },
    { label: 'Rosario', value: 'ROSARIO BRANCH' },
    { label: 'Batangas City', value: 'BATANGAS CITY BRANCH' },
    { label: 'Pinamalayan', value: 'PINAMALAYAN BRANCH' },
    { label: 'Calaca', value: 'CALACA BRANCH' },
    { label: 'Lemery', value: 'LEMERY BRANCH' },
    { label: 'Calapan', value: 'CALAPAN BRANCH' },
    { label: 'Bauan', value: 'BAUAN BRANCH' }
  ];

  const statuses = [
    'pending', 'confirmed', 'layout', 'sizing', 
    'printing', 'press', 'prod', 'packing_completing', 
    'picked_up_delivered', 'cancelled'
  ];

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  const deliveredFallbackCount = filteredOrders.filter(o => o.status === 'picked_up_delivered').length;
  const deliveredTotalsByBranch = stats.deliveredTotalsByBranch || {};
  const deliveredStatValue = (() => {
    if (filters.pickupBranch && deliveredTotalsByBranch[filters.pickupBranch] !== undefined) {
      return deliveredTotalsByBranch[filters.pickupBranch];
    }
    if (isMetricsFiltered) {
      return stats.delivered ?? deliveredFallbackCount;
    }
    return stats.deliveredOverall ?? stats.delivered ?? deliveredFallbackCount;
  })();

  return (
    <div className="orders-container">
      {/* Background loading indicator */}
      {isLoadingMore && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(37, 99, 235, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.875rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          Loading more orders...
        </div>
      )}
      {/* Notification System */}
      <OrderNotification 
        notifications={notifications}
        removeNotification={removeNotification}
      />
      
      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.show && (
        <div className="confirm-dialog-overlay" onClick={() => confirmDialog.onCancel()}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-header">
              <h3>{confirmDialog.title}</h3>
              <button className="confirm-dialog-close" onClick={() => confirmDialog.onCancel()}>
                <FaTimes />
              </button>
            </div>
            <div className="confirm-dialog-body">
              <p className="confirm-dialog-message">{confirmDialog.message}</p>
              <div className="confirm-dialog-status-change">
                <span className="status-from">{confirmDialog.currentStatus}</span>
                <FaArrowRight className="status-arrow-icon" />
                <span className="status-to">{confirmDialog.newStatus}</span>
              </div>
            </div>
            <div className="confirm-dialog-actions">
              <button className="confirm-btn-cancel" onClick={() => confirmDialog.onCancel()}>
                Cancel
              </button>
              <button className="confirm-btn-ok" onClick={() => confirmDialog.onConfirm()}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="orders-header">
        <h1>Order Management</h1>
        <div className="orders-stats">
          <div className="stat-card">
            <span className="stat-number">{stats.total ?? pagination.total ?? filteredOrders.length}</span>
            <span className="stat-label">Total Orders</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {deliveredStatValue}
            </span>
            <span className="stat-label">
              Delivered
              {!isMetricsFiltered && <span className="stat-subtext"> (All Branches)</span>}
              {isMetricsFiltered && filters.pickupBranch && (
                <span className="stat-subtext"> ({filters.pickupBranch})</span>
              )}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {stats.inProgress ?? filteredOrders.filter(o => ['layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing'].includes(o.status)).length}
            </span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {stats.pending ?? filteredOrders.filter(o => o.status === 'pending').length}
            </span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="compact-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search orders..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="search-input"
          />
          <FaSearch className="search-icon" />
        </div>
        
        <div className="filter-toggle-container">
          <button 
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter className="filter-icon" />
            Filters
            {showFilters ? <FaChevronUp /> : <FaChevronDown />}
          </button>
          
          {showFilters && (
            <div className="filter-dropdown">
            <div className="filter-group">
              <label>Branch</label>
              <select
                value={filters.pickupBranch}
                onChange={(e) => handleFilterChange('pickupBranch', e.target.value)}
              >
                <option value="">All Branches</option>
                {branchOptions.map(branch => (
                  <option key={branch.value} value={branch.value}>{branch.label}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {getStatusDisplayName(status)}
                  </option>
                ))}
              </select>
            </div>
            
            <button className="clear-filters-btn" onClick={clearFilters}>
              <FaTimes />
              Clear All
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Yohann's Orders Table - Redesigned */}
      <div className="yh-orders-table-wrapper">
        <div className="yh-orders-table-header">
          <div 
            className="yh-orders-header-cell yh-orders-sortable" 
            onClick={() => handleSort('orderNumber')}
          >
            <span className="yh-orders-header-title">Order #</span>
            <FaSort className={`yh-orders-sort-icon ${sortConfig.key === 'orderNumber' ? 'yh-orders-active' : ''}`} />
          </div>
          <div 
            className="yh-orders-header-cell yh-orders-sortable" 
            onClick={() => handleSort('customerName')}
          >
            <span className="yh-orders-header-title">Customer</span>
            <FaSort className={`yh-orders-sort-icon ${sortConfig.key === 'customerName' ? 'yh-orders-active' : ''}`} />
          </div>
          <div className="yh-orders-header-cell">
            <span className="yh-orders-header-title">Items</span>
          </div>
          <div 
            className="yh-orders-header-cell yh-orders-sortable" 
            onClick={() => handleSort('totalAmount')}
          >
            <span className="yh-orders-header-title">Total</span>
            <FaSort className={`yh-orders-sort-icon ${sortConfig.key === 'totalAmount' ? 'yh-orders-active' : ''}`} />
          </div>
          <div 
            className="yh-orders-header-cell yh-orders-sortable" 
            onClick={() => handleSort('orderDate')}
          >
            <span className="yh-orders-header-title">Date</span>
            <FaSort className={`yh-orders-sort-icon ${sortConfig.key === 'orderDate' ? 'yh-orders-active' : ''}`} />
          </div>
          <div className="yh-orders-header-cell">
            <span className="yh-orders-header-title">Status</span>
          </div>
          <div className="yh-orders-header-cell">
            <span className="yh-orders-header-title">Actions</span>
          </div>
        </div>
        
        <div className="yh-orders-table-body">
          {(filteredOrders || []).map((order, index) => {
            const dateInfo = formatDate(order.orderDate);
            return (
              <div key={`${order.id || order.orderNumber || 'order'}-${index}`} className={`yh-orders-table-row ${index % 2 === 0 ? 'yh-orders-row-even' : 'yh-orders-row-odd'}`}>
                <div className="yh-orders-table-cell yh-orders-cell-order-number">
                  <span 
                    className="yh-orders-number-text"
                    title={order.orderNumber}
                  >
                    {truncateOrderNumber(order.orderNumber)}
                  </span>
                </div>
                
                <div className="yh-orders-table-cell yh-orders-cell-customer">
                  <div className="yh-orders-customer-name">{order.customerName}</div>
                  <div className="yh-orders-customer-email">{order.customerEmail || 'N/A'}</div>
                </div>
                
                <div className="yh-orders-table-cell yh-orders-cell-items">
                  <div className="yh-orders-items-count">{order.totalItems} item{order.totalItems !== 1 ? 's' : ''}</div>
                  <div className="yh-orders-delivery-method">
                    {order.shippingMethod === 'pickup' ? 'Pickup' : 'COD'}
                    {order.pickupLocation && ` - ${order.pickupLocation.substring(0, 15)}...`}
                  </div>
                </div>
                
                <div className="yh-orders-table-cell yh-orders-cell-total">
                  <span className="yh-orders-total-price">₱{(order.totalAmount || 0).toFixed(2)}</span>
                </div>
                
                <div className="yh-orders-table-cell yh-orders-cell-date">
                  <div className="yh-orders-date-wrapper">
                    <div className="yh-orders-date-text">{dateInfo.date}</div>
                    <div className="yh-orders-time-text">{dateInfo.time}</div>
                  </div>
                </div>
                
                <div className="yh-orders-table-cell yh-orders-cell-status">
                  <div 
                    className={`yh-orders-status-badge yh-orders-status-${getStatusColor(order.status)}`}
                    title={getStatusDescription(order.status)}
                  >
                    {getStatusDisplayName(order.status)}
                  </div>
                </div>
                
                <div className="yh-orders-table-cell yh-orders-cell-actions">
                  <button 
                    className="yh-orders-view-btn"
                    onClick={() => toggleOrderExpansion(order.id)}
                    title="View Details"
                  >
                    <FaEye className="yh-orders-btn-icon" />
                    <span className="yh-orders-btn-text">View</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pagination Controls - shown only when filters are applied */}
      {pagination.totalPages > 1 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total orders)
          </div>
          <div className="pagination-buttons">
            <button
              className="pagination-btn prev-btn"
              onClick={() => setPagination(prev => ({...prev, page: Math.max(1, prev.page - 1)}))}
              disabled={pagination.page === 1}
            >
              <FaChevronLeft /> Previous
            </button>
            
            <div className="page-numbers">
              {Array.from({length: Math.min(5, pagination.totalPages)}, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`page-number ${pagination.page === pageNum ? 'active' : ''}`}
                    onClick={() => setPagination(prev => ({...prev, page: pageNum}))}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              className="pagination-btn next-btn"
              onClick={() => setPagination(prev => ({...prev, page: Math.min(pagination.totalPages, prev.page + 1)}))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next <FaChevronRight />
            </button>
          </div>
        </div>
      )}
      
      {/* Show all orders count when no filters are applied */}
      <div className="orders-count-info">
        Showing {filteredOrders.length} orders on this page (limit {pagination.limit}) out of {stats.total ?? pagination.total ?? filteredOrders.length} total
      </div>

      {/* Expanded Order Details Modal */}
      {expandedOrder && (
        <div className="order-details-modal" onClick={() => setExpandedOrder(null)}>
          {(() => {
            const order = orders.find(o => o.id === expandedOrder);
            if (!order) return null;
            const userRole = user?.user_metadata?.role || 'customer';
            const designFiles = Array.isArray(order.designFiles)
              ? order.designFiles
              : Array.isArray(order.design_files)
                ? order.design_files
                : [];
            const canViewDesignFiles = ['admin', 'owner'].includes(userRole);
            
            return (
              <div className="order-details-content" onClick={(e) => e.stopPropagation()}>
                <div className="order-details-header">
                  <h3>Order Details - {order.orderNumber}</h3>
                  <button 
                    className="close-details-btn"
                    onClick={() => setExpandedOrder(null)}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>
                
                <div className="order-details-body">
                  {/* Tabs */}
                  <div className="order-details-tabs">
                    <button
                      className={`orders-tab-btn ${orderDetailsActiveTab === 'details' ? 'active' : ''}`}
                      onClick={() => setOrderDetailsActiveTab('details')}
                    >
                      Details
                    </button>
                    <button
                      className={`orders-tab-btn ${orderDetailsActiveTab === 'status' ? 'active' : ''}`}
                      onClick={() => setOrderDetailsActiveTab('status')}
                    >
                      Order Status
                    </button>
                  </div>
                  {orderDetailsActiveTab === 'details' && (
                  <>
                  <div className="yh-customer-section">
                    <h4 className="yh-customer-heading">
                      <FaUser className="yh-customer-heading-icon" />
                      {order.orderItems?.[0]?.product_type === 'custom_design' ? 'Custom Design Client Information' : 'Customer Information'}
                    </h4>
                    <div className="yh-customer-info-grid">
                      <div className="yh-customer-info-row">
                        <span className="yh-customer-label">
                          <FaUser className="yh-customer-icon" />
                          Name:
                        </span>
                        <span className="yh-customer-value">
                          {order.orderItems?.[0]?.product_type === 'custom_design' 
                            ? order.orderItems[0]?.client_name || order.customerName
                            : order.customerName
                          }
                        </span>
                      </div>
                      <div className="yh-customer-info-row">
                        <span className="yh-customer-label">
                          <FaEnvelope className="yh-customer-icon" />
                          Email:
                        </span>
                        <span className="yh-customer-value yh-customer-value-email">
                          {order.orderItems?.[0]?.product_type === 'custom_design' 
                            ? order.orderItems[0]?.client_email || order.customerEmail
                            : order.customerEmail
                          }
                        </span>
                      </div>
                      <div className="yh-customer-info-row">
                        <span className="yh-customer-label">
                          <FaPhone className="yh-customer-icon" />
                          Phone:
                        </span>
                        <span className="yh-customer-value yh-customer-value-phone">
                          {order.orderItems?.[0]?.product_type === 'custom_design' 
                            ? order.orderItems[0]?.client_phone || order.deliveryAddress?.phone || 'N/A'
                            : order.deliveryAddress?.phone || 'N/A'
                          }
                        </span>
                      </div>
                      <div className="yh-customer-info-row">
                        <span className="yh-customer-label">
                          <FaMapMarkerAlt className="yh-customer-icon" />
                          Address:
                        </span>
                        <span className="yh-customer-value yh-customer-value-address">
                          {(() => {
                            // Check both naming conventions (snake_case and camelCase)
                            const deliveryAddr = order.delivery_address || order.deliveryAddress;
                            
                            // Show delivery address if it exists
                            if (deliveryAddr?.address) {
                              return deliveryAddr.address;
                            }
                            
                            // If no delivery address, show pickup location (nearest branch used as drop point)
                            const pickupLoc = order.pickup_location || order.pickupLocation;
                            if (pickupLoc) {
                              return pickupLoc;
                            }
                            
                            return 'N/A';
                          })()}
                        </span>
                      </div>
                      {assignedArtists[expandedOrder] && (
                        <div className="yh-customer-info-row">
                          <span className="yh-customer-label">
                            <FaPalette className="yh-customer-icon" />
                            Assigned Artist:
                          </span>
                          <span className="yh-customer-value">
                            {assignedArtists[expandedOrder].artist_name || 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="details-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0 }}><FaBox className="section-icon" />Order Items</h4>
                      <button
                        type="button"
                        onClick={() => {
                          // Find the order items section by finding the section with "Order Items" heading
                          const allSections = document.querySelectorAll('.details-section');
                          const orderItemsSection = Array.from(allSections).find(section => {
                            const heading = section.querySelector('h4');
                            return heading && heading.textContent.includes('Order Items');
                          });
                          
                          if (!orderItemsSection) return;
                          
                          // Clone the section and remove the print button
                          const printContent = orderItemsSection.cloneNode(true);
                          const headerDiv = printContent.querySelector('div[style*="display: flex"]');
                          const printBtn = headerDiv?.querySelector('button');
                          if (printBtn) printBtn.remove();
                          
                          const printWindow = window.open('', '_blank');
                          
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Order Items - Order ${order.orderNumber || order.id}</title>
                                <style>
                                  body {
                                    font-family: Arial, sans-serif;
                                    padding: 20px;
                                    color: #000;
                                  }
                                  h4 {
                                    margin: 0 0 15px 0;
                                    font-size: 18px;
                                    font-weight: bold;
                                  }
                                  .order-item {
                                    border: 1px solid #ddd;
                                    border-radius: 8px;
                                    padding: 15px;
                                    margin-bottom: 15px;
                                    background: #fff;
                                  }
                                  .custom-design-item, .regular-order-item {
                                    margin-bottom: 15px;
                                  }
                                  .custom-design-header {
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                    margin-bottom: 15px;
                                  }
                                  .custom-design-title {
                                    font-weight: bold;
                                    font-size: 16px;
                                  }
                                  .custom-design-subtitle {
                                    color: #666;
                                    font-size: 14px;
                                  }
                                  .item-header {
                                    display: flex;
                                    gap: 15px;
                                    margin-bottom: 10px;
                                  }
                                  .item-image {
                                    width: 80px;
                                    height: 80px;
                                    object-fit: cover;
                                    border-radius: 4px;
                                  }
                                  .item-name {
                                    font-weight: bold;
                                    font-size: 16px;
                                    margin-bottom: 5px;
                                  }
                                  .item-price {
                                    color: #666;
                                    font-size: 14px;
                                  }
                                  table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    margin-top: 10px;
                                  }
                                  th, td {
                                    border: 1px solid #ddd;
                                    padding: 8px;
                                    text-align: left;
                                    font-size: 12px;
                                  }
                                  th {
                                    background-color: #f5f5f5;
                                    font-weight: bold;
                                  }
                                  .design-review-section, .design-upload-section {
                                    margin-top: 15px;
                                    padding-top: 15px;
                                    border-top: 1px solid #eee;
                                  }
                                  .custom-design-section-title {
                                    font-size: 14px;
                                    font-weight: bold;
                                    margin-bottom: 10px;
                                  }
                                  .jersey-details-table, .design-review-table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    margin-top: 10px;
                                  }
                                  @media print {
                                    body {
                                      padding: 10px;
                                    }
                                    button {
                                      display: none;
                                    }
                                  }
                                </style>
                              </head>
                              <body>
                                <h2>Order Items - Order ${order.orderNumber || order.id}</h2>
                                <p><strong>Date:</strong> ${new Date(order.created_at || order.createdAt).toLocaleString()}</p>
                                <p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
                                <hr style="margin: 20px 0;" />
                                ${printContent.innerHTML}
                                <script>
                                  window.onload = function() {
                                    window.print();
                                  };
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                      >
                        <FaPrint /> Print Order Items
                      </button>
                    </div>
                    {(Array.isArray(order.orderItems) ? order.orderItems : []).map((item, index) => {
                      // Determine category for hiding fields
                      const categoryLower = (item.category || '').toString().toLowerCase().trim();
                      const isUniformsCategory = categoryLower === 'uniforms';
                      const isHoodieCategory = categoryLower === 'hoodies';
                      const isLongSleevesCategory = categoryLower === 'long sleeves';
                      const isTShirtCategory = categoryLower === 't-shirts' || categoryLower === 't-shirt';
                      const shouldHideJerseyType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                      const shouldHideCutType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                      
                      // Helper function to map apparel type to display name
                      const getApparelDisplayName = (apparelType) => {
                        const apparelTypeMap = {
                          'basketball_jersey': 'Custom Basketball Jersey',
                          'volleyball_jersey': 'Custom Volleyball Jersey',
                          'hoodie': 'Custom Hoodie',
                          'tshirt': 'Custom T-shirt',
                          'longsleeves': 'Custom Long Sleeves',
                          'uniforms': 'Custom Uniforms'
                        };
                        return apparelTypeMap[apparelType] || 'Custom Design';
                      };

                      // Helper function to check if an item is a ball or trophy
                      const isBallOrTrophyItem = (item) => {
                        const category = (item.category || item.product_type || '').toString().toLowerCase().trim();
                        const name = (item.name || '').toString().toLowerCase().trim();
                        
                        if (category === 'balls' || category === 'trophies') {
                          return true;
                        }
                        
                        if (name.includes('ball') && !name.includes('basketball') && !name.includes('volleyball') && !name.includes('jersey')) {
                          return true;
                        }
                        
                        if (name.includes('trophy') || name.includes('trophie')) {
                          return true;
                        }
                        
                        return false;
                      };

                      // Get first design image as product image
                      const designImage = item.design_images && item.design_images.length > 0 
                        ? item.design_images[0].url 
                        : null;

                      return (
                        <div key={index} className="order-item">
                          {item.product_type === 'custom_design' ? (
                            <div className="custom-design-item">
                              {/* Use same header structure as regular orders with unique class names */}
                              <div className="cd-order-item-header">
                                <div 
                                  className="cd-order-item-image-wrapper"
                                  onClick={() => {
                                    const images = item.design_images || [];
                                    if (images.length > 0) {
                                      openImageGallery(images, 0);
                                    }
                                  }}
                                  style={{ position: 'relative', cursor: (item.design_images && item.design_images.length > 0) ? 'pointer' : 'default' }}
                                >
                                  <img 
                                    src={designImage || '/placeholder-image.png'} 
                                    alt={getApparelDisplayName(item.apparel_type)} 
                                    className="cd-order-item-image"
                                    onError={(e) => {
                                      e.target.src = '/placeholder-image.png';
                                    }}
                                  />
                                  {item.design_images && item.design_images.length > 1 && (
                                    <div className="cd-order-item-image-badge">
                                      +{item.design_images.length - 1}
                                    </div>
                                  )}
                                </div>
                                <div className="cd-order-item-info">
                                  <div className="cd-order-item-name">{getApparelDisplayName(item.apparel_type)}</div>
                                  <div className="cd-order-item-price">
                                    ₱{(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} × {item.quantity || 1}
                                  </div>
                                </div>
                              </div>
                            
                            {/* Submitted Design Files section removed - using existing design files section near bottom */}

                            {/* Team Details - Same structure as regular team orders */}
                            {item.team_members && item.team_members.length > 0 && (
                              <div className="team-details">
                                <div className="team-name">Team: {item.team_name || 'N/A'}</div>
                                <div className="team-members-table">
                                  {(() => {
                                    const members = item.team_members || [];
                                    const fallbackVisibility = {
                                      jersey: members.some(member => Boolean(member?.size)),
                                      shorts: members.some(member => Boolean(member?.shortsSize))
                                    };
                                    const { showJersey: showTeamJerseySize, showShorts: showTeamShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                    return (
                                     <table className="jersey-details-table">
                                       <thead>
                                         <tr>
                                           <th>Surname</th>
                                           <th>Jersey #</th>
                                           {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                           {!shouldHideJerseyType && <th>Jersey Type</th>}
                                           <th>Fabric</th>
                                           {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                           {!shouldHideCutType && <th>Cut Type</th>}
                                           <th>Size Type</th>
                                           {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                           {((showTeamJerseySize || members.some(m => Boolean(m?.size))) || shouldHideJerseyType) && <th>{shouldHideJerseyType ? 'Size' : 'Jersey Size'}</th>}
                                           {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                           {(showTeamShortsSize || members.some(m => Boolean(m?.shortsSize))) && !shouldHideJerseyType && <th>Shorts Size</th>}
                                         </tr>
                                       </thead>
                                       <tbody>
                                         {members.map((member, memberIndex) => {
                                           const memberJerseyType = member.jerseyType || 'full';
                                           const memberFabricOption = member.fabricOption || '';
                                           const memberCutType = member.cutType || '';
                                           const memberSizingType = member.sizingType || 'adults';
                                           const jerseyTypeLabel = memberJerseyType === 'shirt' ? 'Shirt Only' : memberJerseyType === 'shorts' ? 'Shorts Only' : 'Full Set';
                                           
                                           return (
                                             <tr key={memberIndex}>
                                               <td>{(member.surname || 'N/A').toUpperCase()}</td>
                                               <td>{member.number || 'N/A'}</td>
                                               {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                               {!shouldHideJerseyType && <td>{jerseyTypeLabel}</td>}
                                               <td>{memberFabricOption || 'N/A'}</td>
                                               {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                               {!shouldHideCutType && <td>{memberCutType || 'N/A'}</td>}
                                               <td>{memberSizingType === 'kids' ? 'Kids' : 'Adult'}</td>
                                               {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                               {((showTeamJerseySize || members.some(m => Boolean(m?.size))) || (shouldHideJerseyType && (member.size || member.jerseySize))) && (
                                                 <td>{(memberJerseyType === 'full' || memberJerseyType === 'shirt' || shouldHideJerseyType) ? (member.size || member.jerseySize || 'N/A') : '-'}</td>
                                               )}
                                               {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                               {(showTeamShortsSize || members.some(m => Boolean(m?.shortsSize))) && !shouldHideJerseyType && (
                                                 <td>{(memberJerseyType === 'full' || memberJerseyType === 'shorts') ? (member.shortsSize || 'N/A') : '-'}</td>
                                               )}
                                             </tr>
                                           );
                                         })}
                                       </tbody>
                                     </table>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* Design Upload Section - Artist Only */}
                            {/* Show upload button only if: customer approved OR 1 hour passed since review request */}
                            {/* Revision Notes - placed above Upload section for artist */}
                            {(() => {
                              const roleLower = (user?.user_metadata?.role || '').toLowerCase();
                              const canSeeNotes = ['artist', 'admin', 'owner'].includes(roleLower);
                              if (!canSeeNotes) return null;
                              // Gather notes from server for this order
                              const serverKey = (order.orderNumber || order.id);
                              const fetched = serverRevisionNotes?.[serverKey] || [];
                              // Only use server-fetched notes for this order
                              const sources = [];
                              const notes = Array.isArray(fetched) ? fetched : [];
                              // Normalize, dedupe, sort
                              const seen = new Set();
                              const normalized = notes
                                .map(n => (typeof n === 'string' ? { message: n } : n))
                                .filter(n => {
                                  const key = `${n.message || n.text || n.note}-${n.createdAt || n.created_at || n.timestamp || ''}`;
                                  if (seen.has(key)) return false;
                                  seen.add(key);
                                  return Boolean(n.message || n.text || n.note);
                                })
                                .sort((a, b) => {
                                  const ta = new Date(a.createdAt || a.created_at || a.timestamp || 0).getTime();
                                  const tb = new Date(b.createdAt || b.created_at || b.timestamp || 0).getTime();
                                  return tb - ta;
                                });
                              try { console.log('[Orders] Above-upload revision notes', { orderId: order.id, itemId: item.id, serverKey, normalizedCount: normalized.length }); } catch (_) {}
                              if (normalized.length === 0) return null;
                              return (
                                <div
                                  className="revision-notes-panel above-upload"
                                  style={{
                                    border: '1px solid var(--border-color, #e5e7eb)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    margin: '10px 0 14px',
                                    background: '#fff'
                                  }}
                                >
                                  <div
                                    className="panel-title"
                                    style={{ fontWeight: 700, marginBottom: '8px', fontSize: 'clamp(13px, 1.2vw, 16px)', color: '#dc2626' }}
                                  >
                                    Revision Notes
                                  </div>
                                  <div className="notes-list" style={{ display: 'grid', gap: '10px' }}>
                                    {normalized.map((n, i) => {
                                      const ts = n.createdAt || n.created_at || n.timestamp || null;
                                      const when = ts ? new Date(ts).toLocaleString() : '';
                                      const by = n.author || n.createdBy || n.user || 'Admin';
                                      const msg = n.message || n.text || n.note || String(n);
                                      return (
                                        <div
                                          key={i}
                                          className="note-item"
                                          style={{
                                            border: '1px solid var(--border-color, #e5e7eb)',
                                            borderRadius: '8px',
                                            padding: '10px'
                                          }}
                                        >
                                          <div
                                            className="note-meta"
                                            style={{ fontSize: 'clamp(11px, 1vw, 13px)', opacity: 0.7, marginBottom: 6 }}
                                          >
                                            {by}{when ? ` • ${when}` : ''}
                                          </div>
                                          <div
                                            className="note-message"
                                            style={{ fontSize: 'clamp(12px, 1.1vw, 15px)', whiteSpace: 'pre-wrap', color: '#000' }}
                                          >
                                            {msg}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                            {user?.user_metadata?.role === 'artist' && 
                             (item.status === 'confirmed' || item.status === 'layout') && 
                             orderApprovalStatus[item.id] && (
                              <div className="design-upload-section">
                                <h5 className="custom-design-section-title">
                                  <FaUpload className="section-icon" />
                                  Upload Design Files
                                </h5>
                                <div className="design-upload-area">
                                  <input
                                    type="file"
                                    id={`design-upload-${item.id}`}
                                    multiple
                                    accept="image/*,.pdf,.ai,.psd"
                                    onChange={(e) => handleDesignUpload(item.id, e.target.files)}
                                    style={{ display: 'none' }}
                                    disabled={uploadingDesigns[item.id]}
                                  />
                                  <label 
                                    htmlFor={`design-upload-${item.id}`}
                                    className={`design-upload-label ${uploadingDesigns[item.id] ? 'uploading' : ''}`}
                                  >
                                    {uploadingDesigns[item.id] ? (
                                      <>
                                        <FaClock className="upload-icon" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <FaUpload className="upload-icon" />
                                        Click to upload design files
                                      </>
                                    )}
                                  </label>
                                  <p className="design-upload-hint">
                                    Upload design files to automatically move order to sizing status
                                    <br />
                                    <small style={{ fontSize: '0.85em', opacity: 0.8 }}>
                                      (Button appears after customer approval or 1 hour after review request)
                                    </small>
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Pickup Information */}
                            {item.pickup_branch_id && (
                              <div className="custom-design-pickup-section">
                                <h5 className="custom-design-section-title">
                                  <FaMapMarkerAlt className="section-icon" />
                                  Pickup Information
                                </h5>
                                <div className="custom-design-pickup-details">
                                  <strong>Pickup Branch:</strong> {item.pickup_branch_id}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="regular-order-item">
                            <div className="item-header">
                              <img src={item.image} alt={item.name} className="item-image" />
                              <div className="item-info">
                                <div className="item-name">{item.name}</div>
                                <div className="item-price">
                                  ₱{(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{item.isTeamOrder ? '' : ` × ${item.quantity}`}
                                </div>
                              </div>
                            </div>
                            
                            {/* Submitted Design Files section removed - using existing design files section near bottom */}

                            {item.isTeamOrder && item.teamMembers && item.teamMembers.length > 0 && (
                              <div className="team-details">
                                <div className="team-name">Team: {item.teamName || item.team_name || item.teamMembers?.[0]?.teamName || item.teamMembers?.[0]?.team_name || 'N/A'}</div>
                                <div className="team-members-table">
                                  {(() => {
                                    const fallbackVisibility = {
                                      jersey: item.teamMembers.some(member => Boolean(member?.jerseySize || member?.size)),
                                      shorts: item.teamMembers.some(member => Boolean(member?.shortsSize))
                                    };
                                    const { showJersey: showTeamJerseySize, showShorts: showTeamShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                    return (
                                     <table className="jersey-details-table">
                                       <thead>
                                         <tr>
                                           <th>Surname</th>
                                           <th>Jersey #</th>
                                           {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                           {!shouldHideJerseyType && <th>Jersey Type</th>}
                                           <th>Fabric</th>
                                           {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                           {!shouldHideCutType && <th>Cut Type</th>}
                                           <th>Size Type</th>
                                           {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                           {((showTeamJerseySize || item.teamMembers.some(m => Boolean(m?.jerseySize || m?.size))) || shouldHideJerseyType) && <th>{shouldHideJerseyType ? 'Size' : 'Jersey Size'}</th>}
                                           {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                           {(showTeamShortsSize || item.teamMembers.some(m => Boolean(m?.shortsSize))) && !shouldHideJerseyType && <th>Shorts Size</th>}
                                         </tr>
                                       </thead>
                                       <tbody>
                                         {item.teamMembers.map((member, memberIndex) => {
                                           const memberJerseyType = member.jerseyType || member.jersey_type || 'full';
                                           const memberFabricOption = member.fabricOption || member.fabric_option || '';
                                           const memberCutType = member.cutType || member.cut_type || '';
                                           const memberSizingType = member.sizingType || member.sizing_type || item.sizeType || 'adult';
                                           const jerseyTypeLabel = memberJerseyType === 'shirt' ? 'Shirt Only' : memberJerseyType === 'shorts' ? 'Shorts Only' : 'Full Set';
                                           
                                           return (
                                             <tr key={memberIndex}>
                                               <td>{(member.surname || member.lastName || 'N/A').toUpperCase()}</td>
                                               <td>{member.number || member.jerseyNo || member.jerseyNumber || 'N/A'}</td>
                                               {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                               {!shouldHideJerseyType && <td>{jerseyTypeLabel}</td>}
                                               <td>{memberFabricOption || 'N/A'}</td>
                                               {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                               {!shouldHideCutType && <td>{memberCutType || 'N/A'}</td>}
                                               <td>{memberSizingType === 'kids' ? 'Kids' : 'Adult'}</td>
                                               {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                               {((showTeamJerseySize || item.teamMembers.some(m => Boolean(m?.jerseySize || m?.size))) || (shouldHideJerseyType && (member.size || member.jerseySize))) && (
                                                 <td>{(memberJerseyType === 'full' || memberJerseyType === 'shirt' || shouldHideJerseyType) ? (member.jerseySize || member.size || 'N/A') : '-'}</td>
                                               )}
                                               {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                               {(showTeamShortsSize || item.teamMembers.some(m => Boolean(m?.shortsSize))) && !shouldHideJerseyType && (
                                                 <td>{(memberJerseyType === 'full' || memberJerseyType === 'shorts') ? (member.shortsSize || 'N/A') : '-'}</td>
                                               )}
                                             </tr>
                                           );
                                         })}
                                       </tbody>
                                     </table>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                            
                            {!item.isTeamOrder && item.singleOrderDetails && (
                              <div className="single-details">
                                <div className="team-name">Team: {item.singleOrderDetails.teamName || item.singleOrderDetails?.team_name || 'N/A'}</div>
                                <div className="single-details-table">
                                  {(() => {
                                    const fallbackVisibility = {
                                      jersey: Boolean(item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size),
                                      shorts: Boolean(item.singleOrderDetails?.shortsSize)
                                    };
                                    const { showJersey: showSingleJerseySize, showShorts: showSingleShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                    return (
                                      <table className="jersey-details-table">
                                        <thead>
                                          <tr>
                                            <th>Surname</th>
                                            <th>Jersey #</th>
                                            {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                            {!shouldHideJerseyType && <th>Jersey Type</th>}
                                            <th>Fabric</th>
                                            {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                            {!shouldHideCutType && <th>Cut Type</th>}
                                            <th>Size Type</th>
                                            {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                            {((showSingleJerseySize || Boolean(item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size)) || shouldHideJerseyType) && <th>{shouldHideJerseyType ? 'Size' : 'Jersey Size'}</th>}
                                            {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                            {(showSingleShortsSize || Boolean(item.singleOrderDetails?.shortsSize)) && !shouldHideJerseyType && <th>Shorts Size</th>}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td>{(item.singleOrderDetails.surname || item.singleOrderDetails?.lastName || 'N/A').toUpperCase()}</td>
                                            <td>{item.singleOrderDetails.number || item.singleOrderDetails?.jerseyNo || item.singleOrderDetails?.jerseyNumber || 'N/A'}</td>
                                            {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                            {!shouldHideJerseyType && (
                                              <td>{(() => {
                                                const jerseyType = item.jerseyType || item.singleOrderDetails?.jerseyType || 'full';
                                                return jerseyType === 'shirt' ? 'Shirt Only' : jerseyType === 'shorts' ? 'Shorts Only' : 'Full Set';
                                              })()}</td>
                                            )}
                                            <td>{item.fabricOption || item.singleOrderDetails?.fabricOption || 'N/A'}</td>
                                            {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                            {!shouldHideCutType && <td>{item.cutType || item.singleOrderDetails?.cutType || 'N/A'}</td>}
                                            <td>{(item.singleOrderDetails.sizingType || item.sizeType || 'adult') === 'kids' ? 'Kids' : 'Adult'}</td>
                                            {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                            {((showSingleJerseySize || Boolean(item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size)) || shouldHideJerseyType) && (
                                              <td>{item.singleOrderDetails.jerseySize || item.singleOrderDetails.size || 'N/A'}</td>
                                            )}
                                            {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                            {(showSingleShortsSize || Boolean(item.singleOrderDetails?.shortsSize)) && !shouldHideJerseyType && (
                                              <td>{item.singleOrderDetails.shortsSize || 'N/A'}</td>
                                            )}
                                          </tr>
                                        </tbody>
                                      </table>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  
                  {/* Redesigned Order Summary */}
                  <div className="details-section yh-summary-section">
                    <h4 className="yh-summary-heading">
                      <FaDollarSign className="yh-summary-heading-icon" />
                      Order Summary
                    </h4>
                    <div className="yh-summary-container">
                      <div className="yh-summary-item yh-summary-subtotal">
                        <div className="yh-summary-label">
                          <FaDollarSign className="yh-summary-icon" />
                          <span className="yh-summary-label-text">Subtotal</span>
                        </div>
                        <span className="yh-summary-value">₱{(order.subtotalAmount || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="yh-summary-item yh-summary-shipping">
                        <div className="yh-summary-label">
                          <FaShippingFast className="yh-summary-icon" />
                          <span className="yh-summary-label-text">Shipping</span>
                        </div>
                        <span className="yh-summary-value">₱{(order.shippingCost || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="yh-summary-divider"></div>
                      
                      <div className="yh-summary-item yh-summary-total">
                        <div className="yh-summary-label">
                          <FaDollarSign className="yh-summary-icon yh-summary-total-icon" />
                          <span className="yh-summary-label-text yh-summary-total-label">Total Amount</span>
                        </div>
                        <span className="yh-summary-value yh-summary-total-value">₱{(order.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {order.orderNotes && (
                    <div className="details-section">
                      <h4><FaFileAlt className="section-icon" />Order Notes</h4>
                      <div className="order-notes">{order.orderNotes}</div>
                    </div>
                  )}
                  </>
                  )}
                  {orderDetailsActiveTab === 'status' && (
                  <div className="details-section">
                    <h4><FaCog className="section-icon" />Order Status Management</h4>
                    <div className="status-update-section">
                      <div className="current-status-display">
                        <div className="status-info-card">
                          <span className="status-label">Current Status:</span>
                          <span className={`status-value status-${order.status}`}>
                            {getStatusDisplayName(order.status)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Order Status Flow Guide */}
                      <div className="status-flow-guide">
                        <h5><FaArrowRight className="flow-icon" /> Order Status Flow:</h5>
                        <div className="flow-steps">
                          {(() => {
                            // For ball/trophy orders, only show: pending, confirmed, packing_completing, picked_up_delivered
                            // For apparel orders, show all stages
                            const ballOrTrophy = hasBallOrTrophyProducts(order);
                            const stages = ballOrTrophy 
                              ? ['pending', 'confirmed', 'packing_completing', 'picked_up_delivered']
                              : ['pending', 'confirmed', 'layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing', 'picked_up_delivered'];
                            
                            return stages.map((stage, index, arr) => {
                            const stageIndex = arr.indexOf(order.status);
                            const currentStageIndex = arr.indexOf(stage);
                            const isActive = order.status === stage;
                            const isCompleted = stageIndex > currentStageIndex && stageIndex >= 0;
                            
                            return (
                              <React.Fragment key={stage}>
                                <span className={`flow-step ${isActive ? 'active' : isCompleted ? 'completed' : ''}`}>
                                  {getStatusDisplayName(stage)}
                                </span>
                                {index < arr.length - 1 && <span className="flow-arrow"><FaArrowRight /></span>}
                              </React.Fragment>
                            );
                            });
                          })()}
                        </div>
                      </div>
                      
                      <p className="status-description">
                        Update the order status as it progresses through fulfillment.
                      </p>
                      
                      {/* Assigned Artist */}
                      {assignedArtists[expandedOrder] && (
                        <div className="status-info-card" style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
                          <span className="status-label">
                            <FaPalette style={{ marginRight: '0.5rem' }} />
                            Assigned Artist:
                          </span>
                          <span className="status-value" style={{ color: 'var(--text-primary)' }}>
                            {assignedArtists[expandedOrder].artist_name || 'N/A'}
                          </span>
                        </div>
                      )}

                      {/* Pending Orders - Confirm/Cancel Buttons */}
                      {order.status === 'pending' && (
                        <div className="orders-pending-action-buttons">
                          <button 
                            className="orders-status-update-btn orders-confirm-btn"
                            onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                          >
                            <FaCheck className="orders-status-icon" /> Confirm Order
                          </button>
                          <button 
                            className="orders-status-update-btn orders-cancel-btn"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this order?')) {
                                handleStatusUpdate(order.id, 'cancelled');
                              }
                            }}
                          >
                            <FaTimes className="orders-status-icon" /> Cancel Order
                          </button>
                        </div>
                      )}

                      {/* Status Update Buttons - For all statuses except pending */}
                      {order.status !== 'pending' && (
                        <div className="status-buttons">
                          {/* Confirmed - Start Layout (for apparel) or Move to Packing (for balls/trophies) */}
                          {order.status === 'confirmed' && (
                            <>
                              {hasBallOrTrophyProducts(order) ? (
                                <button 
                                  className="status-update-btn process-btn"
                                  onClick={() => handleStatusUpdate(order.id, 'packing_completing')}
                                >
                                  <FaBox className="status-icon" /> Move to Packing
                                </button>
                              ) : (
                            <button 
                              className="status-update-btn process-btn"
                              onClick={() => handleStatusUpdate(order.id, 'layout')}
                            >
                              <FaPalette className="status-icon" /> Start Layout
                            </button>
                              )}
                            </>
                          )}
                          
                          {/* Layout - Move to Sizing (only for apparel orders) */}
                          {order.status === 'layout' && !hasBallOrTrophyProducts(order) && (
                            <button 
                              className={`status-update-btn process-btn ${user?.user_metadata?.role !== 'artist' ? 'disabled-btn' : ''}`}
                              onClick={() => handleStatusUpdate(order.id, 'sizing')}
                              disabled={user?.user_metadata?.role !== 'artist'}
                              title={user?.user_metadata?.role !== 'artist' ? 'Only artists can move orders to sizing status' : 'Move to Sizing'}
                            >
                              <FaRuler className="status-icon" /> 
                              {user?.user_metadata?.role !== 'artist' ? 'Artist Only - Move to Sizing' : 'Move to Sizing'}
                            </button>
                          )}
                          
                          {/* Sizing - Move to Printing (only for apparel orders) */}
                          {order.status === 'sizing' && !hasBallOrTrophyProducts(order) && (
                            <button 
                              className="status-update-btn process-btn"
                              onClick={() => handleStatusUpdate(order.id, 'printing')}
                            >
                              <FaPrint className="status-icon" /> Move to Printing
                            </button>
                          )}
                          
                          {/* Printing - Move to Press (only for apparel orders) */}
                          {order.status === 'printing' && !hasBallOrTrophyProducts(order) && (
                            <button 
                              className="status-update-btn process-btn"
                              onClick={() => handleStatusUpdate(order.id, 'press')}
                            >
                              <FaCog className="status-icon" /> Move to Press
                            </button>
                          )}
                          
                          {/* Press - Move to Prod (only for apparel orders) */}
                          {order.status === 'press' && !hasBallOrTrophyProducts(order) && (
                            <button 
                              className="status-update-btn process-btn"
                              onClick={() => handleStatusUpdate(order.id, 'prod')}
                            >
                              <FaIndustry className="status-icon" /> Move to Prod
                            </button>
                          )}
                          
                          {/* Prod - Move to Packing (only for apparel orders) */}
                          {order.status === 'prod' && !hasBallOrTrophyProducts(order) && (
                            <button 
                              className="status-update-btn process-btn"
                              onClick={() => handleStatusUpdate(order.id, 'packing_completing')}
                            >
                              <FaBox className="status-icon" /> Move to Packing/Completing
                            </button>
                          )}
                          
                          {/* Packing - Mark as Picked Up/Delivered */}
                          {order.status === 'packing_completing' && (
                            <button 
                              className="status-update-btn complete-btn"
                              onClick={() => handleStatusUpdate(order.id, 'picked_up_delivered')}
                            >
                              <FaCheck className="status-icon" /> Mark as Picked Up/Delivered
                            </button>
                          )}
                          
                          {/* Picked Up/Delivered - Final Status */}
                          {order.status === 'picked_up_delivered' && (
                            <div className="status-complete-message">
                              <span className="complete-icon"><FaCheck /></span>
                              <p>This order has been completed and delivered.</p>
                            </div>
                          )}
                          
                          {/* Cancelled Orders */}
                          {order.status === 'cancelled' && (
                            <div className="status-cancelled-message">
                              <span className="cancelled-icon"><FaTimes /></span>
                              <p>This order has been cancelled.</p>
                            </div>
                          )}
                          
                          {/* Go Back Option (for any production stage) */}
                          {['layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing'].includes(order.status) && (
                            <button 
                              className="status-update-btn reopen-btn"
                              onClick={() => {
                                // For ball/trophy orders, only allow going back to confirmed from packing
                                if (hasBallOrTrophyProducts(order)) {
                                  if (order.status === 'packing_completing') {
                                    setConfirmDialog({
                                      show: true,
                                      title: 'Go Back One Stage',
                                      message: `Are you sure you want to go back to ${getStatusDisplayName('confirmed')}?`,
                                      currentStatus: getStatusDisplayName(order.status),
                                      newStatus: getStatusDisplayName('confirmed'),
                                      onConfirm: () => {
                                        handleStatusUpdate(order.id, 'confirmed');
                                        setConfirmDialog(null);
                                      },
                                      onCancel: () => setConfirmDialog(null)
                                    });
                                  }
                                } else {
                                  // For apparel orders, use normal flow
                                const stages = ['confirmed', 'layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing'];
                                const currentIndex = stages.indexOf(order.status);
                                if (currentIndex > 0) {
                                  const prevStage = stages[currentIndex - 1];
                                  setConfirmDialog({
                                    show: true,
                                    title: 'Go Back One Stage',
                                    message: `Are you sure you want to go back to ${getStatusDisplayName(prevStage)}?`,
                                    currentStatus: getStatusDisplayName(order.status),
                                    newStatus: getStatusDisplayName(prevStage),
                                    onConfirm: () => {
                                      handleStatusUpdate(order.id, prevStage);
                                      setConfirmDialog(null);
                                    },
                                    onCancel: () => setConfirmDialog(null)
                                  });
                                  }
                                }
                              }}
                            >
                              <FaArrowLeft className="status-icon" /> Go Back One Stage
                            </button>
                          )}
                        </div>
                      )}

                      {canViewDesignFiles && !hasBallOrTrophyProducts(order) && (
                        <div className="design-files-section inside-status">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h5 className="design-files-heading" style={{ margin: 0 }}>
                              <FaFileAlt className="design-files-heading-icon" />
                              Submitted Design Files
                              {designFiles.length > 0 && (
                                <span className="design-files-count">({designFiles.length})</span>
                              )}
                            </h5>
                            {designFiles.length > 0 && ['admin', 'owner'].includes(userRole) && (
                              <button
                                type="button"
                                onClick={() => handleDownloadDesignFilesAsZip(order, designFiles)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--primary-color, #2563eb)',
                                  background: 'var(--primary-color, #2563eb)',
                                  color: '#ffffff',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: 'clamp(12px, 1.1vw, 14px)',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = '#1d4ed8';
                                  e.target.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = 'var(--primary-color, #2563eb)';
                                  e.target.style.transform = 'translateY(0)';
                                }}
                              >
                                <FaDownload />
                                <span>Download ZIP</span>
                              </button>
                            )}
                          </div>

                          {/* Two-column layout: Left roster (35%), Right files (65%) */}
                          <div
                            className="submitted-design-files-grid"
                            style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}
                          >
                            {/* Left Column */}
                            <div
                              className="submitted-col left"
                              style={{ flex: '0 0 35%', maxWidth: '35%' }}
                            >
                              {(() => {
                                // Aggregate team data across items
                                const firstItem = (order.orderItems || [])[0] || {};
                                
                                // Check for team name in various locations
                                // For team orders: check item.team_name or item.teamName
                                // For single orders: check item.singleOrderDetails.teamName or item.singleOrderDetails.team_name
                                const teamName =
                                  firstItem.team_name ||
                                  firstItem.teamName ||
                                  firstItem.singleOrderDetails?.teamName ||
                                  firstItem.singleOrderDetails?.team_name ||
                                  (order.orderItems || []).find(i => i.team_name || i.teamName)?.team_name ||
                                  (order.orderItems || []).find(i => i.team_name || i.teamName)?.teamName ||
                                  (order.orderItems || []).find(i => i.singleOrderDetails?.teamName || i.singleOrderDetails?.team_name)?.singleOrderDetails?.teamName ||
                                  (order.orderItems || []).find(i => i.singleOrderDetails?.teamName || i.singleOrderDetails?.team_name)?.singleOrderDetails?.team_name ||
                                  'N/A';

                                // Only keep the essentials: surname and jersey number
                                const aggregatedMembers = (order.orderItems || []).flatMap(i =>
                                  (i.team_members || i.teamMembers || []).map(m => ({
                                    number: m.number || m.jerseyNo || m.jerseyNumber || '—',
                                    surname: (m.surname || m.lastName || 'N/A').toString().toUpperCase(),
                                    jerseyType: (m.jerseyType || m.jersey_type || i.jerseyType || 'full')
                                  }))
                                );

                                const singleItem = (order.orderItems || []).find(i => i.singleOrderDetails)?.singleOrderDetails || null;
                                const singleChip = singleItem
                                  ? {
                                      number: singleItem.number || singleItem.jerseyNo || singleItem.jerseyNumber || '—',
                                      surname: (singleItem.surname || singleItem.lastName || 'N/A').toString().toUpperCase(),
                                      jerseyType: singleItem.jerseyType || 'full'
                                    }
                                  : null;

                                return (
                                  <div style={{ fontSize: 'clamp(12px, 1.25vw, 16px)' }}>
                                    <div className="team-pill">
                                      <span className="team-pill-label">Team:</span>
                                      <span className="team-pill-name">{teamName}</span>
                                    </div>
                                    {aggregatedMembers.length > 0 ? (
                                      <div className="member-chips">
                                        <div className="member-chips-grid" style={{ gap: '8px', display: 'grid', gridTemplateColumns: '1fr' }}>
                                          {aggregatedMembers.map((m, idx) => (
                                            <div
                                              key={idx}
                                              className="member-chip"
                                              title={`${m.surname} • #${m.number}`}
                                              style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                fontSize: 'clamp(12px, 1.2vw, 16px)'
                                              }}
                                            >
                                              <span className="member-num-badge" style={{ fontSize: 'clamp(12px, 1.1vw, 15px)' }}>#{m.number}</span>
                                              <span className="member-surname-text" style={{ flex: 1, marginLeft: '6px', fontSize: 'clamp(12px, 1.2vw, 16px)' }}>{m.surname}</span>
                                              <span className="member-type-badge" style={{ whiteSpace: 'nowrap', fontSize: 'clamp(11px, 1.05vw, 14px)', opacity: 0.85 }}>
                                                {m.jerseyType === 'shirt' ? 'Shirt Only' : m.jerseyType === 'shorts' ? 'Shorts Only' : 'Full Set'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : singleChip ? (
                                      <div className="member-chips">
                                        <div className="member-chips-grid" style={{ gap: '8px', display: 'grid', gridTemplateColumns: '1fr' }}>
                                          <div
                                            className="member-chip"
                                            title={`${singleChip.surname} • #${singleChip.number}`}
                                            style={{
                                              width: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              gap: '8px',
                                              fontSize: 'clamp(12px, 1.2vw, 16px)'
                                            }}
                                          >
                                            <span className="member-num-badge" style={{ fontSize: 'clamp(12px, 1.1vw, 15px)' }}>#{singleChip.number}</span>
                                            <span className="member-surname-text" style={{ flex: 1, marginLeft: '6px', fontSize: 'clamp(12px, 1.2vw, 16px)' }}>{singleChip.surname}</span>
                                            <span className="member-type-badge" style={{ whiteSpace: 'nowrap', fontSize: 'clamp(11px, 1.05vw, 14px)', opacity: 0.85 }}>
                                              {singleChip.jerseyType === 'shirt' ? 'Shirt Only' : singleChip.jerseyType === 'shorts' ? 'Shorts Only' : 'Full Set'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="member-empty-row">
                                        No roster available.
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Revision Notes - moved to left column */}
                              {(() => {
                                const serverKey = (order.orderNumber || order.id);
                                const normalizedNotes = Array.isArray(serverRevisionNotes[serverKey]) ? serverRevisionNotes[serverKey] : [];
                                try { console.log('[Orders] Rendering revision notes for artist', { orderId: order.id, count: normalizedNotes.length }); } catch (_) {}
                                const userRoleLower = (user?.user_metadata?.role || '').toLowerCase();
                                const canSeeNotes = ['artist', 'admin', 'owner'].includes(userRoleLower);
                                if (canSeeNotes && normalizedNotes.length > 0) {
                                  return (
                                    <div style={{ marginTop: '16px' }}>
                                      <div
                                        className="revision-notes-panel"
                                        style={{
                                          border: '1px solid var(--border-color, #e5e7eb)',
                                          borderRadius: '10px',
                                          padding: '12px',
                                          marginBottom: '8px',
                                          background: '#fff'
                                        }}
                                      >
                                        <div
                                          className="panel-title"
                                          style={{ fontWeight: 700, marginBottom: '8px', fontSize: 'clamp(13px, 1.2vw, 16px)', color: '#dc2626' }}
                                        >
                                          Revision Notes
                                        </div>
                                        <div className="notes-list" style={{ display: 'grid', gap: '10px' }}>
                                          {normalizedNotes.map((n, i) => {
                                            const ts = n.createdAt || n.created_at || n.timestamp || null;
                                            const when = ts ? new Date(ts).toLocaleString() : '';
                                            const by = n.author || n.createdBy || n.user || 'Admin';
                                            const msg = n.message || n.text || n.note || String(n);
                                            return (
                                              <div
                                                key={i}
                                                className="note-item"
                                                style={{
                                                  border: '1px solid var(--border-color, #e5e7eb)',
                                                  borderRadius: '8px',
                                                  padding: '10px'
                                                }}
                                              >
                                                <div
                                                  className="note-meta"
                                                  style={{ fontSize: 'clamp(11px, 1vw, 13px)', opacity: 0.7, marginBottom: 6 }}
                                                >
                                                  {by}{when ? ` • ${when}` : ''}
                                                </div>
                                                <div
                                                  className="note-message"
                                                  style={{ fontSize: 'clamp(12px, 1.1vw, 15px)', whiteSpace: 'pre-wrap', color: '#000' }}
                                                >
                                                  {msg}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            {/* Right Column */}
                            <div
                              className="submitted-col right"
                              style={{ flex: '1 1 auto', minWidth: 0 }}
                            >
                              {designFiles.length > 0 ? (
                                <div
                                  className="custom-design-images-grid"
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                    gap: '12px'
                                  }}
                                >
                                  {(showAllDesignFiles ? designFiles : designFiles.slice(0, 4)).map((file, index) => (
                                    <div
                                      key={file.publicId || `${index}-${file.url}`}
                                      className="custom-design-image-item"
                                      style={{ width: '100%' }}
                                    >
                                      <img
                                        src={file.url}
                                        alt={file.filename || `Design ${index + 1}`}
                                        className="custom-design-image"
                                        style={{ width: '100%', height: 'auto', display: 'block' }}
                                        onClick={() => window.open(file.url, '_blank')}
                                      />
                                      <div
                                        className="custom-design-image-name"
                                        style={{ fontSize: 'clamp(12px, 1.2vw, 14px)' }}
                                      >
                                        {file.filename || file.originalname || `Design ${index + 1}`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="custom-design-images-empty">
                                  No submitted design files yet.
                                </div>
                              )}
                              {/* View all / Show less toggle */}
                              {designFiles.length > 4 && (
                                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                                  {!showAllDesignFiles ? (
                                    <button
                                      type="button"
                                      className="design-files-view-all"
                                      aria-label="View all design files"
                                      onClick={() => setShowAllDesignFiles(true)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--primary-color, #2563eb)',
                                        background: 'var(--primary-color, #2563eb)',
                                        color: 'var(--on-primary-color, #ffffff)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                      }}
                                    >
                                      <span>View all ({designFiles.length})</span>
                                      <FaChevronDown />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="design-files-view-less"
                                      aria-label="Show fewer design files"
                                      onClick={() => setShowAllDesignFiles(false)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--primary-color, #2563eb)',
                                        background: '#ffffff',
                                        color: 'var(--primary-color, #2563eb)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                      }}
                                    >
                                      <FaChevronUp />
                                      <span>Show less</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Admin review actions - only show if there are submitted files */}
                          {['admin', 'owner'].includes(userRole) && designFiles.length > 0 && (
                            <div className="design-review-actions" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="approve-design-btn"
                                onClick={() => {
                                  setConfirmDialog({
                                    show: true,
                                    title: 'Approve Designs?',
                                    message: 'This will move the order status to Sizing.',
                                    currentStatus: getStatusDisplayName(order.status),
                                    newStatus: getStatusDisplayName('sizing'),
                                    onConfirm: async () => {
                                      try {
                                        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
                                        const { data: { session } } = await supabase.auth.getSession();
                                        const identifier = order.orderNumber || order.id;
                                        let res = await fetch(`${API_BASE_URL}/api/orders/${identifier}/design-review`, {
                                          method: 'PATCH',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                                          },
                                          body: JSON.stringify({ action: 'approve' })
                                        });
                                        if (res.status === 404 && order.id && order.id !== identifier) {
                                          res = await fetch(`${API_BASE_URL}/api/orders/${order.orderNumber}/design-review`, {
                                            method: 'PATCH',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                                            },
                                            body: JSON.stringify({ action: 'approve' })
                                          });
                                        }
                                        if (!res.ok) {
                                          const err = await res.json().catch(() => ({}));
                                          throw new Error(err.error || 'Approval failed');
                                        }
                                        setRefreshKey(prev => prev + 1);
                                        setExpandedOrder(null);
                                      } catch (e) {
                                        alert(e.message || 'Failed to approve designs');
                                      } finally {
                                        setConfirmDialog(null);
                                      }
                                    },
                                    onCancel: () => setConfirmDialog(null)
                                  });
                                }}
                              >
                                Approve Designs
                              </button>
                              <button
                                type="button"
                                className="revise-design-btn"
                                onClick={() => {
                                  try {
                                    console.log('[Orders] Opening Request Revisions modal for order', { orderId: order.id, orderNumber: order.orderNumber });
                                  } catch (_) {}
                                  setRevisionDialog({ show: true, notes: '', orderId: order.id, submitting: false });
                                }}
                              >
                                Request Revisions
                              </button>

                              {/* Dev-only test buttons removed */}
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Revision Notes Modal */}
      {revisionDialog.show && (
        <div className="orders-revision-modal-overlay" onClick={() => setRevisionDialog({ show: false, notes: '', orderId: null, submitting: false })}>
          <div className="orders-revision-modal" onClick={(e) => e.stopPropagation()}>
            <div className="orders-revision-header">
              <h3>Request Revisions</h3>
              <button
                className="orders-revision-close"
                onClick={() => setRevisionDialog({ show: false, notes: '', orderId: null, submitting: false })}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="orders-revision-body">
              <label className="orders-revision-label">Revision Notes for Artist</label>
              <textarea
                className="orders-revision-textarea"
                placeholder="List what needs to be revised..."
                value={revisionDialog.notes}
                onChange={(e) => setRevisionDialog(prev => ({ ...prev, notes: e.target.value }))}
                rows={6}
              />
              <div className="orders-revision-hint">
                These notes will be forwarded to the artist's task details and the task will move back to In Progress.
              </div>
            </div>
            <div className="orders-revision-footer">
              <button
                type="button"
                className="revise-design-btn"
                disabled={revisionDialog.submitting || !revisionDialog.notes.trim()}
                onClick={async () => {
                  if (!revisionDialog.orderId) return;
                  if (!revisionDialog.notes || !revisionDialog.notes.trim()) return;
                  // Use app-styled confirmation dialog
                  setConfirmDialog({
                    show: true,
                    title: 'Send Revision Request?',
                    message: 'This will send the notes to the artist and move the task back to Layout/In Progress.',
                    currentStatus: getStatusDisplayName((orders.find(o => o.id === revisionDialog.orderId) || {}).status || 'layout'),
                    newStatus: getStatusDisplayName('layout'),
                    onConfirm: async () => {
                      try {
                        setRevisionDialog(prev => ({ ...prev, submitting: true }));
                        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
                        const { data: { session } } = await supabase.auth.getSession();
                        // Prefer order number for API lookups
                        const ord = orders.find(o => o.id === revisionDialog.orderId) || {};
                        const identifier = ord.orderNumber || revisionDialog.orderId;
                        let res = await fetch(`${API_BASE_URL}/api/orders/${identifier}/design-review`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                          },
                          body: JSON.stringify({ action: 'revision_required', notes: revisionDialog.notes.trim() })
                        });
                        if (res.status === 404 && ord?.orderNumber && ord.orderNumber !== identifier) {
                          res = await fetch(`${API_BASE_URL}/api/orders/${ord.orderNumber}/design-review`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                            },
                            body: JSON.stringify({ action: 'revision_required', notes: revisionDialog.notes.trim() })
                          });
                        }
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          throw new Error(err.error || 'Revision request failed');
                        }
                        // Best-effort write to dedicated revision-notes endpoint
                        try {
                          await fetch(`${API_BASE_URL}/api/orders/${identifier}/revision-notes`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                            },
                            body: JSON.stringify({ message: revisionDialog.notes.trim() })
                          });
                        } catch (_) {}
                        // Optimistic local insert so UI shows note immediately
                        try {
                          const key = identifier;
                          const message = revisionDialog.notes.trim();
                          setServerRevisionNotes(prev => {
                            const existing = Array.isArray(prev[key]) ? prev[key] : [];
                            const optimistic = {
                              message,
                              author: (user?.user_metadata?.role || 'Admin'),
                              createdAt: new Date().toISOString()
                            };
                            return { ...prev, [key]: [optimistic, ...existing] };
                          });
                        } catch (_) {}
                        const result = await res.json().catch(() => ({}));
                        setRevisionDialog({ show: false, notes: '', orderId: null, submitting: false });
                        setRefreshKey(prev => prev + 1);
                        setExpandedOrder(null);
                      } catch (e) {
                        alert(e.message || 'Failed to request revisions');
                        setRevisionDialog(prev => ({ ...prev, submitting: false }));
                      } finally {
                        setConfirmDialog(null);
                      }
                    },
                    onCancel: () => setConfirmDialog(null)
                  });
                }}
              >
                {revisionDialog.submitting ? 'Sending...' : 'Send Revision Request'}
              </button>
              <button
                type="button"
                className="orders-revision-cancel"
                onClick={() => setRevisionDialog({ show: false, notes: '', orderId: null, submitting: false })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Walk-in Order Button */}
      <button 
        className="floating-walkin-btn"
        onClick={() => navigate('/admin/walk-in-orders')}
        title="Walk-in Order"
      >
        <FaShoppingCart />
        <span className="btn-text">Walk-in Order</span>
      </button>

      {/* Image Gallery Modal */}
      {imageGallery.isOpen && imageGallery.images.length > 0 && (
        <div 
          className="cd-image-gallery-overlay"
          onClick={closeImageGallery}
        >
          <div 
            className="cd-image-gallery-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="cd-image-gallery-close"
              onClick={closeImageGallery}
              aria-label="Close gallery"
            >
              <FaTimes />
            </button>

            <button
              className="cd-image-gallery-nav cd-image-gallery-prev"
              onClick={goToPrevImage}
              aria-label="Previous image"
              disabled={imageGallery.images.length <= 1}
            >
              <FaChevronLeft />
            </button>

            <div className="cd-image-gallery-main">
              <img
                src={imageGallery.images[imageGallery.currentIndex].url}
                alt={`Design ${imageGallery.currentIndex + 1}`}
                className="cd-image-gallery-image"
                onError={(e) => {
                  e.target.src = '/placeholder-image.png';
                }}
              />
              <div className="cd-image-gallery-info">
                <span className="cd-image-gallery-counter">
                  {imageGallery.currentIndex + 1} / {imageGallery.images.length}
                </span>
                <button
                  className="cd-image-gallery-download"
                  onClick={() => downloadImage(
                    imageGallery.images[imageGallery.currentIndex].url,
                    imageGallery.images[imageGallery.currentIndex].filename
                  )}
                  aria-label="Download image"
                >
                  <FaDownload />
                </button>
              </div>
            </div>

            <button
              className="cd-image-gallery-nav cd-image-gallery-next"
              onClick={goToNextImage}
              aria-label="Next image"
              disabled={imageGallery.images.length <= 1}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Artist Assignment Loading Modal */}
      {artistAssignmentLoading.orderId && (
        <div className="artist-assignment-loading-overlay">
          <div className={`artist-assignment-loading-modal ${artistAssignmentLoading.status === 'success' ? 'success-state' : ''}`}>
            <div className="artist-assignment-loading-content">
              {artistAssignmentLoading.status === 'loading' && (
                <>
                  <div className="artist-assignment-spinner">
                    <FaPalette className="spinner-icon" />
                  </div>
                  <h3>Looking for an Artist</h3>
                  <p>Assigning order {artistAssignmentLoading.orderNumber} to an available artist...</p>
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </>
              )}
              {artistAssignmentLoading.status === 'success' && (
                <>
                  <div className="artist-assignment-success-check">
                    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                      <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                      <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                  </div>
                  <h3 className="success-title">Artist Found!</h3>
                  <p className="success-message">
                    Order {artistAssignmentLoading.orderNumber} has been assigned to
                  </p>
                  <div className="artist-name-display">
                    <FaUsers className="artist-icon" />
                    <span>{artistAssignmentLoading.artistName}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
