import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash, faShoppingCart, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import ProductModal from './ProductModal';
import './WishlistModal.css';

const WishlistModal = () => {
  const { 
    wishlistItems, 
    isWishlistOpen, 
    closeWishlist, 
    removeFromWishlist, 
    reloadWishlist,
    isLoading, 
    error 
  } = useWishlist();
  
  const { addToCart } = useCart();
  const { showSuccess } = useNotification();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Reload wishlist when modal opens
  useEffect(() => {
    if (isWishlistOpen) {
      reloadWishlist();
    }
  }, [isWishlistOpen, reloadWishlist]);

  if (!isWishlistOpen) return null;

  const handleAddToCart = (product) => {
    // Normalize the product data to match ProductModal expectations
    const normalizedProduct = {
      ...product,
      main_image: product.image || product.main_image || '/images/placeholder-jersey.png'
    };
    
    // Open ProductModal for the user to configure product details
    setSelectedProduct(normalizedProduct);
    setIsProductModalOpen(true);
  };

  const handleConfirmAddToCart = async (product, cartOptions) => {
    try {
      // Add to cart with the configured options
      await addToCart(product, cartOptions);
      
      // Close the ProductModal
      setIsProductModalOpen(false);
      setSelectedProduct(null);
      
      showSuccess('Added to Cart', `${product.name} has been added to your cart!`);
      
      // Reload wishlist to show the item has been removed
      setTimeout(() => {
        reloadWishlist();
      }, 500);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await removeFromWishlist(productId);
      reloadWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  return (
    <div className="mywishlist-overlay-clean" onClick={closeWishlist}>
      <div className="mywishlist-container-clean" onClick={(e) => e.stopPropagation()}>
        <div className="mywishlist-header-clean">
          <h2>MY WISHLIST</h2>
          <button className="mywishlist-close-btn-clean" onClick={closeWishlist} title="Close">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="mywishlist-content-clean">
          {isLoading ? (
            <div className="mywishlist-loading-state">
              <div className="mywishlist-loading-spinner"></div>
              <p>Loading your wishlist...</p>
            </div>
          ) : error ? (
            <div className="mywishlist-error-state">
              <p>Error: {error}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          ) : wishlistItems.length === 0 ? (
            <div className="mywishlist-empty-state">
              <FontAwesomeIcon icon={faHeart} className="mywishlist-empty-icon" />
              <h3>Your wishlist is empty</h3>
              <p>Save items you love to your wishlist!</p>
            </div>
          ) : (
            <div className="mywishlist-items-list-clean">
              {wishlistItems.map((item) => (
                <div key={item.id} className="mywishlist-item-box">
                  <div className="mywishlist-product-image-wrapper">
                    <img 
                      src={item.image || '/images/placeholder-jersey.png'} 
                      alt={item.name}
                      onError={(e) => {
                        e.target.src = '/images/placeholder-jersey.png';
                      }}
                    />
                  </div>
                  
                  <div className="mywishlist-product-info-section">
                    <div className="mywishlist-product-header-line">
                      <h3 className="mywishlist-product-name">{item.name}</h3>
                      <button 
                        className="mywishlist-remove-btn-clean"
                        onClick={() => handleRemoveFromWishlist(item.id)}
                        title="Remove from Wishlist"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                    
                    <div className="mywishlist-detail-line">
                      <span className="mywishlist-detail-label">Category:</span>
                      <span className="mywishlist-detail-value">{item.category || 'N/A'}</span>
                    </div>
                    
                    <div className="mywishlist-detail-line">
                      <span className="mywishlist-detail-label">Added:</span>
                      <span className="mywishlist-detail-value">
                        {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="mywishlist-price-display">
                      <span className="mywishlist-item-price">₱{parseFloat(item.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>

                    <button 
                      className="mywishlist-add-to-cart-btn"
                      onClick={() => handleAddToCart(item)}
                      title="Add to Cart"
                    >
                      <FontAwesomeIcon icon={faShoppingCart} />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {wishlistItems.length > 0 && (
          <div className="mywishlist-footer-section">
            <p className="mywishlist-count">
              {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} in wishlist
            </p>
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          product={selectedProduct}
          onConfirm={handleConfirmAddToCart}
        />
      )}
    </div>
  );
};

export default WishlistModal;
