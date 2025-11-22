import React, { useState, useEffect } from 'react';
import orderTrackingService from '../services/orderTrackingService';
import './OrderTrackingStatus.css';

const OrderTrackingStatus = ({ orderId, orderNumber }) => {
  const [currentStatus, setCurrentStatus] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrderStatus();
  }, [orderId]);

  const fetchOrderStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current status
      const status = await orderTrackingService.getCurrentOrderStatus(orderId);
      setCurrentStatus(status);

      // Get tracking history
      const history = await orderTrackingService.getOrderTracking(orderId);
      setTrackingHistory(history);

    } catch (err) {
      console.error('Error fetching order status:', err);
      setError('Failed to load order tracking information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      in_store: {
        title: 'In Store Branch',
        description: 'Your order is being prepared at our store branch',
        icon: '🏪',
        color: '#3B82F6',
        bgColor: '#EFF6FF',
        borderColor: '#3B82F6'
      },
      on_the_way: {
        title: 'On The Way',
        description: 'Your order is on the way to your location',
        icon: '🚚',
        color: '#F59E0B',
        bgColor: '#FFFBEB',
        borderColor: '#F59E0B'
      },
      delivered: {
        title: 'Delivered',
        description: 'Your order has arrived at your location',
        icon: '✅',
        color: '#10B981',
        bgColor: '#ECFDF5',
        borderColor: '#10B981'
      }
    };

    return statusMap[status] || {
      title: 'Unknown Status',
      description: 'Order status is being updated',
      icon: '❓',
      color: '#6B7280',
      bgColor: '#F9FAFB',
      borderColor: '#6B7280'
    };
  };

  const getProgressPercentage = (status) => {
    const progressMap = {
      in_store: 33,
      on_the_way: 66,
      delivered: 100
    };
    return progressMap[status] || 0;
  };

  if (loading) {
    return (
      <div className="order-tracking-loading">
        <div className="loading-spinner"></div>
        <p>Loading order status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-tracking-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={fetchOrderStatus} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  const statusInfo = currentStatus ? getStatusInfo(currentStatus.status) : getStatusInfo('in_store');
  const progressPercentage = currentStatus ? getProgressPercentage(currentStatus.status) : 0;

  return (
    <div className="order-tracking-status">
      <div className="tracking-header">
        <h3>Order Tracking</h3>
        <p className="order-number">Order #{orderNumber}</p>
      </div>

      {/* Current Status */}
      <div className="current-status">
        <div 
          className="status-card"
          style={{
            backgroundColor: statusInfo.bgColor,
            borderColor: statusInfo.borderColor
          }}
        >
          <div className="status-icon" style={{ color: statusInfo.color }}>
            {statusInfo.icon}
          </div>
          <div className="status-content">
            <h4 style={{ color: statusInfo.color }}>{statusInfo.title}</h4>
            <p>{statusInfo.description}</p>
            {currentStatus && (
              <p className="status-time">
                Updated: {new Date(currentStatus.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${progressPercentage}%`,
                backgroundColor: statusInfo.color
              }}
            ></div>
          </div>
          <div className="progress-labels">
            <span className={progressPercentage >= 33 ? 'completed' : ''}>In Store</span>
            <span className={progressPercentage >= 66 ? 'completed' : ''}>On The Way</span>
            <span className={progressPercentage >= 100 ? 'completed' : ''}>Delivered</span>
          </div>
        </div>
      </div>

      {/* Tracking History */}
      {trackingHistory.length > 0 && (
        <div className="tracking-history">
          <h4>Tracking History</h4>
          <div className="history-timeline">
            {trackingHistory.map((entry, index) => {
              const entryStatusInfo = getStatusInfo(entry.status);
              return (
                <div key={entry.id} className="timeline-item">
                  <div 
                    className="timeline-marker"
                    style={{ backgroundColor: entryStatusInfo.color }}
                  >
                    {entryStatusInfo.icon}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <h5 style={{ color: entryStatusInfo.color }}>
                        {entryStatusInfo.title}
                      </h5>
                      <span className="timeline-time">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="timeline-description">{entry.description}</p>
                    {entry.location && (
                      <p className="timeline-location">📍 {entry.location}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estimated Delivery */}
      {currentStatus && currentStatus.status !== 'delivered' && (
        <div className="estimated-delivery">
          <h4>Estimated Delivery</h4>
          <p>
            {currentStatus.status === 'in_store' 
              ? 'Your order will be ready for pickup/delivery within 2-3 hours'
              : 'Your order is on the way and should arrive within 1-2 hours'
            }
          </p>
        </div>
      )}

      {/* Contact Information */}
      <div className="tracking-contact">
        <h4>Need Help?</h4>
        <p>If you have any questions about your order, please contact us:</p>
        <div className="contact-info">
          <p>📞 Phone: (555) 123-4567</p>
          <p>📧 Email: support@yohanns.com</p>
          <p>💬 Live Chat: Available 24/7</p>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingStatus;
