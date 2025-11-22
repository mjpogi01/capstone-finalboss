import React, { useState, useEffect, useRef } from 'react';
import './RecentOrders.css';
import orderService from '../../services/orderService';

const RecentOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 5;
  const filterContainerRef = useRef(null);

  // Close dropdown when clicking outside - improved approach
  useEffect(() => {
    if (!showFilterDropdown) return;

    const handleClickOutside = (event) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowFilterDropdown(false);
      }
    };

    // Use mousedown instead of click to handle events before they propagate
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showFilterDropdown]);

  useEffect(() => {
    fetchRecentOrders(true);
    
    // Refresh orders every 30 seconds to keep data up to date (silently, without loading spinner)
    const refreshInterval = setInterval(() => {
      fetchRecentOrders(false);
    }, 30000);
    
    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchRecentOrders = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await orderService.getAllOrders({
        limit: 100,
        dateSort: 'desc'
      });
      
      if (response && response.orders && Array.isArray(response.orders)) {
        // Format orders for display - use formatted order from service if available
        const formattedOrders = response.orders.map(order => {
          // Use orderService formatOrderForDisplay if order is not yet formatted
          const formattedOrder = order.orderItems ? order : orderService.formatOrderForDisplay(order);
          
          return {
            id: formattedOrder.id,
            email: formattedOrder.customer_email || formattedOrder.customerEmail || order.customer_email || order.email || 'N/A',
            product: getProductName(formattedOrder),
            date: formatDate(formattedOrder.orderDate || formattedOrder.created_at || order.created_at),
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
        setLoading(false);
      }
    }
  };

  const getProductName = (order) => {
    // Check different possible property names for order items
    const orderItems = order.order_items || order.orderItems || order.items || [];
    
    if (orderItems && orderItems.length > 0) {
      // Get product names from items with better extraction
      const productNames = orderItems
        .map(item => {
          // Try different property names for product name (prioritize name over product_name)
          const productName = item.name || 
                            item.product_name || 
                            item.productName || 
                            item.product?.name ||
                            item.product_name ||
                            null;
          
          // Also get quantity for display
          const quantity = parseInt(item.quantity) || 1;
          const size = item.size || item.product_size;
          
          return {
            name: productName,
            quantity: quantity,
            size: size
          };
        })
        .filter(item => item.name && item.name.trim() !== ''); // Remove null/empty values
      
      if (productNames.length > 0) {
        // Group by product name
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
          // Single product type
          const product = products[0];
          const quantityText = product.totalQuantity > 1 ? ` (${product.totalQuantity}x)` : '';
          const sizeText = product.sizes.length > 0 ? ` - Size: ${product.sizes.join(', ')}` : '';
          return `${product.name}${quantityText}${sizeText}`;
        } else if (products.length === 2) {
          // Two products - show both with quantities
          return products.map(p => `${p.name} (${p.totalQuantity}x)`).join(', ');
        } else {
          // Multiple products - show first 2 with total count
          const firstTwo = products.slice(0, 2).map(p => `${p.name} (${p.totalQuantity}x)`).join(', ');
          const remaining = products.length - 2;
          return `${firstTwo} +${remaining} more product${remaining > 1 ? 's' : ''}`;
        }
      }
    }
    
    // Fallback: try direct product_name on order
    if (order.product_name) {
      return order.product_name;
    }
    
    // Final fallback
    return 'No Product Name';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Close filter dropdown when searching
    setShowFilterDropdown(false);
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    // Close filter dropdown when opening search
    if (!showSearch) {
      setShowFilterDropdown(false);
    }
    // Clear search when closing
    if (showSearch) {
      setSearchTerm('');
    }
  };

  const handleFilterToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
    setShowFilterDropdown(prev => !prev);
    // Close search when opening filter
    setShowSearch(false);
  };

  const handleFilterSelect = (status, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('Filter selected:', status); // Debug log
    setFilterStatus(status);
    setShowFilterDropdown(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.date.toLowerCase().includes(searchTerm.toLowerCase());
    
    const orderStatus = (order.status || '').toLowerCase().trim();
    
    // Filter logic based on selected filter
    let matchesFilter = true;
    if (filterStatus !== 'all') {
      const filterStatusLower = filterStatus.toLowerCase();
      
      if (filterStatusLower === 'pending') {
        // Show only pending orders
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
        // For other filters, exact match
        matchesFilter = orderStatus === filterStatusLower;
      }
    } else {
      // When "all" is selected, exclude cancelled but show everything else including pending
      if (orderStatus === 'cancelled' || orderStatus === 'canceled') {
        return false;
      }
    }
    
    return matchesSearch && matchesFilter;
  });

  // Show limited or all orders based on showAll state
  const displayedOrders = showAll ? filteredOrders : filteredOrders.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = filteredOrders.length > INITIAL_DISPLAY_COUNT && !showAll;

  const getFilterLabel = () => {
    switch(filterStatus.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'delivered': return 'Delivered';
      default: return 'All Status';
    }
  };

  const getFilterIcon = () => {
    return (
      <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
    );
  };

  return (
    <div className="recent-orders">
      <div className="table-header">
        <h3 className="table-title">Recent Orders</h3>
        <div className="header-actions">
          {showSearch && (
            <input
              type="text"
              className="search-input"
              placeholder="Search by email, product, or date..."
              value={searchTerm}
              onChange={handleSearch}
              autoFocus
              onBlur={(e) => {
                // Keep search open if there's text
                if (!e.target.value) {
                  // Only auto-close if empty
                }
              }}
            />
          )}
          <button 
            className={`search-btn ${showSearch ? 'active' : ''}`}
            onClick={handleSearchToggle}
            aria-label="Search"
            title="Search orders"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
          <div className="filter-dropdown-container" ref={filterContainerRef}>
            <button 
              className={`filter-btn ${filterStatus !== 'all' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent?.stopImmediatePropagation();
                handleFilterToggle(e);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              aria-label="Filter"
              aria-expanded={showFilterDropdown}
              title={`Filter: ${getFilterLabel()}`}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                {getFilterIcon()}
              </svg>
            </button>
            {showFilterDropdown && (
              <div 
                className="filter-dropdown"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <button
                  type="button"
                  className={`filter-option ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent?.stopImmediatePropagation();
                    setFilterStatus('all');
                    setShowFilterDropdown(false);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <span>All Status</span>
                  {filterStatus === 'all' && <span className="check-mark">✓</span>}
                </button>
                <button
                  type="button"
                  className={`filter-option ${filterStatus === 'pending' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent?.stopImmediatePropagation();
                    setFilterStatus('pending');
                    setShowFilterDropdown(false);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <span>Pending</span>
                  {filterStatus === 'pending' && <span className="check-mark">✓</span>}
                </button>
                <button
                  type="button"
                  className={`filter-option ${filterStatus === 'processing' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent?.stopImmediatePropagation();
                    setFilterStatus('processing');
                    setShowFilterDropdown(false);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <span>Processing</span>
                  {filterStatus === 'processing' && <span className="check-mark">✓</span>}
                </button>
                <button
                  type="button"
                  className={`filter-option ${filterStatus === 'delivered' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent?.stopImmediatePropagation();
                    setFilterStatus('delivered');
                    setShowFilterDropdown(false);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <span>Delivered</span>
                  {filterStatus === 'delivered' && <span className="check-mark">✓</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>{orders.length === 0 ? 'No data order yet' : 'No orders found'}</p>
          </div>
        ) : (
          <>
            <div className="recent-orders-header-row">
              <div className="recent-orders-header-cell recent-orders-col-email">Users Email</div>
              <div className="recent-orders-header-cell recent-orders-col-product">Product</div>
              <div className="recent-orders-header-cell recent-orders-col-date">Date</div>
              <div className="recent-orders-header-cell recent-orders-col-status">Status</div>
            </div>
            
            {displayedOrders.map((order) => (
              <div key={order.id} className="recent-orders-row">
                <div className="recent-orders-cell recent-orders-col-email">
                  {order.email}
                </div>
                <div className="recent-orders-cell recent-orders-col-product">
                  {order.product}
                </div>
                <div className="recent-orders-cell recent-orders-col-date">
                  {order.date}
                </div>
                <div className="recent-orders-cell recent-orders-col-status">
                  <span className={`recent-orders-status-badge ${order.statusColor}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <button 
                className="view-more-btn"
                onClick={() => setShowAll(true)}
              >
                View More ({filteredOrders.length - INITIAL_DISPLAY_COUNT} more)
              </button>
            )}
            
            {showAll && filteredOrders.length > INITIAL_DISPLAY_COUNT && (
              <button 
                className="view-less-btn"
                onClick={() => {
                  setShowAll(false);
                  // Scroll to top of table
                  document.querySelector('.table-wrapper')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Show Less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RecentOrders;
