import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ArtistProfile.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faEdit, 
  faSave, 
  faTimes,
  faStar,
  faToggleOn,
  faToggleOff
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import artistDashboardService from '../../services/artistDashboardService';
import authService from '../../services/authService';
import ChangePasswordModal from '../customer/ChangePasswordModal';
import ChangeEmailModal from './ChangeEmailModal';
import ConfirmModal from '../shared/ConfirmModal';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import profileImageService from '../../services/profileImageService';

const ArtistProfile = () => {
  const [profile, setProfile] = useState({
    artist_name: '',
    bio: '',
    specialties: [],
    commission_rate: 0,
    rating: 0,
    total_designs: 0,
    total_sales: 0,
    total_tasks_completed: 0,
    is_active: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);
  const { user, refreshUser } = useAuth();
  const { showNotification } = useNotification();

  const fetchArtistProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.warn('No user ID available');
        setProfile({
          artist_name: '',
          bio: '',
          specialties: [],
          commission_rate: 0,
          rating: 0,
          total_designs: 0,
          total_sales: 0,
          total_tasks_completed: 0,
          is_active: true
        });
        return;
      }

      const profileData = await artistDashboardService.getArtistProfile();
      setProfile(profileData);
      
      // Load profile image
      if (user?.user_metadata?.avatar_url) {
        setProfileImage(user.user_metadata.avatar_url);
      } else {
        // Try to get from user_profiles table
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (profileData?.avatar_url) {
          setProfileImage(profileData.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      // Set default values on error
      setProfile({
        artist_name: '',
        bio: '',
        specialties: [],
        commission_rate: 0,
        rating: 0,
        total_designs: 0,
        total_sales: 0,
        total_tasks_completed: 0,
        is_active: true
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchArtistProfile();
  }, [user, fetchArtistProfile]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchArtistProfile(); // Reset to original data
  };

  const handlePasswordChange = async (passwordData) => {
    try {
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      showNotification('Password changed successfully!', 'success');
    } catch (error) {
      console.error('Error changing password:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  const handleEmailChange = async (emailData) => {
    try {
      await authService.changeEmail(
        emailData.newEmail,
        emailData.password
      );
      showNotification('Email change request sent! Please check your new email to confirm.', 'success');
      // Refresh user data to get updated email
      if (user) {
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser) {
          // User data will be updated via auth context
        }
      }
    } catch (error) {
      console.error('Error changing email:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await artistDashboardService.updateArtistProfile(profile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Toggle artist active status - show confirmation modal
  const handleToggleStatus = () => {
    const newStatus = !profile.is_active;
    setPendingStatus(newStatus);
    setIsStatusConfirmOpen(true);
  };

  // Confirm status change
  const handleConfirmStatusChange = async () => {
    setIsStatusConfirmOpen(false);
    const newStatus = pendingStatus;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showNotification('No active session. Please log in again.', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/admin/artists/${user.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Status toggle successful:', result);
        setProfile(prev => ({ ...prev, is_active: newStatus }));
        showNotification(`Your status has been updated to ${newStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        const errorText = await response.text();
        console.error('❌ Status toggle failed:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          showNotification(`Error: ${errorData.error || 'Failed to update status'}`, 'error');
        } catch (parseError) {
          showNotification(`Error: ${response.status} - ${errorText}`, 'error');
        }
      }
    } catch (error) {
      console.error('❌ Error toggling status:', error);
      showNotification(`Error updating status: ${error.message}`, 'error');
    } finally {
      setPendingStatus(null);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file
      profileImageService.validateImageFile(file);
      
      setIsUploading(true);
      
      // Upload file
      const result = await profileImageService.uploadProfileImage(file);
      
      // Update user profile with new image URL
      await profileImageService.updateUserProfileImage(result.imageUrl);
      
      // Update local state
      setProfileImage(result.imageUrl);
      
      // Refresh user data
      await refreshUser();
      
      showNotification('Profile image updated successfully!', 'success');
      
    } catch (error) {
      console.error('Error uploading profile image:', error);
      showNotification(error.message || 'Failed to upload profile image', 'error');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <FontAwesomeIcon key={i} icon={faStar} className="artist-star artist-star-filled" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <FontAwesomeIcon key="half" icon={faStar} className="artist-star artist-star-half" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <FontAwesomeIcon key={`empty-${i}`} icon={faStar} className="artist-star artist-star-empty" />
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="artist-profile-page">
        <div className="artist-profile-container">
          <div className="artist-profile-content">
            <div className="artist-profile-loading">
              <div className="artist-profile-loading-title">Loading profile...</div>
              <div className="artist-profile-loading-text">Please wait while we fetch your information.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-profile-page">
      <div className="artist-profile-container">
        {/* Content */}
        <div className="artist-profile-content">
          {/* Edit Controls - Top Right */}
          <div className="artist-profile-top-controls">
            {!isEditing ? (
              <button className="artist-edit-link" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            ) : (
              <div className="artist-edit-actions">
                <button className="artist-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="artist-cancel-btn" onClick={handleCancel}>Cancel</button>
              </div>
            )}
          </div>

          <div className="artist-personal-info-section">
            {/* Left Column - Profile Picture */}
            <div className="artist-profile-picture-section">
              <div className="artist-profile-picture">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="artist-profile-image"
                  />
                ) : (
                  <div className="artist-profile-avatar">
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                )}
              </div>
              <button 
                className="artist-upload-btn" 
                onClick={handleFileSelect}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Right Column - Personal Information */}
            <div className="artist-personal-info-form">
              <div className="artist-form-header">
                <h3>Personal Information</h3>
              </div>

              <div className="artist-form-fields">
                {/* Artist Name */}
                <div className="artist-form-field">
                  <label>Artist Name :</label>
                  <input
                    type="text"
                    value={profile.artist_name}
                    onChange={(e) => handleInputChange('artist_name', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Your artist name"
                  />
                </div>

                {/* Email */}
                <div className="artist-form-field">
                  <label>Email Address :</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled={true}
                      style={{ cursor: 'not-allowed', opacity: 0.7, flex: 1 }}
                    />
                    {isEditing && (
                      <button 
                        className="artist-change-email-btn"
                        onClick={() => setIsEmailModalOpen(true)}
                      >
                        Change Email
                      </button>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div className="artist-form-field">
                  <label>Password :</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>••••••••••••••••</span>
                    {isEditing && (
                      <button 
                        className="artist-change-password-btn"
                        onClick={() => setIsPasswordModalOpen(true)}
                      >
                        Change Password
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Status */}
                <div className="artist-form-field">
                  <label>Account Status :</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <button
                      onClick={handleToggleStatus}
                      className={`artist-status-toggle-btn ${profile.is_active ? 'active' : 'inactive'}`}
                      title={profile.is_active ? 'Click to set inactive' : 'Click to activate'}
                      aria-label={profile.is_active ? 'Set account inactive' : 'Activate account'}
                    >
                      <FontAwesomeIcon 
                        icon={profile.is_active ? faToggleOn : faToggleOff} 
                        className="toggle-icon"
                      />
                      <span className="toggle-label">
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>
                      {profile.is_active 
                        ? 'You are eligible for task assignments' 
                        : 'You will not receive new task assignments'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onPasswordChange={handlePasswordChange}
      />

      {/* Change Email Modal */}
      <ChangeEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onEmailChange={handleEmailChange}
        currentEmail={user?.email || ''}
      />

      {/* Status Toggle Confirmation Modal */}
      <ConfirmModal
        isOpen={isStatusConfirmOpen}
        onClose={() => {
          setIsStatusConfirmOpen(false);
          setPendingStatus(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={pendingStatus ? 'Activate Account' : 'Set Account Inactive'}
        message={
          pendingStatus
            ? 'Are you sure you want to activate your account? You will be eligible to receive new task assignments from orders.'
            : 'Are you sure you want to set your account to inactive? You will be excluded from receiving new task assignments. Existing tasks will not be affected.'
        }
        confirmText={pendingStatus ? 'Activate' : 'Set Inactive'}
        cancelText="Cancel"
        type={pendingStatus ? 'success' : 'warning'}
      />
    </div>
  );
};

export default ArtistProfile;
