import React, { useState, useEffect } from 'react';
import './StockManagementDashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, 
  faBoxOpen, 
  faTrash
} from '@fortawesome/free-solid-svg-icons';

const StockManagementCompact = () => {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const mockData = [
        {
          "id": 1,
          "name": "Custom T-Shirt Premium",
          "thumbnail": "https://via.placeholder.com/40",
          "category": "Apparel",
          "stockQuantity": 450,
          "reorderLevel": 100,
          "supplier": "Textile Co.",
          "lastRestocked": "2024-01-15",
          "status": "In Stock"
        },
        {
          "id": 2,
          "name": "Basketball Jersey",
          "thumbnail": "https://via.placeholder.com/40",
          "category": "Apparel",
          "stockQuantity": 35,
          "reorderLevel": 50,
          "supplier": "Sportswear Inc.",
          "lastRestocked": "2024-01-10",
          "status": "Low Stock"
        },
        {
          "id": 3,
          "name": "Trophy Gold",
          "thumbnail": "https://via.placeholder.com/40",
          "category": "Awards",
          "stockQuantity": 0,
          "reorderLevel": 20,
          "supplier": "Award Master",
          "lastRestocked": "2023-12-20",
          "status": "Out of Stock"
        },
        {
          "id": 4,
          "name": "Medal Set",
          "thumbnail": "https://via.placeholder.com/40",
          "category": "Awards",
          "stockQuantity": 120,
          "reorderLevel": 30,
          "supplier": "Award Master",
          "lastRestocked": "2024-01-08",
          "status": "In Stock"
        },
        {
          "id": 5,
          "name": "Polo Shirt",
          "thumbnail": "https://via.placeholder.com/40",
          "category": "Apparel",
          "stockQuantity": 28,
          "reorderLevel": 50,
          "supplier": "Textile Co.",
          "lastRestocked": "2024-01-12",
          "status": "Low Stock"
        }
      ];
      setStockItems(mockData);
      setLoading(false);
    }, 300);
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
    const max = reorderLevel * 5;
    return Math.min((quantity / max) * 100, 100);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  console.log('StockManagementCompact rendering...', { stockItems, loading });
  
  return (
    <div className="stock-mgmt-dashboard stock-mgmt-compact" style={{ 
      width: '100%', 
      minHeight: '400px',
      background: '#ffffff',
      border: '3px solid #3b82f6',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      display: 'block !important',
      position: 'relative',
      zIndex: 10,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      <div className="stock-mgmt-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
        <h2 className="stock-mgmt-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>
          Stock Management
        </h2>
      </div>

      {loading ? (
        <div className="stock-mgmt-loading">
          <div className="stock-mgmt-spinner"></div>
          <p>Loading...</p>
        </div>
      ) : stockItems.length === 0 ? (
        <div className="stock-mgmt-empty">
          <p>No stock items</p>
        </div>
      ) : (
        <div className="stock-mgmt-table-wrapper">
          <table className="stock-mgmt-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.slice(0, 5).map((item) => {
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
  );
};

export default StockManagementCompact;

