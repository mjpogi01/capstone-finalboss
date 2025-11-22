import React, { useState, useEffect } from 'react';
import { FaTimes, FaFilter, FaSortAmountDown, FaStar, FaChevronDown, FaChevronUp, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useCart } from '../../contexts/CartContext';
import productService from '../../services/productService';
import ProductModal from './ProductModal';
import ProductCarousel from './ProductCarousel';
import './ProductListModal.css';
import Loading from '../Loading';
import ErrorState from '../ErrorState';

// Helper function to get display price for product cards
const getDisplayPrice = (product) => {
  // For jersey products, show the minimum price from jersey_prices
  if (product.category && product.category.toLowerCase().includes('jersey')) {
    if (product.jersey_prices) {
      try {
        const prices = typeof product.jersey_prices === 'string' 
          ? JSON.parse(product.jersey_prices) 
          : product.jersey_prices;
        
        const priceValues = [
          prices.fullSet || prices.full_set,
          prices.shirtOnly || prices.shirt_only,
          prices.shortsOnly || prices.shorts_only,
          prices.fullSetKids || prices.full_set_kids,
          prices.shirtOnlyKids || prices.shirt_only_kids,
          prices.shortsOnlyKids || prices.shorts_only_kids
        ].filter(val => val !== null && val !== undefined).map(val => parseFloat(val));
        
        if (priceValues.length > 0) {
          const minPrice = Math.min(...priceValues);
          const maxPrice = Math.max(...priceValues);
          if (minPrice === maxPrice) {
            return minPrice;
          }
          return { min: minPrice, max: maxPrice };
        }
      } catch (error) {
        console.error('Error parsing jersey_prices:', error);
      }
    }
  }
  // For other products, use the base price
  return parseFloat(product.price) || 0;
};

const ProductListModal = ({ isOpen, onClose }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // New filter states for Shopee-style sidebar
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedRating, setSelectedRating] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { openSignIn } = useModal();
  const { addToCart } = useCart();
  
  // Responsive products per page - reduce for mobile to ensure all products fit
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const productsPerPage = isMobile ? 10 : 15;

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      
      // Set up real-time polling to refresh products every 30 seconds
      // This ensures reviews and sold counts update in real-time
      const pollInterval = setInterval(() => {
        fetchProducts();
      }, 30000); // Refresh every 30 seconds
      
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPriceDropdown && !event.target.closest('.price-dropdown-wrapper')) {
        setShowPriceDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPriceDropdown]);

  useEffect(() => {
    filterAndSortProducts();
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [products, searchTerm, selectedCategory, selectedCategories, sortBy, priceMin, priceMax, selectedRating]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category (sidebar checkboxes)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => selectedCategories.includes(product.category));
    } else if (selectedCategory !== 'All') {
      // Fallback to old category filter
      filtered = filtered.filter(product => product.category === selectedCategory);
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
      console.log(`✨ Rating filter (>= ${selectedRating}): ${filtered.length} products match`);
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
    setCurrentPage(1);
  };

  const getCategories = () => {
    const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
    return categories;
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

  const handlePriceFilter = () => {
    filterAndSortProducts();
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceMin('');
    setPriceMax('');
    setSelectedRating(null);
    setSearchTerm('');
  };

  const handleProductClick = (product) => {
    if (!isAuthenticated) {
      openSignIn();
      return;
    }
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleToggleWishlist = async (product, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openSignIn();
      return;
    }
    await toggleWishlist(product);
  };

  const handleAddToCart = async (product, e) => {
    console.log('🛒 Add to Cart clicked!', product.name);
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      console.log('⚠️ Not authenticated, opening sign in');
      openSignIn();
      return;
    }
    console.log('✅ Opening Product Modal for:', product.name);
    // Open ProductModal instead of adding directly to cart
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleImageClick = (product, e) => {
    e.stopPropagation();
    if (product.main_image || product.image_url) {
      setZoomedImage({
        url: product.main_image || product.image_url,
        name: product.name
      });
    }
  };

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!isOpen) return null;

  return (
    <>
      <div className="shop-overlay" onClick={onClose}>
        <div className="shop-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="shop-header">
            <h1 className="shop-title">Shop Our Products</h1>
            <button className="shop-close-btn" onClick={onClose} aria-label="Close">
              <FaTimes />
            </button>
          </div>

          {/* Sort Bar */}
          <div className="shop-filter-bar">
            <div className="shop-search-wrapper">
              <button 
                className={`shop-search-btn ${searchTerm ? 'active' : ''}`}
                onClick={() => {
                  const input = document.querySelector('.shop-search-input');
                  if (input) {
                    input.focus();
                  }
                }}
                aria-label="Search"
                title="Search products"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="10.5" cy="10.5" r="5.5" />
                  <line x1="15.5" y1="15.5" x2="20" y2="20" strokeLinecap="round" />
                </svg>
              </button>
              <input
                type="text"
                className="shop-search-input"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={(e) => e.target.parentElement.classList.add('focused')}
                onBlur={(e) => {
                  if (!e.target.value) {
                    e.target.parentElement.classList.remove('focused');
                  }
                }}
              />
            </div>
            <div className="sort-label">Sort by</div>
            <div className="sort-buttons">
              <button
                className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                onClick={() => setSortBy('name')}
              >
                Relevance
              </button>
              <button
                className={`sort-btn ${sortBy === 'latest' ? 'active' : ''}`}
                onClick={() => setSortBy('latest')}
              >
                Latest
              </button>
              <button
                className={`sort-btn ${sortBy === 'popularity' ? 'active' : ''}`}
                onClick={() => setSortBy('popularity')}
              >
                Top Sales
              </button>
              <div className="price-dropdown-wrapper">
                <button
                  className={`sort-btn price-btn ${sortBy === 'price-low' || sortBy === 'price-high' ? 'active' : ''}`}
                  onClick={() => setShowPriceDropdown(!showPriceDropdown)}
                >
                  Price
                  <FaChevronDown className={`price-arrow ${showPriceDropdown ? 'rotated' : ''}`} />
                </button>
                {showPriceDropdown && (
                  <div className="price-dropdown-menu">
                    <button
                      className={`price-option ${sortBy === 'price-low' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('price-low');
                        setShowPriceDropdown(false);
                      }}
                    >
                      Lowest to Highest
                    </button>
                    <button
                      className={`price-option ${sortBy === 'price-high' ? 'selected' : ''}`}
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
            {/* Desktop/Laptop Filter Icon Button aligned with sort buttons */}
            <button
              className="desktop-filter-btn"
              onClick={() => setShowMobileFilters(true)}
              aria-label="Open filters"
              title="Filters"
            >
              <FaFilter />
            </button>
            <div className="results-count">
              <button
                className="page-nav-arrow"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
                title={`Page ${currentPage - 1} of ${totalPages}`}
              >
                <FaChevronLeft />
              </button>
              <button
                className="page-nav-arrow"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                title={`Page ${currentPage + 1} of ${totalPages}`}
              >
                <FaChevronRight />
              </button>
            </div>
          </div>

          {/* Main Content with Sidebar */}
          <div className="shop-content-wrapper">
            {/* Left Sidebar - Shopee Style Filters */}
            <div className="shop-sidebar">
              <div className="sidebar-section">
                <h3 className="sidebar-title">All Filters</h3>
                <button className="clear-filters-btn" onClick={clearAllFilters}>
                  Clear All
                </button>
              </div>

              {/* By Category */}
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">By Category</h4>
                <div className="category-list">
                  {getCategoriesForSidebar()
                    .slice(0, showAllCategories ? undefined : 3)
                    .map(category => (
                      <label key={category} className="category-item">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => handleCategoryToggle(category)}
                          className="category-checkbox"
                        />
                        <span className="category-label">{category}</span>
                      </label>
                    ))}
                </div>
                {getCategoriesForSidebar().length > 3 && (
                  <button
                    className="show-more-btn"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                  >
                    {showAllCategories ? (
                      <>
                        Less <FaChevronUp className="arrow-icon" />
                      </>
                    ) : (
                      <>
                        More <FaChevronDown className="arrow-icon" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Price Range</h4>
                <div className="price-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="price-input"
                    min="0"
                  />
                  <span className="price-separator">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="price-input"
                    min="0"
                  />
                </div>
                {(priceMin !== '' || priceMax !== '') && (
                  <div className="price-filter-active">
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
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Rating</h4>
                <div className="rating-list">
                  {[5, 4, 3, 2, 1].map(rating => (
                    <button
                      key={rating}
                      className={`rating-item ${selectedRating === rating ? 'active' : ''}`}
                      onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                    >
                      <div className="rating-stars">
                        {[...Array(5)].map((_, index) => (
                          <FaStar
                            key={index}
                            className={index < rating ? 'star-filled' : 'star-empty'}
                          />
                        ))}
                      </div>
                      {rating < 5 && <span className="rating-up">& Up</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content Area */}
          <div className="shop-content">
            {loading ? (
              <Loading message="Loading products..." />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchProducts} />
            ) : filteredProducts.length === 0 ? (
              <div className="shop-empty-state">
                <p>No products found</p>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {currentProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="product-card"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div 
                        className="product-card-clickable"
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="product-card-image">
                          <ProductCarousel
                            images={{
                              main_image: product.main_image,
                              image_url: product.image_url,
                              additional_images: product.additional_images
                            }}
                            productName={product.name}
                            onImageClick={(e) => handleImageClick(product, e)}
                          />
                        </div>
                        
                        <div className="product-card-info">
                          <h3 className="product-card-name">{product.name}</h3>
                          
                          {/* Price Section */}
                          <div className="product-card-price">
                            {(() => {
                              const displayPrice = getDisplayPrice(product);
                              if (typeof displayPrice === 'object' && displayPrice.min !== undefined) {
                                return `₱${displayPrice.min.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - ₱${displayPrice.max.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                              }
                              return `₱${displayPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                            })()}
                          </div>
                          
                          {/* Review Count and Sold Quantity - Public for all users */}
                          <div className="product-stats">
                            {(product.average_rating > 0 || product.review_count > 0) && (
                              <span className="stat-item">
                                <span className="rating-number">{product.average_rating || 0}</span>
                                <FaStar className="star-icon" />
                                {product.review_count > 0 && (
                                  <span className="review-count-text"> ({product.review_count})</span>
                                )}
                              </span>
                            )}
                            {product.sold_quantity !== undefined && product.sold_quantity > 0 && (
                              <span className="stat-item">{product.sold_quantity} sold</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="product-card-footer">
                        {/* Add to Cart Button and Wishlist Heart - Side by Side */}
                        <div className="product-footer-top">
                          <button
                            className="add-to-cart-btn"
                            onClick={(e) => handleAddToCart(product, e)}
                            aria-label="Add to cart"
                          >
                            Add to Cart
                          </button>
                          <button
                            className="product-wishlist-btn"
                            onClick={(e) => handleToggleWishlist(product, e)}
                            aria-label="Add to wishlist"
                          >
                            {isInWishlist(product.id) ? (
                              <AiFillHeart className="wishlist-icon filled" />
                            ) : (
                              <AiOutlineHeart className="wishlist-icon" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination with Page Numbers */}
                {totalPages > 1 && (
                  <div className="shop-pagination">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="shop-page-arrow"
                      aria-label="Previous page"
                      title={`Page ${currentPage - 1} of ${totalPages}`}
                    >
                      <FaChevronLeft />
                    </button>
                    
                    <div className="shop-page-numbers">
                      {(() => {
                        // Always show only 3 page numbers
                        let pagesToShow = [];
                        
                        if (totalPages <= 3) {
                          // If 3 or fewer pages, show all
                          pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1);
                        } else if (currentPage === 1) {
                          // Show first 3 pages: 1, 2, 3
                          pagesToShow = [1, 2, 3];
                        } else if (currentPage === totalPages) {
                          // Show last 3 pages
                          pagesToShow = [totalPages - 2, totalPages - 1, totalPages];
                        } else {
                          // Show current page and one before/after: current-1, current, current+1
                          pagesToShow = [currentPage - 1, currentPage, currentPage + 1];
                        }
                        
                        return pagesToShow.map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => paginate(pageNum)}
                            className={`shop-page-number ${currentPage === pageNum ? 'active' : ''}`}
                            aria-label={`Go to page ${pageNum}`}
                            title={`Page ${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        ));
                      })()}
                    </div>
                    
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="shop-page-arrow"
                      aria-label="Next page"
                      title={`Page ${currentPage + 1} of ${totalPages}`}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                )}

                <div className="shop-results-info">
                  Showing {indexOfFirstProduct + 1} - {Math.min(indexOfLastProduct, filteredProducts.length)} of {filteredProducts.length} products
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilters && (
        <div className="mobile-filter-overlay" onClick={() => setShowMobileFilters(false)}>
          <div className="mobile-filter-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="mobile-filter-header">
              <h2 className="mobile-filter-title">Filters</h2>
              <button 
                className="mobile-filter-close"
                onClick={() => setShowMobileFilters(false)}
                aria-label="Close filters"
              >
                <FaTimes />
              </button>
            </div>

            {/* Filter Content - Same as sidebar */}
            <div className="mobile-filter-content">
              <div className="sidebar-section">
                <h3 className="sidebar-title">All Filters</h3>
                <button className="clear-filters-btn" onClick={clearAllFilters}>
                  Clear All
                </button>
              </div>

              {/* By Category */}
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">By Category</h4>
                <div className="category-list">
                  {getCategoriesForSidebar()
                    .slice(0, showAllCategories ? undefined : 3)
                    .map(category => (
                      <label key={category} className="category-item">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => handleCategoryToggle(category)}
                          className="category-checkbox"
                        />
                        <span className="category-label">{category}</span>
                      </label>
                    ))}
                </div>
                {getCategoriesForSidebar().length > 3 && (
                  <button
                    className="show-more-btn"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                  >
                    {showAllCategories ? (
                      <>
                        Less <FaChevronUp className="arrow-icon" />
                      </>
                    ) : (
                      <>
                        More <FaChevronDown className="arrow-icon" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Price Range</h4>
                <div className="price-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="price-input"
                    min="0"
                  />
                  <span className="price-separator">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="price-input"
                    min="0"
                  />
                </div>
                {(priceMin !== '' || priceMax !== '') && (
                  <div className="price-filter-active">
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
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Rating</h4>
                <div className="rating-list">
                  {[5, 4, 3, 2, 1].map(rating => (
                    <button
                      key={rating}
                      className={`rating-item ${selectedRating === rating ? 'active' : ''}`}
                      onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                    >
                      <div className="rating-stars">
                        {[...Array(5)].map((_, index) => (
                          <FaStar
                            key={index}
                            className={index < rating ? 'star-filled' : 'star-empty'}
                          />
                        ))}
                      </div>
                      {rating < 5 && <span className="rating-up">& Up</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mobile-filter-footer">
              <button 
                className="mobile-filter-apply"
                onClick={() => setShowMobileFilters(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="image-zoom-overlay" onClick={() => setZoomedImage(null)}>
          <div className="image-zoom-container" onClick={(e) => e.stopPropagation()}>
            <button className="image-zoom-close" onClick={() => setZoomedImage(null)} aria-label="Close">
              <FaTimes />
            </button>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.name}
              className="image-zoom-img"
            />
            <div className="image-zoom-caption">{zoomedImage.name}</div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showProductModal && selectedProduct && (
        <ProductModal
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
        />
      )}
    </>
  );
};

export default ProductListModal;