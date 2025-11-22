import React, { useState } from 'react';
import './AddAccountModal.css';
import { supabase } from '../../lib/supabase';

const AddAccountModal = ({ onClose, onAccountAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    contact_number: '',
    branch_id: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.password || !formData.contact_number) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session');
        return;
      }

      const response = await fetch('http://localhost:4000/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          password: formData.password,
          contact_number: formData.contact_number,
          branch_id: parseInt(formData.branch_id)
        })
      });

      if (response.ok) {
        onAccountAdded();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay add-account-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Account</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Admin Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter admin name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact_number">Contact No. *</label>
            <input
              type="tel"
              id="contact_number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleInputChange}
              placeholder="Enter contact number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="branch_id">Branch ID *</label>
            <select
              id="branch_id"
              name="branch_id"
              value={formData.branch_id}
              onChange={handleInputChange}
              required
            >
              <option value="1">Main Branch</option>
              <option value="2">Mall Branch</option>
              <option value="3">Downtown Branch</option>
              <option value="4">Suburb Branch</option>
              <option value="5">Coastal Branch</option>
              <option value="6">University Branch</option>
              <option value="7">Industrial Branch</option>
              <option value="8">Residential Branch</option>
              <option value="9">Business Branch</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;
