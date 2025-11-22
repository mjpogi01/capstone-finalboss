import React, { useState, useEffect, useCallback } from 'react';
import { FaStar, FaTimes, FaCheck } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import orderTrackingService from '../../services/orderTrackingService';
import './SimpleOrderReview.css';

const SimpleOrderReview = ({ orderId, orderNumber, productId = null, onReviewSubmit }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(true);
  const [validationError, setValidationError] = useState(false);

  // Define checkExistingReview first (before useEffect that calls it)
  const checkExistingReview = useCallback(async () => {
    try {
      setLoadingReview(true);
      const review = await orderTrackingService.getOrderReview(orderId);
      setExistingReview(review);
    } catch (error) {
      console.error('Error checking existing review:', error);
      setExistingReview(null);
    } finally {
      setLoadingReview(false);
    }
  }, [orderId]);

  // Check if user already reviewed this order
  useEffect(() => {
    if (orderId && user) {
      checkExistingReview();
    }
  }, [orderId, user, checkExistingReview]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReview.comment.trim()) {
      showError('Review Error', 'Please enter a comment');
      setValidationError(true);
      setTimeout(() => setValidationError(false), 500);
      // Show additional alert on mobile for better visibility
      if (window.innerWidth <= 768) {
        alert('Please enter a comment for your review');
      }
      return;
    }

    if (!user) {
      showError('Auth Error', 'You must be logged in to submit a review');
      // Show additional alert on mobile for better visibility
      if (window.innerWidth <= 768) {
        alert('You must be logged in to submit a review');
      }
      return;
    }

    setSubmitting(true);
    setValidationError(false);
    
    // Optimistic update: immediately set existing review to disable button
    const optimisticReview = {
      id: `temp-${Date.now()}`,
      orderId,
      userId: user.id,
      rating: newReview.rating,
      comment: newReview.comment,
      reviewType: 'general',
      productId: productId,
      createdAt: new Date().toISOString()
    };
    setExistingReview(optimisticReview);
    setShowReviewPopup(false);
    
    try {
      const response = await fetch('http://localhost:4000/api/order-tracking/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          rating: newReview.rating,
          comment: newReview.comment,
          reviewType: 'general',
          productId: productId // Include product ID for product-specific reviews
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update with actual review from server
        setExistingReview(data.review);
        
        // Reset form
        setNewReview({ rating: 5, comment: '' });
        
        // Show success message
        showSuccess('Review Submitted', 'Thank you for your review!');
        
        // Notify parent component
        if (onReviewSubmit) {
          onReviewSubmit(data.review);
        }
      } else {
        // Revert optimistic update on error
        setExistingReview(null);
        setShowReviewPopup(true);
        showError('Review Error', data.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      // Revert optimistic update on error
      setExistingReview(null);
      setShowReviewPopup(true);
      showError('Review Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`star ${star <= rating ? 'filled' : 'empty'}`}
            onClick={() => interactive && onRatingChange && onRatingChange(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Simple Write Review Button */}
      <div className="sor-simple-review-section">
        {loadingReview ? (
          <button className="sor-write-review-btn" disabled>
            Loading...
          </button>
        ) : existingReview ? (
          <button 
            className="sor-write-review-btn sor-review-already-submitted"
            disabled
            title="You have already reviewed this product"
          >
            <FaCheck className="sor-check-icon" />
            <span>You have already reviewed this product</span>
          </button>
        ) : (
          <button 
            className="sor-write-review-btn"
            onClick={() => setShowReviewPopup(true)}
          >
            <FaStar className="sor-review-icon" />
            Write a Review
          </button>
        )}
      </div>

      {/* Review Popup Modal */}
      {showReviewPopup && (
        <div className="review-popup-overlay" onClick={() => setShowReviewPopup(false)}>
          <div className="review-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="review-popup-header">
              <h3>Write Your Review</h3>
              <button 
                className="close-popup-btn"
                onClick={() => setShowReviewPopup(false)}
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmitReview} className="review-popup-form">
              <div className="form-group">
                <label>Rating</label>
                <div className="rating-input">
                  {renderStars(newReview.rating, true, (rating) => 
                    setNewReview({ ...newReview, rating })
                  )}
                  <span className="rating-text">
                    {newReview.rating === 1 ? 'Poor' : 
                     newReview.rating === 2 ? 'Fair' :
                     newReview.rating === 3 ? 'Good' :
                     newReview.rating === 4 ? 'Very Good' : 'Excellent'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Your Review</label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => {
                    setNewReview({ ...newReview, comment: e.target.value });
                    setValidationError(false);
                  }}
                  placeholder="Share your experience with this order..."
                  className={`review-comment ${validationError ? 'shake-error' : ''}`}
                  rows="4"
                  required
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setShowReviewPopup(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting || !newReview.comment.trim()}
                  className="submit-btn"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SimpleOrderReview;
