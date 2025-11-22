import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Inventory.css';
import './admin-shared.css';
import Sidebar from '../../components/admin/Sidebar';
import AddProductModal from '../../components/admin/AddProductModal';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus, faImage, faChevronDown, faChevronUp, faSearch } from '@fortawesome/free-solid-svg-icons';

const Inventory = () => {
  const [activePage, setActivePage] = useState('inventory');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedSizes, setExpandedSizes] = useState({});
  const [openStockDropdown, setOpenStockDropdown] = useState(null); // Track which product's stock dropdown is open
  const [openSizesDropdown, setOpenSizesDropdown] = useState(null); // Track which product's sizes dropdown is open
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, productId: null });
  const [sizesDropdownPosition, setSizesDropdownPosition] = useState({ top: 0, left: 0, productId: null });
  const triggerRefs = useRef({}); // Store refs to trigger buttons
  const sizesTriggerRefs = useRef({}); // Store refs to sizes dropdown trigger buttons
  const [filters, setFilters] = useState({
    branch: 'all',
    category: 'all',
    stockSort: 'none',
    priceSort: 'none',
    soldSort: 'none'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, filters, searchTerm]);

  const fetchProducts = async () => {
    try {
      // Use 'all=true' query parameter to get all products from all branches (no deduplication)
      const response = await fetch('http://localhost:4000/api/products?all=true');
      const data = await response.json();
      const normalizedProducts = normalizeProductsResponse(data);
      setProducts(normalizedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeProductsResponse = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.products)) return data.products;
    return [];
  };

  const applyFilters = () => {
    if (!Array.isArray(products) || products.length === 0) {
      setFilteredProducts([]);
      return;
    }

    let filtered = [...products];

    // Filter by product name search (before grouping)
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
    }

    // Filter by branch (before grouping if specific branch is selected)
    if (filters.branch !== 'all') {
      const selectedBranchId = parseInt(filters.branch);
      filtered = filtered.filter(product => product.branch_id === selectedBranchId);
      
      // When filtering by specific branch, deduplicate products by name and category
      // This prevents duplicates if the same product exists multiple times in the same branch
      const deduplicatedProducts = {};
      
      filtered.forEach(product => {
        // Create a unique key based on name and category (case-insensitive)
        const normalizedName = (product.name || '').toLowerCase().trim();
        const normalizedCategory = (product.category || '').toLowerCase().trim();
        const key = `${normalizedName}_${normalizedCategory}`;
        
        // Parse size_stocks if it's a string
        let parsedSizeStocks = product.size_stocks;
        if (typeof parsedSizeStocks === 'string') {
          try {
            parsedSizeStocks = JSON.parse(parsedSizeStocks);
          } catch (e) {
            parsedSizeStocks = null;
          }
        }
        
        if (!deduplicatedProducts[key]) {
          // First occurrence - use this product
          deduplicatedProducts[key] = {
            ...product,
            stock_quantity: (product.stock_quantity !== null && product.stock_quantity !== undefined) 
              ? product.stock_quantity 
              : 0,
            size_stocks: parsedSizeStocks
          };
        } else {
          // Duplicate found - merge stocks if needed
          // Use the product with the most recent updated_at or higher stock
          const existing = deduplicatedProducts[key];
          const existingStock = existing.stock_quantity || 0;
          const newStock = (product.stock_quantity !== null && product.stock_quantity !== undefined) 
            ? product.stock_quantity 
            : 0;
          
          // If this product has more stock or is more recent, use it
          const existingDate = new Date(existing.updated_at || 0);
          const newDate = new Date(product.updated_at || 0);
          
          if (newStock > existingStock || (newStock === existingStock && newDate > existingDate)) {
            deduplicatedProducts[key] = {
              ...product,
              stock_quantity: newStock,
              size_stocks: parsedSizeStocks
            };
            console.log(`📦 [Inventory] Replaced duplicate product: ${product.name} (${product.category}) in branch ${selectedBranchId} - using product with stock ${newStock}`);
          } else {
            console.log(`📦 [Inventory] Skipped duplicate product: ${product.name} (${product.category}) in branch ${selectedBranchId} - keeping existing with stock ${existingStock}`);
          }
        }
      });
      
      // Convert back to array
      filtered = Object.values(deduplicatedProducts);
      console.log(`📦 [Inventory] Branch filter: ${filtered.length} unique products from branch ${selectedBranchId}`);
    }
    
    // If branch filter is 'all', group products by name and category, and sum stock quantities
    if (filters.branch === 'all') {
      const groupedProducts = {};
      
      console.log(`📦 [Inventory] Grouping ${filtered.length} products by name and category...`);
      
      filtered.forEach(product => {
        // Group all products in on-hand categories (balls, trophies, medals) by name and category
        // This ensures products from different branches are grouped together
        // For other products (apparel), show them individually
        const onHandCategories = ['balls', 'trophies', 'medals'];
        const isOnHandProduct = onHandCategories.includes(product.category?.toLowerCase());
        
        if (isOnHandProduct) {
          // Create a unique key based on name and category (case-insensitive for consistency)
          const normalizedName = (product.name || '').toLowerCase().trim();
          const normalizedCategory = (product.category || '').toLowerCase().trim();
          const key = `${normalizedName}_${normalizedCategory}`;
          
          if (!groupedProducts[key]) {
            // First occurrence - create the grouped product
            // Parse size_stocks if it's a string
            let parsedSizeStocks = product.size_stocks;
            if (typeof parsedSizeStocks === 'string') {
              try {
                parsedSizeStocks = JSON.parse(parsedSizeStocks);
              } catch (e) {
                parsedSizeStocks = null;
              }
            }
            
            groupedProducts[key] = {
              ...product,
              // Use the first product's data as base, but ensure stock values are set correctly
              stock_quantity: (product.stock_quantity !== null && product.stock_quantity !== undefined) 
                ? product.stock_quantity 
                : 0,
              size_stocks: parsedSizeStocks,
              branch_ids: product.branch_id ? [product.branch_id] : [],
              branch_names: product.branch_name ? [product.branch_name] : [],
              branch_size_stocks: {}, // Track size_stocks per branch
              // Keep the first product's ID for editing purposes
              _groupedKey: key // Store the grouping key for reference
            };
            
            console.log(`📦 [Inventory] Created grouped product: ${product.name} (${product.category}) - Key: ${key}, Branch: ${product.branch_id}`);
            
            // Store size_stocks for this branch (even if empty/null)
            if (product.branch_id) {
              if (parsedSizeStocks) {
                groupedProducts[key].branch_size_stocks[product.branch_id] = parsedSizeStocks;
              } else {
                // Initialize empty size_stocks for this branch if it doesn't exist
                groupedProducts[key].branch_size_stocks[product.branch_id] = null;
              }
            }
          } else {
            // Product already exists - sum the stock quantities and merge size_stocks
            const existingStock = groupedProducts[key].stock_quantity || 0;
            // Only add stock if it's not null/undefined (0 is valid)
            const newStock = (product.stock_quantity !== null && product.stock_quantity !== undefined) 
              ? product.stock_quantity 
              : 0;
            groupedProducts[key].stock_quantity = existingStock + newStock;
            
            console.log(`📦 [Inventory] Merging product: ${product.name} (${product.category}) - Branch ${product.branch_id}, Stock: ${newStock}, Total: ${groupedProducts[key].stock_quantity}`);
            
            // Debug logging to track where stocks are coming from
            if (newStock > 0) {
              console.log(`📦 [Inventory] Adding stock ${newStock} from branch ${product.branch_id} (${product.branch_name}) for product ${product.name}`);
            }
            
            // Parse and merge size_stocks
            let parsedSizeStocks = product.size_stocks;
            if (typeof parsedSizeStocks === 'string') {
              try {
                parsedSizeStocks = JSON.parse(parsedSizeStocks);
              } catch (e) {
                parsedSizeStocks = null;
              }
            }
            
            if (product.branch_id) {
              // Store size_stocks for this branch (even if null/empty)
              if (parsedSizeStocks) {
                groupedProducts[key].branch_size_stocks[product.branch_id] = parsedSizeStocks;
                
                // Merge size_stocks across branches (sum quantities for each size)
                if (!groupedProducts[key].size_stocks) {
                  groupedProducts[key].size_stocks = {};
                }
                
                Object.keys(parsedSizeStocks).forEach(size => {
                  const existingQty = groupedProducts[key].size_stocks[size] || 0;
                  // Only add stock if it's not null/undefined (0 is valid)
                  const newQty = (parsedSizeStocks[size] !== null && parsedSizeStocks[size] !== undefined) 
                    ? parsedSizeStocks[size] 
                    : 0;
                  groupedProducts[key].size_stocks[size] = existingQty + newQty;
                  
                  // Debug logging to track where size stocks are coming from
                  if (newQty > 0) {
                    console.log(`📦 [Inventory] Adding size stock ${size}: ${newQty} from branch ${product.branch_id} (${product.branch_name}) for product ${product.name}`);
                  }
                });
              } else {
                // Initialize empty size_stocks for this branch if it doesn't exist
                groupedProducts[key].branch_size_stocks[product.branch_id] = null;
              }
            }
            
            // Track branch IDs and names
            if (product.branch_id && !groupedProducts[key].branch_ids.includes(product.branch_id)) {
              groupedProducts[key].branch_ids.push(product.branch_id);
            }
            if (product.branch_name && !groupedProducts[key].branch_names.includes(product.branch_name)) {
              groupedProducts[key].branch_names.push(product.branch_name);
            }
          }
        } else {
          // For non-on-hand products, keep them as individual items
          const key = `${product.id}`;
          groupedProducts[key] = product;
        }
      });
      
      // Convert grouped object back to array
      filtered = Object.values(groupedProducts);
      console.log(`📦 [Inventory] Grouped ${filtered.length} products from ${filtered.reduce((sum, p) => sum + (p.branch_ids?.length || 1), 0)} total product records`);
    }

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Sort by stock
    if (filters.stockSort !== 'none') {
      filtered.sort((a, b) => {
        const aStock = a.stock_quantity || 0;
        const bStock = b.stock_quantity || 0;
        return filters.stockSort === 'asc' ? aStock - bStock : bStock - aStock;
      });
    }

    // Sort by price
    if (filters.priceSort !== 'none') {
      filtered.sort((a, b) => {
        const aPrice = parseFloat(a.price) || 0;
        const bPrice = parseFloat(b.price) || 0;
        return filters.priceSort === 'asc' ? aPrice - bPrice : bPrice - aPrice;
      });
    }

    // Sort by sold (assuming we'll add a sold field to products)
    if (filters.soldSort !== 'none') {
      filtered.sort((a, b) => {
        const aSold = a.sold_quantity || 0;
        const bSold = b.sold_quantity || 0;
        return filters.soldSort === 'asc' ? aSold - bSold : bSold - aSold;
      });
    }

    setFilteredProducts(Array.isArray(filtered) ? filtered : []);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getUniqueBranches = () => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const branches = [...new Set(products.map(p => p.branch_id).filter(Boolean))];
    return branches.map(id => {
      const product = products.find(p => p.branch_id === id);
      return { id, name: product?.branch_name || `Branch ${id}` };
    });
  };

  const getUniqueCategories = () => {
    if (!Array.isArray(products) || products.length === 0) return [];

    return [...new Set(products.map(p => p.category).filter(Boolean))];
  };

  const normalizeProductSurcharges = (product) => {
    if (!product) return product;

    let sizeSurcharges = product.size_surcharges;
    if (typeof sizeSurcharges === 'string') {
      try {
        sizeSurcharges = JSON.parse(sizeSurcharges);
      } catch (error) {
        console.warn('Failed to parse size_surcharges in Inventory:', error?.message);
        sizeSurcharges = null;
      }
    }

    let fabricSurcharges = product.fabric_surcharges;
    if (typeof fabricSurcharges === 'string') {
      try {
        fabricSurcharges = JSON.parse(fabricSurcharges);
      } catch (error) {
        console.warn('Failed to parse fabric_surcharges in Inventory:', error?.message);
        fabricSurcharges = null;
      }
    }

    return {
      ...product,
      size_surcharges: sizeSurcharges,
      fabric_surcharges: fabricSurcharges
    };
  };

  const handleAddProduct = async (newProduct) => {
    // Refetch all products to get the complete list (especially important when multiple branch products are created)
    await fetchProducts();
    setShowAddModal(false);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleUpdateProduct = async (updatedProduct) => {
    // Refetch all products to get the complete list (especially important when multiple branch products are updated)
    await fetchProducts();
    setRefreshKey(prev => prev + 1); // Force re-render
    setShowAddModal(false);
    setEditingProduct(null);
    // The useEffect will automatically apply filters and update filteredProducts
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
  };

  const toggleSizesDropdown = (productId, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (openSizesDropdown === productId) {
      // Closing dropdown
      setOpenSizesDropdown(null);
      setSizesDropdownPosition({ top: 0, left: 0, productId: null });
    } else {
      // Opening dropdown - calculate position for portal
      const trigger = sizesTriggerRefs.current[productId];
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        const dropdownWidth = 320;
        const dropdownHeight = 300;
        
        // Position below the button, centered
        let left = rect.left + (rect.width / 2) - (dropdownWidth / 2);
        let top = rect.bottom + 8;
        
        // Adjust if would go off right edge
        if (left + dropdownWidth > window.innerWidth - 20) {
          left = window.innerWidth - dropdownWidth - 20;
        }
        
        // Adjust if would go off left edge
        if (left < 20) {
          left = 20;
        }
        
        // Adjust if would go off bottom
        if (top + dropdownHeight > window.innerHeight - 20) {
          top = rect.top - dropdownHeight - 8;
        }
        
        // Adjust if would go off top
        if (top < 20) {
          top = 20;
        }
        
        setSizesDropdownPosition({ top, left, productId });
        setOpenSizesDropdown(productId);
      }
    }
  };

  const toggleStockDropdown = (productId, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (openStockDropdown === productId) {
      // Closing dropdown
      setOpenStockDropdown(null);
      setDropdownPosition({ top: 0, left: 0, productId: null });
    } else {
      // Opening dropdown - calculate position for portal
      const trigger = triggerRefs.current[productId];
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        const dropdownWidth = 320;
        const dropdownHeight = 300;
        
        // Position below the button, centered
        let left = rect.left + (rect.width / 2) - (dropdownWidth / 2);
        let top = rect.bottom + 8;
        
        // Adjust if would go off right edge
        if (left + dropdownWidth > window.innerWidth - 20) {
          left = window.innerWidth - dropdownWidth - 20;
        }
        
        // Adjust if would go off left edge
        if (left < 20) {
          left = 20;
        }
        
        // Adjust if would go off bottom
        if (top + dropdownHeight > window.innerHeight - 20) {
          top = rect.top - dropdownHeight - 8;
        }
        
        // Adjust if would go off top
        if (top < 20) {
          top = 20;
        }
        
        setDropdownPosition({ top, left, productId });
        setOpenStockDropdown(productId);
      }
    }
  };

  // Close stock dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openStockDropdown && !event.target.closest('.stock-dropdown-container') && !event.target.closest('.stock-dropdown-overlay')) {
        setOpenStockDropdown(null);
      }
      if (openSizesDropdown && !event.target.closest('.sizes-dropdown-container') && !event.target.closest('.sizes-dropdown-overlay')) {
        setOpenSizesDropdown(null);
      }
    };

    const handleScroll = () => {
      if (openStockDropdown) {
        setOpenStockDropdown(null);
      }
      if (openSizesDropdown) {
        setOpenSizesDropdown(null);
      }
    };

    if (openStockDropdown || openSizesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scrolls
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [openStockDropdown, openSizesDropdown]);

  const isTrophyOrBall = (category) => {
    if (!category) return false;
    const normalizedCategory = category.toLowerCase();
    return normalizedCategory === 'trophies' || normalizedCategory === 'balls';
  };

  const getProductSizes = (product) => {
    let sizes = [];
    let jerseySizes = null;
    let hasSizes = false;

    if (product.size) {
      try {
        if (typeof product.size === 'string' && product.size.startsWith('{')) {
          const parsed = JSON.parse(product.size);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            jerseySizes = parsed;
            hasSizes = !!(
              parsed.shirts?.adults?.length ||
              parsed.shirts?.kids?.length ||
              parsed.shorts?.adults?.length ||
              parsed.shorts?.kids?.length
            );
          }
        } else if (typeof product.size === 'string' && product.size.startsWith('[')) {
          const parsed = JSON.parse(product.size);
          if (Array.isArray(parsed)) {
            sizes = parsed;
            hasSizes = sizes.length > 0;
          }
        } else if (Array.isArray(product.size)) {
          sizes = product.size;
          hasSizes = sizes.length > 0;
        } else {
          sizes = [product.size];
          hasSizes = true;
        }
      } catch (e) {
        sizes = [product.size];
        hasSizes = true;
      }
    }

    if (!hasSizes && product.available_sizes) {
      if (Array.isArray(product.available_sizes)) {
        sizes = product.available_sizes;
        hasSizes = sizes.length > 0;
      } else if (typeof product.available_sizes === 'string') {
        sizes = product.available_sizes
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        hasSizes = sizes.length > 0;
      }
    }

    return { sizes, jerseySizes, hasSizes };
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        // Get current session for authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          alert('Please log in to delete products');
          return;
        }

        const response = await fetch(`http://localhost:4000/api/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setProducts(products.filter(p => p.id !== productId));
          console.log('Product deleted successfully');
        } else {
          const errorData = await response.json();
          console.error('Delete failed:', errorData.error);
          alert(`Failed to delete product: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  return (
    <div className="admin-dashboard">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
      />
      <div className="admin-main-content">
        <div className="inventory-main-content">
          <div className="inventory-header">
            <h1>Inventory Management</h1>
            <p>
              {filters.branch !== 'all' 
                ? `Viewing products from: ${getUniqueBranches().find(b => b.id === parseInt(filters.branch))?.name || `Branch ${filters.branch}`}`
                : 'Manage your product inventory (all branches)'
              }
            </p>
          </div>

          <div className="inventory-content">
          {loading ? (
            <div className="loading">Loading products...</div>
          ) : (
            <div className="inventory-table-container">
              {products.length === 0 ? (
                <div className="no-products">
                  <h3>No products found</h3>
                  <p>Click the "Add Product" button to get started</p>
                </div>
              ) : (
                <>
                  {/* Filter Controls */}
                  <div className="filter-controls">
                    <div className="filter-group">
                      <label>Branch:</label>
                      <select 
                        value={filters.branch} 
                        onChange={(e) => handleFilterChange('branch', e.target.value)}
                      >
                        <option value="all">All Branches</option>
                        {getUniqueBranches().map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="filter-group">
                      <label>Category:</label>
                      <select 
                        value={filters.category} 
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                      >
                        <option value="all">All Categories</option>
                        {getUniqueCategories().map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="filter-group">
                      <label>Stock:</label>
                      <select 
                        value={filters.stockSort} 
                        onChange={(e) => handleFilterChange('stockSort', e.target.value)}
                      >
                        <option value="none">No Sort</option>
                        <option value="asc">Low to High</option>
                        <option value="desc">High to Low</option>
                      </select>
                    </div>
                    
                    <div className="filter-group">
                      <label>Price:</label>
                      <select 
                        value={filters.priceSort} 
                        onChange={(e) => handleFilterChange('priceSort', e.target.value)}
                      >
                        <option value="none">No Sort</option>
                        <option value="asc">Low to High</option>
                        <option value="desc">High to Low</option>
                      </select>
                    </div>
                    
                    <div className="filter-group">
                      <label>Sold:</label>
                      <select 
                        value={filters.soldSort} 
                        onChange={(e) => handleFilterChange('soldSort', e.target.value)}
                      >
                        <option value="none">No Sort</option>
                        <option value="asc">Low to High</option>
                        <option value="desc">High to Low</option>
                      </select>
                    </div>
                    
                    {/* Search Button - Right side of Filter Controls */}
                    <div className="filter-group search-group">
                      {showSearchInput ? (
                        <div className="search-input-wrapper">
                          <input
                            type="text"
                            className="search-input"
                            placeholder="Search by product name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                applyFilters();
                              }
                            }}
                            onBlur={() => {
                              if (searchTerm.trim() === '') {
                                setShowSearchInput(false);
                              }
                            }}
                            autoFocus
                          />
                          <button 
                            className="search-button"
                            onClick={() => {
                              if (searchTerm.trim() === '') {
                                setShowSearchInput(false);
                              } else {
                                applyFilters();
                              }
                            }}
                            type="button"
                            aria-label="Search products"
                          >
                            <FontAwesomeIcon icon={faSearch} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="search-icon-button"
                          onClick={() => {
                            setShowSearchInput(true);
                            setSearchTerm('');
                          }}
                          type="button"
                          aria-label="Search products"
                        >
                          <FontAwesomeIcon icon={faSearch} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop Table */}
                  <div className="desktop-table">
                    <table key={refreshKey} className="inventory-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Product Name</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Sold</th>
                          <th>Available Sizes</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => (
                        <tr key={`${product.id}-${product.updated_at || Date.now()}`} className="product-row">
                          <td className="product-image-cell">
                            <div className="product-image">
                              {product.main_image ? (
                                <img src={product.main_image} alt={product.name} />
                              ) : (
                                <div className="no-image">
                                  <FontAwesomeIcon icon={faImage} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="inventory-product-name-cell">
                            <div className="inventory-product-name">
                              {product.name}
                            </div>
                          </td>
                          <td className="inventory-product-price-cell">
                            <div className="inventory-product-price">₱{product.price}</div>
                          </td>
                          <td className="product-stock-cell">
                            {(() => {
                              // Check if product has size_stocks (for trophies with sizes)
                              let sizeStocks = product.size_stocks;
                              if (typeof sizeStocks === 'string') {
                                try {
                                  sizeStocks = JSON.parse(sizeStocks);
                                } catch (e) {
                                  sizeStocks = null;
                                }
                              }
                              
                              // When filtering by specific branch, show branch-specific stocks
                              // When showing all branches, show aggregated stocks
                              const isBranchFiltered = filters.branch !== 'all';
                              const isTrophyBall = isTrophyOrBall(product.category);
                              
                              if (sizeStocks && typeof sizeStocks === 'object' && Object.keys(sizeStocks).length > 0) {
                                // Display size_stocks for trophies/balls with dropdown
                                const totalStock = Object.values(sizeStocks).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
                                const stockClass = totalStock > 10 ? 'in-stock' : totalStock > 0 ? 'low-stock' : 'out-of-stock';
                                const isOpen = openStockDropdown === product.id;
                                
                                if (isTrophyBall) {
                                  return (
                                    <div className="stock-dropdown-container">
                                      <button
                                        ref={(el) => { triggerRefs.current[product.id] = el; }}
                                        className={`stock-badge stock-dropdown-trigger ${stockClass} ${isOpen ? 'active' : ''}`}
                                        onClick={(e) => toggleStockDropdown(product.id, e)}
                                        type="button"
                                      >
                                        {totalStock}
                                        <FontAwesomeIcon 
                                          icon={isOpen ? faChevronUp : faChevronDown} 
                                          className="stock-chevron"
                                        />
                                      </button>
                                    </div>
                                  );
                                } else {
                                  // Non-trophy/ball products with size_stocks - show preview
                                  const stockTitle = isBranchFiltered 
                                    ? `Branch ${product.branch_name || product.branch_id} stocks: ${Object.entries(sizeStocks).map(([size, qty]) => `${size}: ${qty}`).join(', ')}`
                                    : Object.entries(sizeStocks).map(([size, qty]) => `${size}: ${qty}`).join(', ');
                                  return (
                                    <div className="stock-info">
                                      <div className={`stock-badge ${stockClass}`} title={stockTitle}>
                                        {totalStock}
                                      </div>
                                      <div className="size-stocks-preview">
                                        {Object.entries(sizeStocks).slice(0, 3).map(([size, qty]) => (
                                          <span key={size} className="size-stock-item">{size}: {qty}</span>
                                        ))}
                                        {Object.keys(sizeStocks).length > 3 && <span className="size-stock-more">+{Object.keys(sizeStocks).length - 3} more</span>}
                                      </div>
                                    </div>
                                  );
                                }
                              } else {
                                // Display regular stock_quantity
                                const stockQty = (product.stock_quantity !== null && product.stock_quantity !== undefined) 
                                  ? product.stock_quantity 
                                  : 0;
                                const stockClass = stockQty > 10 ? 'in-stock' : stockQty > 0 ? 'low-stock' : 'out-of-stock';
                                const stockTitle = isBranchFiltered 
                                  ? `Branch ${product.branch_name || product.branch_id} stock: ${stockQty}`
                                  : `Total stock: ${stockQty}`;
                                return (
                                  <div className={`stock-badge ${stockClass}`} title={stockTitle}>
                                    {stockQty}
                                  </div>
                                );
                              }
                            })()}
                          </td>
                          <td className="product-sold-cell">
                            <div className="sold-badge">
                              {product.sold_quantity || 0}
                            </div>
                          </td>
                          <td className="product-available-sizes-cell">
                            <div className="product-available-sizes">
                              {(() => {
                                const { sizes, jerseySizes, hasSizes } = getProductSizes(product);

                                if (!hasSizes) {
                                  return <span className="no-sizes">No sizes</span>;
                                }

                                const isOpen = openSizesDropdown === product.id;

                                return (
                                  <div className="sizes-dropdown-container">
                                    <button
                                      ref={(el) => { sizesTriggerRefs.current[product.id] = el; }}
                                      className={`sizes-dropdown-toggle ${isOpen ? 'active' : ''}`}
                                      onClick={(e) => toggleSizesDropdown(product.id, e)}
                                      type="button"
                                    >
                                      <span className="sizes-preview">
                                        {jerseySizes ? 'View Sizes' : `${sizes.length} size${sizes.length > 1 ? 's' : ''}`}
                                      </span>
                                      <FontAwesomeIcon
                                        icon={isOpen ? faChevronUp : faChevronDown}
                                        className="sizes-chevron"
                                      />
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="product-category-cell">
                            <div className="product-category">{product.category}</div>
                          </td>
                          <td className="product-description-cell">
                            <div className="product-description">
                              {product.description ? (
                                product.description.length > 50 
                                  ? `${product.description.substring(0, 50)}...` 
                                  : product.description
                              ) : (
                                <span className="no-description">No description</span>
                              )}
                            </div>
                          </td>
                          <td className="product-actions-cell">
                            <div className="product-actions">
                              <button 
                                className="edit-btn"
                                onClick={() => handleEditProduct(product)}
                                title="Edit Product"
                                aria-label="Edit Product"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button 
                                className="delete-btn"
                                onClick={() => handleDeleteProduct(product.id)}
                                title="Delete Product"
                                aria-label="Delete Product"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile Card Layout */}
                  <div className="mobile-cards">
                    {filteredProducts.map((product) => (
                      <div key={`mobile-${product.id}-${product.updated_at || Date.now()}`} className="product-card">
                        <div className="inventory-card-header">
                          <div className="product-image">
                            {product.main_image ? (
                              <img src={product.main_image} alt={product.name} />
                            ) : (
                              <div className="no-image">
                                <FontAwesomeIcon icon={faImage} />
                              </div>
                            )}
                          </div>
                          <div className="product-info">
                            <h3 className="inventory-product-name">
                              {product.name}
                            </h3>
                            <div className="product-category">{product.category}</div>
                          </div>
                          <div className="inventory-product-price">₱{product.price}</div>
                        </div>
                        
                        <div className="card-body">
                          <div className="product-description">
                            {product.description ? (
                              product.description.length > 100 
                                ? `${product.description.substring(0, 100)}...` 
                                : product.description
                            ) : (
                              <span className="no-description">No description</span>
                            )}
                          </div>
                          
                          <div className="card-stats">
                            <div className="stat-item">
                              <span className="stat-label">Stock</span>
                              {(() => {
                                // Check if product has size_stocks (for trophies with sizes)
                                let sizeStocks = product.size_stocks;
                                if (typeof sizeStocks === 'string') {
                                  try {
                                    sizeStocks = JSON.parse(sizeStocks);
                                  } catch (e) {
                                    sizeStocks = null;
                                  }
                                }
                                
                                // When filtering by specific branch, show branch-specific stocks
                                const isBranchFiltered = filters.branch !== 'all';
                                const isTrophyBall = isTrophyOrBall(product.category);
                                
                                if (sizeStocks && typeof sizeStocks === 'object' && Object.keys(sizeStocks).length > 0) {
                                  // Display size_stocks for trophies/balls with dropdown
                                  const totalStock = Object.values(sizeStocks).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
                                  const stockClass = totalStock > 10 ? 'in-stock' : totalStock > 0 ? 'low-stock' : 'out-of-stock';
                                  const isOpen = openStockDropdown === `${product.id}-mobile`;
                                  
                                  if (isTrophyBall) {
                                    return (
                                      <div className="stock-dropdown-container">
                                        <button
                                          ref={(el) => { triggerRefs.current[`${product.id}-mobile`] = el; }}
                                          className={`stock-badge stock-dropdown-trigger ${stockClass} ${isOpen ? 'active' : ''}`}
                                          onClick={(e) => toggleStockDropdown(`${product.id}-mobile`, e)}
                                          type="button"
                                        >
                                          {totalStock}
                                          <FontAwesomeIcon 
                                            icon={isOpen ? faChevronUp : faChevronDown} 
                                            className="stock-chevron"
                                          />
                                        </button>
                                      </div>
                                    );
                                  } else {
                                    // Non-trophy/ball products with size_stocks - show preview
                                    return (
                                      <div className="stock-info">
                                        <div className={`stock-badge ${stockClass}`}>
                                          {totalStock}
                                        </div>
                                        <div className="size-stocks-preview">
                                          {Object.entries(sizeStocks).map(([size, qty]) => (
                                            <span key={size} className="size-stock-item">{size}: {qty}</span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                } else {
                                  // Display regular stock_quantity
                                  const stockQty = (product.stock_quantity !== null && product.stock_quantity !== undefined) 
                                    ? product.stock_quantity 
                                    : 0;
                                  const stockClass = stockQty > 10 ? 'in-stock' : stockQty > 0 ? 'low-stock' : 'out-of-stock';
                                  return (
                                    <div className={`stock-badge ${stockClass}`}>
                                      {stockQty}
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Sold</span>
                              <div className="sold-badge">
                                {product.sold_quantity || 0}
                              </div>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Available Sizes</span>
                              <div className="product-available-sizes">
                                {(() => {
                                  const { sizes, jerseySizes, hasSizes } = getProductSizes(product);

                                  if (!hasSizes) {
                                    return <span className="no-sizes">No sizes</span>;
                                  }

                                  const dropdownKey = `${product.id}-mobile`;
                                  const isOpen = openSizesDropdown === dropdownKey;
                                  
                                  return (
                                    <div className="sizes-dropdown-container">
                                      <button 
                                        ref={(el) => { sizesTriggerRefs.current[dropdownKey] = el; }}
                                        className={`sizes-dropdown-toggle ${isOpen ? 'active' : ''}`}
                                        onClick={(e) => toggleSizesDropdown(dropdownKey, e)}
                                        type="button"
                                      >
                                        <span className="sizes-preview">
                                          {jerseySizes ? 'View Sizes' : `${sizes.length} size${sizes.length > 1 ? 's' : ''}`}
                                        </span>
                                        <FontAwesomeIcon 
                                          icon={isOpen ? faChevronUp : faChevronDown} 
                                          className="sizes-chevron"
                                        />
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="card-actions">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEditProduct(product)}
                            title="Edit Product"
                            aria-label="Edit Product"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                            <span>Edit</span>
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Delete Product"
                            aria-label="Delete Product"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Floating Add Product Button */}
      <button 
        className="floating-add-btn"
        onClick={() => setShowAddModal(true)}
      >
        <FontAwesomeIcon icon={faPlus} />
        Add Product
      </button>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <AddProductModal
          onClose={handleCloseModal}
          onAdd={editingProduct ? handleUpdateProduct : handleAddProduct}
          editingProduct={editingProduct}
          isEditMode={!!editingProduct}
        />
      )}

      {/* Stock Dropdown Portal - Renders outside table to appear above everything */}
      {openStockDropdown && dropdownPosition.productId === openStockDropdown && (() => {
        // Handle both desktop and mobile product IDs
        const productId = openStockDropdown.toString().replace('-mobile', '');
        const product = filteredProducts.find(p => p.id.toString() === productId);
        if (!product) return null;
        
        let sizeStocks = product.size_stocks;
        if (typeof sizeStocks === 'string') {
          try {
            sizeStocks = JSON.parse(sizeStocks);
          } catch (e) {
            sizeStocks = null;
          }
        }
        
        if (!sizeStocks || typeof sizeStocks !== 'object' || Object.keys(sizeStocks).length === 0) {
          return null;
        }
        
        const totalStock = Object.values(sizeStocks).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
        
        return createPortal(
          <div 
            className="stock-dropdown-overlay stock-dropdown-portal"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              position: 'fixed'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stock-dropdown-header">
              <span className="stock-dropdown-title">Stock by Size</span>
              <button
                className="stock-dropdown-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenStockDropdown(null);
                  setDropdownPosition({ top: 0, left: 0, productId: null });
                }}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="stock-dropdown-content">
              {Object.entries(sizeStocks)
                .sort(([sizeA], [sizeB]) => {
                  const numA = parseFloat(sizeA);
                  const numB = parseFloat(sizeB);
                  if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                  }
                  return sizeA.localeCompare(sizeB);
                })
                .map(([size, qty]) => {
                  const quantity = parseInt(qty) || 0;
                  const itemStockClass = quantity > 10 ? 'in-stock' : quantity > 0 ? 'low-stock' : 'out-of-stock';
                  return (
                    <div key={size} className="stock-dropdown-item">
                      <span className="stock-size-label">{size}</span>
                      <span className={`stock-size-quantity ${itemStockClass}`}>{quantity}</span>
                    </div>
                  );
                })}
              <div className="stock-dropdown-footer">
                <span className="stock-total-label">Total:</span>
                <span className="stock-total-value">{totalStock}</span>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Sizes Dropdown Portal - Renders outside table to appear above everything */}
      {openSizesDropdown && sizesDropdownPosition.productId === openSizesDropdown && (() => {
        // Handle both desktop and mobile product IDs
        const productId = openSizesDropdown.toString().replace('-mobile', '');
        const product = filteredProducts.find(p => p.id.toString() === productId);
        if (!product) return null;
        
        const { sizes, jerseySizes, hasSizes } = getProductSizes(product);
        
        if (!hasSizes) {
          return null;
        }
        
        return createPortal(
          <div 
            className="sizes-dropdown-overlay sizes-dropdown-portal"
            style={{
              top: `${sizesDropdownPosition.top}px`,
              left: `${sizesDropdownPosition.left}px`,
              position: 'fixed'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sizes-dropdown-header">
              <span className="sizes-dropdown-title">Available Sizes</span>
              <button
                className="sizes-dropdown-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSizesDropdown(null);
                  setSizesDropdownPosition({ top: 0, left: 0, productId: null });
                }}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="sizes-dropdown-content">
              {jerseySizes ? (
                <div className="jersey-sizes-dropdown">
                  {jerseySizes.shirts?.adults?.length > 0 && (
                    <div className="size-group-item">
                      <strong>Shirts - Adults:</strong> {jerseySizes.shirts.adults.join(', ')}
                    </div>
                  )}
                  {jerseySizes.shirts?.kids?.length > 0 && (
                    <div className="size-group-item">
                      <strong>Shirts - Kids:</strong> {jerseySizes.shirts.kids.join(', ')}
                    </div>
                  )}
                  {jerseySizes.shorts?.adults?.length > 0 && (
                    <div className="size-group-item">
                      <strong>Shorts - Adults:</strong> {jerseySizes.shorts.adults.join(', ')}
                    </div>
                  )}
                  {jerseySizes.shorts?.kids?.length > 0 && (
                    <div className="size-group-item">
                      <strong>Shorts - Kids:</strong> {jerseySizes.shorts.kids.join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="sizes-list">
                  {sizes.map((size, index) => (
                    <div key={index} className="sizes-dropdown-item">
                      <span className="size-item">{size}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

export default Inventory;
