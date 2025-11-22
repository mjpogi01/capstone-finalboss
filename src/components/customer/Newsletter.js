import React, { useState } from 'react';
import './Newsletter.css';
import newsletterService from '../../services/newsletterService';
import { useNotification } from '../../contexts/NotificationContext';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const result = await newsletterService.subscribe(email);
      
      if (result.success) {
        setSuccess(true);
        setError('');
        setEmail('');
        showNotification(result.message || 'Successfully subscribed to our newsletter!', 'success');
      } else {
        throw new Error(result.error || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setError(error.message || 'Failed to subscribe. Please try again.');
      setSuccess(false);
      showNotification(error.message || 'Failed to subscribe. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="newsletter">
      <div className="newsletter-content">
        {/* Left Album Images */}
        <div className="newsletter-album newsletter-album-left">
          <div className="album-image album-top-left">
            <img 
              src="/image_highlights/basketball.png" 
              alt="Basketball Player" 
              className="album-img"
            />
          </div>
          <div className="album-image album-bottom-left">
            <img 
              src="/image_highlights/volleyball.png" 
              alt="Volleyball Player" 
              className="album-img"
            />
          </div>
        </div>

        {/* Newsletter Text & Form */}
        <div className="newsletter-text">
          <h2 className="newsletter-title">LEVEL UP YOUR GAME WITH YOHANN'S</h2>
          <p className="newsletter-subtitle">
            New heat. Fresh fits. More teams on deck. Big drops coming - don't miss out.
          </p>
          <p className="newsletter-description">
            Be the first to know about our latest product drops and exclusive offers.
          </p>

          {error && (
            <div className="newsletter-error">
              ⚠ {error}
            </div>
          )}

          {success && (
            <div className="newsletter-success">
              ✓ Successfully subscribed! Check your email for a welcome message.
            </div>
          )}
          
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Enter Your Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
                setSuccess(false);
              }}
              className="email-input"
              required
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="subscribe-btn"
              disabled={isLoading}
            >
              {isLoading ? 'SUBSCRIBING...' : 'SUBSCRIBE'}
            </button>
          </form>
        </div>

        {/* Right Album Images */}
        <div className="newsletter-album newsletter-album-right">
          <div className="album-image album-top-right">
            <img 
              src="/image_highlights/basketball1.png" 
              alt="Basketball Player 1" 
              className="album-img"
            />
          </div>
          <div className="album-image album-bottom-right">
            <img 
              src="/image_highlights/football.png" 
              alt="Football Player" 
              className="album-img"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter; 