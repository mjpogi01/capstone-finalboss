import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaSearch, 
  FaShoppingCart, 
  FaTimes, 
  FaSort, 
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
  FaArrowUp,
  FaArrowDown,
  FaExpand,
  FaCartPlus,
  FaTh,
  FaThList,
  FaFilter,
  FaStar
} from 'react-icons/fa';
import ProductModal from '../customer/ProductModal';
import CheckoutModal from '../customer/CheckoutModal';
import OrderProcessingModal from '../customer/OrderProcessingModal';
import productService from '../../services/productService';
import orderService from '../../services/orderService';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import './WalkInOrdering.css';

const WalkInOrdering = ({ onClose }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'category'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [showFilters, setShowFilters] = useState(true);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const { showOrderConfirmation, showError } = useNotification();
  const { user } = useAuth();

  const categories = [
    { value: 'all', label: 'All Products', icon: FaStore, color: '#3b82f6' },
    { value: 'jerseys', label: 'Jerseys', icon: FaTshirt, color: '#ef4444' },
    { value: 'shorts', label: 'Shorts', icon: FaShoePrints, color: '#10b981' },
    { value: 'shoes', label: 'Shoes', icon: FaShoePrints, color: '#f59e0b' },
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
    let filtered = products;
    console.log('🔍 Filtering products:', { products: products.length, selectedCategory, searchTerm });

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort products
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = parseFloat(a.price);
          bValue = parseFloat(b.price);
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log('🔍 Filtered products:', filtered.length);
    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleEditItem = (item) => {
    const product = {
      id: item.id,
      name: item.name,
      price: item.price,
      main_image: item.image,
      category: 'jerseys'
    };
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleAddToCart = (product, options) => {
    console.log('🛒 [Walk-in] Adding to walk-in cart:', product.name);
    
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
      uniqueId: `walkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Unique prefix for walk-in items
    };

    if (existingItemIndex >= 0) {
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex] = cartItem;
      setCartItems(updatedItems);
      console.log('🛒 [Walk-in] Updated existing item in walk-in cart');
    } else {
      setCartItems([...cartItems, cartItem]);
      console.log('🛒 [Walk-in] Added new item to walk-in cart. Total items:', cartItems.length + 1);
    }
  };

  const handleBuyNow = (product, options) => {
    console.log('🛒 [Walk-in] Buy Now for walk-in order:', product.name);
    
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
      uniqueId: `walkin-buynow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique prefix for walk-in
      isBuyNow: true
    };
    setCartItems([buyNowItem]);
    setShowCheckout(true);
    console.log('🛒 [Walk-in] Opening checkout for walk-in Buy Now order');
  };

  const removeFromCart = (uniqueId) => {
    console.log('🛒 [Walk-in] Removing item from walk-in cart:', uniqueId);
    setCartItems(prev => {
      const filtered = prev.filter(item => item.uniqueId !== uniqueId);
      console.log('🛒 [Walk-in] Items remaining in walk-in cart:', filtered.length);
      return filtered;
    });
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
      
      setCartItems([]);
      setShowCheckout(false);
      onClose();
      
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

  return (
    <div className="walkin-ordering-overlay">
      <div className="walkin-ordering-container">
        {/* Modern Header */}
        <div className="walkin-header">
          {/* Left Section: Title and Stats */}
          <div className="header-left">
            <div className="header-title-section">
              <div className="title-group">
                <FaShoppingCart className="title-icon" />
                <h1>Walk-in Ordering</h1>
                <div className="title-badge">
                  <FaUser className="badge-icon" />
                  <span>Admin Mode</span>
                </div>
              </div>
              <div className="header-stats">
                <div className="stat-item">
                  <FaStore className="stat-icon" />
                  <span>{products.length} Products</span>
                </div>
                <div className="stat-item">
                  <FaShoppingBag className="stat-icon" />
                  <span>{getTotalItems()} in Cart</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Section: Action Buttons */}
          <div className="header-actions">
            <div className="action-buttons-group">
              <button 
                className={`action-btn search-btn`}
                onClick={() => setShowFilters(!showFilters)}
                title="Search Products"
              >
                <FaSearch />
              </button>
              <button 
                className={`action-btn filters-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                title="Toggle Filters"
              >
                <FaFilter />
              </button>
              <button className="action-btn close-btn" onClick={onClose} title="Close">
                <FaTimes />
              </button>
            </div>
          </div>
        </div>

        <div className="walkin-content">
          {/* Enhanced Search and Filters */}
          {showFilters && (
            <div className="walkin-filters">
              <div className="search-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search products by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                  className="search-action-button"
                  onClick={() => {}}
                  title="Search"
                >
                  <FaSearch />
                </button>
              </div>
            </div>
          )}

          <div className="walkin-main">
            {/* Enhanced Products Section */}
            <div className="walkin-products">
              {loading ? (
                <div className="walkin-loading">
                  <FaSpinner className="spinner" />
                  <span>Loading products...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="walkin-no-products">
                  <FaSearch className="no-products-icon" />
                  <h3>No products found</h3>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <div className={`walkin-products-${viewMode}`}>
                  {filteredProducts.map(product => {
                    const CategoryIcon = getCategoryIcon(product.category);
                    const categoryColor = getCategoryColor(product.category);
                    
                    return (
                      <div 
                        key={product.id} 
                        className={`walkin-product-card ${viewMode}`}
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="product-card-header">
                          <div className="product-badges">
                            <div 
                              className="category-badge"
                              style={{ backgroundColor: categoryColor }}
                            >
                              <CategoryIcon className="badge-icon" />
                              <span>{product.category}</span>
                            </div>
                            {product.price < 500 && (
                              <div className="sale-badge">
                                <FaTag />
                                <span>Sale</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="walkin-product-image">
                          <img 
                            src={product.main_image || '/image_highlights/image.png'} 
                            alt={product.name}
                            onError={(e) => {
                              e.target.src = '/image_highlights/image.png';
                            }}
                          />
                          <div className="product-overlay">
                            <button 
                              className="overlay-btn quick-add-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                quickAddToCart(product);
                              }}
                              title="Quick Add to Cart"
                            >
                              <FaPlus />
                            </button>
                            <button 
                              className="overlay-btn view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(product);
                              }}
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                          </div>
                        </div>
                        
                        <div className="walkin-product-info">
                          <h3 className="walkin-product-name">{product.name}</h3>
                          <p className="walkin-product-category">
                            <CategoryIcon className="category-icon" />
                            {product.category}
                          </p>
                          <div className="product-price-section">
                            <p className="walkin-product-price">₱{parseFloat(product.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            {product.price < 500 && (
                              <span className="original-price">₱{parseFloat(product.price * 1.2).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            )}
                          </div>
                          
                          {/* Review Count and Sold Quantity - Public for all users */}
                          <div className="walkin-product-stats">
                            {(product.average_rating > 0 || product.review_count > 0) && (
                              <span className="walkin-stat-item">
                                <span className="walkin-rating-number">{product.average_rating || 0}</span>
                                <FaStar className="walkin-star-icon" />
                                {product.review_count > 0 && (
                                  <span className="walkin-review-count"> ({product.review_count})</span>
                                )}
                              </span>
                            )}
                            {product.sold_quantity !== undefined && product.sold_quantity > 0 && (
                              <span className="walkin-stat-item">{product.sold_quantity} sold</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Enhanced Cart Sidebar */}
            <div className="walkin-cart">
              <div className="cart-header">
                <div className="cart-title">
                  <FaShoppingCart className="cart-icon" />
                  <h3>Shopping Cart</h3>
                </div>
                <div className="cart-stats">
                  <span className="cart-total">₱{getTotalPrice().toFixed(2)}</span>
                  <span className="cart-items-count">{getTotalItems()} items</span>
                </div>
              </div>
              
              <div className="cart-items">
                {cartItems.length === 0 ? (
                  <div className="empty-cart">
                    <FaShoppingBag className="empty-cart-icon" />
                    <h4>Your cart is empty</h4>
                    <p>Add some products to get started</p>
                  </div>
                ) : (
                  <div className="cart-items-list">
                    {cartItems.map((item, index) => {
                      // Determine category for hiding fields
                      const categoryLower = (item.category || '').toString().toLowerCase().trim();
                      const isUniformsCategory = categoryLower === 'uniforms';
                      const isHoodieCategory = categoryLower === 'hoodies';
                      const isLongSleevesCategory = categoryLower === 'long sleeves';
                      const isTShirtCategory = categoryLower === 't-shirts' || categoryLower === 't-shirt';
                      const shouldHideJerseyType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                      const shouldHideCutType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                      
                      return (
                      <div key={item.uniqueId} className="cart-item-card">
                        <div className="item-image">
                          <img 
                            src={item.image || '/image_highlights/image.png'} 
                            alt={item.name}
                            onError={(e) => {
                              e.target.src = '/image_highlights/image.png';
                            }}
                          />
                        </div>
                        
                        <div className="item-details">
                          <div className="item-header">
                            <div className="item-name">{item.name}</div>
                            <button 
                              className="remove-btn"
                              onClick={() => removeFromCart(item.uniqueId || item.id)}
                              title="Remove item"
                            >
                              <FaTimes />
                            </button>
                          </div>
                          
                          <div className="compact-order-container">
                            <div 
                              className="compact-order-header"
                              onClick={() => setExpandedOrderIndex(expandedOrderIndex === index ? null : index)}
                            >
                              <span className="order-type-text">
                                {item.isTeamOrder ? 'Team Order' : 'Single Order'}
                              </span>
                              <span className="dropdown-arrow">
                                {expandedOrderIndex === index ? '▲' : '▼'}
                              </span>
                            </div>
                            
                            {expandedOrderIndex === index && (
                              <div className="compact-order-details">
                                {item.isTeamOrder && item.teamMembers && item.teamMembers.length > 0 ? (
                                  <div className="compact-team-details">
                                    <div className="team-name-header">
                                      <span className="compact-detail team-name-detail">
                                        Team: {item.teamMembers[0]?.teamName || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="team-divider"></div>
                                    {item.teamMembers.map((member, memberIndex) => (
                                      <div key={memberIndex} className="compact-member">
                                        <span className="compact-detail surname-detail">
                                          Surname: {member.surname || 'N/A'}
                                        </span>
                                        <span className="compact-detail">
                                          Jersey: {member.number || member.jerseyNo || member.jerseyNumber || 'N/A'}
                                        </span>
                                        {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                        <span className="compact-detail">
                                          {shouldHideJerseyType ? 'Size' : 'Jersey Size'}: {member.jerseySize || member.size || 'N/A'} ({item.sizeType || 'Adult'})
                                        </span>
                                        {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                        {!shouldHideJerseyType && (
                                          <span className="compact-detail">
                                            Shorts Size: {member.shortsSize || member.size || 'N/A'} ({item.sizeType || 'Adult'})
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="compact-single-details">
                                    <span className="compact-detail team-name-detail">
                                      Team: {item.singleOrderDetails?.teamName || 'N/A'}
                                    </span>
                                    <span className="compact-detail surname-detail">
                                      Surname: {item.singleOrderDetails?.surname || 'N/A'}
                                    </span>
                                    <span className="compact-detail">
                                      Jersey: {item.singleOrderDetails?.number || item.singleOrderDetails?.jerseyNo || item.singleOrderDetails?.jerseyNumber || 'N/A'}
                                    </span>
                                    {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                    <span className="compact-detail">
                                      {shouldHideJerseyType ? 'Size' : 'Jersey Size'}: {item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size || 'N/A'} ({item.sizeType || 'Adult'})
                                    </span>
                                    {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                    {!shouldHideJerseyType && (
                                      <span className="compact-detail">
                                        Shorts Size: {item.singleOrderDetails?.shortsSize || item.singleOrderDetails?.size || 'N/A'} ({item.sizeType || 'Adult'})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="quantity-section">
                            <span className="quantity-label">Quantity: {item.quantity}</span>
                          </div>
                          
                          <div className="price-section">
                            <div className="item-price">₱{parseFloat(item.price).toFixed(2)}</div>
                            <div className="item-total">Total: ₱{(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
                          </div>
                          
                          <div className="item-actions">
                            <button 
                              onClick={() => handleEditItem(item)}
                              className="edit-btn"
                              title="Edit item"
                            >
                              <FaEdit />
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {cartItems.length > 0 && (
                <div className="cart-footer">
                  <div className="cart-summary">
                    <div className="summary-row">
                      <span>Subtotal:</span>
                      <span>₱{getTotalPrice().toFixed(2)}</span>
                    </div>
                    <div className="summary-row total">
                      <span>Total:</span>
                      <span>₱{getTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <button 
                    className="checkout-btn"
                    onClick={() => setShowCheckout(true)}
                  >
                    <FaCreditCard />
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </div>
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
      </div>
    </div>
  );
};

export default WalkInOrdering;