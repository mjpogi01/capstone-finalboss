import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaEye, FaTruck, FaMapMarkerAlt, FaCalendarAlt, FaShoppingBag, FaUsers, FaBan, FaRoute, FaCheckCircle, FaStar, FaCamera, FaLocationArrow, FaComments, FaChevronLeft, FaChevronRight, FaDownload, FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import orderService from '../../services/orderService';
import orderTrackingService from '../../services/orderTrackingService';
import SimpleOrderReview from './SimpleOrderReview';
import DesignChat from './DesignChat';
import { supabase } from '../../lib/supabase';
import './CustomerOrdersModal.css';
import Loading from '../Loading';
import ErrorState from '../ErrorState';

const CustomerOrdersModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [orderTracking, setOrderTracking] = useState({});
  const [orderReviews, setOrderReviews] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState(null);
  const [imageGallery, setImageGallery] = useState({ isOpen: false, images: [], currentIndex: 0 }); // Image gallery modal state

  // Image gallery functions
  const openImageGallery = useCallback((images, startIndex = 0) => {
    if (!images || images.length === 0) return;
    setImageGallery({
      isOpen: true,
      images: images.map(img => ({
        url: img.url || img,
        filename: img.filename || img.originalname || `image-${images.indexOf(img) + 1}.jpg`
      })),
      currentIndex: startIndex
    });
  }, []);

  const closeImageGallery = useCallback(() => {
    setImageGallery({ isOpen: false, images: [], currentIndex: 0 });
  }, []);

  const goToNextImage = useCallback(() => {
    setImageGallery(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  }, []);

  const goToPrevImage = useCallback(() => {
    setImageGallery(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  }, []);

  const downloadImage = useCallback((imageUrl, filename) => {
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'image.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Error downloading image:', error);
        window.open(imageUrl, '_blank');
      });
  }, []);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (!imageGallery.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeImageGallery();
      } else if (e.key === 'ArrowLeft') {
        goToPrevImage();
      } else if (e.key === 'ArrowRight') {
        goToNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageGallery.isOpen, closeImageGallery, goToPrevImage, goToNextImage]);

  useEffect(() => {
    if (isOpen && user) {
      loadUserOrders();
    }
  }, [isOpen, user]);

  const loadUserOrders = async () => {
    if (!user) {
      console.warn('📦 No user logged in, cannot load orders');
      return;
    }
    
    console.log('📦 Loading orders for user:', user.id, user.email);
    setLoading(true);
    setError(null);
    try {
      // getUserOrders now excludes cancelled orders by default
      const userOrders = await orderService.getUserOrders(user.id);
      console.log('📦 Fetched user orders:', userOrders.length, 'orders');
      console.log('📦 Orders:', userOrders);
      setOrders(userOrders);
      
      // Load tracking, reviews, and delivery proof for each order
      await loadOrderDetails(userOrders);
    } catch (err) {
      console.error('❌ Error loading user orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistProfileById = async (artistId) => {
    if (!artistId) return null;

    try {
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, is_active')
        .eq('id', artistId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching artist profile:', error);
        return null;
      }

      return data || null;
    } catch (err) {
      console.error('❌ Unexpected error fetching artist profile:', err);
      return null;
    }
  };

  const loadOrderDetails = async (userOrders) => {
    const trackingData = {};
    const reviewsData = {};
    const artistData = {};

    for (const order of userOrders) {
      try {
        // Load tracking data
        const tracking = await orderTrackingService.getOrderTracking(order.id);
        trackingData[order.id] = tracking;

        // Load review data
        const review = await orderTrackingService.getOrderReview(order.id);
        reviewsData[order.id] = review;

        // Load assigned artist data directly from Supabase
        try {
          const { data: artistTask, error: taskError } = await supabase
            .from('artist_tasks')
            .select('artist_id')
            .eq('order_id', order.id)
            .maybeSingle();

          console.log(`🎨 Raw artist task query result for order ${order.id}:`, { artistTask, taskError });

          if (taskError) {
            console.error(`❌ Error getting artist task for order ${order.id}:`, taskError);
            artistData[order.id] = null;
          } else if (artistTask?.artist_id) {
            const profile = await fetchArtistProfileById(artistTask.artist_id);
            
            if (profile && profile.is_active) {
              artistData[order.id] = profile;
              console.log(`✅ Found active artist for order ${order.id}:`, profile.artist_name);
            } else {
              console.log(`⚠️ Artist profile not active or not found for order ${order.id}`);
              artistData[order.id] = null;
            }
          } else {
            console.log(`⚠️ No artist task found for order ${order.id}`);
            artistData[order.id] = null;
          }
        } catch (artistError) {
          console.log(`⚠️ Error loading artist for order ${order.id}:`, artistError);
          artistData[order.id] = null;
        }
      } catch (error) {
        console.error(`Error loading details for order ${order.id}:`, error);
      }
    }

    setOrderTracking(trackingData);
    setOrderReviews(reviewsData);
    
    // Update orders with artist information
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => {
        const artist = artistData[order.id];
        console.log(`🎨 Updating order ${order.id} with artist:`, artist);
        return {
          ...order,
          assignedArtist: artist || null
        };
      });
      console.log('🎨 Updated orders with artist data:', updatedOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, hasArtist: !!o.assignedArtist, artistName: o.assignedArtist?.artist_name })));
      return updatedOrders;
    });
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

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'layout':
      case 'sizing':
      case 'printing':
      case 'press':
      case 'prod':
      case 'processing': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'delivered': 
      case 'picked_up_delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  // Calculate order total dynamically for custom design orders
  const calculateOrderTotal = (order) => {
    if (!order.orderItems || order.orderItems.length === 0) {
      return parseFloat(order.totalAmount || 0);
    }

    let calculatedSubtotal = 0;

    order.orderItems.forEach((item) => {
      const isCustomDesign = item.product_type === 'custom_design';
      
      if (isCustomDesign && item.team_members && item.team_members.length > 0) {
        // Calculate total for custom design items by summing all member prices
        item.team_members.forEach((member) => {
          let memberPrice = 0;
          const memberSizingType = member.sizingType || 'adults';
          const memberJerseyType = member.jerseyType || 'full';
          
          // Base price calculation
          if (memberSizingType === 'kids') {
            if (memberJerseyType === 'full') memberPrice = 850;
            else if (memberJerseyType === 'shirt') memberPrice = 450;
            else if (memberJerseyType === 'shorts') memberPrice = 400;
          } else {
            if (memberJerseyType === 'full') memberPrice = 950;
            else if (memberJerseyType === 'shirt') memberPrice = 500;
            else if (memberJerseyType === 'shorts') memberPrice = 450;
          }
          
          // Size surcharge
          const surchargeSizes = ['2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
          const shirtSize = member.size || '';
          const shortsSize = member.shortsSize || '';
          if (surchargeSizes.includes(shirtSize) || surchargeSizes.includes(shortsSize)) {
            memberPrice += 50;
          }
          
          // Fabric surcharge
          const fabricOption = member.fabricOption || '';
          if (fabricOption === 'Polytex') memberPrice += 50;
          
          // Cut type surcharge
          const cutType = member.cutType || '';
          if (cutType === 'NBA Cut') memberPrice += 100;
          
          // Custom design fee
          memberPrice += 200;
          
          calculatedSubtotal += memberPrice;
        });
      } else {
        // Regular items: use price * quantity
        const itemPrice = parseFloat(item.price || 0);
        const quantity = parseFloat(item.quantity || 1);
        calculatedSubtotal += itemPrice * quantity;
      }
    });

    // Add shipping cost
    const shippingCost = parseFloat(order.shippingCost || 0);
    return calculatedSubtotal + shippingCost;
  };

  const getStatusDescription = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Your order is being reviewed';
      case 'confirmed': return 'Order confirmed, preparing items';
      case 'layout': return 'Creating design layout';
      case 'sizing': return 'Determining item sizes';
      case 'printing': return 'Printing items';
      case 'press': return 'Heat press application in progress';
      case 'prod': return 'In final production stages';
      case 'packing_completing': return 'Packing and final checks';
      case 'picked_up_delivered': return 'Order has been picked up or delivered ✓';
      case 'processing': return 'Items are being prepared';
      case 'shipped': return 'Order is on the way';
      case 'delivered': return 'Order has been delivered';
      case 'cancelled': return 'Order has been cancelled';
      default: return 'Order status unknown';
    }
  };

  const handleCancelOrder = (orderId) => {
    setOrderToCancel(orderId);
    setShowCancelReason(true);
    setCancelReason('');
  };

  const handleSubmitCancellation = async () => {
    if (!cancelReason) {
      showError('Reason Required', 'Please select a cancellation reason');
      return;
    }

    if (!user) return;
    
    setCancellingOrder(orderToCancel);
    setShowCancelReason(false);
    
    try {
      await orderService.updateOrderStatus(orderToCancel, 'cancelled');
      
      // Remove the cancelled order from the list automatically
      setOrders(prevOrders => 
        prevOrders.filter(order => order.id !== orderToCancel)
      );
      
      showSuccess('Order Cancelled', `Your order has been successfully cancelled. Reason: ${cancelReason}`);
      
      // Trigger event to refresh orders count in header
      window.dispatchEvent(new CustomEvent('orderCancelled'));
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      showError('Cancellation Failed', 'Failed to cancel order. Please try again or contact support.');
    } finally {
      setCancellingOrder(null);
      setOrderToCancel(null);
      setCancelReason('');
    }
  };

  const handleCloseCancelDialog = () => {
    setShowCancelReason(false);
    setOrderToCancel(null);
    setCancelReason('');
  };

  const handleOpenChat = (order) => {
    setSelectedOrderForChat(order);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedOrderForChat(null);
  };

  const handleEditCustomOrder = (order) => {
    // TODO: Implement edit functionality
    console.log('Edit custom order:', order);
    showSuccess('Edit Order', 'Edit functionality will be implemented soon.');
  };

  const handleDeleteCustomOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to delete order #${order.orderNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Only allow deletion of pending orders
      if (order.status.toLowerCase() !== 'pending') {
        showError('Cannot Delete', 'Only pending orders can be deleted.');
        return;
      }

      await orderService.updateOrderStatus(order.id, 'cancelled');
      
      // Remove the order from the list
      setOrders(prevOrders => 
        prevOrders.filter(o => o.id !== order.id)
      );
      
      showSuccess('Order Deleted', `Order #${order.orderNumber} has been successfully deleted.`);
      
      // Trigger event to refresh orders count in header
      window.dispatchEvent(new CustomEvent('orderCancelled'));
      
    } catch (error) {
      console.error('Error deleting order:', error);
      showError('Delete Failed', 'Failed to delete order. Please try again or contact support.');
    }
  };

  const hasCustomDesign = (order) => {
    // Check both order_items and orderItems for compatibility
    const items = order.order_items || order.orderItems || [];
    const hasDesign = items.some(item => 
      item.design_images && item.design_images.length > 0
    );
    
    // Debug logging
    console.log(`🔍 Order ${order.orderNumber || order.order_number}:`, {
      hasOrderItems: !!order.order_items,
      hasOrderItemsAlt: !!order.orderItems,
      itemsLength: items.length,
      hasDesignImages: items.some(item => item.design_images && item.design_images.length > 0),
      hasDesign: hasDesign,
      orderKeys: Object.keys(order)
    });
    
    return hasDesign;
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleReviewSubmit = async () => {
    if (!selectedOrderForReview || !user) return;

    try {
      await orderTrackingService.addOrderReview(
        selectedOrderForReview.id,
        user.id,
        reviewData.rating,
        reviewData.comment
      );

      // Update local state
      setOrderReviews(prev => ({
        ...prev,
        [selectedOrderForReview.id]: {
          rating: reviewData.rating,
          comment: reviewData.comment,
          created_at: new Date().toISOString()
        }
      }));

      showSuccess('Review Submitted', 'Thank you for your review!');
      setShowReviewModal(false);
      setSelectedOrderForReview(null);
      setReviewData({ rating: 5, comment: '' });
    } catch (error) {
      console.error('Error submitting review:', error);
      showError('Review Failed', 'Failed to submit review. Please try again.');
    }
  };

  const openReviewModal = (order) => {
    setSelectedOrderForReview(order);
    setReviewData({ rating: 5, comment: '' });
    setShowReviewModal(true);
  };

  const getTrackingStatus = (orderId) => {
    const tracking = orderTracking[orderId] || [];
    if (tracking.length === 0) return null;
    
    const latest = tracking[tracking.length - 1];
    return {
      status: latest.status,
      location: latest.location,
      description: latest.description,
      timestamp: latest.timestamp
    };
  };

  const getLocationIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'confirmed':
        return <FaMapMarkerAlt className="location-icon main-branch" />;
      case 'layout':
      case 'sizing':
      case 'printing':
      case 'press':
      case 'prod':
      case 'packing_completing':
      case 'processing':
        return <FaRoute className="location-icon processing" />;
      case 'shipped':
        return <FaTruck className="location-icon on-the-way" />;
      case 'picked_up_delivered':
      case 'delivered':
        return <FaCheckCircle className="location-icon delivered" />;
      default:
        return <FaMapMarkerAlt className="location-icon" />;
    }
  };

  const getLocationText = (status, location) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'confirmed':
        return 'At Main Branch - Yohanns';
      case 'layout':
        return 'Creating Design Layout';
      case 'sizing':
        return 'Determining Sizes';
      case 'printing':
        return 'Printing in Progress';
      case 'press':
        return 'Heat Press Application';
      case 'prod':
        return 'Final Production Stage';
      case 'packing_completing':
        return 'Packing & Final Checks';
      case 'processing':
        return 'Being Prepared';
      case 'shipped':
        return `On the way to ${location || 'your location'}`;
      case 'picked_up_delivered':
      case 'delivered':
        return 'Delivered Successfully';
      default:
        return 'Status Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="customer-orders-modal-overlay" onClick={onClose}>
      <div className="customer-orders-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="customer-orders-modal-header">
          <div className="customer-orders-header-content">
            <h2 className="customer-orders-modal-title">
              <FaShoppingBag /> My Orders
            </h2>
            {!loading && !error && orders.length > 0 && (
              <div className="customer-orders-count-badge">
                {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
              </div>
            )}
          </div>
          <button className="customer-orders-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="customer-orders-modal-body">
          {loading && <Loading message="Loading your orders..." />}

          {error && (
            <ErrorState message={error} onRetry={loadUserOrders} retryLabel="Try Again" />
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="customer-orders-empty">
              <FaShoppingBag className="empty-icon" />
              <h3>No Orders Yet</h3>
              <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="customer-orders-list">
              {orders.map((order) => (
                <div key={order.id} className="customer-order-card">
                  <div className="customer-order-header" onClick={() => toggleOrderExpansion(order.id)}>
                    <div className="customer-order-info">
                      <div className="customer-order-number">
                        <strong>Order #{order.orderNumber}</strong>
                      </div>
                      <div className="customer-order-date">
                        <FaCalendarAlt /> {formatDate(order.orderDate)}
                      </div>
                      <div className="customer-order-total">
                        Total: ₱{(() => {
                          const calculatedTotal = calculateOrderTotal(order);
                          return calculatedTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                        })()}
                      </div>
                      {order.assignedArtist && (
                        <div className="customer-order-artist">
                          <FaUsers /> Assigned Artist: {order.assignedArtist.artist_name}
                        </div>
                      )}
                    </div>
                    <div className="customer-order-status">
                      <span className={`status-badge ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <div className="status-description">
                        {getStatusDescription(order.status)}
                      </div>
                    </div>
                    <div className="customer-order-toggle">
                      <FaEye className={expandedOrder === order.id ? 'expanded' : ''} />
                    </div>
                  </div>

                  {expandedOrder === order.id && (
                    <div className="customer-order-details">
                      <div className="customer-order-items">
                        <h4>Order Items ({order.totalItems} items)</h4>
                        <div className="items-list">
                          {order.orderItems && order.orderItems.map((item, index) => {
                            // Check if this is a custom design order
                            const isCustomDesign = item.product_type === 'custom_design';
                            // Determine category for hiding fields
                            const categoryLower = (item.category || '').toString().toLowerCase().trim();
                            const isUniformsCategory = categoryLower === 'uniforms';
                            const isHoodieCategory = categoryLower === 'hoodies';
                            const isLongSleevesCategory = categoryLower === 'long sleeves';
                            const isTShirtCategory = categoryLower === 't-shirts' || categoryLower === 't-shirt';
                            const shouldHideJerseyType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                            const shouldHideCutType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                            
                            // Determine product category (balls, trophies, or apparel)
                            const isBall = item.category?.toLowerCase() === 'balls';
                            const isTrophy = item.category?.toLowerCase() === 'trophies';
                            const isApparel = !isBall && !isTrophy && !isCustomDesign; // jerseys, t-shirts, etc.

                            return (
                              <div key={index} className="order-item">
                                {isCustomDesign ? (
                                  <>
                                    <div className="item-info">
                                      {/* Get first design image as product image */}
                                      {(() => {
                                        const designImage = item.design_images && item.design_images.length > 0 
                                          ? item.design_images[0].url 
                                          : null;
                                        const getApparelDisplayName = (apparelType) => {
                                          const apparelTypeMap = {
                                            'basketball_jersey': 'Custom Basketball Jersey',
                                            'volleyball_jersey': 'Custom Volleyball Jersey',
                                            'hoodie': 'Custom Hoodie',
                                            'tshirt': 'Custom T-shirt',
                                            'longsleeves': 'Custom Long Sleeves',
                                            'uniforms': 'Custom Uniforms'
                                          };
                                          return apparelTypeMap[apparelType] || 'Custom Design';
                                        };

                                        return (
                                          <div className="cd-order-item-header">
                                            <div 
                                              className="cd-order-item-image-wrapper"
                                              onClick={() => {
                                                const images = item.design_images || [];
                                                if (images.length > 0) {
                                                  openImageGallery(images, 0);
                                                }
                                              }}
                                              style={{ position: 'relative', cursor: (item.design_images && item.design_images.length > 0) ? 'pointer' : 'default' }}
                                            >
                                              <img 
                                                src={designImage || '/placeholder-image.png'} 
                                                alt={getApparelDisplayName(item.apparel_type)} 
                                                className="cd-order-item-image"
                                                onError={(e) => {
                                                  e.target.src = '/placeholder-image.png';
                                                }}
                                              />
                                              {item.design_images && item.design_images.length > 1 && (
                                                <div className="cd-order-item-image-badge">
                                                  +{item.design_images.length - 1}
                                                </div>
                                              )}
                                            </div>
                                            <div className="cd-order-item-info">
                                              <div className="cd-order-item-name">{getApparelDisplayName(item.apparel_type)}</div>
                                              <div className="cd-order-item-price">₱{(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} × {item.quantity || 1}</div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      
                                      <div className="item-details">
                                        {(() => {
                                          const memberCount = item.team_members?.length || 0;
                                          const isSingleOrder = memberCount <= 1;
                                          
                                          // Calculate member price for single orders (before rendering)
                                          let calculatedMemberPrice = 0;
                                          if (isSingleOrder && item.team_members && item.team_members.length > 0) {
                                            const member = item.team_members[0];
                                            const memberJerseyType = member.jerseyType || 'full';
                                            const memberSizingType = member.sizingType || 'adults';
                                            
                                            // Calculate member price
                                            if (memberSizingType === 'kids') {
                                              if (memberJerseyType === 'full') calculatedMemberPrice = 850;
                                              else if (memberJerseyType === 'shirt') calculatedMemberPrice = 450;
                                              else if (memberJerseyType === 'shorts') calculatedMemberPrice = 400;
                                            } else {
                                              if (memberJerseyType === 'full') calculatedMemberPrice = 950;
                                              else if (memberJerseyType === 'shirt') calculatedMemberPrice = 500;
                                              else if (memberJerseyType === 'shorts') calculatedMemberPrice = 450;
                                            }
                                            
                                            const surchargeSizes = ['2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
                                            const shirtSize = member.size || '';
                                            const shortsSize = member.shortsSize || '';
                                            if (surchargeSizes.includes(shirtSize) || surchargeSizes.includes(shortsSize)) {
                                              calculatedMemberPrice += 50;
                                            }
                                            
                                            const fabricOption = member.fabricOption || '';
                                            if (fabricOption === 'Polytex') calculatedMemberPrice += 50;
                                            
                                            const cutType = member.cutType || '';
                                            if (cutType === 'NBA Cut') calculatedMemberPrice += 100;
                                            
                                            calculatedMemberPrice += 200; // Custom design fee
                                          }
                                          
                                          // Use calculated price if available, otherwise fall back to item.price
                                          const displayPrice = calculatedMemberPrice > 0 ? calculatedMemberPrice : (item.price || 0);
                                          const quantity = item.quantity || memberCount || 1;
                                          const totalPrice = displayPrice * quantity;
                                          
                                          return isSingleOrder ? (
                                            <div className="single-order-details-expanded">
                                              <div className="single-order-header-info">
                                                <span className="header-order-text">Single Order | Qty: {quantity}</span>
                                                <span className="header-price-text">₱{totalPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    </div>
                                              <div className="single-order-details-list">
                                                {item.team_name && (
                                                  <div className="order-detail-row">
                                                    <span className="order-detail-label">Team Name:</span>
                                                    <span className="order-detail-value">{item.team_name}</span>
                                                  </div>
                                                )}
                                                {item.team_members && item.team_members.length > 0 && (() => {
                                                  const member = item.team_members[0];
                                                  const memberJerseyType = member.jerseyType || 'full';
                                                  const memberSizingType = member.sizingType || 'adults';
                                                  
                                                  // Use the pre-calculated price
                                                  const memberPrice = calculatedMemberPrice;
                                                  
                                                  return (
                                                    <>
                                                      {member.surname && (
                                                        <div className="order-detail-row">
                                                          <span className="order-detail-label">Surname:</span>
                                                          <span className="order-detail-value">{member.surname}</span>
                                      </div>
                                                      )}
                                                      {member.number && (
                                                        <div className="order-detail-row">
                                                          <span className="order-detail-label">Jersey #:</span>
                                                          <span className="order-detail-value">{member.number || 'N/A'}</span>
                                            </div>
                                                      )}
                                                      <div className="order-detail-row">
                                                        <span className="order-detail-label">Jersey Type:</span>
                                                        <span className="order-detail-value">
                                                          {memberJerseyType === 'shirt' ? 'Shirt Only' : memberJerseyType === 'shorts' ? 'Shorts Only' : 'Full Set'}
                                                        </span>
                                        </div>
                                                      {(memberJerseyType === 'full' || memberJerseyType === 'shirt') && (
                                                        <div className="order-detail-row">
                                                          <span className="order-detail-label">Jersey Size:</span>
                                                          <span className="order-detail-value">{member.size || 'N/A'}</span>
                                      </div>
                                                      )}
                                                      {(memberJerseyType === 'full' || memberJerseyType === 'shorts') && (
                                                        <div className="order-detail-row">
                                                          <span className="order-detail-label">Shorts Size:</span>
                                                          <span className="order-detail-value">{member.shortsSize || 'N/A'}</span>
                                    </div>
                                                      )}
                                                      {member.fabricOption && (
                                                        <div className="order-detail-row">
                                                          <span className="order-detail-label">Fabric:</span>
                                                          <span className="order-detail-value">{member.fabricOption || 'N/A'}</span>
                                                        </div>
                                                      )}
                                                      {member.cutType && (
                                                        <div className="order-detail-row">
                                                          <span className="order-detail-label">Cut Type:</span>
                                                          <span className="order-detail-value">{member.cutType || 'N/A'}</span>
                                                        </div>
                                                      )}
                                                      {member.sizingType && (
                                                        <div className="order-detail-row">
                                                          <span className="order-detail-label">Type:</span>
                                                          <span className="order-detail-value">{member.sizingType === 'kids' ? 'Kids' : 'Adult'}</span>
                                                        </div>
                                                      )}
                                                      <div className="order-detail-row">
                                                        <span className="order-detail-label">Price:</span>
                                                        <span className="order-detail-value">₱{memberPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                      </div>
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="team-order-details-expanded">
                                              <div className="team-order-header-info">
                                                <FaUsers className="team-order-icon" /> Team Order
                                              </div>
                                          <div className="team-order-teamname-section">
                                            <div className="team-order-teamname-row">
                                              <span className="team-order-teamname-label">Team Name:</span>
                                              <span className="team-order-teamname-value">{item.team_name || 'N/A'}</span>
                                            </div>
                                          </div>
                                          <div className="team-order-members-list">
                                            {(() => {
                                              // Calculate total price by summing all member prices
                                              let totalTeamPrice = 0;
                                              const memberPrices = [];
                                              
                                              if (item.team_members && item.team_members.length > 0) {
                                                item.team_members.forEach((member) => {
                                                  // Calculate member price
                                                  let memberPrice = 0;
                                                  const memberSizingType = member.sizingType || 'adults';
                                                  const memberJerseyType = member.jerseyType || 'full';
                                                  
                                                  // Base price calculation
                                                  if (memberSizingType === 'kids') {
                                                    if (memberJerseyType === 'full') memberPrice = 850;
                                                    else if (memberJerseyType === 'shirt') memberPrice = 450;
                                                    else if (memberJerseyType === 'shorts') memberPrice = 400;
                                                  } else {
                                                    if (memberJerseyType === 'full') memberPrice = 950;
                                                    else if (memberJerseyType === 'shirt') memberPrice = 500;
                                                    else if (memberJerseyType === 'shorts') memberPrice = 450;
                                                  }
                                                  
                                                  // Size surcharge
                                                  const surchargeSizes = ['2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
                                                  const shirtSize = member.size || '';
                                                  const shortsSize = member.shortsSize || '';
                                                  if (surchargeSizes.includes(shirtSize) || surchargeSizes.includes(shortsSize)) {
                                                    memberPrice += 50;
                                                  }
                                                  
                                                  // Fabric surcharge (if applicable)
                                                  const fabricOption = member.fabricOption || '';
                                                  if (fabricOption === 'Polytex') memberPrice += 50;
                                                  
                                                  // Cut type surcharge (if applicable)
                                                  const cutType = member.cutType || '';
                                                  if (cutType === 'NBA Cut') memberPrice += 100;
                                                  
                                                  // Custom design fee
                                                  memberPrice += 200;
                                                  
                                                  memberPrices.push(memberPrice);
                                                  totalTeamPrice += memberPrice;
                                                });
                                              }
                                              
                                              return item.team_members && item.team_members.length > 0 ? (
                                                item.team_members.map((member, memberIndex) => {
                                                  // Use the pre-calculated member price
                                                  const memberPrice = memberPrices[memberIndex] || 0;
                                                  const memberJerseyType = member.jerseyType || 'full';
                                                
                                                return (
                                                  <div key={memberIndex} className="team-member-detail-item">
                                                    <div className="member-detail-row">
                                                      <span className="member-detail-label">Surname:</span>
                                                      <span className="member-detail-value">{member.surname || 'N/A'}</span>
                                              </div>
                                                    <div className="member-detail-row">
                                                      <span className="member-detail-label">Jersey #:</span>
                                                      <span className="member-detail-value">{member.number || 'N/A'}</span>
                                            </div>
                                                    <div className="member-detail-row">
                                                      <span className="member-detail-label">Jersey Type:</span>
                                                      <span className="member-detail-value">
                                                        {memberJerseyType === 'shirt' ? 'Shirt Only' : memberJerseyType === 'shorts' ? 'Shorts Only' : 'Full Set'}
                                                      </span>
                                                    </div>
                                                    {(memberJerseyType === 'full' || memberJerseyType === 'shirt') && (
                                                      <div className="member-detail-row">
                                                        <span className="member-detail-label">Jersey Size:</span>
                                                        <span className="member-detail-value">{member.size || 'N/A'}</span>
                                                      </div>
                                                    )}
                                                    {(memberJerseyType === 'full' || memberJerseyType === 'shorts') && (
                                                      <div className="member-detail-row">
                                                        <span className="member-detail-label">Shorts Size:</span>
                                                        <span className="member-detail-value">{member.shortsSize || 'N/A'}</span>
                                                      </div>
                                                    )}
                                                    {member.fabricOption ? (
                                                      <div className="member-detail-row">
                                                        <span className="member-detail-label">Fabric:</span>
                                                        <span className="member-detail-value">{member.fabricOption || 'N/A'}</span>
                                                      </div>
                                                    ) : null}
                                                    <div className="member-detail-row">
                                                      <span className="member-detail-label">Cut Type:</span>
                                                      <span className="member-detail-value">{member.cutType || 'N/A'}</span>
                                                    </div>
                                                    {member.sizingType ? (
                                                      <div className="member-detail-row">
                                                        <span className="member-detail-label">Type:</span>
                                                        <span className="member-detail-value">{member.sizingType === 'kids' ? 'Kids' : 'Adult'}</span>
                                                      </div>
                                                    ) : null}
                                                    <div className="member-detail-row member-price-row">
                                                      <span className="member-detail-label">Price:</span>
                                                      <span className="member-detail-value member-price-value">₱{memberPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="team-order-no-members">No team members found</div>
                                            );
                                            })()}
                                          </div>
                                          <div className="team-order-quantity-info">
                                            <span className="quantity-text">Quantity: {item.quantity || item.team_members?.length || 0}</span>
                                            <span className="quantity-price">₱{(() => {
                                              // Calculate total by summing all member prices
                                              let calculatedTotal = 0;
                                              if (item.team_members && item.team_members.length > 0) {
                                                item.team_members.forEach((member) => {
                                                  let memberPrice = 0;
                                                  const memberSizingType = member.sizingType || 'adults';
                                                  const memberJerseyType = member.jerseyType || 'full';
                                                  
                                                  if (memberSizingType === 'kids') {
                                                    if (memberJerseyType === 'full') memberPrice = 850;
                                                    else if (memberJerseyType === 'shirt') memberPrice = 450;
                                                    else if (memberJerseyType === 'shorts') memberPrice = 400;
                                                  } else {
                                                    if (memberJerseyType === 'full') memberPrice = 950;
                                                    else if (memberJerseyType === 'shirt') memberPrice = 500;
                                                    else if (memberJerseyType === 'shorts') memberPrice = 450;
                                                  }
                                                  
                                                  const surchargeSizes = ['2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
                                                  const shirtSize = member.size || '';
                                                  const shortsSize = member.shortsSize || '';
                                                  if (surchargeSizes.includes(shirtSize) || surchargeSizes.includes(shortsSize)) {
                                                    memberPrice += 50;
                                                  }
                                                  
                                                  const fabricOption = member.fabricOption || '';
                                                  if (fabricOption === 'Polytex') memberPrice += 50;
                                                  
                                                  const cutType = member.cutType || '';
                                                  if (cutType === 'NBA Cut') memberPrice += 100;
                                                  
                                                  memberPrice += 200;
                                                  calculatedTotal += memberPrice;
                                                });
                                              }
                                              return calculatedTotal > 0 ? calculatedTotal : ((item.price || 0) * (item.quantity || item.team_members?.length || 1));
                                            })().toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                        </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="item-info">
                                      <div className="item-name">{item.name}</div>
                                    
                                      {/* For Apparel (Jerseys, T-shirts, etc.) */}
                                      {isApparel && (
                                        <div className="item-details">
                                          {item.isTeamOrder ? (
                                            <div className="team-order-details-expanded">
                                              <div className="team-order-header-info">
                                                <FaUsers className="team-order-icon" /> Team Order
                                              </div>
                                              <div className="team-order-teamname-section">
                                                <div className="team-order-teamname-row">
                                                  <span className="team-order-teamname-label">Team Name:</span>
                                                  <span className="team-order-teamname-value">{item.teamName || item.team_name || item.teamMembers?.[0]?.teamName || item.teamMembers?.[0]?.team_name || 'N/A'}</span>
                                                </div>
                                              </div>
                                              <div className="team-order-members-list">
                                                {item.teamMembers && item.teamMembers.length > 0 ? (
                                                  item.teamMembers.map((member, memberIndex) => {
                                                    // Calculate member price - prioritize stored totalPrice, then calculate from components
                                                    let memberPrice = 0;
                                                    if (member.totalPrice && member.totalPrice > 0) {
                                                      memberPrice = member.totalPrice;
                                                    } else if (member.basePrice !== undefined || member.fabricSurcharge !== undefined || member.cutTypeSurcharge !== undefined || member.sizeSurcharge !== undefined) {
                                                      memberPrice = (member.basePrice || 0) + (member.fabricSurcharge || 0) + (member.cutTypeSurcharge || 0) + (member.sizeSurcharge || 0);
                                                    } else {
                                                      // Fallback: divide total by number of members
                                                      const perUnitTotal = Number(item.price || 0);
                                                      memberPrice = perUnitTotal / Math.max(1, item.teamMembers?.length || 1);
                                                    }
                                                    
                                                    return (
                                                      <div key={memberIndex} className="team-member-detail-item">
                                                        <div className="member-detail-row">
                                                          <span className="member-detail-label">Surname:</span>
                                                          <span className="member-detail-value">{member.surname || 'N/A'}</span>
                                                        </div>
                                                        <div className="member-detail-row">
                                                          <span className="member-detail-label">Jersey #:</span>
                                                          <span className="member-detail-value">{member.number || member.jerseyNo || member.jerseyNumber || 'N/A'}</span>
                                                        </div>
                                                        <div className="member-detail-row">
                                                          <span className="member-detail-label">Jersey Size:</span>
                                                          <span className="member-detail-value">{member.jerseySize || member.size || 'N/A'}</span>
                                                        </div>
                                                        <div className="member-detail-row">
                                                          <span className="member-detail-label">Shorts Size:</span>
                                                          <span className="member-detail-value">{member.shortsSize || member.size || 'N/A'}</span>
                                                        </div>
                                                        {member.fabricOption || member.fabric_option ? (
                                                          <div className="member-detail-row">
                                                            <span className="member-detail-label">Fabric:</span>
                                                            <span className="member-detail-value">{member.fabricOption || member.fabric_option || 'N/A'}</span>
                                                          </div>
                                                        ) : null}
                                                        <div className="member-detail-row">
                                                          <span className="member-detail-label">Cut Type:</span>
                                                          <span className="member-detail-value">{member.cutType || member.cut_type || 'N/A'}</span>
                                                        </div>
                                                        {member.sizingType || item.sizeType ? (
                                                          <div className="member-detail-row">
                                                            <span className="member-detail-label">Type:</span>
                                                            <span className="member-detail-value">{member.sizingType || item.sizeType || 'Adult'}</span>
                                                          </div>
                                                        ) : null}
                                                        <div className="member-detail-row member-price-row">
                                                          <span className="member-detail-label">Price:</span>
                                                          <span className="member-detail-value member-price-value">₱{memberPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })
                                                ) : (
                                                  <div className="team-order-no-members">No team members found</div>
                                                )}
                                              </div>
                                              <div className="team-order-quantity-info">
                                                <span className="quantity-text">Quantity: {item.quantity}</span>
                                                <span className="quantity-price">₱{(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="single-order-details-expanded">
                                              <div className="single-order-header-info">
                                                <span className="header-order-text">Single Order | Qty: {item.quantity}</span>
                                                <span className="header-price-text">₱{(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                              </div>
                                              <div className="single-order-details-list">
                                                {item.singleOrderDetails?.teamName && (
                                                  <div className="order-detail-row">
                                                    <span className="order-detail-label">Team Name:</span>
                                                    <span className="order-detail-value">{item.singleOrderDetails.teamName}</span>
                                                  </div>
                                                )}
                                                {item.singleOrderDetails?.surname && (
                                                  <div className="order-detail-row">
                                                    <span className="order-detail-label">Surname:</span>
                                                    <span className="order-detail-value">{item.singleOrderDetails.surname}</span>
                                                  </div>
                                                )}
                                                {item.singleOrderDetails?.number && (
                                                  <div className="order-detail-row">
                                                    <span className="order-detail-label">Jersey #:</span>
                                                    <span className="order-detail-value">{item.singleOrderDetails.number || item.singleOrderDetails.jerseyNo || item.singleOrderDetails.jerseyNumber || 'N/A'}</span>
                                                  </div>
                                                )}
                                                {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                                <div className="order-detail-row">
                                                  <span className="order-detail-label">{shouldHideJerseyType ? 'Size' : 'Jersey Size'}:</span>
                                                  <span className="order-detail-value">{item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size || item.size || 'N/A'}</span>
                                                </div>
                                                {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                                {!shouldHideJerseyType && (
                                                  <div className="order-detail-row">
                                                    <span className="order-detail-label">Shorts Size:</span>
                                                    <span className="order-detail-value">{item.singleOrderDetails?.shortsSize || item.singleOrderDetails?.size || item.size || 'N/A'}</span>
                                                  </div>
                                                )}
                                                {(item.fabricOption || item.singleOrderDetails?.fabricOption) && (
                                                  <div className="order-detail-row">
                                                    <span className="order-detail-label">Fabric:</span>
                                                    <span className="order-detail-value">{item.fabricOption || item.singleOrderDetails?.fabricOption || 'N/A'}</span>
                                                  </div>
                                                )}
                                                {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                                {!shouldHideCutType && (
                                                  <div className="order-detail-row">
                                                    <span className="order-detail-label">Cut Type:</span>
                                                    <span className="order-detail-value">{item.cutType || item.singleOrderDetails?.cutType || 'N/A'}</span>
                                                  </div>
                                                )}
                                                {(item.singleOrderDetails?.sizingType || item.sizeType) && (
                                                  <div className="order-detail-row">
                                                    <span className="order-detail-label">Type:</span>
                                                    <span className="order-detail-value">{item.singleOrderDetails?.sizingType || item.sizeType || 'Adult'}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* For Balls */}
                                      {isBall && (
                                        <div className="item-details ball-details">
                                          <div className="detail-badge ball-badge">🏀 Ball</div>
                                          <div className="ball-info-grid">
                                            {item.ballDetails?.sportType && (
                                              <div className="detail-item">
                                                <span className="detail-label">Sport:</span>
                                                <span className="detail-value">{item.ballDetails.sportType}</span>
                                              </div>
                                            )}
                                            {item.ballDetails?.brand && (
                                              <div className="detail-item">
                                                <span className="detail-label">Brand:</span>
                                                <span className="detail-value">{item.ballDetails.brand}</span>
                                              </div>
                                            )}
                                            {item.ballDetails?.ballSize && (
                                              <div className="detail-item">
                                                <span className="detail-label">Size:</span>
                                                <span className="detail-value">{item.ballDetails.ballSize}</span>
                                              </div>
                                            )}
                                            {item.ballDetails?.material && (
                                              <div className="detail-item">
                                                <span className="detail-label">Material:</span>
                                                <span className="detail-value">{item.ballDetails.material}</span>
                                              </div>
                                            )}
                                            <div className="detail-item">
                                              <span className="detail-label">Quantity:</span>
                                              <span className="detail-value">{item.quantity}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* For Trophies */}
                                      {isTrophy && (
                                        <div className="item-details trophy-details">
                                          <div className="detail-badge trophy-badge">🏆 Trophy</div>
                                          <div className="trophy-info-grid">
                                            {item.trophyDetails?.trophyType && (
                                              <div className="detail-item">
                                                <span className="detail-label">Type:</span>
                                                <span className="detail-value">{item.trophyDetails.trophyType}</span>
                                              </div>
                                            )}
                                            {item.trophyDetails?.size && (
                                              <div className="detail-item">
                                                <span className="detail-label">Size:</span>
                                                <span className="detail-value">{item.trophyDetails.size}</span>
                                              </div>
                                            )}
                                            {item.trophyDetails?.material && (
                                              <div className="detail-item">
                                                <span className="detail-label">Material:</span>
                                                <span className="detail-value">{item.trophyDetails.material}</span>
                                              </div>
                                            )}
                                            {item.trophyDetails?.engravingText && (
                                              <div className="detail-item detail-item-full">
                                                <span className="detail-label">Engraving:</span>
                                                <span className="detail-value engraving-text">{item.trophyDetails.engravingText}</span>
                                              </div>
                                            )}
                                            {item.trophyDetails?.occasion && (
                                              <div className="detail-item">
                                                <span className="detail-label">Occasion:</span>
                                                <span className="detail-value">{item.trophyDetails.occasion}</span>
                                              </div>
                                            )}
                                            <div className="detail-item">
                                              <span className="detail-label">Quantity:</span>
                                              <span className="detail-value">{item.quantity}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {!isApparel && (
                                      <div className="item-price">₱{(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Assigned Artist Section */}
                      {order.assignedArtist && order.assignedArtist.artist_name && (
                        <div className="customer-order-artist-section">
                          <h4>Assigned Artist</h4>
                          <div className="artist-info-card">
                            <div className="artist-icon">
                              <FaUsers />
                            </div>
                            <div className="artist-details">
                              <div className="artist-name-label">Artist Name:</div>
                              <div className="artist-name-value">{order.assignedArtist.artist_name}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Order Tracking Section - Only for COD orders */}
                      {order.shippingMethod === 'cod' && (
                        <div className="customer-order-tracking">
                          <h4>Order Tracking</h4>
                          <div className="tracking-info">
                            {(() => {
                              const trackingStatus = getTrackingStatus(order.id);
                              return (
                                <div className="tracking-status">
                                  <div className="tracking-icon">
                                    {getLocationIcon(trackingStatus?.status)}
                                  </div>
                                  <div className="tracking-details">
                                    <div className="tracking-location">
                                      {getLocationText(trackingStatus?.status, trackingStatus?.location)}
                                    </div>
                                    {trackingStatus?.description && (
                                      <div className="tracking-description">
                                        {trackingStatus.description}
                                      </div>
                                    )}
                                    {trackingStatus?.timestamp && (
                                      <div className="tracking-time">
                                        {formatDate(trackingStatus.timestamp)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      <div className="customer-order-shipping">
                        <h4>Shipping Information</h4>
                        <div className="shipping-info">
                          <div className="shipping-method">
                            <FaTruck /> 
                            {order.shippingMethod === 'pickup' ? 'Pickup' : 'Cash on Delivery'}
                            {order.pickupLocation && (
                              <span className="pickup-location">
                                <FaMapMarkerAlt /> {order.pickupLocation}
                              </span>
                            )}
                          </div>
                          {order.deliveryAddress && order.shippingMethod === 'cod' && (
                            <div className="delivery-address">
                              <strong>Delivery Address:</strong>
                              <div>{order.deliveryAddress.fullName}</div>
                              <div>{order.deliveryAddress.phone}</div>
                              <div>
                                {order.deliveryAddress.streetAddress}, {order.deliveryAddress.barangay}
                              </div>
                              <div>
                                {order.deliveryAddress.city}, {order.deliveryAddress.province} {order.deliveryAddress.postalCode}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="customer-order-summary">
                        <h4>Order Summary</h4>
                        {(() => {
                          const calculatedTotal = calculateOrderTotal(order);
                          const shippingCost = parseFloat(order.shippingCost || 0);
                          const calculatedSubtotal = calculatedTotal - shippingCost;
                          
                          return (
                            <>
                        <div className="summary-row">
                          <span>Subtotal:</span>
                                <span>₱{calculatedSubtotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="summary-row">
                          <span>Shipping:</span>
                                <span>₱{shippingCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="summary-row total">
                          <span>Total:</span>
                                <span>₱{calculatedTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                            </>
                          );
                        })()}
                        {order.orderNotes && (
                          <div className="order-notes">
                            <strong>Notes:</strong> {order.orderNotes}
                          </div>
                        )}
                      </div>

                      {/* Simple Review Section - Only for delivered/picked up orders */}
                      {(order.status.toLowerCase() === 'delivered' || order.status.toLowerCase() === 'picked_up_delivered') && (
                        <div className="simple-review-section">
                          <SimpleOrderReview 
                            orderId={order.id}
                            orderNumber={order.orderNumber}
                            onReviewSubmit={(review) => {
                              setOrderReviews(prev => ({
                                ...prev,
                                [order.id]: review
                              }));
                            }}
                          />
                        </div>
                      )}

                       {/* Chat Button - Show only for orders with custom designs AND assigned artist */}
                       {hasCustomDesign(order) && order.assignedArtist && (
                         <div className="customer-order-chat-actions">
                           <button
                             className="customer-chat-with-artist-btn"
                             onClick={() => handleOpenChat(order)}
                             title="Chat with artist about design"
                           >
                             <FaComments />
                             Chat with Artist
                           </button>
                         </div>
                       )}

                       {/* Edit and Delete Buttons - Show for custom design orders */}
                       {hasCustomDesign(order) && (
                         <div className="customer-order-custom-actions">
                           <button
                             className="customer-edit-order-btn"
                             onClick={() => handleEditCustomOrder(order)}
                             title="Edit Custom Order"
                           >
                             <FaEdit />
                             Edit
                           </button>
                           <button
                             className="customer-delete-order-btn"
                             onClick={() => handleDeleteCustomOrder(order)}
                             title="Delete Custom Order"
                             disabled={order.status.toLowerCase() !== 'pending'}
                           >
                             <FaTrash />
                             Delete
                           </button>
                         </div>
                       )}

                      {/* Cancel Button - Only show for pending orders */}
                      {order.status.toLowerCase() === 'pending' && (
                        <div className="order-actions">
                          <button
                            className="cancel-order-btn"
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingOrder === order.id}
                          >
                            <FaBan />
                            {cancellingOrder === order.id ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedOrderForReview && (
        <div className="review-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <h3>Leave a Review</h3>
              <button 
                className="review-modal-close" 
                onClick={() => setShowReviewModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="review-modal-body">
              <div className="review-order-info">
                <h4>Order #{selectedOrderForReview.orderNumber}</h4>
                <p>Total: ₱{(() => {
                  const calculatedTotal = calculateOrderTotal(selectedOrderForReview);
                  return calculatedTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                })()}</p>
              </div>
              
              <div className="review-rating-input">
                <label>Rating:</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <FaStar
                      key={rating}
                      className={rating <= reviewData.rating ? 'star-filled' : 'star-empty'}
                      onClick={() => setReviewData(prev => ({ ...prev, rating }))}
                    />
                  ))}
                </div>
              </div>
              
              <div className="review-comment-input">
                <label>Comment (optional):</label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Tell us about your experience..."
                  rows={4}
                />
              </div>
              
              <div className="review-modal-actions">
                <button 
                  className="cancel-review-btn"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="submit-review-btn"
                  onClick={handleReviewSubmit}
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Reason Dialog */}
      {showCancelReason && (
        <div className="confirmation-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="confirmation-modal cancel-reason-modal">
            <h3>Cancel Order</h3>
            <p>Please select a reason for cancelling:</p>
            
            <div className="cancel-reasons">
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Ordered by mistake"
                  checked={cancelReason === 'Ordered by mistake'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Ordered by mistake</span>
              </label>
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Changed my mind"
                  checked={cancelReason === 'Changed my mind'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Changed my mind</span>
              </label>
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Wrong product or size selected"
                  checked={cancelReason === 'Wrong product or size selected'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Wrong product or size selected</span>
              </label>
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Payment or checkout issue"
                  checked={cancelReason === 'Payment or checkout issue'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Payment or checkout issue</span>
              </label>
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Personal reasons (other)"
                  checked={cancelReason === 'Personal reasons (other)'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Personal reasons (other)</span>
              </label>
            </div>
            
            <div className="confirmation-buttons">
              <button className="confirm-btn submit-cancel-btn" onClick={handleSubmitCancellation}>
                Submit
              </button>
              <button className="confirm-btn back-btn" onClick={handleCloseCancelDialog}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Design Chat Modal */}
      {showChat && selectedOrderForChat && (
        <DesignChat
          orderId={selectedOrderForChat.id}
          isOpen={showChat}
          onClose={handleCloseChat}
        />
      )}

      {/* Image Gallery Modal */}
      {imageGallery.isOpen && imageGallery.images.length > 0 && (
        <div 
          className="cd-image-gallery-overlay"
          onClick={closeImageGallery}
        >
          <div 
            className="cd-image-gallery-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="cd-image-gallery-close"
              onClick={closeImageGallery}
              aria-label="Close gallery"
            >
              <FaTimes />
            </button>

            <button
              className="cd-image-gallery-nav cd-image-gallery-prev"
              onClick={goToPrevImage}
              aria-label="Previous image"
              disabled={imageGallery.images.length <= 1}
            >
              <FaChevronLeft />
            </button>

            <div className="cd-image-gallery-main">
              <img
                src={imageGallery.images[imageGallery.currentIndex].url}
                alt={`Design ${imageGallery.currentIndex + 1}`}
                className="cd-image-gallery-image"
                onError={(e) => {
                  e.target.src = '/placeholder-image.png';
                }}
              />
              <div className="cd-image-gallery-info">
                <span className="cd-image-gallery-counter">
                  {imageGallery.currentIndex + 1} / {imageGallery.images.length}
                </span>
                <button
                  className="cd-image-gallery-download"
                  onClick={() => downloadImage(
                    imageGallery.images[imageGallery.currentIndex].url,
                    imageGallery.images[imageGallery.currentIndex].filename
                  )}
                  aria-label="Download image"
                >
                  <FaDownload />
                </button>
              </div>
            </div>

            <button
              className="cd-image-gallery-nav cd-image-gallery-next"
              onClick={goToNextImage}
              aria-label="Next image"
              disabled={imageGallery.images.length <= 1}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrdersModal;