import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import userProfileService from '../../services/userProfileService';
import userService from '../../services/userService';
import orderService from '../../services/orderService';
import authService from '../../services/authService';
import ChangePasswordModal from '../../components/customer/ChangePasswordModal';
import DeleteAccountModal from '../../components/customer/DeleteAccountModal';
import './Profile.css';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAccountSection, setShowDeleteAccountSection] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '*****************'
  });

  // Load user profile data on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        console.log('🔄 Loading user profile...');
        
        // Get user profile from database
        let profileData = null;
        try {
          profileData = await userProfileService.getUserProfile(user.id);
          console.log('✅ Loaded profile data from user_profiles:', profileData);
        } catch (profileError) {
          // Handle timeout and other errors gracefully
          if (profileError.name === 'AbortError' || profileError.message?.includes('timeout')) {
            console.warn('⚠️ Timeout loading profile data (non-critical)');
          } else {
            console.log('No profile data found, will use defaults');
          }
          // profileData will remain null, which is fine
        }
        
        // Try to get the user's saved address from checkout
        let savedAddress = null;
        try {
          savedAddress = await userService.getUserAddress();
          console.log('✅ Successfully loaded saved address from user_addresses:', savedAddress);
        } catch (addressError) {
          // Handle timeout and other errors gracefully
          if (addressError.name === 'AbortError' || addressError.message?.includes('timeout')) {
            console.warn('⚠️ Timeout loading address (non-critical)');
          } else {
            console.log('ℹ️ No saved address found in user_addresses, trying to fetch from recent orders...');
          }
          // savedAddress will remain null, which is fine
        }
        
        // If no saved address found, try to get from most recent order
        let orderAddress = null;
        if (!savedAddress) {
          try {
            const userOrders = await orderService.getUserOrders(user.id, false); // Include cancelled orders too
            if (userOrders && userOrders.length > 0) {
              // Find the most recent order with delivery address
              const recentOrderWithAddress = userOrders.find(order => 
                order.deliveryAddress && (order.deliveryAddress.address || typeof order.deliveryAddress === 'string')
              );
              
              if (recentOrderWithAddress && recentOrderWithAddress.deliveryAddress) {
                let deliveryAddr = recentOrderWithAddress.deliveryAddress;
                
                // Parse if delivery address is a JSON string
                if (typeof deliveryAddr === 'string') {
                  try {
                    deliveryAddr = JSON.parse(deliveryAddr);
                  } catch (e) {
                    // If parsing fails, treat as plain string address
                    orderAddress = {
                      full_name: '',
                      phone: '',
                      address: deliveryAddr
                    };
                    console.log('✅ Successfully loaded address from recent order (string format):', orderAddress);
                  }
                }
                
                // Format address from order (if not already set as string)
                if (!orderAddress) {
                  let formattedAddress = '';
                  if (typeof deliveryAddr === 'string') {
                    formattedAddress = deliveryAddr;
                  } else if (deliveryAddr && typeof deliveryAddr === 'object') {
                    if (deliveryAddr.address) {
                      formattedAddress = deliveryAddr.address;
                    } else {
                      // Build address from components
                      const parts = [
                        deliveryAddr.streetAddress || deliveryAddr.street_address,
                        deliveryAddr.barangay,
                        deliveryAddr.city,
                        deliveryAddr.province,
                        deliveryAddr.postalCode || deliveryAddr.postal_code
                      ].filter(Boolean);
                      formattedAddress = parts.join(', ');
                    }
                    
                    orderAddress = {
                      full_name: deliveryAddr.receiver || deliveryAddr.fullName || deliveryAddr.full_name || '',
                      phone: deliveryAddr.phone || '',
                      address: formattedAddress
                    };
                    console.log('✅ Successfully loaded address from recent order:', orderAddress);
                  }
                }
              }
            }
          } catch (orderError) {
            // Handle timeout and other errors gracefully
            if (orderError.message?.includes('timeout') || orderError.name === 'AbortError') {
              console.warn('⚠️ Timeout fetching orders:', orderError.message);
            } else {
              console.log('ℹ️ Could not fetch address from orders:', orderError.message);
            }
          }
        }
        
        // Determine the best source for each field (note: database uses snake_case)
        // Priority for name/phone: profileData (where profile edits are saved) > savedAddress > orderAddress > user_metadata
        // Priority for address: savedAddress > orderAddress > profileData > user_metadata
        const name = profileData?.full_name || savedAddress?.full_name || orderAddress?.full_name || user.user_metadata?.full_name || '';
        const phone = profileData?.phone || savedAddress?.phone || orderAddress?.phone || user.user_metadata?.phone || '';
        const address = savedAddress?.address || orderAddress?.address || profileData?.address || '';
        
        console.log('📋 Final form data to set:', { name, phone, address });
        
        setFormData({
          name: name,
          email: user.email || '',
          phone: phone,
          address: address,
          password: '*****************'
        });
        
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Don't show error notification for missing checkout data - it's normal for new users
        
        // Fallback to user metadata
        setFormData({
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          address: '',
          password: '*****************'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for phone number field
    if (name === 'phone') {
      // Remove all non-digit characters
      const digitsOnly = value.replace(/\D/g, '');
      
      // Limit to 11 digits maximum
      if (digitsOnly.length <= 11) {
        setFormData(prev => ({
          ...prev,
          [name]: digitsOnly
        }));
        // Clear error if within limit
        setPhoneError('');
      } else {
        // Show error if trying to input more than 11 digits
        setPhoneError('Phone number must contain exactly 11 digits');
      }
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!user) {
      showNotification('Please log in to save your profile', 'error');
      return;
    }

    // Basic validation
    if (!formData.name || !formData.name.trim()) {
      showNotification('Name is required', 'error');
      return;
    }

    if (!formData.email || !formData.email.trim()) {
      showNotification('Email is required', 'error');
      return;
    }

    // Validate phone number: must be exactly 11 digits if provided
    if (formData.phone && formData.phone.trim()) {
      const digitsOnly = formData.phone.replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        showNotification('Phone number must contain exactly 11 digits', 'error');
        setPhoneError('Phone number must contain exactly 11 digits');
        return;
      }
    }

    try {
      setIsLoading(true);
      
      // Prepare profile data for database - handle empty strings properly
      const profileData = {
        full_name: formData.name.trim(),
        phone: formData.phone && formData.phone.trim() ? formData.phone.trim() : null,
        address: formData.address && formData.address.trim() ? formData.address.trim() : null
      };

      console.log('💾 Saving profile data:', profileData);
      console.log('👤 User ID:', user.id);

      // Update user profile in database
      const savedProfile = await userProfileService.upsertUserProfile(user.id, profileData);
      console.log('✅ Profile saved to database:', savedProfile);
      
      // Also update user metadata in Supabase Auth for consistency
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.updateUser({
            data: {
              full_name: profileData.full_name,
              phone: profileData.phone,
              address: profileData.address
            }
          });
          console.log('✅ User metadata updated in Supabase Auth');
        }
      } catch (authError) {
        console.warn('⚠️ Could not update user metadata in Supabase Auth:', authError);
        // Don't fail the whole save if auth update fails
      }
      
      // Clear phone error on success
      setPhoneError('');
      
      // Update form data immediately with saved data to reflect changes
      // This ensures UI updates right away
      setFormData(prev => ({
        ...prev,
        name: profileData.full_name,
        phone: profileData.phone || '',
        address: profileData.address || ''
      }));
      
      console.log('💾 Updated formData with saved profile:', profileData);
      
      // Refresh user data to get latest from database
      await refreshUser();
      
      // Reload profile data from database after a small delay to ensure database has updated
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const updatedProfile = await userProfileService.getUserProfile(user.id).catch(() => null);
        
        if (updatedProfile) {
          // Use data from database - this ensures we have the latest saved data
          console.log('✅ Reloaded profile from database after save:', updatedProfile);
          setFormData(prev => ({
            ...prev,
            name: updatedProfile.full_name || prev.name,
            phone: updatedProfile.phone !== null && updatedProfile.phone !== undefined ? updatedProfile.phone : prev.phone,
            address: updatedProfile.address || prev.address
          }));
        } else {
          // If no profile found in database, keep what we just saved
          console.log('⚠️ Profile not found in database after save, keeping saved data');
        }
      } catch (reloadError) {
        console.warn('⚠️ Could not reload profile data:', reloadError);
        // Keep the data we just saved - it's already in formData
      }
      
      setIsEditing(false);
      showNotification('Profile updated successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save profile. Please try again.';
      if (error.message) {
        if (error.message.includes('permission') || error.message.includes('policy')) {
          errorMessage = 'Permission denied. Please check if the user_profiles table exists and you have access.';
        } else if (error.message.includes('404') || error.message.includes('not found')) {
          errorMessage = 'Profile table not found. Please check your database setup.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsEditing(false);
    setPhoneError(''); // Clear phone error on cancel
    setShowDeleteAccountSection(false); // Hide delete account section when canceling
    
    // Reload original data from database
    if (user) {
      try {
        // Get user profile from database
        let profileData = null;
        try {
          profileData = await userProfileService.getUserProfile(user.id);
        } catch (profileError) {
          console.log('No profile data found, will use defaults');
        }
        
        // Try to get the user's saved address from checkout
        let savedAddress = null;
        try {
          savedAddress = await userService.getUserAddress();
          console.log('✅ Successfully loaded saved address from user_addresses:', savedAddress);
        } catch (addressError) {
          console.log('ℹ️ No saved address found in user_addresses, trying to fetch from recent orders...');
        }
        
        // If no saved address found, try to get from most recent order
        let orderAddress = null;
        if (!savedAddress) {
          try {
            const userOrders = await orderService.getUserOrders(user.id, false); // Include cancelled orders too
            if (userOrders && userOrders.length > 0) {
              // Find the most recent order with delivery address
              const recentOrderWithAddress = userOrders.find(order => 
                order.deliveryAddress && (order.deliveryAddress.address || typeof order.deliveryAddress === 'string')
              );
              
              if (recentOrderWithAddress && recentOrderWithAddress.deliveryAddress) {
                let deliveryAddr = recentOrderWithAddress.deliveryAddress;
                
                // Parse if delivery address is a JSON string
                if (typeof deliveryAddr === 'string') {
                  try {
                    deliveryAddr = JSON.parse(deliveryAddr);
                  } catch (e) {
                    // If parsing fails, treat as plain string address
                    orderAddress = {
                      full_name: '',
                      phone: '',
                      address: deliveryAddr
                    };
                    console.log('✅ Successfully loaded address from recent order (string format):', orderAddress);
                  }
                }
                
                // Format address from order (if not already set as string)
                if (!orderAddress) {
                  let formattedAddress = '';
                  if (typeof deliveryAddr === 'string') {
                    formattedAddress = deliveryAddr;
                  } else if (deliveryAddr && typeof deliveryAddr === 'object') {
                    if (deliveryAddr.address) {
                      formattedAddress = deliveryAddr.address;
                    } else {
                      // Build address from components
                      const parts = [
                        deliveryAddr.streetAddress || deliveryAddr.street_address,
                        deliveryAddr.barangay,
                        deliveryAddr.city,
                        deliveryAddr.province,
                        deliveryAddr.postalCode || deliveryAddr.postal_code
                      ].filter(Boolean);
                      formattedAddress = parts.join(', ');
                    }
                    
                    orderAddress = {
                      full_name: deliveryAddr.receiver || deliveryAddr.fullName || deliveryAddr.full_name || '',
                      phone: deliveryAddr.phone || '',
                      address: formattedAddress
                    };
                    console.log('✅ Successfully loaded address from recent order:', orderAddress);
                  }
                }
              }
            }
          } catch (orderError) {
            // Handle timeout and other errors gracefully
            if (orderError.message?.includes('timeout') || orderError.name === 'AbortError') {
              console.warn('⚠️ Timeout fetching orders:', orderError.message);
            } else {
              console.log('ℹ️ Could not fetch address from orders:', orderError.message);
            }
          }
        }
        
        // Determine the best source for each field (note: database uses snake_case)
        // Priority for name/phone: profileData (where profile edits are saved) > savedAddress > orderAddress > user_metadata
        // Priority for address: savedAddress > orderAddress > profileData > user_metadata
        const name = profileData?.full_name || savedAddress?.full_name || orderAddress?.full_name || user.user_metadata?.full_name || '';
        const phone = profileData?.phone || savedAddress?.phone || orderAddress?.phone || user.user_metadata?.phone || '';
        const address = savedAddress?.address || orderAddress?.address || profileData?.address || '';
        
        setFormData({
          name: name,
          email: user.email || '',
          phone: phone,
          address: address,
          password: '*****************'
        });
        
      } catch (error) {
        console.error('Error reloading profile data:', error);
      }
    }
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

  const handleDeleteAccount = async () => {
    if (!user) {
      showNotification('Please log in to delete your account', 'error');
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete the account
      await userService.deleteAccount();
      
      // Sign out the user
      await authService.signOut();
      
      // Show success message
      showNotification('Account deleted successfully', 'success');
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate('/');
        // Refresh the page to clear all state
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ [Profile] Error deleting account:', error);
      console.error('❌ [Profile] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setIsDeleting(false);
      
      // Show more detailed error message
      let errorMessage = 'Failed to delete account. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="yohanns-profile-page">
        <div className="yohanns-profile-container">
          <div className="yohanns-profile-content">
            <div className="yohanns-profile-loading">
              <div className="yohanns-profile-loading-title">Loading profile...</div>
              <div className="yohanns-profile-loading-text">Please wait while we fetch your information.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="yohanns-profile-page">
      <div className="yohanns-profile-container">
        {/* Content */}
        <div className="yohanns-profile-content">
          {/* Edit Controls - Top Right */}
          <div className="yohanns-profile-top-controls">
            {!isEditing ? (
              <button className="yohanns-edit-link" onClick={() => {
                // Validate existing phone number when entering edit mode
                if (formData.phone) {
                  const digitsOnly = formData.phone.replace(/\D/g, '');
                  if (digitsOnly.length > 11) {
                    setPhoneError('Phone number must contain exactly 11 digits');
                  } else if (digitsOnly.length > 0 && digitsOnly.length !== 11) {
                    setPhoneError('Phone number must contain exactly 11 digits');
                  } else {
                    setPhoneError('');
                  }
                }
                setIsEditing(true);
              }}>
                Edit
              </button>
            ) : (
              <div className="yohanns-edit-actions">
                <button className="yohanns-save-btn" onClick={handleSave}>Save</button>
                <button className="yohanns-cancel-btn" onClick={handleCancel}>Cancel</button>
              </div>
            )}
          </div>

          <div className="yohanns-personal-info-section">
            {/* Left Column - Profile Icon */}
            <div className="yohanns-profile-picture-section">
              <div className="yohanns-profile-picture">
                <div className="yohanns-profile-avatar">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
              {formData.name && (
                <div style={{ 
                  marginTop: '1rem', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  fontWeight: '500',
                  color: '#ffffff'
                }}>
                  {formData.name}
                </div>
              )}
            </div>

            {/* Right Column - Personal Information */}
            <div className="yohanns-personal-info-form">
              <div className="yohanns-form-header">
                <h3>Personal Information</h3>
              </div>

              <div className="yohanns-form-fields">
                {/* Name */}
                <div className="yohanns-form-field">
                  <label>Name :</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Your full name"
                  />
                  {!formData.name && (
                    <small style={{ color: '#ff6b6b', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      📌 Will auto-fill after you place your first order
                    </small>
                  )}
                </div>

                {/* Email */}
                <div className="yohanns-form-field">
                  <label>Email Address :</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={true}
                    style={{ cursor: 'not-allowed', opacity: 0.7 }}
                  />
                  <small style={{ color: '#00bfff', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Email cannot be changed (from your account signup)
                  </small>
                </div>

                {/* Phone */}
                <div className="yohanns-form-field">
                  <label>Phone Number :</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Your contact number (11 digits)"
                    maxLength={11}
                  />
                  {phoneError && (
                    <small style={{ color: '#ff6b6b', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      {phoneError}
                    </small>
                  )}
                  {!formData.phone && !phoneError && (
                    <small style={{ color: '#ff6b6b', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      📌 Will auto-fill after you place your first order
                    </small>
                  )}
                </div>

                {/* Address */}
                <div className="yohanns-form-field">
                  <label>Address :</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Your delivery address"
                  />
                  {!formData.address && (
                    <small style={{ color: '#ff6b6b', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      📌 Will auto-fill after you place your first order
                    </small>
                  )}
                </div>

                {/* Password */}
                <div className="yohanns-form-field">
                  <label>Password :</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
                    <span style={{ color: '#cccccc', fontSize: '14px' }}>••••••••••••••••</span>
                    {isEditing && (
                      <>
                        <button 
                          className="yohanns-change-password-btn"
                          onClick={() => setIsPasswordModalOpen(true)}
                        >
                          Change Password
                        </button>
                        <button 
                          className="yohanns-delete-account-toggle-btn"
                          onClick={() => setShowDeleteAccountSection(!showDeleteAccountSection)}
                        >
                          {showDeleteAccountSection ? 'Hide Delete Account' : 'Delete Account'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Account Section - Only show when editing and button is clicked */}
          {isEditing && showDeleteAccountSection && (
            <div className="yohanns-delete-account-section">
              <div className="yohanns-delete-account-content">
                <p className="yohanns-delete-account-description">
                  This will permanently delete your account and all your data. This action cannot be undone.
                </p>
                <button
                  className="yohanns-delete-account-btn"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onPasswordChange={handlePasswordChange}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Profile;
