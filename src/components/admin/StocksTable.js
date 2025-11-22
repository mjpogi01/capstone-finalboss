import React from 'react';
import './StocksTable.css';

const StocksTable = () => {
  const stockItems = [
    { item: 'Trophy', status: 'In Stock', statusColor: 'green' },
    { item: 'Towels', status: 'In Stock', statusColor: 'green' },
    { item: 'Medals', status: 'Out of Stock', statusColor: 'red' },
    { item: 'Polyester', status: 'In Stock', statusColor: 'green' },
    { item: 'Polyester', status: 'In Stock', statusColor: 'green' }
  ];

  return (
    <div className="stocks-table">
      <div className="table-header">
        <h3 className="table-title">Stocks</h3>
        <button className="filter-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>
      
      <div className="table-content">
        <div className="table-header-row">
          <div className="header-cell">Item</div>
          <div className="header-cell">Status</div>
        </div>
        
        {stockItems.map((item, index) => (
          <div key={index} className="table-row">
            <div className="table-cell item-cell">
              {item.item}
            </div>
            <div className="table-cell status-cell">
              <span className={`status-badge ${item.statusColor}`}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StocksTable;
