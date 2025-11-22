import React from 'react';
import './PopularProducts.css';

const PopularProducts = () => {
  const products = [
    {
      name: 'Green-White La Salle Inspired Jersey',
      image: '🟢⚪',
      color: 'green'
    },
    {
      name: 'Blue-White "Wolves" Inspired Jersey',
      image: '🔵⚪',
      color: 'blue'
    },
    {
      name: 'Maroon-Black "Hamble" Jersey Set',
      image: '🟤⚫',
      color: 'maroon'
    }
  ];

  return (
    <div className="popular-products">
      <div className="section-header">
        <h3 className="section-title">Popular Products</h3>
        <button className="filter-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>
      
      <div className="products-list">
        {products.map((product, index) => (
          <div key={index} className="product-item">
            <div className="product-image">
              <span className="product-emoji">{product.image}</span>
            </div>
            <div className="product-info">
              <div className="product-name">{product.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularProducts;
