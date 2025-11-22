import React, { useState } from 'react';
import CustomDesignFormModal from './CustomDesignFormModal';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import './CustomDesign.css';

const CustomDesign = () => {
  const [clickedImage, setClickedImage] = useState(null);
  const { isCartOpen } = useCart();
  const { isWishlistOpen } = useWishlist();

  const handleImageClick = (imageType) => {
    setClickedImage(imageType);
    // Reset the clicked state after animation completes
    setTimeout(() => {
      setClickedImage(null);
    }, 600);
  };

  const handleUploadClick = () => {
    setClickedImage('button');
  };

  return (
    <>
    <section className="custom-design" style={{ display: 'none' }}>
      <div className="container" style={{ display: 'none' }}>
        {/* All content hidden */}
      </div>
    </section>
    
    {/* Floating Button - Hidden when cart or wishlist is open */}
    {!isCartOpen && !isWishlistOpen && (
      <button 
        className="custom-design-floating-btn"
        onClick={handleUploadClick}
        title="Upload Your Dream Design"
      >
        UPLOAD YOUR DREAM DESIGN
      </button>
    )}
    
    <CustomDesignFormModal isOpen={!!clickedImage} onClose={() => setClickedImage(null)} />
    </>
  );
};

export default CustomDesign; 