import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './ProductCategories.css';
import Loading from '../Loading';
import ErrorState from '../ErrorState';
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { FaChevronLeft, FaChevronRight, FaStar, FaShoppingCart } from "react-icons/fa";
import ProductModal from './ProductModal';
import ProductCarousel from './ProductCarousel';
import ProtectedAction from '../ProtectedAction';
import { useModal } from '../../contexts/ModalContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import productService from '../../services/productService';
import orderService from '../../services/orderService';

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

const ProductCategories = ({ activeCategory, setActiveCategory, searchQuery, setSearchQuery }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // Add this state
  const [isModalOpen, setIsModalOpen] = useState(false); // Add this state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productRatings, setProductRatings] = useState({});
  const navRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDotIndex, setActiveDotIndex] = useState(0); // 0, 1, or 2 for the 3 dots
  const [dotStartIndex, setDotStartIndex] = useState(0); // Starting index for the sliding window of dots
  const { openSignIn } = useModal();
  // const { addToCart } = useCart(); // Removed unused import
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const handleToggleWishlist = async (product) => {
    if (!isAuthenticated) {
      openSignIn();
      return;
    }
    await toggleWishlist(product);
  };

  // Function to calculate average rating for a product
  const calculateAverageRating = async (productId) => {
    try {
      const reviews = await orderService.getProductReviews(productId);
      if (reviews.length === 0) return null; // No reviews available
      
      const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      const averageRating = totalRating / reviews.length;
      return averageRating.toFixed(1); // Always show 1 decimal place
    } catch (error) {
      console.error('Error calculating rating for product', productId, error);
      return null; // No rating available on error
    }
  };

  // Add this function to handle opening the modal
  const openProductModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Add this function to handle closing the modal
  const closeProductModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // Removed unused handleAddToCart function

  // Get categories dynamically from products and custom categories from localStorage
  const categories = useMemo(() => {
    const predefinedCategories = [
      { id: 'jerseys', name: 'JERSEYS' },
      { id: 't-shirts', name: 'T-SHIRTS' },
      { id: 'long sleeves', name: 'LONG SLEEVES' },
      { id: 'hoodies', name: 'HOODIES' },
      { id: 'uniforms', name: 'UNIFORMS' },
      { id: 'balls', name: 'BALLS' },
      { id: 'trophies', name: 'TROPHIES' }
    ];

    // Get custom categories from localStorage
    let customCategories = [];
    try {
      const savedCustomCategories = localStorage.getItem('customCategories');
      if (savedCustomCategories) {
        customCategories = JSON.parse(savedCustomCategories).map(cat => ({
          id: cat.toLowerCase(),
          name: cat.toUpperCase()
        }));
      }
    } catch (e) {
      console.warn('Failed to parse custom categories:', e);
    }

    // Get hidden categories (to exclude them)
    let hiddenCategories = [];
    try {
      const savedHiddenCategories = localStorage.getItem('hiddenCategories');
      if (savedHiddenCategories) {
        hiddenCategories = JSON.parse(savedHiddenCategories).map(cat => cat.toLowerCase());
      }
    } catch (e) {
      console.warn('Failed to parse hidden categories:', e);
    }

    // Filter out hidden predefined categories
    const visiblePredefined = predefinedCategories.filter(
      cat => !hiddenCategories.includes(cat.id)
    );

    // Get unique categories from products that aren't already in predefined or custom
    const productCategories = [...new Set(
      products
        .map(p => p.category)
        .filter(Boolean)
        .map(cat => ({
          id: cat.toLowerCase(),
          name: cat.toUpperCase()
        }))
    )];

    // Combine all categories, removing duplicates using a Map to ensure uniqueness
    const categoryMap = new Map();
    
    // Add visible predefined categories first
    visiblePredefined.forEach(cat => {
      categoryMap.set(cat.id, cat);
    });
    
    // Add custom categories (will overwrite if duplicate)
    customCategories.forEach(cat => {
      if (!hiddenCategories.includes(cat.id)) {
        categoryMap.set(cat.id, cat);
      }
    });
    
    // Add product categories (only if not already present and not hidden)
    productCategories.forEach(cat => {
      if (!categoryMap.has(cat.id) && !hiddenCategories.includes(cat.id)) {
        categoryMap.set(cat.id, cat);
      }
    });

    // Convert Map values back to array
    return Array.from(categoryMap.values());
  }, [products]);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedProducts = await productService.getAllProducts();
        setProducts(fetchedProducts);
        
        // Load ratings asynchronously without blocking the UI
        loadRatingsAsync(fetchedProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
        // Fallback to empty array
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    
    // Set up real-time polling to refresh products every 30 seconds
    // This ensures reviews and sold counts update in real-time
    const pollInterval = setInterval(() => {
      fetchProducts();
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Load ratings asynchronously without blocking the main product load
  const loadRatingsAsync = async (products) => {
    try {
      const ratings = {};
      // Process ratings in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (product) => {
            const averageRating = await calculateAverageRating(product.id);
            ratings[product.id] = averageRating;
          })
        );
        // Update ratings progressively
        setProductRatings(prev => ({ ...prev, ...ratings }));
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const filteredProducts = searchQuery.trim()
    ? products.filter(product =>
        product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products.filter(product => 
        product.category && product.category.toLowerCase() === activeCategory.toLowerCase()
      );
  const displayedProducts = showAll ? filteredProducts : filteredProducts.slice(0, 8);
  
  // Debug logging
  console.log(`Category: ${activeCategory}, Total products: ${products.length}, Filtered: ${filteredProducts.length}, Displayed: ${displayedProducts.length}, Show All: ${showAll}, Search: ${searchQuery}`);

  const checkScroll = useCallback(() => {
    if (navRef.current) {
      setCanScrollLeft(navRef.current.scrollLeft > 0);
      setCanScrollRight(
        navRef.current.scrollWidth > navRef.current.clientWidth + navRef.current.scrollLeft
      );
    }
  }, []);

  const scrollNav = (direction) => {
    if (navRef.current) {
      navRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth"
      });
    }
  };

  // Fixed groups: First 3 dots (categories 0-2), Second 3 dots (categories 3-5), Last 1 dot (category 6)
  useEffect(() => {
    if (!activeCategory || categories.length === 0) {
      setActiveDotIndex(0);
      setDotStartIndex(0);
      return;
    }
    
    const categoryIndex = categories.findIndex(cat => cat.id === activeCategory);
    if (categoryIndex === -1) {
      setActiveDotIndex(0);
      setDotStartIndex(0);
      return;
    }
    
    const totalCategories = categories.length;
    let newStartIndex = 0;
    let newActiveDotIndex = 0;
    
    // Group 1: First 3 categories (0-2) → Show dots 0-2
    if (categoryIndex < 3) {
      newStartIndex = 0;
      newActiveDotIndex = categoryIndex;
    }
    // Group 2: Next 3 categories (3-5) → Show dots 3-5
    else if (categoryIndex < 6) {
      newStartIndex = 3;
      newActiveDotIndex = categoryIndex - 3;
    }
    // Group 3: Last category (6) → Show only dot 6
    else {
      newStartIndex = 6;
      newActiveDotIndex = 0;
    }
    
    setDotStartIndex(newStartIndex);
    setActiveDotIndex(newActiveDotIndex);
  }, [activeCategory, categories]);

  useEffect(() => {
    // Add a small delay to ensure DOM is updated after category change
    const timeoutId = setTimeout(() => {
      checkScroll();
    }, 100);

    const navEl = navRef.current;
    if (navEl) {
      navEl.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
    }
    
    return () => {
      clearTimeout(timeoutId);
      if (navEl) {
        navEl.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      }
    };
  }, [activeCategory, checkScroll]); // Add checkScroll to dependency array

  return (
    <section className="product-categories">
      {/* Category Nav */}
      <div className="sportswear-category-nav-wrapper">
        {/* Fixed Groups Pagination - Mobile only */}
        {/* Group 1: First 3 dots (categories 0-2) */}
        {/* Group 2: Second 3 dots (categories 3-5) */}
        {/* Group 3: Last 1 dot (category 6) */}
        <div className="sportswear-scroll-radio-indicators">
          {categories.length > 0 && (() => {
            // Determine how many dots to show based on current group
            let dotsToShow = 3;
            if (dotStartIndex === 6) {
              // Last group: only 1 dot
              dotsToShow = 1;
            }
            
            return Array.from({ length: dotsToShow }, (_, idx) => {
              const dotIndex = dotStartIndex + idx;
              const isActive = activeDotIndex === idx;
              return (
                <span 
                  key={`dot-${dotIndex}`}
                  className={`sportswear-radio-dot ${isActive ? 'active' : ''}`}
                />
              );
            });
          })()}
        </div>
        
        {/* LEFT ARROW */}
        <button
          className="sportswear-scroll-btn left"
          onClick={() => scrollNav("left")}
          title="Scroll left"
        >
          <FaChevronLeft />
        </button>

        <div className="sportswear-category-nav" ref={navRef}>
          {categories.map(category => (
            <button
              key={category.id}
              className={`sportswear-category-btn ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(category.id);
                setShowAll(false);
                // Dot indicator will update automatically via useEffect
              }}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* RIGHT ARROW */}
        <button
          className="sportswear-scroll-btn right"
          onClick={() => scrollNav("right")}
          title="Scroll right"
        >
          <FaChevronRight />
        </button>
      </div>

      {/* Products */}
      <div className="sportswear-products-container">
        {/* Search Header - Show when searching */}
        {searchQuery.trim() && (
          <div className="sportswear-search-header">
            <div className="sportswear-search-info">
              <h2 className="sportswear-search-title">
                Search Results for: <span className="sportswear-search-query">"{searchQuery}"</span>
              </h2>
              <p className="sportswear-search-count">
                Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button 
              className="sportswear-clear-search-btn"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('jerseys');
                setShowAll(false);
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <Loading message="Loading products..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : (
          <div className="sportswear-products-grid">
            {displayedProducts.map(product => (
              <div key={product.id} className="sportswear-product-card">
                <ProtectedAction
                  onAuthenticated={() => openProductModal(product)}
                  onUnauthenticated={() => openSignIn()}
                  className="sportswear-product-clickable-area"
                >
                  <div className="sportswear-product-image-wrapper">
                    <ProductCarousel
                      images={{
                        main_image: product.main_image,
                        image_url: product.image_url,
                        additional_images: product.additional_images
                      }}
                      productName={product.name}
                    />
                  </div>
                  <div className="sportswear-product-info">
                    <p className="sportswear-product-name">{product.name}</p>
                    <div className="sportswear-product-price">
                      {(() => {
                        const displayPrice = getDisplayPrice(product);
                        if (typeof displayPrice === 'object' && displayPrice.min !== undefined) {
                          return `₱${displayPrice.min.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - ₱${displayPrice.max.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                        }
                        return `₱${displayPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                      })()}
                    </div>
                    <div className="sportswear-product-stats">
                      {(product.average_rating > 0 || productRatings[product.id]) && (
                        <span className="sportswear-stat-item">
                          <span className="rating-number">
                            {product.average_rating > 0 ? product.average_rating : (productRatings[product.id] || 0)}
                          </span>
                          <FaStar className="star-icon" />
                        </span>
                      )}
                      {product.sold_quantity !== undefined && product.sold_quantity > 0 && (
                        <span className="sportswear-stat-item">{product.sold_quantity} sold</span>
                      )}
                    </div>
                    <div className="sportswear-action-buttons">
                      <button 
                        className="sportswear-add-to-cart-btn" 
                        title="Add to Cart"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openProductModal(product);
                        }}
                      >
                        <FaShoppingCart />
                        <span>Add Cart</span>
                      </button>
                      <button 
                        className="sportswear-add-to-favorites-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWishlist(product);
                        }}
                        title={isInWishlist(product.id) ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        {isInWishlist(product.id) ? (
                          <AiFillHeart color="red" />
                        ) : (
                          <AiOutlineHeart />
                        )}
                      </button>
                    </div>
                  </div>
                </ProtectedAction>
              </div>
            ))}
          </div>
        )}

        {/* View All/Show Less Button */}
        {filteredProducts.length > 8 && (
          <div className="sportswear-view-all-section">
            {!showAll ? (
              <button className="sportswear-view-all-btn" onClick={() => setShowAll(true)}>
                SHOW MORE
              </button>
            ) : (
              <button className="sportswear-view-all-btn show-less" onClick={() => setShowAll(false)}>
                SHOW LESS
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add the ProductModal component */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={closeProductModal}
        product={selectedProduct}
      />
    </section>
  );
};

export default ProductCategories;