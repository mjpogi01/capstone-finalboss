import React, { useState, useEffect } from 'react';
import { FaStar, FaUser, FaCalendarAlt, FaComment } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './UniversalOrderReview.css';

const UniversalOrderReview = ({ orderId, orderNumber, productId = null, onReviewSubmit }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    reviewType: 'general'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchReviewStats();
  }, [orderId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/order-tracking/reviews/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/order-tracking/review-stats/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setReviewStats(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReview.comment.trim()) {
      setValidationError(true);
      setTimeout(() => setValidationError(false), 500);
      // Show alert on mobile for better visibility
      if (window.innerWidth <= 768) {
        alert('Please enter a comment for your review');
      }
      return;
    }
    
    if (!user) {
      console.error('User not authenticated');
      if (window.innerWidth <= 768) {
        alert('You must be logged in to submit a review');
      }
      return;
    }

    setSubmitting(true);
    setValidationError(false);
    try {
      const response = await fetch('http://localhost:4000/api/order-tracking/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          userId: user.id, // Use actual user ID from auth context
          rating: newReview.rating,
          comment: newReview.comment,
          reviewType: newReview.reviewType,
          productId: productId // Include product ID for product-specific reviews
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh reviews and stats
        await fetchReviews();
        await fetchReviewStats();
        
        // Reset form
        setNewReview({ rating: 5, comment: '', reviewType: 'general' });
        setShowReviewForm(false);
        
        // Notify parent component
        if (onReviewSubmit) {
          onReviewSubmit(data.review);
        }
      }
    } catch (error) {
      console.error('Error submitting review:', error);
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

  const getReviewTypeLabel = (type) => {
    const types = {
      general: 'General Review',
      delivery: 'Delivery Experience',
      product: 'Product Quality',
      service: 'Customer Service'
    };
    return types[type] || 'Review';
  };

  if (loading) {
    return (
      <div className="universal-review-loading">
        <div className="loading-spinner"></div>
        <p>Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="universal-order-review">
      {/* Review Statistics */}
      {reviewStats && (
        <div className="review-stats">
          <div className="stats-header">
            <h3>Order Reviews</h3>
            <div className="average-rating">
              <span className="rating-number">{reviewStats.averageRating}</span>
              <div className="rating-stars">
                {renderStars(Math.round(parseFloat(reviewStats.averageRating)))}
              </div>
              <span className="total-reviews">({reviewStats.totalReviews} reviews)</span>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="rating-distribution">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviewStats.ratingDistribution[`${rating === 5 ? 'five' : rating === 4 ? 'four' : rating === 3 ? 'three' : rating === 2 ? 'two' : 'one'}Star`];
              const percentage = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
              
              return (
                <div key={rating} className="rating-bar">
                  <span className="rating-label">{rating}★</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Review Button */}
      <div className="add-review-section">
        <button 
          className="add-review-btn"
          onClick={() => setShowReviewForm(!showReviewForm)}
        >
          {showReviewForm ? 'Cancel Review' : 'Write a Review'}
        </button>
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <div className="review-form-container">
          <form onSubmit={handleSubmitReview} className="review-form">
            <h4>Write Your Review</h4>
            
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
              <label>Review Type</label>
              <select 
                value={newReview.reviewType}
                onChange={(e) => setNewReview({ ...newReview, reviewType: e.target.value })}
                className="review-type-select"
              >
                <option value="general">General Review</option>
                <option value="delivery">Delivery Experience</option>
                <option value="product">Product Quality</option>
                <option value="service">Customer Service</option>
              </select>
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
                onClick={() => setShowReviewForm(false)}
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
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        <h4>Customer Reviews</h4>
        
        {reviews.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews yet. Be the first to review this order!</p>
          </div>
        ) : (
          <div className="reviews-container">
            {reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="reviewer-info">
                    <FaUser className="user-icon" />
                    <div className="reviewer-details">
                      <span className="reviewer-name">
                        {review.user_name || review.user_email || 'Anonymous'}
                      </span>
                      <span className="review-type">
                        {getReviewTypeLabel(review.review_type)}
                      </span>
                    </div>
                  </div>
                  <div className="review-meta">
                    <div className="review-rating">
                      {renderStars(review.rating)}
                    </div>
                    <div className="review-date">
                      <FaCalendarAlt className="date-icon" />
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {review.comment && (
                  <div className="review-comment">
                    <FaComment className="comment-icon" />
                    <p>{review.comment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalOrderReview;
