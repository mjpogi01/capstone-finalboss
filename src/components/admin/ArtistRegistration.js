import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './ArtistRegistration.css';

const ArtistRegistration = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    artistName: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'artist',
            artist_name: formData.artistName,
            full_name: formData.fullName
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setMessage('Artist account created successfully! Please check your email to confirm your account.');
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          artistName: '',
          fullName: ''
        });
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="artist-registration">
      <div className="artist-registration-container">
        <h2>🎨 Artist Registration</h2>
        <p>Create a new artist account for the design team</p>
        
        <form onSubmit={handleSubmit} className="artist-registration-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="artist@yohanns.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="artistName">Artist Name</label>
            <input
              type="text"
              id="artistName"
              name="artistName"
              value={formData.artistName}
              onChange={handleChange}
              required
              placeholder="Artist 1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Artist One"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="Enter password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm password"
            />
          </div>

          <button 
            type="submit" 
            className="register-btn"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Artist Account'}
          </button>
        </form>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="artist-accounts-info">
          <h3>📋 Quick Setup for 20 Artists</h3>
          <p>Use this form to create accounts for:</p>
          <ul>
            <li>artist1@yohanns.com - Artist 1</li>
            <li>artist2@yohanns.com - Artist 2</li>
            <li>artist3@yohanns.com - Artist 3</li>
            <li>...and so on through artist20@yohanns.com</li>
          </ul>
          <p><strong>Password for all:</strong> Artist123!</p>
        </div>
      </div>
    </div>
  );
};

export default ArtistRegistration;
