import React, { useState, useEffect } from 'react';
import { AiOutlineMail } from 'react-icons/ai';
import authService from '../../services/authService';
import './ForgotPasswordModal.css';

const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '' }) => {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setError('');
      setSuccess(false);
    }
  }, [isOpen, initialEmail]);

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
      await authService.resetPasswordForEmail(email);
      setSuccess(true);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="forgot-password-modal-overlay" onClick={handleClose}>
      <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="forgot-password-modal-header">
          <h2>Reset Password</h2>
          {!isLoading && (
            <button className="forgot-password-modal-close" onClick={handleClose}>
              ×
            </button>
          )}
        </div>

        <div className="forgot-password-modal-content">
          {success ? (
            <div className="forgot-password-success">
              <div className="success-icon">✓</div>
              <h3>Check Your Email</h3>
              <p>
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="success-instructions">
                Please check your email inbox and click on the reset link to create a new password.
                If you don't see the email, check your spam folder.
              </p>
              <button
                className="forgot-password-close-btn"
                onClick={handleClose}
                disabled={isLoading}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="forgot-password-description">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="forgot-password-error">
                  <span className="error-icon">⚠</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="forgot-password-form">
                <div className="forgot-password-input-wrapper">
                  <AiOutlineMail className="forgot-password-input-icon" />
                  <input
                    type="email"
                    name="email"
                    className="forgot-password-input"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="forgot-password-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="forgot-password-spinner"></span>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <button
                type="button"
                className="forgot-password-back-btn"
                onClick={handleClose}
                disabled={isLoading}
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

