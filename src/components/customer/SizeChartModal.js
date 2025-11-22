import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './SizeChartModal.css';

const numberedCandidates = Array.from({ length: 10 }, (_, i) => `${i + 1}.jpg`);

export default function SizeChartModal({ isOpen, onClose, imageFiles }) {
  const [availableImages, setAvailableImages] = useState([]);
  const [zoomSrc, setZoomSrc] = useState(null);

  const candidates = useMemo(() => {
    if (Array.isArray(imageFiles) && imageFiles.length > 0) {
      return imageFiles;
    }
    return numberedCandidates;
  }, [imageFiles]);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    // Probe candidate images and keep ones that load
    const probes = candidates.map((name) =>
      new Promise((resolve) => {
        const img = new Image();
        const src = `/sizecharts/${name}`;
        img.onload = () => resolve(src);
        img.onerror = () => resolve(null);
        img.src = src;
      })
    );

    Promise.all(probes).then((results) => {
      if (isCancelled) return;
      const valid = results.filter(Boolean);
      setAvailableImages(valid);
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, candidates]);

  if (!isOpen) return null;

  return (
    <div className="sizechart-overlay" onClick={onClose}>
      <div className="sizechart-modal" onClick={(e) => e.stopPropagation()}>
        <button className="sizechart-close" onClick={onClose} aria-label="Close size chart">
          <FaTimes />
        </button>
        <div className="sizechart-header">
          <h2>Size Chart</h2>
        </div>
        <div className="sizechart-content">
          {availableImages.length > 0 ? (
            <div className="sizechart-grid">
              {availableImages.map((src, idx) => (
                <div key={idx} className="sizechart-item">
                  <img
                    src={src}
                    alt={`size-chart-${idx + 1}`}
                    onClick={() => setZoomSrc(src)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="sizechart-empty">
              <p>No size chart images found in /sizecharts.</p>
            </div>
          )}
        </div>
        {zoomSrc && (
          <div className="sizechart-zoom-overlay" onClick={() => setZoomSrc(null)}>
            <div className="sizechart-zoom-container" onClick={(e) => e.stopPropagation()}>
              <img src={zoomSrc} alt="zoomed-size-chart" />
              <button className="sizechart-zoom-close" onClick={() => setZoomSrc(null)} aria-label="Close zoom">×</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


