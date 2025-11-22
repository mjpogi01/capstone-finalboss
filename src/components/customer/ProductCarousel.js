import React, { useState, useEffect } from 'react';
import './ProductCarousel.css';

const ProductCarousel = ({ images, productName, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Combine main image and additional images
  const allImages = React.useMemo(() => {
    const imageArray = [];
    
    // Add main image
    if (images?.main_image) imageArray.push(images.main_image);
    if (images?.image_url) imageArray.push(images.image_url);
    
    // Handle additional_images (could be array or JSON string)
    if (images?.additional_images) {
      let additionalImagesArray = [];
      
      if (Array.isArray(images.additional_images)) {
        additionalImagesArray = images.additional_images;
      } else if (typeof images.additional_images === 'string') {
        try {
          const parsed = JSON.parse(images.additional_images);
          if (Array.isArray(parsed)) {
            additionalImagesArray = parsed;
          }
        } catch (e) {
          // If parsing fails, treat as single image URL
          if (images.additional_images.trim()) {
            additionalImagesArray = [images.additional_images];
          }
        }
      }
      
      // Filter out empty/null values and add to array
      imageArray.push(...additionalImagesArray.filter(img => img && img.trim()));
    }
    
    // Remove duplicates and return
    return [...new Set(imageArray)];
  }, [images]);

  // Auto-advance carousel (pauses on hover)
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    if (allImages.length <= 1 || isHovered) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [allImages.length, isHovered]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  // Touch handlers for mobile swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // If no images, show placeholder
  if (allImages.length === 0) {
    return (
      <div className="product-carousel">
        <div className="product-carousel-image-container">
          <span className="product-placeholder">🏀</span>
        </div>
      </div>
    );
  }

  // If only one image, show it without carousel
  if (allImages.length === 1) {
    return (
      <div className="product-carousel">
        <div className="product-carousel-image-container">
          <img
            src={allImages[0]}
            alt={productName}
            className="product-carousel-image"
            onClick={onImageClick}
            title="Click to zoom"
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="product-carousel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="product-carousel-image-container">
        <img
          src={allImages[currentIndex]}
          alt={`${productName} - Image ${currentIndex + 1}`}
          className="product-carousel-image"
          onClick={onImageClick}
          title="Click to zoom"
        />
      </div>

      {/* Minimalist dots navigation */}
      <div className="product-carousel-dots">
        {allImages.map((_, index) => (
          <button
            key={index}
            className={`product-carousel-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductCarousel;

