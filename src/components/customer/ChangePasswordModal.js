import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faTimes } from '@fortawesome/free-solid-svg-icons';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose, onPasswordChange }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePassword = (password) => {
    // Password must be at least 6 characters
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!formData.newPassword) {
      setError('Please enter a new password');
      return;
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.newPassword === formData.currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await onPasswordChange({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    onClose();
  };

  return (
    <div className="change-password-modal-overlay" onClick={handleClose}>
      <div className="change-password-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="change-password-modal-header">
          <h2>Change Password</h2>
          <button className="change-password-close-btn" onClick={handleClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="change-password-form">
          {error && (
            <div className="change-password-error">
              {error}
            </div>
          )}

          {/* Current Password */}
          <div className="change-password-field">
            <label htmlFor="currentPassword">Current Password</label>
            <div className="change-password-input-wrapper">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Enter current password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="change-password-toggle-btn"
                onClick={() => togglePasswordVisibility('current')}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={showPasswords.current ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="change-password-field">
            <label htmlFor="newPassword">New Password</label>
            <div className="change-password-input-wrapper">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="change-password-toggle-btn"
                onClick={() => togglePasswordVisibility('new')}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={showPasswords.new ? faEyeSlash : faEye} />
              </button>
            </div>
            <small className="change-password-hint">
              Password must be at least 6 characters long
            </small>
          </div>

          {/* Confirm Password */}
          <div className="change-password-field">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="change-password-input-wrapper">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="change-password-toggle-btn"
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={showPasswords.confirm ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="change-password-actions">
            <button
              type="button"
              className="change-password-cancel-btn"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="change-password-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;

