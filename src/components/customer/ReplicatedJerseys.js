import React, { useState, useEffect } from 'react';
import './ReplicatedJerseys.css';
import productService from '../../services/productService';

const ReplicatedJerseys = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchReplicatedJerseys = async () => {
      try {
        setLoading(true);
        const allProducts = await productService.getAllProducts();
        const replicatedProducts = allProducts.filter(product => 
          product.category && product.category.toLowerCase().includes('replicated')
        );
        setProducts(replicatedProducts);
      } catch (error) {
        console.error('Error fetching replicated jerseys:', error);
        // Fallback to static data
        setProducts([
          { id: 1, name: 'PILIPINAS Jersey #1', main_image: null, number: '1', color: 'blue' },
          { id: 2, name: 'PILIPINAS Jersey #34', main_image: null, number: '34', color: 'white' },
          { id: 3, name: 'PILIPINAS Jersey #8', main_image: null, number: '8', color: 'red' },
          { id: 4, name: 'PILIPINAS Jersey #2', main_image: null, number: '2', color: 'blue' },
          { id: 5, name: 'PILIPINAS Jersey #20', main_image: null, number: '20', color: 'blue' },
          { id: 6, name: 'PILIPINAS Jersey #18', main_image: null, number: '18', color: 'white' },
          { id: 7, name: 'PILIPINAS Jersey #11', main_image: null, number: '11', color: 'blue-yellow-red' },
          { id: 8, name: 'PILIPINAS Jersey #9', main_image: null, number: '9', color: 'red' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchReplicatedJerseys();
  }, []);

  const pilipinasJerseys = [
    { number: '1', color: 'blue' },
    { number: '34', color: 'white' },
    { number: '8', color: 'red' },
    { number: '2', color: 'blue' },
    { number: '20', color: 'blue' },
    { number: '18', color: 'white' },
    { number: '11', color: 'blue-yellow-red' },
    { number: '9', color: 'red' }
  ];

  if (loading) {
    return (
      <section className="replicated-jerseys">
        <div className="container">
          <h2 className="section-title">REPLICATED DESIGN JERSEYS</h2>
          <div className="loading-message">Loading jerseys...</div>
        </div>
      </section>
    );
  }

  const allJerseys = products.length > 0 ? products : pilipinasJerseys;
  const displayedJerseys = showAll ? allJerseys : allJerseys.slice(0, 6);

  return (
    <section className="replicated-jerseys">
      <div className="container">
        <h2 className="section-title">REPLICATED DESIGN JERSEYS</h2>
        <div className="jerseys-grid">
          {products.length > 0 ? (
            displayedJerseys.map((product, index) => (
              <div key={product.id || index} className={`jersey-item ${product.color || 'blue'}`}>
                {product.main_image ? (
                  <img 
                    src={product.main_image} 
                    alt={product.name}
                    className="jersey-image"
                  />
                ) : (
                  <>
                    <div className="jersey-number">{product.number || '1'}</div>
                    <div className="jersey-brand">PILIPINAS</div>
                  </>
                )}
              </div>
            ))
          ) : (
            displayedJerseys.map((jersey, index) => (
              <div key={index} className={`jersey-item ${jersey.color}`}>
                <div className="jersey-number">{jersey.number}</div>
                <div className="jersey-brand">PILIPINAS</div>
              </div>
            ))
          )}
        </div>
        
        {/* View More/Show Less Button */}
        {allJerseys.length > 6 && (
          <div className="view-all-section">
            {!showAll ? (
              <button className="view-all-btn" onClick={() => setShowAll(true)}>
                VIEW ALL
              </button>
            ) : (
              <button className="view-all-btn show-less" onClick={() => setShowAll(false)}>
                SHOW LESS
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ReplicatedJerseys; 