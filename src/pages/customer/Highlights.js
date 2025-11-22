import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Highlight.css';

const Highlights = () => {
  const [showAll, setShowAll] = useState(false);
  const [buyerImages, setBuyerImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // For fade-in
  const [gridConfig, setGridConfig] = useState({ visible: 10, columns: 5 });

  const computeGridConfig = useCallback((width) => {
    if (width >= 1440) return { visible: 10, columns: 5 };
    if (width >= 1200) return { visible: 8, columns: 4 };
    if (width >= 900) return { visible: 6, columns: 3 };
    if (width >= 640) return { visible: 4, columns: 2 };
    return { visible: 4, columns: 2 };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateGrid = () => setGridConfig(computeGridConfig(window.innerWidth));
    updateGrid();
    window.addEventListener('resize', updateGrid);
    return () => window.removeEventListener('resize', updateGrid);
  }, [computeGridConfig]);

  // Scroll reveal observer
  useEffect(() => {
    if (!buyerImages.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll('.reveal:not(.is-visible)');

    if (!elements.length) return;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [buyerImages, showAll]);

  useEffect(() => {
    // Image file list
    const imageFiles = [
      { id: 1, filename: '1.png' },
      { id: 2, filename: '2.png' },
      { id: 3, filename: '3.png' },
      { id: 4, filename: '4.png' },
      { id: 5, filename: '5.png' },
      { id: 6, filename: '6.png' },
      { id: 7, filename: '7.png' },
      { id: 8, filename: '8.png' },
      { id: 9, filename: '9.png' },
      { id: 10, filename: '10.png' },
      { id: 11, filename: '11.png' },
      { id: 12, filename: '12.jpg' },
      { id: 13, filename: '13.jpg' },
      { id: 14, filename: '14.jpg' },
      { id: 15, filename: '15.jpg' },
      { id: 16, filename: '16.jpg' },
      { id: 17, filename: '17.jpg' },
      { id: 18, filename: '18.jpg' },
      { id: 19, filename: '19.jpg' },
      { id: 20, filename: '20.jpg' },
      { id: 21, filename: '21.jpg' },
      { id: 22, filename: '22.jpg' },
      { id: 23, filename: '23.jpg' },
      { id: 24, filename: 'image.png' }
    ];

    const images = imageFiles.map((file) => ({
      id: file.id,
      image: `/image_highlights/${file.filename}`,
      alt: `Highlight ${file.id}`, // Better alt text
    }));

    setBuyerImages(images);
    setIsLoaded(true); // Trigger fade-in
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedImageIndex(null);
  }, []);

  const showPrev = useCallback(() => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : buyerImages.length - 1
    );
  }, [buyerImages.length]);

  const showNext = useCallback(() => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex < buyerImages.length - 1 ? prevIndex + 1 : 0
    );
  }, [buyerImages.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isModalOpen) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal, showPrev, showNext]);

  const visibleImages = useMemo(() => {
    if (showAll) return buyerImages;
    return buyerImages.slice(0, gridConfig.visible);
  }, [buyerImages, showAll, gridConfig.visible]);

  const handleImageClick = useCallback((index) => {
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  }, []);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) closeModal();
  }, [closeModal]);

  return (
    <div className={`highlights ${isLoaded ? 'fade-in' : ''}`}>
      <div className="container">
        {/* Title Section */}
        <div className="title-section">
          <h1 className="page-title reveal">Highlights</h1>
          <p className="reveal reveal-delay-1">Discover our featured products and latest collections</p>
        </div>

        {/* Buyers Album Section */}
        <div className="buyers-album">
          <div
            className="buyers-grid"
            role="grid"
            aria-label="Image gallery"
            style={{ gridTemplateColumns: `repeat(${gridConfig.columns}, minmax(0, 1fr))` }}
          >
            {visibleImages.map((item, index) => (
              <div
                key={item.id}
                className={`buyer-item reveal reveal-delay-${(index % 5) + 1}`}
                onClick={() => handleImageClick(index)}
                role="button"
                tabIndex={0}
                aria-label={`View ${item.alt}`}
                onKeyDown={(e) => e.key === 'Enter' && handleImageClick(index)}
              >
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  onError={(e) => { e.target.src = '/fallback-image.png'; }}
                />
              </div>
            ))}
          </div>

          <div className="button-container">
            {!showAll ? (
              <button className="view-more reveal reveal-delay-1" onClick={() => setShowAll(true)} aria-expanded={showAll}>
                View More
              </button>
            ) : (
              <button className="show-less reveal reveal-delay-1" onClick={() => setShowAll(false)} aria-expanded={showAll}>
                Show Less
              </button>
            )}
          </div>
        </div>

        {/* Call to Action */}
        <div className="cta-section">
          <h2 className="reveal">Explore Our Collection</h2>
          <p className="reveal reveal-delay-1">Visit our branches to see our full range of products</p>
          <a href="/branches" className="cta-button reveal reveal-delay-2" aria-label="Find our branches">
            Find Our Branches
          </a>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedImageIndex !== null && (
        <div
          className="image-modal"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-image"
          aria-describedby="modal-caption"
        >
          <div className="modal-content">
            <button
              className="close-button"
              onClick={closeModal}
              aria-label="Close modal"
            >
              &times;
            </button>

            <button
              className="nav-button prev"
              onClick={showPrev}
              aria-label="Previous image"
            >
              &#10094;
            </button>

            <img
              id="modal-image"
              src={buyerImages[selectedImageIndex].image}
              alt={buyerImages[selectedImageIndex].alt}
              className="modal-image"
              onError={(e) => { e.target.src = '/fallback-image.png'; }}
            />

            <button
              className="nav-button next"
              onClick={showNext}
              aria-label="Next image"
            >
              &#10095;
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default Highlights;