import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/api';
import './Unsubscribe.css';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error', 'already-unsubscribed'
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsubscribeEmail = searchParams.get('email');
    
    if (!unsubscribeEmail) {
      setStatus('error');
      setMessage('Email address is required to unsubscribe.');
      return;
    }

    setEmail(unsubscribeEmail);
    handleUnsubscribe(unsubscribeEmail);
  }, [searchParams]);

  const handleUnsubscribe = async (emailToUnsubscribe) => {
    try {
      const response = await fetch(`${API_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(emailToUnsubscribe)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        if (data.alreadyUnsubscribed) {
          setStatus('already-unsubscribed');
          setMessage(data.message || 'This email is not currently subscribed to our newsletter.');
        } else {
          setStatus('success');
          setMessage(data.message || 'You have been successfully unsubscribed from our newsletter.');
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to unsubscribe. Please try again.');
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setStatus('error');
      setMessage('An error occurred while processing your unsubscribe request. Please try again later.');
    }
  };

  const handleResubscribe = () => {
    navigate('/');
  };

  return (
    <div className="unsubscribe-page">
      <div className="unsubscribe-container">
        <div className="unsubscribe-header">
          <h1>🏀 YOHANNS</h1>
          <h2>Newsletter Unsubscribe</h2>
        </div>

        <div className="unsubscribe-content">
          {status === 'loading' && (
            <div className="unsubscribe-loading">
              <div className="spinner"></div>
              <p>Processing your unsubscribe request...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="unsubscribe-success">
              <div className="success-icon">✓</div>
              <h3>Successfully Unsubscribed</h3>
              <div className="confirmation-message">
                <p className="confirmation-main">{message}</p>
                {email && (
                  <p className="email-info">
                    <strong>Email:</strong> {email}
                  </p>
                )}
                <p className="confirmation-detail">
                  You have been successfully removed from our newsletter. You will no longer receive marketing emails from us.
                </p>
              </div>
              <div className="unsubscribe-actions">
                <button onClick={() => navigate('/')} className="btn-primary">
                  Return to Homepage
                </button>
              </div>
            </div>
          )}

          {status === 'already-unsubscribed' && (
            <div className="unsubscribe-already">
              <div className="info-icon">ℹ</div>
              <h3>Already Unsubscribed</h3>
              <p>{message}</p>
              {email && (
                <p className="email-info">
                  <strong>Email:</strong> {email}
                </p>
              )}
              <p className="unsubscribe-note">
                This email address is not currently subscribed to our newsletter.
              </p>
              <div className="unsubscribe-actions">
                <button onClick={() => navigate('/')} className="btn-primary">
                  Return to Homepage
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="unsubscribe-error">
              <div className="error-icon">✗</div>
              <h3>Error</h3>
              <p>{message}</p>
              <div className="unsubscribe-actions">
                <button onClick={() => window.location.reload()} className="btn-primary">
                  Try Again
                </button>
                <button onClick={() => navigate('/')} className="btn-secondary">
                  Return to Homepage
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="unsubscribe-footer">
          <p>If you have any questions, please contact our support team.</p>
          <p>&copy; {new Date().getFullYear()} Yohanns - Premium Sports Apparel</p>
        </div>
      </div>
    </div>
  );
};

export default Unsubscribe;

