import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: notification.type || 'info', // success, error, warning, info
      title: notification.title || '',
      message: notification.message || '',
      duration: notification.duration || 1500, // Auto-dismiss after 1.5 seconds
      timestamp: new Date(),
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss after specified duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [removeNotification]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods for different notification types
  const showSuccess = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 1500, // Ultra-short error duration
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  // Transaction-specific notification methods
  const showOrderConfirmation = useCallback((orderNumber, totalAmount) => {
    return showSuccess(
      'Order Placed Successfully!',
      `Your order #${orderNumber} has been placed. Total: ₱${totalAmount.toFixed(2)}. We will contact you soon for confirmation.`,
      { duration: 2000 }
    );
  }, [showSuccess]);

  const showCartUpdate = useCallback((action, itemName) => {
    return showSuccess(
      'Added to Cart',
      '',
      { 
        duration: 1500,
        position: 'center',
        type: 'cart-success'
      }
    );
  }, [showSuccess]);

  const showLoginSuccess = useCallback((userName) => {
    return showSuccess(
      'Welcome Back!',
      `Hello ${userName}, great to see you again!`,
      { duration: 1000 }
    );
  }, [showSuccess]);

  const showWelcome = useCallback((userName) => {
    return showSuccess(
      'Welcome!',
      `Hello ${userName}, welcome to Yohann's Sportswear House!`,
      { duration: 1000 }
    );
  }, [showSuccess]);

  const showLogoutSuccess = useCallback(() => {
    return showInfo(
      'Logged Out',
      'You have been successfully logged out.',
      { duration: 1000 }
    );
  }, [showInfo]);

  // Generic notification function that routes to appropriate specific method
  const showNotification = useCallback((message, type = 'info', title = '') => {
    switch (type) {
      case 'success':
        return showSuccess(title, message);
      case 'error':
        return showError(title, message);
      case 'warning':
        return showWarning(title, message);
      case 'info':
      default:
        return showInfo(title, message);
    }
  }, [showSuccess, showError, showWarning, showInfo]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    showOrderConfirmation,
    showCartUpdate,
    showLoginSuccess,
    showLogoutSuccess,
    showWelcome
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
