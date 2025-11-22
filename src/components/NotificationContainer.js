import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import './NotificationContainer.css';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <>
      {/* Regular notifications (top-right) */}
      <div className="notification-container">
        {notifications
          .filter(notification => notification.position !== 'center')
          .map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="notification-content">
              <div className="notification-icon">
                {notification.type === 'success' && '✓'}
                {notification.type === 'error' && '✕'}
                {notification.type === 'warning' && '⚠'}
                {notification.type === 'info' && 'ℹ'}
              </div>
              <div className="notification-text">
                {notification.title && (
                  <div className="notification-title">{notification.title}</div>
                )}
                <div className="notification-message">{notification.message}</div>
              </div>
              <button
                className="notification-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
              >
                ×
              </button>
            </div>
            <div className="notification-progress">
              <div 
                className="notification-progress-bar"
                style={{
                  animationDuration: `${notification.duration}ms`
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Center notifications (Shopee-style) */}
      <div className="notification-center-container">
        {notifications
          .filter(notification => notification.position === 'center')
          .map((notification) => (
          <div
            key={notification.id}
            className={`notification-center notification-center-${notification.type}`}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="notification-center-content">
              <div className="notification-center-icon">
                {notification.type === 'success' && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
                {notification.type === 'cart-success' && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="check-icon">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
                {notification.type === 'error' && '✕'}
                {notification.type === 'warning' && '⚠'}
                {notification.type === 'info' && 'ℹ'}
              </div>
              <div className="notification-center-text">
                <div className="notification-center-title">{notification.title}</div>
                {notification.message && (
                  <div className="notification-center-message">{notification.message}</div>
                )}
              </div>
            </div>
            <div className="notification-center-progress">
              <div 
                className="notification-center-progress-bar"
                style={{
                  animationDuration: `${notification.duration}ms`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationContainer;
