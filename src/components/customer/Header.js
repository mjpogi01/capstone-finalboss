import React, { useState, useEffect, useRef } from 'react';
import './Header.css';
import logo from '../../images/yohanns_logo-removebg-preview 3.png';
import SignInModal from './SignInModal';
import SignUpModal from './SignUpModal';
import CartModal from './CartModal';
import WishlistModal from './WishlistModal';
import CustomerOrdersModal from './CustomerOrdersModal';
import CustomerChatModal from './CustomerChatModal';
import { Link, useLocation } from "react-router-dom";
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../../services/orderService';
import productService from '../../services/productService';
import { FaStar, FaBars, FaTimes } from 'react-icons/fa';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false); // Legacy dropdown (kept hidden)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isOwner, isAdmin } = useAuth();
  
  // Safety check: ensure isOwner and isAdmin are functions
  const checkIsOwner = isOwner && typeof isOwner === 'function' ? isOwner : () => false;
  const checkIsAdmin = isAdmin && typeof isAdmin === 'function' ? isAdmin : () => false;
  const { 
    showSignInModal, 
    showSignUpModal, 
    openSignIn, 
    closeSignIn, 
    openSignUp, 
    closeSignUp 
  } = useModal();
  const { getCartItemsCount, openCart, isCartOpen } = useCart();
  const { openWishlist, wishlistItems, isWishlistOpen } = useWishlist();
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Check if any modal is open
  const isAnyModalOpen = showSignInModal || showSignUpModal || isCartOpen || isWishlistOpen || showOrdersModal || showChatModal || showSearchDropdown;
  
  // Track screen size for mobile search behavior
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Search toggle handler (similar to admin recent orders)
  const handleSearchToggle = () => {
    setShowSearchDropdown(false);
    setShowSearch((prev) => {
      const next = !prev;
      if (!next) {
        setSearchQuery('');
      }
      return next;
    });
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Navigate on change if query exists
    if (e.target.value.trim()) {
      navigate(`/?search=${encodeURIComponent(e.target.value)}`);
    } else {
      navigate('/');
    }
  };

  // Load orders count when user changes
  useEffect(() => {
    const loadOrdersCount = async () => {
      if (!user || checkIsAdmin() || checkIsOwner()) {
        setOrdersCount(0);
        return;
      }

      try {
        const userOrders = await orderService.getUserOrders(user.id);
        setOrdersCount(userOrders.length);
      } catch (error) {
        console.error('Error loading orders count:', error);
        setOrdersCount(0);
      }
    };

    loadOrdersCount();
  }, [user, isAdmin, isOwner]);

  // Listen for order placed events to refresh orders count
  useEffect(() => {
    const handleOrderPlaced = async () => {
      if (user && !checkIsAdmin() && !checkIsOwner()) {
        try {
          const userOrders = await orderService.getUserOrders(user.id);
          setOrdersCount(userOrders.length);
        } catch (error) {
          console.error('Error refreshing orders count:', error);
        }
      }
    };

    const handleOrderCancelled = async () => {
      if (user && !checkIsAdmin() && !checkIsOwner()) {
        try {
          const userOrders = await orderService.getUserOrders(user.id);
          setOrdersCount(userOrders.length);
        } catch (error) {
          console.error('Error refreshing orders count:', error);
        }
      }
    };

    window.addEventListener('orderPlaced', handleOrderPlaced);
    window.addEventListener('orderCancelled', handleOrderCancelled);
    return () => {
      window.removeEventListener('orderPlaced', handleOrderPlaced);
      window.removeEventListener('orderCancelled', handleOrderCancelled);
    };
  }, [user, isAdmin, isOwner]);

  // SAVED FILTER DROPDOWN CONTENTS FOR LATER USE:
  // const filterOptions = [
  //   { category: 'Categories', options: ['Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Accessories'] },
  //   { category: 'Price Range', options: ['Under P500', 'P500 - P1000', 'P1000 - P1500', 'Above P1500'] },
  //   { category: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom'] },
  //   { category: 'Color', options: ['Blue', 'Red', 'White', 'Black', 'Green', 'Yellow', 'Purple'] },
  //   { category: 'Brand', options: ['Yohann\'s Own', 'Replicated', 'Custom Design'] }
  // ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Removed unused handleProtectedAction function

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      openSignIn();
    } else {
      setShowProfileDropdown(!showProfileDropdown);
    }
  };

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
    navigate('/logout');
  };

  // Search products as user types
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const allProducts = await productService.getAllProducts();
        const query = searchQuery.toLowerCase();
        
        // Filter products by name matching the search query
        const results = allProducts.filter(product => 
          product.name && product.name.toLowerCase().includes(query)
        );
        
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching products:', error);
        setSearchResults([]);
      }
    };

    searchProducts();
  }, [searchQuery]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-left">
          <div className={`logo ${showSearch && isMobileView ? 'logo-hidden' : ''}`}>
            <img 
              src={logo} 
              alt="YOHANNS Sportswear House" 
              className="logo-image"
            />
          </div>
        </div>
        
        {/* Hamburger Menu Button */}
        {isAnyModalOpen ? (
          <span className="hamburger-menu-spacer" aria-hidden="true" />
        ) : (
          <button 
            className={`hamburger-menu ${mobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        )}
        
        <nav className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`} key={location.pathname}>
          <div className="nav-menu-content">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              >
              HOME
            </Link>
            <Link 
              to="/about" 
              className={`nav-link ${isActive('/about') ? 'active' : ''}`}
            >
              ABOUT
            </Link>
            <Link 
              to="/highlights" 
              className={`nav-link ${isActive('/highlights') ? 'active' : ''}`}
            >
              HIGHLIGHTS
            </Link>
            <Link 
              to="/branches" 
              className={`nav-link ${isActive('/branches') ? 'active' : ''}`}
            >
              BRANCHES
            </Link>
            <Link 
              to="/faqs" 
              className={`nav-link ${isActive('/faqs') ? 'active' : ''}`}
            >
              FAQs
            </Link>
            <Link 
              to="/contacts" 
              className={`nav-link ${isActive('/contacts') ? 'active' : ''}`}
            >
              CONTACTS
            </Link>
            
            {/* Mobile Menu Actions - Text Links */}
            <div className="mobile-menu-actions">
              <button
                className="mobile-action-link"
                onClick={(e) => {
                  e.currentTarget.blur();
                  openCart();
                  setMobileMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M3 3h2l3 12h10l3-8H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="19" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17" cy="19" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span>Cart</span>
                {getCartItemsCount() > 0 && (
                  <span className="mobile-action-badge">{getCartItemsCount()}</span>
                )}
              </button>
            
              <button
                className="mobile-action-link"
                onClick={(e) => {
                  e.currentTarget.blur();
                  openWishlist();
                  setMobileMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Wishlist</span>
                {wishlistItems.length > 0 && (
                  <span className="mobile-action-badge">{wishlistItems.length}</span>
                )}
              </button>
              
              {isAuthenticated && !checkIsAdmin() && !checkIsOwner() && (
                <button
                  className="mobile-action-link"
                  onClick={async (e) => {
                    e.currentTarget.blur();
                    if (user) {
                      try {
                        const userOrders = await orderService.getUserOrders(user.id);
                        setOrdersCount(userOrders.length);
                      } catch (error) {
                        console.error('Error refreshing orders count:', error);
                      }
                    }
                    setMobileMenuOpen(false);
                    setShowOrdersModal(true);
                  }}
                >
                  <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                  </svg>
                  <span>Orders</span>
                  {ordersCount > 0 && (
                    <span className="mobile-action-badge">{ordersCount}</span>
                  )}
                </button>
              )}
              
              {isAuthenticated && (
                <button
                  className="mobile-action-link"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setMobileMenuOpen(false);
                    setShowChatModal(true);
                  }}
                >
                  <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor" />
                  </svg>
                  <span>Chat</span>
                </button>
              )}
              
              <button 
              className="mobile-action-link" 
              onClick={(e) => {
                e.currentTarget.blur();
                setMobileMenuOpen(false);
                if (!isAuthenticated) {
                  openSignIn();
                } else {
                  navigate('/profile');
                }
              }}
            >
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
                  <span>{isAuthenticated ? 'Account' : 'Sign In'}</span>
              </button>
              
              {isAuthenticated && (
                <button 
                className="mobile-action-link mobile-logout-link" 
                onClick={(e) => {
                  e.currentTarget.blur();
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" />
                </svg>
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </nav>
        
        <div className="header-right">
          <div className="utility-icons">
          <div className="header-search-wrapper">
            {showSearch && (
              isMobileView ? (
                <div className="header-search-field mobile-slide">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="header-search-input mobile"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowSearch(false);
                        setSearchQuery('');
                      } else if (e.key === 'Enter') {
                        if (searchQuery.trim()) {
                          navigate(`/?search=${encodeURIComponent(searchQuery)}`);
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <input
                  ref={searchInputRef}
                  type="text"
                  className="header-search-input"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  autoFocus
                  onBlur={(e) => {
                    if (!e.target.value) {
                      setShowSearch(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSearch(false);
                      setSearchQuery('');
                    } else if (e.key === 'Enter') {
                      if (searchQuery.trim()) {
                        navigate(`/?search=${encodeURIComponent(searchQuery)}`);
                      }
                    }
                  }}
                />
              )
            )}
            <button 
              className={`header-search-btn ${showSearch ? 'active' : ''}`}
              onClick={handleSearchToggle}
              aria-label="Search"
              title="Search products"
            >
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="15.5" y1="15.5" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          
          {/* SAVED FILTER DROPDOWN JSX FOR LATER USE:
          {showMoreDropdown && (
            <div className="dropdown-menu">
              <div className="filter-categories-row">
                {filterOptions.map((filter, index) => (
                  <div key={index} className="filter-category">
                    <h4 className="filter-category-title">{filter.category}</h4>
                    <div className="filter-options">
                      {filter.options.map((option, optionIndex) => (
                        <label key={optionIndex} className="filter-option">
                          <input type="checkbox" />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="filter-actions">
                <button className="apply-filters">Apply Filters</button>
                <button className="clear-filters">Clear All</button>
              </div>
            </div>
          )}
          */}
          
          <div className="icon cart-icon" aria-label="Cart" onClick={openCart}>
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M3 3h2l3 12h10l3-8H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="19" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="17" cy="19" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            {getCartItemsCount() > 0 && (
              <span className="cart-badge">{getCartItemsCount()}</span>
            )}
          </div>
          <div className="icon y-wishlist-icon" aria-label="Wishlist" onClick={openWishlist}>
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {wishlistItems.length > 0 && (
              <span className="wishlist-badge">{wishlistItems.length}</span>
            )}
          </div>
          <div className="icon profile-icon" aria-label="Account" onClick={handleProfileClick}>
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isAuthenticated && showProfileDropdown && (
              <div className="profile-dropdown" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                <div className="profile-dropdown-content">
                  <div className="profile-menu">
                    {/* Dashboard Links for Admin/Owner */}
                    {checkIsOwner() && (
                      <button 
                        className="profile-menu-item dashboard" 
                        onClick={() => {
                          setShowProfileDropdown(false);
                          navigate('/owner');
                        }}
                      >
                        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor" />
                        </svg>
                        Owner Dashboard
                      </button>
                    )}
                    {checkIsAdmin() && (
                      <button 
                        className="profile-menu-item dashboard" 
                        onClick={() => {
                          setShowProfileDropdown(false);
                          navigate('/admin');
                        }}
                      >
                        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor" />
                        </svg>
                        Admin Dashboard
                      </button>
                    )}
                    
                    <button 
                      className="profile-menu-item" 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigate('/profile');
                      }}
                    >
                      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                      </svg>
                      My Account
                    </button>
                    <button 
                      className="profile-menu-item orders-menu-item" 
                      onClick={async () => {
                        setShowProfileDropdown(false);
                        // Refresh orders count before opening modal
                        if (user) {
                          try {
                            const userOrders = await orderService.getUserOrders(user.id);
                            setOrdersCount(userOrders.length);
                          } catch (error) {
                            console.error('Error refreshing orders count:', error);
                          }
                        }
                        setShowOrdersModal(true);
                      }}
                    >
                      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                        <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h12v12z" fill="currentColor" />
                      </svg>
                      Orders
                      {ordersCount > 0 && (
                        <span className="orders-badge">{ordersCount}</span>
                      )}
                    </button>
                    <button 
                      className="profile-menu-item" 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowChatModal(true);
                      }}
                    >
                      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor" />
                      </svg>
                      Chat
                    </button>
                    <div className="profile-divider"></div>
                    <button 
                      className="profile-menu-item logout" 
                      onClick={handleLogout}
                    >
                      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
      
      
      {/* Dark Minimalist Search Dropdown - Below Icon */}
      {showSearchDropdown && (
        <div 
          className={`yohanns-search-dropdown-wrapper`}
          onClick={() => setShowSearchDropdown(false)}
        >
          <div 
            className="yohanns-search-dropdown" 
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="yohanns-search-input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowSearchDropdown(false);
                } else if (e.key === 'Enter') {
                  // Navigate to home with search query on Enter
                  if (searchQuery.trim()) {
                    setShowSearchDropdown(false);
                    navigate(`/?search=${encodeURIComponent(searchQuery)}`);
                  }
                }
              }}
            />
            <button 
              className="yohanns-search-submit-btn"
              aria-label="Search"
              title="Search"
              onClick={() => {
                if (searchQuery.trim()) {
                  setShowSearchDropdown(false);
                  navigate(`/?search=${encodeURIComponent(searchQuery)}`);
                }
              }}
            >
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="15.5" y1="15.5" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Search Results Container */}
            {searchQuery.trim() && (
              <div className="yohanns-search-results-container">
                {searchResults.length > 0 ? (
                  <div className="yohanns-search-results-list">
                    {searchResults.slice(0, 8).map((product) => (
                      <div 
                        key={product.id} 
                        className="yohanns-search-result-item"
                        onClick={() => {
                          setShowSearchDropdown(false);
                          // Navigate to home with search query
                          navigate(`/?search=${encodeURIComponent(searchQuery)}`);
                        }}
                      >
                        <div className="yohanns-result-image-wrapper">
                          {product.main_image ? (
                            <img 
                              src={product.main_image} 
                              alt={product.name}
                              className="yohanns-result-image"
                              onError={(e) => e.target.src = '/images/placeholder-jersey.png'}
                            />
                          ) : product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="yohanns-result-image"
                              onError={(e) => e.target.src = '/images/placeholder-jersey.png'}
                            />
                          ) : (
                            <div className="yohanns-result-placeholder">🏀</div>
                          )}
                        </div>
                        <div className="yohanns-result-info">
                          <p className="yohanns-result-name">{product.name}</p>
                          <p className="yohanns-result-price">₱{parseFloat(product.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          {product.category && (
                            <p className="yohanns-result-category">{product.category}</p>
                          )}
                          {(product.average_rating > 0 || product.sold_quantity > 0) && (
                            <div className="yohanns-result-stats">
                              {product.average_rating > 0 && (
                                <span className="yohanns-stat-item">
                                  <span className="rating-number">{product.average_rating}</span>
                                  <FaStar className="star-icon" />
                                </span>
                              )}
                              {product.sold_quantity > 0 && (
                                <span className="yohanns-stat-item">{product.sold_quantity} sold</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="yohanns-search-no-results">
                    <p>No products found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}
      
      <SignInModal 
        isOpen={showSignInModal} 
        onClose={closeSignIn} 
        onOpenSignUp={() => { closeSignIn(); openSignUp(); }}
      />
      <SignUpModal 
        isOpen={showSignUpModal}
        onClose={closeSignUp}
        onOpenSignIn={() => { closeSignUp(); openSignIn(); }}
      />
      <CartModal />
      <WishlistModal />
      <CustomerOrdersModal 
        isOpen={showOrdersModal} 
        onClose={() => setShowOrdersModal(false)} 
      />
      <CustomerChatModal 
        isOpen={showChatModal} 
        onClose={() => setShowChatModal(false)} 
      />
    </header>
  );
};

export default Header; 
