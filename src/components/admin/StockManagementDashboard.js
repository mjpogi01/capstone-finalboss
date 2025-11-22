import React, { useState, useEffect } from 'react';
import './StockManagementDashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilter, 
  faPlus, 
  faEdit, 
  faBoxOpen, 
  faTrash,
  faTimes,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

const StockManagementDashboard = () => {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    supplier: ''
  });

  // Close filters dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.stock-mgmt-filter-group')) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilters]);

  // Mock data - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockData = [
        {
          "id": 1,
          "name": "Custom T-Shirt Premium",
          "thumbnail": "https://via.placeholder.com/60",
          "category": "t-shirts",
          "stockQuantity": 450,
          "reorderLevel": 100,
          "supplier": "Textile Co.",
          "lastRestocked": "2024-01-15",
          "status": "In Stock"
        },
        {
          "id": 2,
          "name": "Basketball Jersey",
          "thumbnail": "https://via.placeholder.com/60",
          "category": "jerseys",
          "stockQuantity": 35,
          "reorderLevel": 50,
          "supplier": "Sportswear Inc.",
          "lastRestocked": "2024-01-10",
          "status": "Low Stock"
        },
        {
          "id": 3,
          "name": "Trophy Gold",
          "thumbnail": "https://via.placeholder.com/60",
          "category": "trophies",
          "stockQuantity": 0,
          "reorderLevel": 20,
          "supplier": "Award Master",
          "lastRestocked": "2023-12-20",
          "status": "Out of Stock"
        },
        {
          "id": 4,
          "name": "Medal Set",
          "thumbnail": "https://via.placeholder.com/60",
          "category": "trophies",
          "stockQuantity": 120,
          "reorderLevel": 30,
          "supplier": "Award Master",
          "lastRestocked": "2024-01-08",
          "status": "In Stock"
        },
        {
          "id": 5,
          "name": "Long Sleeve Shirt",
          "thumbnail": "https://via.placeholder.com/60",
          "category": "long sleeves",
          "stockQuantity": 28,
          "reorderLevel": 50,
          "supplier": "Textile Co.",
          "lastRestocked": "2024-01-12",
          "status": "Low Stock"
        },
        {
          "id": 6,
          "name": "Hoodie",
          "thumbnail": "https://via.placeholder.com/60",
          "category": "hoodies",
          "stockQuantity": 200,
          "reorderLevel": 50,
          "supplier": "Sportswear Inc.",
          "lastRestocked": "2024-01-05",
          "status": "In Stock"
        },
        {
          "id": 7,
          "name": "Team Uniform Set",
          "thumbnail": "https://via.placeholder.com/60",
          "category": "uniforms",
          "stockQuantity": 75,
          "reorderLevel": 40,
          "supplier": "Sportswear Inc.",
          "lastRestocked": "2024-01-18",
          "status": "In Stock"
        },
        {
          "id": 8,
          "name": "Basketball Official",
          "thumbnail": "https://via.placeholder.com/60",
          "category": "balls",
          "stockQuantity": 45,
          "reorderLevel": 25,
          "supplier": "Sports Equipment Co.",
          "lastRestocked": "2024-01-20",
          "status": "In Stock"
        }
      ];
      setStockItems(mockData);
      setLoading(false);
    }, 500);
  }, []);

  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity === 0) return 'out';
    if (quantity <= reorderLevel) return 'low';
    return 'healthy';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'In Stock': 'stock-mgmt-status-in',
      'Low Stock': 'stock-mgmt-status-low',
      'Out of Stock': 'stock-mgmt-status-out'
    };
    return statusMap[status] || 'stock-mgmt-status-in';
  };

  const getProgressBarColor = (status) => {
    const colorMap = {
      'healthy': '#10b981',
      'low': '#f59e0b',
      'out': '#ef4444'
    };
    return colorMap[status] || '#10b981';
  };

  const getProgressPercentage = (quantity, reorderLevel) => {
    if (quantity === 0) return 0;
    const max = reorderLevel * 5; // Assume max is 5x reorder level
    return Math.min((quantity / max) * 100, 100);
  };

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesStatus = !filters.status || item.status === filters.status;
    const matchesSupplier = !filters.supplier || item.supplier === filters.supplier;

    return matchesSearch && matchesCategory && matchesStatus && matchesSupplier;
  });

  const lowStockItems = stockItems
    .filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock')
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
    .slice(0, 5);

  const categories = [...new Set(stockItems.map(item => item.category))];
  const suppliers = [...new Set(stockItems.map(item => item.supplier))];
  const statuses = ['In Stock', 'Low Stock', 'Out of Stock'];

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Close filter dropdown when searching
    setShowFilters(false);
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    // Close filter dropdown when opening search
    if (!showSearch) {
      setShowFilters(false);
    }
    // Clear search when closing
    if (showSearch) {
      setSearchTerm('');
    }
  };

  const handleFilterToggle = () => {
    setShowFilters(!showFilters);
    // Close search when opening filter
    if (!showFilters) {
      setShowSearch(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      status: '',
      supplier: ''
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

  const formatCategory = (category) => {
    if (!category) return '';
    // Format category names for display: "t-shirts" -> "T-Shirts", "long sleeves" -> "Long Sleeves"
    return category
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="stock-mgmt-dashboard">
      <div className="stock-mgmt-header">
        <h1 className="stock-mgmt-title">Stock Management</h1>
        <button className="stock-mgmt-add-btn">
          <FontAwesomeIcon icon={faPlus} />
          <span>Add Stock</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="stock-mgmt-controls">
        <div className="header-actions">
          {showSearch && (
            <input
              type="text"
              className="search-input"
              placeholder="Search items, category, or supplier..."
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
            title="Search items"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>

        <div className="stock-mgmt-filter-group">
          <button 
            className={`stock-mgmt-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={handleFilterToggle}
          >
            <FontAwesomeIcon icon={faFilter} />
            <span>Filters</span>
            {(filters.category || filters.status || filters.supplier) && (
              <span className="stock-mgmt-filter-badge">
                {[filters.category, filters.status, filters.supplier].filter(Boolean).length}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="stock-mgmt-filters-dropdown">
              <div className="stock-mgmt-filter-row">
                <label>Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="stock-mgmt-filter-select"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{formatCategory(cat)}</option>
                  ))}
                </select>
              </div>

              <div className="stock-mgmt-filter-row">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="stock-mgmt-filter-select"
                >
                  <option value="">All Status</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="stock-mgmt-filter-row">
                <label>Supplier</label>
                <select
                  value={filters.supplier || ""}
                  onChange={(e) => handleFilterChange('supplier', e.target.value)}
                  className="stock-mgmt-filter-select"
                >
                  {suppliers.map(supplier => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>

              {(filters.category || filters.status || filters.supplier) && (
                <button className="stock-mgmt-clear-filters" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="stock-mgmt-content-wrapper">
        {/* Main Table */}
        <div className="stock-mgmt-table-container">
          {loading ? (
            <div className="stock-mgmt-loading">
              <div className="stock-mgmt-spinner"></div>
              <p>Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="stock-mgmt-empty">
              <p>No items found</p>
            </div>
          ) : (
            <div className="stock-mgmt-table-wrapper">
              <table className="stock-mgmt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Stock Quantity</th>
                    <th>Reorder Level</th>
                    <th>Supplier</th>
                    <th>Last Restocked</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const stockStatus = getStockStatus(item.stockQuantity, item.reorderLevel);
                    const progressColor = getProgressBarColor(stockStatus);
                    const progressPercentage = getProgressPercentage(item.stockQuantity, item.reorderLevel);

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="stock-mgmt-item-cell">
                            <img 
                              src={item.thumbnail} 
                              alt={item.name}
                              className="stock-mgmt-thumbnail"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <span className="stock-mgmt-item-name">{item.name}</span>
                          </div>
                        </td>
                        <td>{formatCategory(item.category)}</td>
                        <td>
                          <div className="stock-mgmt-quantity-cell">
                            <div className="stock-mgmt-progress-bar-wrapper">
                              <div 
                                className="stock-mgmt-progress-bar"
                                style={{
                                  width: `${progressPercentage}%`,
                                  backgroundColor: progressColor
                                }}
                              />
                            </div>
                            <span className="stock-mgmt-quantity-value">{item.stockQuantity}</span>
                          </div>
                        </td>
                        <td>{item.reorderLevel}</td>
                        <td>{item.supplier}</td>
                        <td>{formatDate(item.lastRestocked)}</td>
                        <td>
                          <span className={`stock-mgmt-status-badge ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div className="stock-mgmt-actions">
                            <button 
                              className="stock-mgmt-action-btn stock-mgmt-edit-btn"
                              title="Edit"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button 
                              className="stock-mgmt-action-btn stock-mgmt-restock-btn"
                              title="Restock"
                            >
                              <FontAwesomeIcon icon={faBoxOpen} />
                            </button>
                            <button 
                              className="stock-mgmt-action-btn stock-mgmt-delete-btn"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Analytics Card */}
        <div className="stock-mgmt-analytics-card">
          <div className="stock-mgmt-analytics-header">
            <h3>Analytics</h3>
          </div>

          <div className="stock-mgmt-analytics-content">
            {/* Low Stock Items */}
            <div className="stock-mgmt-analytics-section">
              <h4 className="stock-mgmt-analytics-section-title">Top Low-Stock Items</h4>
              {lowStockItems.length === 0 ? (
                <p className="stock-mgmt-no-low-stock">All items are well stocked</p>
              ) : (
                <ul className="stock-mgmt-low-stock-list">
                  {lowStockItems.map((item) => (
                    <li key={item.id} className="stock-mgmt-low-stock-item">
                      <div className="stock-mgmt-low-stock-info">
                        <span className="stock-mgmt-low-stock-name">{item.name}</span>
                        <span className={`stock-mgmt-low-stock-qty ${item.status === 'Out of Stock' ? 'out' : 'low'}`}>
                          {item.stockQuantity} units
                        </span>
                      </div>
                      <div className="stock-mgmt-low-stock-bar-wrapper">
                        <div 
                          className="stock-mgmt-low-stock-bar"
                          style={{
                            width: `${getProgressPercentage(item.stockQuantity, item.reorderLevel)}%`,
                            backgroundColor: getProgressBarColor(getStockStatus(item.stockQuantity, item.reorderLevel))
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Inventory Value Chart */}
            <div className="stock-mgmt-analytics-section">
              <h4 className="stock-mgmt-analytics-section-title">Inventory Value Over Time</h4>
              <div className="stock-mgmt-chart-container">
                <div className="stock-mgmt-mini-chart">
                  <svg viewBox="0 0 300 100" className="stock-mgmt-chart-svg">
                    {/* Sample line chart */}
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points="0,80 50,70 100,60 150,55 200,50 250,45 300,40"
                    />
                    <polyline
                      fill="url(#stock-mgmt-gradient)"
                      stroke="none"
                      points="0,80 50,70 100,60 150,55 200,50 250,45 300,40 300,100 0,100"
                    />
                    <defs>
                      <linearGradient id="stock-mgmt-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="stock-mgmt-chart-labels">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockManagementDashboard;

