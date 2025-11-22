import React, { useState } from 'react';
import './DeleteAccountModal.css';

const DeleteAccountModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  const [confirmationText, setConfirmationText] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmationText.toLowerCase() === 'delete') {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText('');
      onClose();
    }
  };

  const isConfirmDisabled = confirmationText.toLowerCase() !== 'delete' || isDeleting;

  return (
    <div className="delete-account-modal-overlay" onClick={handleClose}>
      <div className="delete-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-account-modal-header">
          <h2>Delete Account</h2>
          {!isDeleting && (
            <button className="delete-account-modal-close" onClick={handleClose}>
              ×
            </button>
          )}
        </div>

        <div className="delete-account-modal-content">
          <div className="delete-account-warning">
            <p className="delete-account-warning-text">
              This will permanently delete your account and all your data. This action cannot be undone.
            </p>
          </div>

          <div className="delete-account-confirmation">
            <label htmlFor="confirmation-input">
              Type <strong>"DELETE"</strong> to confirm:
            </label>
            <input
              id="confirmation-input"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type DELETE to confirm"
              disabled={isDeleting}
              autoFocus
            />
          </div>
        </div>

        <div className="delete-account-modal-actions">
          <button
            className="delete-account-cancel-btn"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="delete-account-confirm-btn"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {isDeleting ? 'Deleting...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
