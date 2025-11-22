import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaTruck, FaCheckCircle, FaRoute, FaCamera, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { useNotification } from '../../contexts/NotificationContext';
import orderTrackingService from '../../services/orderTrackingService';
import './OrderTrackingManager.css';

const OrderTrackingManager = ({ order, onClose, onUpdate }) => {
  const { showSuccess, showError } = useNotification();
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [deliveryProof, setDeliveryProof] = useState(null);
  const [showAddTracking, setShowAddTracking] = useState(false);
  const [showAddProof, setShowAddProof] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [trackingForm, setTrackingForm] = useState({
    status: 'in_store',
    location: '',
    description: ''
  });

  // Order status options
  const statusOptions = [
    { value: 'in_store', label: 'In Store Branch', icon: '🏪', color: '#3B82F6' },
    { value: 'on_the_way', label: 'On The Way', icon: '🚚', color: '#F59E0B' },
    { value: 'delivered', label: 'Delivered', icon: '✅', color: '#10B981' }
  ];
  
  const [proofForm, setProofForm] = useState({
    deliveryPersonName: '',
    deliveryPersonContact: '',
    deliveryNotes: '',
    proofImages: []
  });

  useEffect(() => {
    if (order) {
      loadTrackingData();
    }
  }, [order]);

  const loadTrackingData = async () => {
    if (!order) return;
    
    setLoading(true);
    try {
      const [tracking, proof] = await Promise.all([
        orderTrackingService.getOrderTracking(order.id),
        orderTrackingService.getDeliveryProof(order.id)
      ]);
      
      setTrackingHistory(tracking);
      setDeliveryProof(proof);
    } catch (error) {
      console.error('Error loading tracking data:', error);
      showError('Error', 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTracking = async () => {
    if (!order) return;
    
    try {
      await orderTrackingService.addTrackingUpdate(
        order.id,
        trackingForm.status,
        trackingForm.location,
        trackingForm.description
      );
      
      showSuccess('Tracking Updated', 'Order tracking has been updated');
      setShowAddTracking(false);
      setTrackingForm({ status: 'processing', location: '', description: '' });
      loadTrackingData();
      onUpdate?.();
    } catch (error) {
      console.error('Error adding tracking update:', error);
      showError('Error', 'Failed to add tracking update');
    }
  };

  const handleAddDeliveryProof = async () => {
    if (!order) return;
    
    try {
      await orderTrackingService.addDeliveryProof(
        order.id,
        proofForm.deliveryPersonName,
        proofForm.deliveryPersonContact,
        proofForm.proofImages,
        proofForm.deliveryNotes
      );
      
      showSuccess('Delivery Proof Added', 'Delivery proof has been recorded');
      setShowAddProof(false);
      setProofForm({
        deliveryPersonName: '',
        deliveryPersonContact: '',
        deliveryNotes: '',
        proofImages: []
      });
      loadTrackingData();
      onUpdate?.();
    } catch (error) {
      console.error('Error adding delivery proof:', error);
      showError('Error', 'Failed to add delivery proof');
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'confirmed':
        return <FaMapMarkerAlt className="status-icon main-branch" />;
      case 'processing':
        return <FaRoute className="status-icon processing" />;
      case 'shipped':
        return <FaTruck className="status-icon on-the-way" />;
      case 'delivered':
        return <FaCheckCircle className="status-icon delivered" />;
      default:
        return <FaMapMarkerAlt className="status-icon" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'confirmed':
        return '#00bfff';
      case 'processing':
        return '#ffa500';
      case 'shipped':
        return '#32cd32';
      case 'delivered':
        return '#00ff88';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!order) return null;

  // Only show tracking for COD orders
  if (order.shippingMethod !== 'cod') {
    return (
      <div className="order-tracking-manager">
        <div className="tracking-manager-header">
          <h3>Order Tracking - #{order.orderNumber}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="tracking-manager-content">
          <div className="no-tracking-available">
            <h4>Tracking Not Available</h4>
            <p>Order tracking is only available for Cash on Delivery (COD) orders.</p>
            <p>This order is set for <strong>Pickup</strong> at {order.pickupLocation}.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-tracking-manager">
      <div className="tracking-manager-header">
        <h3>Order Tracking - #{order.orderNumber}</h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="tracking-manager-content">
        {/* Current Order Status */}
        <div className="current-status">
          <h4>Current Status</h4>
          <div className="status-display">
            {getStatusIcon(order.status)}
            <div className="status-info">
              <div className="status-name" style={{ color: getStatusColor(order.status) }}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </div>
              <div className="status-description">
                {order.status === 'pending' && 'Order is being reviewed'}
                {order.status === 'confirmed' && 'Order confirmed, preparing items'}
                {order.status === 'processing' && 'Items are being prepared'}
                {order.status === 'shipped' && 'Order is on the way'}
                {order.status === 'delivered' && 'Order has been delivered'}
              </div>
            </div>
          </div>
        </div>

        {/* Tracking History */}
        <div className="tracking-history">
          <div className="section-header">
            <h4>Tracking History</h4>
            <button 
              className="add-btn"
              onClick={() => setShowAddTracking(true)}
            >
              <FaPlus /> Add Update
            </button>
          </div>

          {trackingHistory.length === 0 ? (
            <div className="no-tracking">
              <p>No tracking updates yet</p>
            </div>
          ) : (
            <div className="tracking-timeline">
              {trackingHistory.map((update, index) => (
                <div key={update.id} className="tracking-update">
                  <div className="timeline-icon">
                    {getStatusIcon(update.status)}
                  </div>
                  <div className="timeline-content">
                    <div className="update-status" style={{ color: getStatusColor(update.status) }}>
                      {update.status.charAt(0).toUpperCase() + update.status.slice(1)}
                    </div>
                    {update.location && (
                      <div className="update-location">
                        <FaMapMarkerAlt /> {update.location}
                      </div>
                    )}
                    {update.description && (
                      <div className="update-description">
                        {update.description}
                      </div>
                    )}
                    <div className="update-time">
                      {formatDate(update.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Proof */}
        <div className="delivery-proof-section">
          <div className="section-header">
            <h4>Delivery Proof</h4>
            {!deliveryProof && (
              <button 
                className="add-btn"
                onClick={() => setShowAddProof(true)}
              >
                <FaCamera /> Add Proof
              </button>
            )}
          </div>

          {deliveryProof ? (
            <div className="delivery-proof-display">
              <div className="proof-info">
                <div className="proof-person">
                  <strong>Delivered by:</strong> {deliveryProof.delivery_person_name}
                </div>
                {deliveryProof.delivery_person_contact && (
                  <div className="proof-contact">
                    <strong>Contact:</strong> {deliveryProof.delivery_person_contact}
                  </div>
                )}
                {deliveryProof.delivery_notes && (
                  <div className="proof-notes">
                    <strong>Notes:</strong> {deliveryProof.delivery_notes}
                  </div>
                )}
                <div className="proof-time">
                  <strong>Delivered at:</strong> {formatDate(deliveryProof.delivered_at)}
                </div>
              </div>
              
              {deliveryProof.proof_images && deliveryProof.proof_images.length > 0 && (
                <div className="proof-images">
                  <strong>Proof Images:</strong>
                  <div className="proof-images-grid">
                    {deliveryProof.proof_images.map((image, index) => (
                      <img 
                        key={index} 
                        src={image} 
                        alt={`Delivery proof ${index + 1}`}
                        className="proof-image"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-proof">
              <p>No delivery proof recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Tracking Modal */}
      {showAddTracking && (
        <div className="modal-overlay" onClick={() => setShowAddTracking(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Tracking Update</h3>
              <button onClick={() => setShowAddTracking(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Status:</label>
                <select 
                  value={trackingForm.status}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div className="form-group">
                <label>Location:</label>
                <input 
                  type="text"
                  value={trackingForm.location}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Main Branch, On the way to customer"
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea 
                  value={trackingForm.description}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about this update"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowAddTracking(false)}>Cancel</button>
                <button onClick={handleAddTracking}>Add Update</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Delivery Proof Modal */}
      {showAddProof && (
        <div className="modal-overlay" onClick={() => setShowAddProof(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Delivery Proof</h3>
              <button onClick={() => setShowAddProof(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Delivery Person Name:</label>
                <input 
                  type="text"
                  value={proofForm.deliveryPersonName}
                  onChange={(e) => setProofForm(prev => ({ ...prev, deliveryPersonName: e.target.value }))}
                  placeholder="Name of delivery person"
                />
              </div>
              <div className="form-group">
                <label>Contact Number:</label>
                <input 
                  type="text"
                  value={proofForm.deliveryPersonContact}
                  onChange={(e) => setProofForm(prev => ({ ...prev, deliveryPersonContact: e.target.value }))}
                  placeholder="Contact number"
                />
              </div>
              <div className="form-group">
                <label>Delivery Notes:</label>
                <textarea 
                  value={proofForm.deliveryNotes}
                  onChange={(e) => setProofForm(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                  placeholder="Any additional notes about the delivery"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Proof Images (URLs):</label>
                <textarea 
                  value={proofForm.proofImages.join('\n')}
                  onChange={(e) => setProofForm(prev => ({ 
                    ...prev, 
                    proofImages: e.target.value.split('\n').filter(url => url.trim()) 
                  }))}
                  placeholder="Enter image URLs, one per line"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowAddProof(false)}>Cancel</button>
                <button onClick={handleAddDeliveryProof}>Add Proof</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingManager;
