import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import './ChangeEmailModal.css';

const ChangeEmailModal = ({ isOpen, onClose, onEmailChange, currentEmail }) => {
  const [formData, setFormData] = useState({
    newEmail: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.newEmail) {
      setError('Please enter a new email address');
      return;
    }

    if (!validateEmail(formData.newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.newEmail === currentEmail) {
      setError('New email must be different from current email');
      return;
    }

    if (!formData.password) {
      setError('Please enter your password to confirm');
      return;
    }

    setIsLoading(true);

    try {
      await onEmailChange({
        newEmail: formData.newEmail,
        password: formData.password
      });
      
      // Reset form
      setFormData({
        newEmail: '',
        password: ''
      });
      
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to change email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      newEmail: '',
      password: ''
    });
    setError('');
    setShowPassword(false);
    onClose();
  };

  return (
    <div className="change-email-modal-overlay" onClick={handleClose}>
      <div className="change-email-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="change-email-modal-header">
          <div className="change-email-modal-title">
            <FontAwesomeIcon icon={faEnvelope} />
            <h2>Change Email Address</h2>
          </div>
          <button className="change-email-modal-close" onClick={handleClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form className="change-email-modal-form" onSubmit={handleSubmit}>
          <div className="change-email-form-group">
            <label htmlFor="current-email">Current Email</label>
            <input
              type="email"
              id="current-email"
              value={currentEmail || ''}
              disabled
              className="change-email-input disabled"
            />
          </div>

          <div className="change-email-form-group">
            <label htmlFor="new-email">New Email Address</label>
            <input
              type="email"
              id="new-email"
              name="newEmail"
              value={formData.newEmail}
              onChange={handleInputChange}
              placeholder="Enter new email address"
              className="change-email-input"
              required
            />
          </div>

          <div className="change-email-form-group">
            <label htmlFor="password">Confirm Password</label>
            <div className="change-email-password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="change-email-input"
                required
              />
              <button
                type="button"
                className="change-email-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="change-email-help-text">
              Enter your password to confirm this change
            </p>
          </div>

          {error && (
            <div className="change-email-error">
              {error}
            </div>
          )}

          <div className="change-email-modal-actions">
            <button
              type="button"
              className="change-email-cancel-btn"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="change-email-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Changing...' : 'Change Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeEmailModal;




