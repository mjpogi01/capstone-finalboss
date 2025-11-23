import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AiOutlineLock } from 'react-icons/ai';
import { FaCheckCircle } from 'react-icons/fa';
import './ResetPassword.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle Supabase password reset token
    // Supabase adds the recovery token to the URL hash
    const checkRecoverySession = async () => {
      try {
        // Check if we have a recovery token in the URL hash
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.substring(1)); // Remove the #
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        // If we have a recovery token, Supabase needs to process it
        if (accessToken && type === 'recovery') {
          console.log('🔐 Processing password reset token...');
          
          // Supabase will automatically process the recovery token from the hash
          // Wait a moment for Supabase to process it
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get the session after processing the recovery token
          const { data: { session: recoverySession }, error: recoveryError } = await supabase.auth.getSession();
          
          if (recoveryError || !recoverySession) {
            console.error('❌ Recovery session error:', recoveryError);
            setError('Invalid or expired reset link. Please request a new password reset.');
            return;
          }
          
          // Verify this is a recovery session (not a full login)
          // Recovery sessions should have the user but we need to ensure it's only for password reset
          if (recoverySession.user) {
            console.log('✅ Recovery session established for password reset');
            // Clean up the hash from URL for security
            window.history.replaceState(null, '', window.location.pathname);
          }
        } else if (!accessToken) {
          // No token - check if we have a valid session (user might have navigated here directly)
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            // No token and no session - invalid link
            setError('Invalid or expired reset link. Please request a new password reset.');
          }
        }
      } catch (err) {
        console.error('❌ Error checking recovery session:', err);
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    };

    checkRecoverySession();
  }, []);

  const validatePassword = (pwd) => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate passwords
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Verify we have a valid recovery session before updating password
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No valid session found. Please use a valid password reset link.');
      }
      
      // Log the user email for verification (to help debug if wrong account)
      const userEmail = session.user?.email;
      console.log('🔐 Resetting password for user:', userEmail);
      console.log('   User ID:', session.user?.id);
      
      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update password');
      }

      console.log('✅ Password updated successfully for:', userEmail);
      
      // IMPORTANT: Sign out the user after password reset
      // The recovery session should not be used for full authentication
      console.log('🔒 Signing out user after password reset...');
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.warn('⚠️ Error signing out after password reset:', signOutError);
        // Continue anyway - password was reset successfully
      } else {
        console.log('✅ User signed out successfully after password reset');
      }

      setSuccess(true);
      setError('');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-success">
          <FaCheckCircle className="success-icon-large" />
          <h2>Password Reset Successful</h2>
          <p>Your password has been updated successfully.</p>
          <p className="redirect-message">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <h1>Reset Your Password</h1>
          <p>Enter your new password below</p>
        </div>

        {error && (
          <div className="reset-password-error">
            <span className="error-icon">⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="reset-password-input-group">
            <label htmlFor="password">New Password</label>
            <div className="reset-password-input-wrapper">
              <AiOutlineLock className="reset-password-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="reset-password-input"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                className="reset-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁' : '👁'}
              </button>
            </div>
          </div>

          <div className="reset-password-input-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="reset-password-input-wrapper">
              <AiOutlineLock className="reset-password-input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="reset-password-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                className="reset-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="reset-password-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="reset-password-spinner"></span>
                Updating Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="reset-password-footer">
          <button
            type="button"
            className="reset-password-back-link"
            onClick={() => navigate('/')}
            disabled={isLoading}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

