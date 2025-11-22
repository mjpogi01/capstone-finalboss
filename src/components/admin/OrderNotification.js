import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import './OrderNotification.css';

const OrderNotification = ({ notifications, removeNotification }) => {
  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="order-notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-remove after duration
    if (notification.autoClose !== false) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: '#F59E0B',
      confirmed: '#3B82F6',
      layout: '#8B5CF6',
      sizing: '#EC4899',
      printing: '#06B6D4',
      press: '#EF4444',
      prod: '#10B981',
      packing_completing: '#6366F1',
      picked_up_delivered: '#059669',
      cancelled: '#DC2626'
    };
    return statusColors[status] || '#6B7280';
  };

  return (
    <div
      className={`order-notification ${notification.type} ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}
      style={{
        '--status-color': getStatusColor(notification.status)
      }}
    >
      <div className="order-notification-content">
        <div className="order-notification-text">
          <div className="order-notification-title">{notification.title}</div>
          {notification.message && (
            <div className="order-notification-message">{notification.message}</div>
          )}
          {notification.orderNumber && (
            <div className="order-notification-order-info">
              Order #{notification.orderNumber}
            </div>
          )}
        </div>
        <button className="order-notification-close" onClick={handleClose}>
          <FaTimes />
        </button>
      </div>
      {notification.progress && (
        <div className="order-notification-progress-bar">
          <div 
            className="order-notification-progress-fill"
            style={{ width: `${notification.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default OrderNotification;

