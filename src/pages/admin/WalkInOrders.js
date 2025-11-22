import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaShoppingCart, 
  FaTimes, 
  FaPlus, 
  FaEdit, 
  FaTrash,
  FaUser,
  FaTshirt,
  FaShoePrints,
  FaEye,
  FaShoppingBag,
  FaCreditCard,
  FaStore,
  FaTag,
  FaGift,
  FaSpinner,
  FaArrowLeft,
  FaFilter,
  FaLock,
  FaBasketballBall,
  FaTrophy,
  FaChevronDown,
  FaChevronUp,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaPalette
} from 'react-icons/fa';
import ProductModal from '../../components/customer/ProductModal';
import CheckoutModal from '../../components/customer/CheckoutModal';
import OrderProcessingModal from '../../components/customer/OrderProcessingModal';
import WalkInCustomOrder from '../../components/admin/WalkInCustomOrder';
import productService from '../../services/productService';
import orderService from '../../services/orderService';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import './WalkInOrders.css';

const WalkInOrders = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editSize, setEditSize] = useState('');
  const [viewMode, setViewMode] = useState('products'); // 'products' or 'custom-order'
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  
  // Filter states (copied from shop page)
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedRating, setSelectedRating] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 25;
  
  const { showOrderConfirmation, showError } = useNotification();
  const { user } = useAuth();

  const categories = [
    { value: 'all', label: 'All Products', icon: FaStore, color: '#3b82f6' },
    { value: 'jerseys', label: 'Jerseys', icon: FaTshirt, color: '#ef4444' },
    { value: 'shorts', label: 'Shorts', icon: FaShoePrints, color: '#10b981' },
    { value: 'balls', label: 'Balls', icon: FaBasketballBall, color: '#f59e0b' },
    { value: 'trophies', label: 'Trophies', icon: FaTrophy, color: '#ffd700' },
    { value: 'accessories', label: 'Accessories', icon: FaGift, color: '#8b5cf6' }
  ];

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts();
      console.log('📦 Products loaded:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      showError('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const filterProducts = useCallback(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category (checkboxes)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => selectedCategories.includes(product.category));
    }

    // Filter by price range
    if (priceMin !== '' && priceMin !== null && !isNaN(priceMin)) {
      const minPrice = parseFloat(priceMin);
      filtered = filtered.filter(product => {
        const productPrice = parseFloat(product.price);
        return !isNaN(productPrice) && productPrice >= minPrice;
      });
    }
    if (priceMax !== '' && priceMax !== null && !isNaN(priceMax)) {
      const maxPrice = parseFloat(priceMax);
      filtered = filtered.filter(product => {
        const productPrice = parseFloat(product.price);
        return !isNaN(productPrice) && productPrice <= maxPrice;
      });
    }

    // Filter by rating
    if (selectedRating !== null) {
      filtered = filtered.filter(product => {
        const rating = product.average_rating || 0;
        return rating >= selectedRating;
      });
    }

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price-high':
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'popularity':
        filtered.sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0));
        break;
      case 'latest':
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [products, sortBy, searchTerm, selectedCategories, priceMin, priceMax, selectedRating]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    filterProducts();
    setCurrentPage(1); // Reset to first page when filters change
  }, [filterProducts]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (viewMode === 'custom-order') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewMode]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleAddToCart = (product, options) => {
    const existingItemIndex = cartItems.findIndex(
      item => item.id === product.id && item.size === options.size
    );

    const cartItem = {
      id: product.id,
      name: product.name,
      price: options.price || product.price,
      image: product.main_image,
      size: options.size,
      quantity: options.quantity,
      isTeamOrder: options.isTeamOrder || false,
      teamMembers: options.teamMembers || null,
      singleOrderDetails: options.singleOrderDetails || null,
      sizeType: options.sizeType || 'adult',
      uniqueId: `walkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    if (existingItemIndex >= 0) {
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex] = cartItem;
      setCartItems(updatedItems);
    } else {
      setCartItems([...cartItems, cartItem]);
    }
  };

  const handleBuyNow = (product, options) => {
    const buyNowItem = {
      id: product.id,
      name: product.name,
      price: options.price || product.price,
      image: product.main_image,
      size: options.size,
      quantity: options.quantity,
      isTeamOrder: options.isTeamOrder || false,
      teamMembers: options.teamMembers || null,
      singleOrderDetails: options.singleOrderDetails || null,
      sizeType: options.sizeType || 'adult',
      uniqueId: `walkin-buynow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isBuyNow: true
    };
    setCartItems([buyNowItem]);
    setShowCheckout(true);
  };

  const removeFromCart = (uniqueId) => {
    setCartItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
  };

  const startEditingItem = (item) => {
    setEditingItem(item.uniqueId);
    setEditQuantity(item.quantity);
    setEditSize(item.size || 'M');
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditQuantity(1);
    setEditSize('');
  };

  const saveItemChanges = (uniqueId) => {
    if (editQuantity < 1) {
      showError('Invalid Quantity', 'Quantity must be at least 1');
      return;
    }

    setCartItems(prev => prev.map(item => 
      item.uniqueId === uniqueId 
        ? { 
            ...item, 
            quantity: editQuantity, 
            size: editSize,
            price: item.price // Keep original price
          }
        : item
    ));
    
    setEditingItem(null);
    setEditQuantity(1);
    setEditSize('');
  };

  const updateQuantity = (uniqueId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCartItems(prev => prev.map(item => 
      item.uniqueId === uniqueId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const handlePlaceOrder = async (orderData) => {
    try {
      if (!user?.id) {
        showError('Authentication Required', 'Please log in to process walk-in orders.');
        return;
      }

      // Show processing modal
      setIsProcessingOrder(true);

      const formattedOrderData = {
        user_id: user.id,
        order_number: `WALKIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order_type: 'walk_in', // Set order_type for proper artist assignment
        status: 'pending',
        shipping_method: orderData.shippingMethod,
        pickup_location: orderData.selectedLocation || null,
        pickup_branch_id: orderData.selectedBranchId || null,
        delivery_address: orderData.deliveryAddress,
        order_notes: orderData.orderNotes || 'Walk-in order',
        subtotal_amount: orderData.subtotalAmount,
        shipping_cost: orderData.shippingCost,
        total_amount: orderData.totalAmount,
        total_items: orderData.totalItems,
        order_items: orderData.items
      };

      const createdOrder = await orderService.createOrder(formattedOrderData);
      
      // Hide processing modal
      setIsProcessingOrder(false);
      
      showOrderConfirmation(createdOrder.order_number, orderData.totalAmount);
      
      // Clear cart and close checkout modal, but remain on walk-in page
      setCartItems([]);
      setShowCheckout(false);
      setShowCartDropdown(false);
      
      // Optional: You can reload products or refresh the page if needed
      // loadProducts();
      
    } catch (error) {
      console.error('Error creating walk-in order:', error);
      
      // Hide processing modal
      setIsProcessingOrder(false);
      
      showError('Order Failed', `Failed to place order: ${error.message}. Please try again.`);
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const quickAddToCart = (product) => {
    const quickItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.main_image,
      size: 'M',
      quantity: 1,
      isTeamOrder: false,
      singleOrderDetails: {
        teamName: 'Walk-in Customer',
        surname: 'Customer',
        number: '00',
        size: 'M'
      },
      sizeType: 'adult',
      uniqueId: `walkin-quick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setCartItems(prev => [...prev, quickItem]);
  };

  const getCategoryIcon = (category) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData ? categoryData.icon : FaTshirt;
  };

  const getCategoryColor = (category) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData ? categoryData.color : '#3b82f6';
  };

  const getCategoriesForSidebar = () => {
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceMin('');
    setPriceMax('');
    setSelectedRating(null);
  };

  // Close cart dropdown when clicking outside
  const cartDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartDropdownRef.current && !cartDropdownRef.current.contains(event.target)) {
        setShowCartDropdown(false);
      }
    };

    if (showCartDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCartDropdown]);

  return (
    <div className="walkin-orders-page">
      <div className="walkin-ordering-container">
        {/* Modern Navigation Bar */}
        <header className="modern-navbar">
          <div className="navbar-left">
              <button 
              className="back-button"
                onClick={() => navigate('/admin/orders')}
                title="Back to Orders"
              >
                <FaArrowLeft />
              </button>
            <div className="brand-section">
              <h1 className="brand-title">Walk-in Ordering</h1>
            </div>
          </div>

          <div className="navbar-center">
            {/* Empty center for spacing */}
          </div>

          <div className="navbar-right">
            <div className="walkin-cart-icon-wrapper" ref={cartDropdownRef}>
              <button
                className="walkin-cart-icon-btn"
                onClick={() => setShowCartDropdown(!showCartDropdown)}
                aria-label="View cart"
                title={`Cart (${getTotalItems()} items)`}
              >
                <FaShoppingCart className="walkin-cart-icon" />
                {getTotalItems() > 0 && (
                  <span className="walkin-cart-badge">{getTotalItems()}</span>
                )}
              </button>
              
              {/* Cart Dropdown */}
              {showCartDropdown && (
                <div className="walkin-cart-dropdown">
                  <div className="walkin-cart-dropdown-header">
                    <h4>Cart ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})</h4>
                    <button
                      className="walkin-close-cart-btn"
                      onClick={() => setShowCartDropdown(false)}
                      aria-label="Close cart"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  {cartItems.length === 0 ? (
                    <div className="walkin-empty-cart-dropdown">
                      <div className="walkin-empty-cart-icon">
                        <FaShoppingCart />
                      </div>
                      <p>Your cart is empty</p>
                    </div>
                  ) : (
                    <>
                      <div className="walkin-cart-dropdown-items">
                        {cartItems.map((item) => (
                          <div key={item.uniqueId} className="walkin-cart-dropdown-item">
                            <img
                              src={item.image || '/image_highlights/image.png'}
                              alt={item.name}
                              className="walkin-cart-dropdown-image"
                              onError={(e) => {
                                e.target.src = '/image_highlights/image.png';
                              }}
                            />
                            <div className="walkin-cart-dropdown-details">
                              <div className="walkin-cart-dropdown-name">{item.name}</div>
                              <div className="walkin-cart-dropdown-price">₱{parseFloat(item.price).toLocaleString()}</div>
                              <div className="walkin-cart-dropdown-quantity">Qty: {item.quantity}</div>
                              {item.size && (
                                <div className="walkin-cart-dropdown-size">Size: {item.size}</div>
                              )}
                            </div>
                            <button
                              className="walkin-cart-dropdown-remove"
                              onClick={() => removeFromCart(item.uniqueId)}
                              aria-label="Remove item"
                              title="Remove"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="walkin-cart-dropdown-footer">
                        <div className="walkin-cart-dropdown-summary">
                          <div className="walkin-summary-row">
                            <span>Subtotal:</span>
                            <span>₱{getTotalPrice().toLocaleString()}</span>
                          </div>
                          <div className="walkin-summary-row walkin-summary-total">
                            <span>Total:</span>
                            <span>₱{getTotalPrice().toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          className="walkin-checkout-btn-dropdown"
                          onClick={() => {
                            setShowCartDropdown(false);
                            setShowCheckout(true);
                          }}
                        >
                          <FaShoppingBag />
                          Checkout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Sort Bar - Only show in products view */}
        {viewMode === 'products' && (
          <div className="walkin-filter-bar">
            <div className="walkin-search-box">
              <FaSearch className="walkin-search-icon" />
              <input
                type="text"
                className="walkin-search-input"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="walkin-sort-label">Sort by</div>
            <div className="walkin-sort-buttons">
              <button
                className={`walkin-sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                onClick={() => setSortBy('name')}
              >
                Relevance
              </button>
              <button
                className={`walkin-sort-btn ${sortBy === 'latest' ? 'active' : ''}`}
                onClick={() => setSortBy('latest')}
              >
                Latest
              </button>
              <button
                className={`walkin-sort-btn ${sortBy === 'popularity' ? 'active' : ''}`}
                onClick={() => setSortBy('popularity')}
              >
                Top Sales
              </button>
              <div className="walkin-price-dropdown-wrapper">
                <button
                  className={`walkin-sort-btn price-btn ${sortBy === 'price-low' || sortBy === 'price-high' ? 'active' : ''}`}
                  onClick={() => setShowPriceDropdown(!showPriceDropdown)}
                >
                  Price
                  <FaChevronDown className={`walkin-price-arrow ${showPriceDropdown ? 'rotated' : ''}`} />
                </button>
                {showPriceDropdown && (
                  <div className="walkin-price-dropdown-menu">
                    <button
                      className={`walkin-price-option ${sortBy === 'price-low' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('price-low');
                        setShowPriceDropdown(false);
                      }}
                    >
                      Lowest to Highest
                    </button>
                    <button
                      className={`walkin-price-option ${sortBy === 'price-high' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('price-high');
                        setShowPriceDropdown(false);
                      }}
                    >
                      Highest to Lowest
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Desktop/Laptop Filter Icon Button and Pagination */}
            <div className="walkin-filter-pagination-group">
              {/* Filter Icon Button */}
              <button
                className="walkin-desktop-filter-btn"
                onClick={() => setShowMobileFilters(true)}
                aria-label="Open filters"
                title="Filters"
              >
                <FaFilter />
              </button>
              {/* Pagination Buttons */}
              {filteredProducts.length > 0 && totalPages > 1 && (
                <div className="walkin-pagination-controls">
                  <button
                    className="walkin-pagination-btn"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    title="Previous page"
                  >
                    &lt;
                  </button>
                  <span className="walkin-pagination-info">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    className="walkin-pagination-btn"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                    title="Next page"
                  >
                    &gt;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Filter Button Row - Only visible on mobile and in products view */}
        {viewMode === 'products' && (
          <div className="walkin-mobile-filter-row">
            <button 
              className="walkin-mobile-filter-btn"
              onClick={() => setShowMobileFilters(true)}
              aria-label="Open filters"
            >
              <FaFilter className="filter-icon" />
              <span>Filters</span>
            </button>
            <div className="walkin-mobile-results-text">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
            </div>
          </div>
        )}

        {/* Main Content Area - Full Width */}
        <div className="main-content-full">
          {viewMode === 'custom-order' ? (
            /* Custom Order View - Modal Overlay */
            <div className="wio-custom-order-overlay" onClick={() => setViewMode('products')}>
              <div className="wio-custom-order-modal" onClick={(e) => e.stopPropagation()}>
                <div className="wio-custom-order-modal-header">
                  <h2 className="wio-custom-order-modal-title">Custom Design Order</h2>
                  <button
                    className="wio-custom-order-close-btn"
                    onClick={() => setViewMode('products')}
                    aria-label="Close Custom Order"
                    title="Close"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="wio-custom-order-modal-content">
                  <WalkInCustomOrder onClose={() => setViewMode('products')} />
                </div>
              </div>
            </div>
          ) : (
            /* Products View */
            <div className="products-section-full">
              {loading ? (
              <div className="loading-state">
                  <FaSpinner className="spinner" />
                  <span>Loading products...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <FaSearch className="empty-icon" />
                  <h3>No products found</h3>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              ) : (
              <div className="walkin-product-grid">
                  {currentProducts.map((product, index) => {
                    return (
                      <div 
                        key={product.id} 
                        className="walkin-product-card"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div 
                          className="walkin-product-card-clickable"
                          onClick={() => handleProductClick(product)}
                        >
                          <div className="walkin-product-card-image">
                            {product.main_image || product.image_url ? (
                              <img 
                                src={product.main_image || product.image_url} 
                                alt={product.name}
                                className="walkin-product-img"
                                onError={(e) => {
                                  e.target.src = '/image_highlights/image.png';
                                }}
                              />
                            ) : (
                              <span className="walkin-product-placeholder">🏀</span>
                            )}
                          </div>
                          
                          <div className="walkin-product-card-info">
                            <h3 className="walkin-product-card-name">{product.name}</h3>
                            
                            {/* Price Section */}
                            <div className="walkin-product-card-price">
                              ₱{parseFloat(product.price).toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              })}
                            </div>
                            
                            {/* Review Count and Sold Quantity */}
                            <div className="walkin-product-stats">
                              {product.average_rating > 0 && (
                                <span className="walkin-stat-item">
                                  <span className="walkin-rating-number">{product.average_rating.toFixed(1)}</span>
                                  <FaStar className="walkin-star-icon" />
                                  {product.review_count > 0 && (
                                    <span className="walkin-review-count">({product.review_count})</span>
                                  )}
                                </span>
                              )}
                              {product.sold_quantity > 0 && (
                                <span className="walkin-stat-item">{product.sold_quantity} sold</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="walkin-product-card-footer">
                          {/* Add to Cart Button */}
                          <div className="walkin-product-footer-top">
                            <button
                              className="walkin-add-to-cart-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(product);
                              }}
                              aria-label="Add to cart"
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product Modal */}
        <ProductModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          product={selectedProduct}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />

        {/* Order Processing Modal */}
        <OrderProcessingModal 
          isOpen={isProcessingOrder}
          onClose={() => setIsProcessingOrder(false)}
          onError={(error) => {
            setIsProcessingOrder(false);
            showError('Order Failed', error.message);
          }}
        />

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          cartItems={cartItems}
          onPlaceOrder={handlePlaceOrder}
        />

        {/* Mobile Filter Modal */}
        {showMobileFilters && (
          <div className="walkin-mobile-filter-overlay" onClick={() => setShowMobileFilters(false)}>
            <div className="walkin-mobile-filter-drawer" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="walkin-mobile-filter-header">
                <h2 className="walkin-mobile-filter-title">Filters</h2>
                <button 
                  className="walkin-mobile-filter-close"
                  onClick={() => setShowMobileFilters(false)}
                  aria-label="Close filters"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Filter Content */}
              <div className="walkin-mobile-filter-content">
                <div className="walkin-sidebar-section">
                  <h3 className="walkin-sidebar-title">All Filters</h3>
                  <button className="walkin-clear-filters-btn" onClick={clearAllFilters}>
                    Clear All
                  </button>
                </div>

                {/* By Category */}
                <div className="walkin-sidebar-section">
                  <h4 className="walkin-sidebar-section-title">By Category</h4>
                  <div className="walkin-category-list">
                    {getCategoriesForSidebar()
                      .slice(0, showAllCategories ? undefined : 3)
                      .map(category => (
                        <label key={category} className="walkin-category-item">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => handleCategoryToggle(category)}
                            className="walkin-category-checkbox"
                          />
                          <span className="walkin-category-label">{category}</span>
                        </label>
                      ))}
                  </div>
                  {getCategoriesForSidebar().length > 3 && (
                    <button
                      className="walkin-show-more-btn"
                      onClick={() => setShowAllCategories(!showAllCategories)}
                    >
                      {showAllCategories ? (
                        <>
                          Less <FaChevronUp className="walkin-arrow-icon" />
                        </>
                      ) : (
                        <>
                          More <FaChevronDown className="walkin-arrow-icon" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Price Range */}
                <div className="walkin-sidebar-section">
                  <h4 className="walkin-sidebar-section-title">Price Range</h4>
                  <div className="walkin-price-inputs">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="walkin-price-input"
                      min="0"
                    />
                    <span className="walkin-price-separator">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="walkin-price-input"
                      min="0"
                    />
                  </div>
                  {(priceMin !== '' || priceMax !== '') && (
                    <div className="walkin-price-filter-active">
                      {priceMin && priceMax ? (
                        <span>₱{parseFloat(priceMin).toLocaleString()} - ₱{parseFloat(priceMax).toLocaleString()}</span>
                      ) : priceMin ? (
                        <span>From ₱{parseFloat(priceMin).toLocaleString()}</span>
                      ) : (
                        <span>Up to ₱{parseFloat(priceMax).toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Rating Filter */}
                <div className="walkin-sidebar-section">
                  <h4 className="walkin-sidebar-section-title">Rating</h4>
                  <div className="walkin-rating-list">
                    {[5, 4, 3, 2, 1].map(rating => (
                      <button
                        key={rating}
                        className={`walkin-rating-item ${selectedRating === rating ? 'active' : ''}`}
                        onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                      >
                        <div className="walkin-rating-stars">
                          {[...Array(5)].map((_, index) => (
                            <FaStar
                              key={index}
                              className={index < rating ? 'star-filled' : 'star-empty'}
                            />
                          ))}
                        </div>
                        {rating < 5 && <span className="walkin-rating-up">& Up</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="walkin-mobile-filter-footer">
                <button 
                  className="walkin-mobile-filter-apply"
                  onClick={() => setShowMobileFilters(false)}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Custom Order Button - Bottom Right (only show in products view) */}
        {viewMode === 'products' && (
          <button
            className="walkin-floating-custom-order-btn"
            onClick={() => setViewMode('custom-order')}
            title="Custom Design Order"
            aria-label="Open Custom Order"
          >
            <FaPalette className="walkin-floating-btn-icon" />
            <span className="walkin-floating-btn-text">Custom Order</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default WalkInOrders;