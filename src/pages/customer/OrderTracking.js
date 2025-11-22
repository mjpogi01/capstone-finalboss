import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import OrderTrackingStatus from '../../components/customer/OrderTrackingStatus';
import orderService from '../../services/orderService';
import './OrderTracking.css';

const OrderTracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real order data with artist information
      const orderWithArtist = await orderService.getOrderWithArtist(orderId);
      setOrder(orderWithArtist);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to load order details. Please try again.');
      
      // Fallback to mock data if API fails
      const mockOrder = {
        id: orderId,
        orderNumber: `ORD-${orderId}`,
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        address: '123 Main St, City, State 12345',
        total: 89.99,
        items: [
          { name: 'Basketball Jersey', quantity: 1, price: 45.99 },
          { name: 'Football Jersey', quantity: 1, price: 44.00 }
        ],
        createdAt: new Date().toISOString(),
        status: 'in_store',
        assignedArtist: null
      };
      setOrder(mockOrder);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="order-tracking-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-tracking-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Order</h3>
          <p>{error}</p>
          <button onClick={fetchOrderDetails} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-tracking-page">
        <div className="not-found-container">
          <div className="not-found-icon">📦</div>
          <h3>Order Not Found</h3>
          <p>The order you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => window.history.back()} 
            className="back-btn"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-tracking-page">
      <div className="tracking-container">
        {/* Order Header */}
        <div className="order-header">
          <h1 className="page-title">Track Your Order</h1>
          <p className="order-subtitle">
            Monitor your order's journey from our store to your doorstep
          </p>
        </div>

        {/* Order Information */}
        <div className="order-info-section">
          <h2>Order Information</h2>
          <div className="order-details-grid">
            <div className="order-detail">
              <label>Order Number</label>
              <span>{order.orderNumber}</span>
            </div>
            <div className="order-detail">
              <label>Customer</label>
              <span>{order.customerName}</span>
            </div>
            <div className="order-detail">
              <label>Email</label>
              <span>{order.email}</span>
            </div>
            <div className="order-detail">
              <label>Phone</label>
              <span>{order.phone}</span>
            </div>
            <div className="order-detail">
              <label>Total Amount</label>
              <span className="order-total">${order.total}</span>
            </div>
            <div className="order-detail">
              <label>Order Date</label>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            {order.assignedArtist && (
              <div className="order-detail artist-detail">
                <label>Assigned Artist</label>
                <span className="artist-name">{order.assignedArtist.artist_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="delivery-address-section">
          <h2>Delivery Address</h2>
          <div className="address-card">
            <div className="address-icon">📍</div>
            <div className="address-details">
              <p className="address-text">{order.address}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="order-items-section">
          <h2>Order Items</h2>
          <div className="items-list">
            {order.items.map((item, index) => (
              <div key={index} className="order-item">
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <p>Quantity: {item.quantity}</p>
                </div>
                <div className="item-price">
                  ${item.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Tracking Status */}
        <div className="tracking-status-section">
          <OrderTrackingStatus 
            orderId={order.id} 
            orderNumber={order.orderNumber}
          />
        </div>

        {/* Support Information */}
        <div className="support-section">
          <h2>Need Help?</h2>
          <div className="support-options">
            <div className="support-option">
              <div className="support-icon">📞</div>
              <div className="support-details">
                <h4>Call Us</h4>
                <p>(555) 123-4567</p>
                <span>Available 24/7</span>
              </div>
            </div>
            <div className="support-option">
              <div className="support-icon">💬</div>
              <div className="support-details">
                <h4>Live Chat</h4>
                <p>Chat with our support team</p>
                <span>Online now</span>
              </div>
            </div>
            <div className="support-option">
              <div className="support-icon">📧</div>
              <div className="support-details">
                <h4>Email Us</h4>
                <p>support@yohanns.com</p>
                <span>Response within 2 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
