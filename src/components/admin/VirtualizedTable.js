import React from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * Virtualized table component for rendering large datasets efficiently
 * Uses react-window to only render visible rows
 */
const VirtualizedTable = ({
  data = [],
  columns = [],
  height = 400,
  rowHeight = 50,
  onRowClick = null,
  className = '',
}) => {
  const Row = ({ index, style }) => {
    const row = data[index];
    
    return (
      <div
        style={style}
        className={`virtualized-table-row ${onRowClick ? 'clickable' : ''}`}
        onClick={() => onRowClick && onRowClick(row, index)}
      >
        {columns.map((column, colIndex) => (
          <div
            key={colIndex}
            className="virtualized-table-cell"
            style={{
              width: column.width || `${100 / columns.length}%`,
              display: 'inline-block',
              padding: '8px 12px',
              borderBottom: '1px solid #e0e0e0',
              verticalAlign: 'middle',
            }}
          >
            {column.render ? column.render(row, index) : row[column.key]}
          </div>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className={`virtualized-table-empty ${className}`} style={{ height, padding: '20px', textAlign: 'center' }}>
        No data available
      </div>
    );
  }

  return (
    <div className={`virtualized-table ${className}`} style={{ height, overflow: 'hidden' }}>
      {/* Header */}
      <div className="virtualized-table-header" style={{ display: 'flex', borderBottom: '2px solid #ccc', backgroundColor: '#f5f5f5' }}>
        {columns.map((column, index) => (
          <div
            key={index}
            className="virtualized-table-header-cell"
            style={{
              width: column.width || `${100 / columns.length}%`,
              padding: '12px',
              fontWeight: 'bold',
              textAlign: column.align || 'left',
            }}
          >
            {column.header}
          </div>
        ))}
      </div>
      
      {/* Virtualized list */}
      <List
        height={height - 50} // Subtract header height
        itemCount={data.length}
        itemSize={rowHeight}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedTable;



