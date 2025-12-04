import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Inventory.css';
import './admin-shared.css';
import Sidebar from '../../components/admin/Sidebar';
import AddProductModal from '../../components/admin/AddProductModal';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { getAPI_URL } from '../../config/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBoxArchive, faBoxOpen, faPlus, faImage, faFilter } from '@fortawesome/free-solid-svg-icons';
import { FaChevronDown, FaChevronUp, FaSearch as FaSearchIcon } from 'react-icons/fa';

const Inventory = () => {
  const [activePage, setActivePage] = useState('inventory');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedSizes, setExpandedSizes] = useState({});
  const [filters, setFilters] = useState({
    branch: 'all',
    category: 'all',
    stockSort: 'none',
    priceSort: 'none',
    soldSort: 'none',
    showArchived: false // New filter to show/hide archived products
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);
  const [archiveModal, setArchiveModal] = useState({
    isOpen: false,
    productId: null,
    productName: ''
  });
  const [unarchiveModal, setUnarchiveModal] = useState({
    isOpen: false,
    productId: null,
    productName: ''
  });
  
  // Default column visibility - load from localStorage or use defaults
  const defaultColumns = {
    image: true,
    sku: true,
    brand: true,
    name: true,
    price: true,
    stock: true,
    sold: true,
    category: true,
    description: true,
    actions: true // Always show actions
  };
  
  const [columnVisibility, setColumnVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('inventoryColumnVisibility');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultColumns, ...parsed, actions: true }; // Always show actions
      }
    } catch (e) {
      console.error('Error loading column visibility:', e);
    }
    return defaultColumns;
  });

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log('🟡 [useEffect] applyFilters triggered by dependencies change');
    console.log('🟡 [useEffect] Products count:', products.length);
    console.log('🟡 [useEffect] Filters:', filters);
    console.log('🟡 [useEffect] Search term:', searchTerm);
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, filters, searchTerm]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilters && filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilters]);

  const fetchProducts = async () => {
    try {
      // Use 'all=true' query parameter to get all products from all branches (no deduplication)
      const response = await fetch(`${getAPI_URL()}/api/products?all=true`);
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
    console.log('🟡 [Filters] applyFilters called');
    console.log('🟡 [Filters] Products count:', products.length);
    console.log('🟡 [Filters] Current filters:', filters);
    
    if (!Array.isArray(products) || products.length === 0) {
      console.log('🟡 [Filters] No products, setting empty filtered list');
      setFilteredProducts([]);
      return;
    }

    let filtered = [...products];
    console.log('🟡 [Filters] Starting with', filtered.length, 'products');

    // Filter by archived status
    if (!filters.showArchived) {
      const beforeArchiveFilter = filtered.length;
      // When showArchived is false (default), hide archived products (show only active products)
      filtered = filtered.filter(product => {
        const isArchived = product.archived === true;
        if (isArchived) {
          console.log('🟡 [Filters] Filtering out archived product:', { id: product.id, name: product.name, archived: product.archived });
        }
        return !isArchived;
      });
      console.log('🟡 [Filters] After archive filter:', beforeArchiveFilter, '->', filtered.length, 'products (showArchived:', filters.showArchived, ')');
    } else {
      console.log('🟡 [Filters] showArchived is true - showing all products including archived');
    }
    // When showArchived is true, show all products (including archived ones) - no filtering needed

    // Filter by product search (searches name, SKU, brand, and description)
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => {
        const name = (product.name || '').toLowerCase();
        const sku = (product.sku || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        return name.includes(searchLower) || 
               sku.includes(searchLower) || 
               brand.includes(searchLower) || 
               description.includes(searchLower);
      });
    }

    // Filter by branch (before grouping if specific branch is selected)
    if (filters.branch !== 'all') {
      const selectedBranchId = parseInt(filters.branch);
      if (!isNaN(selectedBranchId)) {
        filtered = filtered.filter(product => {
          const productBranchId = product.branch_id !== null && product.branch_id !== undefined 
            ? parseInt(product.branch_id) 
            : null;
          return productBranchId === selectedBranchId;
        });
      }
      
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

    // Filter by category (case-insensitive)
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => 
        (product.category || '').toLowerCase() === filters.category.toLowerCase()
      );
    }

    // Expand products with sizes into separate rows (one row per size)
    // This must happen BEFORE sorting so we can sort individual size rows
    const expandedProducts = expandProductsBySize(filtered);

    // Apply sorting - combine multiple sorts so they work together
    // Priority: Stock > Price > Sold (if multiple are selected)
    // Sort AFTER expansion so individual size rows are sorted correctly
    const activeSorts = [];
    if (filters.stockSort !== 'none') {
      activeSorts.push({ type: 'stock', direction: filters.stockSort });
    }
    if (filters.priceSort !== 'none') {
      activeSorts.push({ type: 'price', direction: filters.priceSort });
    }
    if (filters.soldSort !== 'none') {
      activeSorts.push({ type: 'sold', direction: filters.soldSort });
    }

    if (activeSorts.length > 0 && Array.isArray(expandedProducts)) {
      expandedProducts.sort((a, b) => {
        for (const sort of activeSorts) {
          let comparison = 0;
          
          if (sort.type === 'stock') {
            // Use stock_quantity which is now set correctly for each size row
            const aStock = a.stock_quantity || 0;
            const bStock = b.stock_quantity || 0;
            comparison = sort.direction === 'asc' ? aStock - bStock : bStock - aStock;
          } else if (sort.type === 'price') {
            const aPrice = parseFloat(a.price) || 0;
            const bPrice = parseFloat(b.price) || 0;
            comparison = sort.direction === 'asc' ? aPrice - bPrice : bPrice - aPrice;
          } else if (sort.type === 'sold') {
            const aSold = a.sold_quantity || 0;
            const bSold = b.sold_quantity || 0;
            comparison = sort.direction === 'asc' ? aSold - bSold : bSold - aSold;
          }
          
          // If values are different, return the comparison
          // If values are equal, continue to next sort criteria
          if (comparison !== 0) {
            return comparison;
          }
        }
        // If all sort criteria are equal, maintain original order
        return 0;
      });
    }
    
    setFilteredProducts(Array.isArray(expandedProducts) ? expandedProducts : []);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      branch: 'all',
      category: 'all',
      stockSort: 'none',
      priceSort: 'none',
      soldSort: 'none',
      showArchived: false
    });
    setSearchTerm('');
  };

  const hasActiveFilters = () => {
    return filters.branch !== 'all' || 
           filters.category !== 'all' || 
           filters.stockSort !== 'none' ||
           filters.priceSort !== 'none' ||
           filters.soldSort !== 'none' ||
           filters.showArchived ||
           searchTerm.trim() !== '';
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
    // If product is expanded (has _originalId), we need to find the original product
    // For now, we'll pass the product as-is but note that editing size variants
    // will edit the entire product (all sizes)
    const originalProduct = product._originalId 
      ? products.find(p => p.id === product._originalId)
      : products.find(p => p.id === product.id);
    
    setEditingProduct(originalProduct || product);
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


  const isTrophyOrBall = (category) => {
    if (!category) return false;
    const normalizedCategory = category.toLowerCase();
    return normalizedCategory === 'trophies' || normalizedCategory === 'balls';
  };

  // Helper function to normalize SKU format (ensure dashes and uppercase)
  const normalizeSKU = (sku) => {
    if (!sku) return null;
    const upperSKU = sku.toUpperCase().trim();
    
    // If already has dashes, just return uppercase
    if (upperSKU.includes('-')) {
      return upperSKU;
    }
    
    // Convert old format to new format (XXX-XXXX-XXX)
    if (upperSKU.length >= 10) {
      const prefix = upperSKU.slice(0, 3);
      const productId = upperSKU.slice(3, 7);
      const sizePart = upperSKU.slice(7, 10);
      return `${prefix}-${productId}-${sizePart}`;
    } else if (upperSKU.length >= 7) {
      const prefix = upperSKU.slice(0, 3);
      const productId = upperSKU.slice(3).padEnd(4, '0');
      return `${prefix}-${productId}-000`;
    }
    
    return upperSKU;
  };

  // Helper function to generate size suffix (3 characters, zero-padded for numeric sizes)
  const generateSizeSuffix = (sizeValue) => {
    if (!sizeValue || sizeValue === '' || sizeValue === 'N/A') {
      return '000';
    }
    
    // Remove special characters and spaces, keep alphanumeric
    const cleanSize = String(sizeValue).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Check if size is purely numeric
    const isNumeric = /^\d+$/.test(cleanSize);
    
    if (isNumeric) {
      // For numeric sizes, pad with leading zeros to 3 digits (e.g., 8 → 008, 10 → 010, 18 → 018)
      const numSize = parseInt(cleanSize, 10);
      return String(numSize).padStart(3, '0');
    } else {
      // For non-numeric sizes (S, SMALL, M, MEDIUM, XL, 3XL, 4XL, etc.)
      // Use first 3 alphanumeric characters, pad with zeros if needed
      if (cleanSize.length >= 3) {
        // Take first 3 characters (e.g., "SMALL" → "SMA", "MEDIUM" → "MED", "3XL" → "3XL")
        return cleanSize.slice(0, 3);
      } else {
        // Pad short sizes with zeros (e.g., "S" → "S00", "M" → "M00", "XL" → "XL0")
        return cleanSize.padEnd(3, '0');
      }
    }
  };

  // Generate SKU for a size variant (matches backend SKU generation logic - format: XXX-XXXX-XXX)
  const generateSizeVariantSKU = (product, size) => {
    // If product already has a SKU, use it as base
    if (product.sku) {
      // Normalize SKU - ensure uppercase
      const normalizedSKU = product.sku.toUpperCase();
      
      // If SKU has dashes (new format), use it
      if (normalizedSKU.includes('-')) {
        const parts = normalizedSKU.split('-');
        const category = (product.category || '').toLowerCase().trim();
        const isOnStock = ['trophies', 'balls', 'medals'].includes(category);
        
        if (isOnStock && size && parts.length === 3) {
          // For on-stock products, replace last part with size suffix
          const sizeSuffix = generateSizeSuffix(size);
          return `${parts[0]}-${parts[1]}-${sizeSuffix}`.toUpperCase();
        } else {
          // Use existing SKU as-is for apparel or if no size
          return normalizedSKU;
        }
      } else {
        // Old format without dashes - convert to new format
        // Extract parts from old format (assuming format like "BAL5aea000" or "BAL5aea")
        if (normalizedSKU.length >= 7) {
          const prefix = normalizedSKU.slice(0, 3);
          const productId = normalizedSKU.length >= 7 ? normalizedSKU.slice(3, 7) : normalizedSKU.slice(3).padEnd(4, '0');
          const sizePart = normalizedSKU.length >= 10 ? normalizedSKU.slice(7, 10) : '000';
          const category = (product.category || '').toLowerCase().trim();
          const isOnStock = ['trophies', 'balls', 'medals'].includes(category);
          
          if (isOnStock && size) {
            const sizeSuffix = generateSizeSuffix(size);
            return `${prefix}-${productId}-${sizeSuffix}`.toUpperCase();
          } else {
            return `${prefix}-${productId}-${sizePart}`.toUpperCase();
          }
        }
      }
    }
    
    // Fallback: Generate new SKU if product doesn't have one
    const CATEGORY_PREFIXES = {
      'trophies': 'TRP',
      'balls': 'BAL',
      'medals': 'MED',
      'jerseys': 'JRS',
      'uniforms': 'UNF',
      't-shirts': 'TSH',
      'long sleeves': 'LGS',
      'hoodies': 'HOD',
      'jackets': 'JKT',
      'accessories': 'ACC',
      'hats': 'HAT'
    };
    
    const category = (product.category || '').toLowerCase().trim();
    const prefix = (CATEGORY_PREFIXES[category] || category.slice(0, 3).padEnd(3, 'X')).toUpperCase();
    
    // Generate product ID from product name + category (NOT product.id or branch_id)
    // Same product across branches should have the same SKU
    const productName = (product?.name || '').trim();
    const categoryForHash = category.toUpperCase().trim();
    
    // Create hash from category and product name (same as backend logic)
    let hash = 0;
    const str = categoryForHash + productName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const productId = Math.abs(hash).toString(36).toUpperCase().slice(-4).padStart(4, '0');
    
    const sizeSuffix = size ? generateSizeSuffix(size) : '000';
    
    // Check if this is on-stock (trophies, balls, medals) - include size in SKU
    const isOnStock = ['trophies', 'balls', 'medals'].includes(category);
    
    if (isOnStock) {
      // On-stock: XXX-XXXX-XXX format
      return `${prefix}-${productId}-${sizeSuffix}`.toUpperCase();
    } else {
      // Apparel: XXX-XXXX-000 format
      return `${prefix}-${productId}-000`.toUpperCase();
    }
  };

  // Expand products with sizes into separate rows (one row per size)
  const expandProductsBySize = (productsList) => {
    const expandedProducts = [];
    
    productsList.forEach(product => {
      // Check if product has size_stocks (on-stock products with sizes)
      let sizeStocks = product.size_stocks;
      if (typeof sizeStocks === 'string') {
        try {
          sizeStocks = JSON.parse(sizeStocks);
        } catch (e) {
          sizeStocks = null;
        }
      }
      
      // If product has size_stocks, expand into separate rows per size
      if (sizeStocks && typeof sizeStocks === 'object' && !Array.isArray(sizeStocks) && Object.keys(sizeStocks).length > 0) {
        // Expand: create one row per size
        Object.entries(sizeStocks).forEach(([size, stockQty]) => {
          // Generate size-specific SKU for this variant
          const sizeSKU = generateSizeVariantSKU(product, size);
          
          expandedProducts.push({
            ...product,
            // Create unique ID for this size variant (for React keys and editing)
            id: `${product.id}-${size}`,
            _originalId: product.id,
            _size: size,
            stock_quantity: parseInt(stockQty) || 0,
            size_stocks: null, // Remove size_stocks since we're showing one row per size
            size: `["${size}"]`, // Single size array for display
            sku: normalizeSKU(sizeSKU) || sizeSKU, // Size-specific SKU (normalized)
            // Product name with size suffix for display
            displayName: `${product.name} (${size})`
          });
        });
      } else {
        // Product doesn't have size_stocks or has no sizes - keep as single row
        expandedProducts.push({
          ...product,
          displayName: product.name,
          // Ensure stock_quantity is set
          stock_quantity: product.stock_quantity !== null && product.stock_quantity !== undefined 
            ? product.stock_quantity 
            : 0,
          // Use existing SKU from database, normalize to ensure correct format
          sku: product.sku ? normalizeSKU(product.sku) || normalizeSKU(generateSizeVariantSKU(product, null)) : normalizeSKU(generateSizeVariantSKU(product, null))
        });
      }
    });
    
    return expandedProducts;
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

  const handleArchiveProduct = (productId) => {
    console.log('🔵 [Archive] Archive button clicked for productId:', productId);
    // If productId is from an expanded product (contains '-'), extract original ID
    const originalProductId = productId.includes('-') && filteredProducts.find(p => p.id === productId)?._originalId
      ? filteredProducts.find(p => p.id === productId)._originalId
      : productId;
    
    console.log('🔵 [Archive] Original productId:', originalProductId);
    
    // Find the product to get its name for confirmation
    const product = products.find(p => p.id === originalProductId);
    const productName = product?.displayName || product?.name || 'this product';
    
    console.log('🔵 [Archive] Product found:', product ? { id: product.id, name: product.name, archived: product.archived } : 'NOT FOUND');
    
    // Show confirmation modal
    setArchiveModal({
      isOpen: true,
      productId: originalProductId,
      productName: productName
    });
    console.log('🔵 [Archive] Confirmation modal opened');
  };

  const confirmArchiveProduct = async () => {
    const { productId } = archiveModal;
    console.log('🟢 [Archive] Confirm archive - Starting archive process for productId:', productId);
    
    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('🔴 [Archive] No session found:', sessionError);
        alert('Please log in to archive products');
        setArchiveModal({ isOpen: false, productId: null, productName: '' });
        return;
      }

      console.log('🟢 [Archive] Session found, making API call...');
      console.log('🟢 [Archive] API URL:', `${getAPI_URL()}/api/products/${productId}`);
      console.log('🟢 [Archive] Request body:', { archived: true });

      const response = await fetch(`${getAPI_URL()}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: true })
      });

      console.log('🟢 [Archive] Response status:', response.status, response.statusText);
      console.log('🟢 [Archive] Response ok:', response.ok);

      if (response.ok) {
        const responseData = await response.json();
        console.log('🟢 [Archive] API response data:', responseData);
        
        // Update the product in the products array instead of removing it
        const currentProduct = products.find(p => p.id === productId);
        console.log('🟢 [Archive] Current product before update:', currentProduct ? { id: currentProduct.id, name: currentProduct.name, archived: currentProduct.archived } : 'NOT FOUND');
        
        const updatedProducts = products.map(p => 
          p.id === productId ? { ...p, archived: true } : p
        );
        
        const updatedProduct = updatedProducts.find(p => p.id === productId);
        console.log('🟢 [Archive] Updated product:', updatedProduct ? { id: updatedProduct.id, name: updatedProduct.name, archived: updatedProduct.archived } : 'NOT FOUND');
        console.log('🟢 [Archive] Total products before update:', products.length);
        console.log('🟢 [Archive] Total products after update:', updatedProducts.length);
        
        setProducts(updatedProducts);
        console.log('🟢 [Archive] State updated with archived product');
        console.log('🟢 [Archive] Current filters.showArchived:', filters.showArchived);
        
        setArchiveModal({ isOpen: false, productId: null, productName: '' });
        console.log('🟢 [Archive] Product archived successfully - modal closed');
      } else {
        const errorData = await response.json();
        console.error('🔴 [Archive] Archive failed - Response:', response.status, errorData);
        alert(`Failed to archive product: ${errorData.error || 'Unknown error'}`);
        setArchiveModal({ isOpen: false, productId: null, productName: '' });
      }
    } catch (error) {
      console.error('🔴 [Archive] Error archiving product:', error);
      console.error('🔴 [Archive] Error stack:', error.stack);
      alert('Failed to archive product. Please try again.');
      setArchiveModal({ isOpen: false, productId: null, productName: '' });
    }
  };

  const closeArchiveModal = () => {
    setArchiveModal({ isOpen: false, productId: null, productName: '' });
  };

  const handleUnarchiveProduct = (productId) => {
    // If productId is from an expanded product (contains '-'), extract original ID
    const originalProductId = productId.includes('-') && filteredProducts.find(p => p.id === productId)?._originalId
      ? filteredProducts.find(p => p.id === productId)._originalId
      : productId;
    
    // Find the product to get its name for confirmation
    const product = products.find(p => p.id === originalProductId);
    const productName = product?.displayName || product?.name || 'this product';
    
    // Show confirmation modal
    setUnarchiveModal({
      isOpen: true,
      productId: originalProductId,
      productName: productName
    });
  };

  const confirmUnarchiveProduct = async () => {
    const { productId } = unarchiveModal;
    
    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert('Please log in to unarchive products');
        setUnarchiveModal({ isOpen: false, productId: null, productName: '' });
        return;
      }

      const response = await fetch(`${getAPI_URL()}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: false })
      });

      if (response.ok) {
        // Update the product in the products array instead of removing it
        setProducts(products.map(p => 
          p.id === productId ? { ...p, archived: false } : p
        ));
        console.log('Product unarchived successfully');
        setUnarchiveModal({ isOpen: false, productId: null, productName: '' });
      } else {
        const errorData = await response.json();
        console.error('Unarchive failed:', errorData.error);
        alert(`Failed to unarchive product: ${errorData.error}`);
        setUnarchiveModal({ isOpen: false, productId: null, productName: '' });
      }
    } catch (error) {
      console.error('Error unarchiving product:', error);
      alert('Failed to unarchive product. Please try again.');
      setUnarchiveModal({ isOpen: false, productId: null, productName: '' });
    }
  };

  const closeUnarchiveModal = () => {
    setUnarchiveModal({ isOpen: false, productId: null, productName: '' });
  };

  // Handle column visibility changes
  const handleColumnVisibilityChange = (column, visible) => {
    const newVisibility = {
      ...columnVisibility,
      [column]: visible
    };
    setColumnVisibility(newVisibility);
    // Save to localStorage
    try {
      localStorage.setItem('inventoryColumnVisibility', JSON.stringify(newVisibility));
    } catch (e) {
      console.error('Error saving column visibility:', e);
    }
  };

  // Reset to default columns
  const resetColumnVisibility = () => {
    setColumnVisibility(defaultColumns);
    try {
      localStorage.setItem('inventoryColumnVisibility', JSON.stringify(defaultColumns));
    } catch (e) {
      console.error('Error saving column visibility:', e);
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
            <div className="inventory-header-container">
              <h1>Inventory Management</h1>
              <div className="inventory-header-controls">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search by name, SKU, brand, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <FaSearchIcon className="search-icon" />
                </div>
                
                <div className="filter-toggle-container" ref={filterRef}>
                  <button 
                    className={`filter-toggle-btn ${showFilters ? 'active' : ''} ${hasActiveFilters() ? 'has-filters' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <FontAwesomeIcon icon={faFilter} className="filter-icon" />
                    Filters
                    {showFilters ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                  
                  {showFilters && (
                    <div className="filter-dropdown">
                      <div className="filter-group">
                        <label>Branch</label>
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
                        <label>Category</label>
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
                        <label>Stock Sort</label>
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
                        <label>Price Sort</label>
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
                        <label>Sold Sort</label>
                        <select 
                          value={filters.soldSort} 
                          onChange={(e) => handleFilterChange('soldSort', e.target.value)}
                        >
                          <option value="none">No Sort</option>
                          <option value="asc">Low to High</option>
                          <option value="desc">High to Low</option>
                        </select>
                      </div>

                      {/* Customize Table Section */}
                      <div className="filter-group-divider"></div>
                      <div className="filter-group">
                        <label>Show Archived Products</label>
                        <div className="filter-checkbox">
                          <input
                            type="checkbox"
                            checked={filters.showArchived}
                            onChange={(e) => handleFilterChange('showArchived', e.target.checked)}
                          />
                          <span>Show archived products</span>
                        </div>
                      </div>
                      <div className="filter-group-divider"></div>
                      <div className="filter-group">
                        <label>Customize Table</label>
                        <div className="column-selector-options">
                          {Object.entries(columnVisibility)
                            .filter(([key]) => key !== 'actions')
                            .map(([key, visible]) => (
                              <label key={key} className="column-selector-option">
                                <input
                                  type="checkbox"
                                  checked={visible}
                                  onChange={(e) => {
                                    const newVisibility = {
                                      ...columnVisibility,
                                      [key]: e.target.checked
                                    };
                                    setColumnVisibility(newVisibility);
                                    localStorage.setItem('inventoryColumnVisibility', JSON.stringify(newVisibility));
                                  }}
                                />
                                <span className="column-selector-label">
                                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                </span>
                              </label>
                            ))}
                        </div>
                        <button
                          className="column-selector-reset"
                          onClick={() => {
                            setColumnVisibility(defaultColumns);
                            localStorage.setItem('inventoryColumnVisibility', JSON.stringify(defaultColumns));
                          }}
                          style={{ marginTop: '0.5rem', width: '100%' }}
                        >
                          Reset to Default
                        </button>
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
                  {/* Desktop Table */}
                  <div className="desktop-table">
                    <table key={refreshKey} className="inventory-table">
                      <thead>
                        <tr>
                          {columnVisibility.image && <th>Image</th>}
                          {columnVisibility.sku && <th>SKU</th>}
                          {columnVisibility.brand && <th>Brand</th>}
                          {columnVisibility.name && <th>Product Name</th>}
                          {columnVisibility.price && <th>Price</th>}
                          {columnVisibility.stock && <th>Stock</th>}
                          {columnVisibility.sold && <th>Sold</th>}
                          {columnVisibility.category && <th>Category</th>}
                          {columnVisibility.description && <th>Description</th>}
                          {columnVisibility.actions && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => (
                        <tr key={`${product.id}-${product.updated_at || Date.now()}`} className="product-row">
                          {columnVisibility.image && (
                          <td className="product-image-cell">
                            <div className="product-image">
                              {product.main_image ? (
                                  <img 
                                    src={product.main_image} 
                                    alt={product.name || 'Product'}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className="no-image" style={{ display: product.main_image ? 'none' : 'flex' }}>
                                  <FontAwesomeIcon icon={faImage} />
                                </div>
                              </div>
                            </td>
                          )}
                          {columnVisibility.sku && (
                            <td className="product-sku-cell">
                              <div className="product-sku">
                                {product.sku ? (
                                  <span className="sku-code">{normalizeSKU(product.sku) || product.sku}</span>
                                ) : (
                                  <span className="no-sku">No SKU</span>
                              )}
                            </div>
                          </td>
                          )}
                          {columnVisibility.brand && (
                            <td className="product-brand-cell">
                              <div className="product-brand">
                                {product.brand || '-'}
                              </div>
                            </td>
                          )}
                          {columnVisibility.name && (
                          <td className="inventory-product-name-cell">
                            <div 
                              className="inventory-product-name"
                              title={product.displayName || product.name}
                            >
                                {product.displayName || product.name}
                            </div>
                          </td>
                          )}
                          {columnVisibility.price && (
                          <td className="inventory-product-price-cell">
                            <div className="inventory-product-price">₱{product.price}</div>
                          </td>
                          )}
                          {columnVisibility.stock && (
                          <td className="product-stock-cell">
                            {(() => {
                                // Display single stock quantity (products are already expanded by size)
                                const stockQty = (product.stock_quantity !== null && product.stock_quantity !== undefined) 
                                  ? product.stock_quantity 
                                  : 0;
                                const stockClass = stockQty > 10 ? 'in-stock' : stockQty > 0 ? 'low-stock' : 'out-of-stock';
                                const isBranchFiltered = filters.branch !== 'all';
                                const stockTitle = isBranchFiltered 
                                  ? `Branch ${product.branch_name || product.branch_id} stock: ${stockQty}`
                                  : `Total stock: ${stockQty}`;
                                return (
                                  <div className={`stock-badge ${stockClass}`} title={stockTitle}>
                                    {stockQty}
                                  </div>
                                );
                            })()}
                          </td>
                          )}
                          {columnVisibility.sold && (
                          <td className="product-sold-cell">
                            <div className="sold-badge">
                              {product.sold_quantity || 0}
                            </div>
                          </td>
                          )}
                          {columnVisibility.category && (
                          <td className="product-category-cell">
                            <div className="product-category">{product.category}</div>
                          </td>
                          )}
                          {columnVisibility.description && (
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
                          )}
                          {columnVisibility.actions && (
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
                              {filters.showArchived ? (
                                <button 
                                  className="unarchive-btn"
                                  onClick={() => handleUnarchiveProduct(product.id)}
                                  title="Unarchive Product"
                                  aria-label="Unarchive Product"
                                >
                                  <FontAwesomeIcon icon={faBoxOpen} />
                                </button>
                              ) : (
                                <button 
                                  className="archive-btn"
                                  onClick={() => handleArchiveProduct(product.id)}
                                  title="Archive Product"
                                  aria-label="Archive Product"
                                >
                                  <FontAwesomeIcon icon={faBoxArchive} />
                                </button>
                              )}
                            </div>
                          </td>
                          )}
                        </tr>
                        ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile Card Layout */}
                  <div className="mobile-cards">
                    {filteredProducts.map((product) => (
                      <div key={`mobile-${product.id}-${product.updated_at || Date.now()}`} className="product-card">
                        {columnVisibility.image && (
                          <div className="product-card-image">
                            {product.main_image ? (
                              <img 
                                src={product.main_image} 
                                alt={product.name || 'Product'}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className="no-image" style={{ display: product.main_image ? 'none' : 'flex' }}>
                                <FontAwesomeIcon icon={faImage} />
                            </div>
                              </div>
                        )}
                        <div className="inventory-card-header">
                          {columnVisibility.sku && (
                            <div className="product-sku">
                              {product.sku ? (
                                <span className="sku-code">{normalizeSKU(product.sku) || product.sku}</span>
                              ) : (
                                <span className="no-sku">No SKU</span>
                            )}
                          </div>
                          )}
                          <div className="product-info">
                            {columnVisibility.name && (
                            <h3 
                              className="inventory-product-name"
                              title={product.displayName || product.name}
                            >
                                {product.displayName || product.name}
                            </h3>
                            )}
                            {columnVisibility.category && (
                            <div className="product-category">{product.category}</div>
                            )}
                            {columnVisibility.brand && product.brand && (
                              <div className="product-brand">Brand: {product.brand}</div>
                            )}
                          </div>
                          {columnVisibility.price && (
                          <div className="inventory-product-price">₱{product.price}</div>
                          )}
                        </div>
                        
                        <div className="card-body">
                          {columnVisibility.description && (
                          <div className="product-description">
                            {product.description ? (
                              product.description.length > 100 
                                ? `${product.description.substring(0, 100)}...` 
                                : product.description
                            ) : (
                              <span className="no-description">No description</span>
                            )}
                          </div>
                          )}
                          
                          <div className="card-stats">
                            {columnVisibility.stock && (
                            <div className="stat-item">
                              <span className="stat-label">Stock</span>
                              {(() => {
                                  // Display single stock quantity (products are already expanded by size)
                                  const stockQty = (product.stock_quantity !== null && product.stock_quantity !== undefined) 
                                    ? product.stock_quantity 
                                    : 0;
                                  const stockClass = stockQty > 10 ? 'in-stock' : stockQty > 0 ? 'low-stock' : 'out-of-stock';
                                  return (
                                    <div className={`stock-badge ${stockClass}`}>
                                      {stockQty}
                                    </div>
                                  );
                              })()}
                            </div>
                            )}
                            {columnVisibility.sold && (
                            <div className="stat-item">
                              <span className="stat-label">Sold</span>
                              <div className="sold-badge">
                                {product.sold_quantity || 0}
                              </div>
                            </div>
                            )}
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
                          {filters.showArchived ? (
                            <button 
                              className="unarchive-btn"
                              onClick={() => handleUnarchiveProduct(product.id)}
                              title="Unarchive Product"
                              aria-label="Unarchive Product"
                            >
                              <FontAwesomeIcon icon={faBoxOpen} />
                              <span>Unarchive</span>
                            </button>
                          ) : (
                            <button 
                              className="archive-btn"
                              onClick={() => handleArchiveProduct(product.id)}
                              title="Archive Product"
                              aria-label="Archive Product"
                            >
                              <FontAwesomeIcon icon={faBoxArchive} />
                              <span>Archive</span>
                            </button>
                          )}
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

      {/* Archive Confirmation Modal */}
      <ConfirmModal
        isOpen={archiveModal.isOpen}
        onClose={closeArchiveModal}
        onConfirm={confirmArchiveProduct}
        title="Archive Product"
        message={`Are you sure you want to archive "${archiveModal.productName}"? This will archive the product and hide it from the inventory. You can restore it later if needed.`}
        confirmText="Archive"
        cancelText="Cancel"
        type="warning"
      />

      {/* Unarchive Confirmation Modal */}
      <ConfirmModal
        isOpen={unarchiveModal.isOpen}
        onClose={closeUnarchiveModal}
        onConfirm={confirmUnarchiveProduct}
        title="Unarchive Product"
        message={`Are you sure you want to unarchive "${unarchiveModal.productName}"? This will restore the product and make it visible in the inventory again.`}
        confirmText="Unarchive"
        cancelText="Cancel"
        type="success"
      />

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

    </div>
  );
};

export default Inventory;
