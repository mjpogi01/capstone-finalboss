import { supabase } from '../lib/supabase';
import userProfileService from './userProfileService';
import { API_URL } from '../config/api';

class AuthService {
  async signUp(userData) {
    try {
      // Determine redirect URL for email confirmation
      let baseUrl;
      if (typeof window !== 'undefined') {
        const envUrl = process.env.REACT_APP_CLIENT_URL || process.env.REACT_APP_FRONTEND_URL;
        baseUrl = envUrl || window.location.origin;
      } else {
        baseUrl = process.env.REACT_APP_CLIENT_URL || process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
      }
      baseUrl = baseUrl.replace(/\/$/, '');
      
      // Create user account first (but don't auto-confirm email)
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            full_name: userData.fullName,
            phone: userData.phone,
            role: userData.role || 'customer'
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Sign up failed');
      }

      // Store user data temporarily for after verification
      const tempUserData = {
        userId: data.user?.id,
        full_name: userData.fullName,
        phone: userData.phone,
        gender: userData.gender || 'Male',
        date_of_birth: userData.dateOfBirth,
        address: userData.address,
        avatar_url: null
      };

      return {
        user: data.user,
        session: data.session,
        needsVerification: true,
        userData: tempUserData // Store for after verification
      };
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  // Send verification code
  async sendVerificationCode(email, userName = null, userId = null, userData = null) {
    try {
      const response = await fetch(`${API_URL}/api/auth/verification/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userName, userId, userData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  // Verify code
  async verifyCode(email, code) {
    try {
      const response = await fetch(`${API_URL}/api/auth/verification/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  // Complete signup after verification (create profile)
  async completeSignupAfterVerification(userId, userData) {
    try {
      // Create user profile after email verification
      if (userId && userData) {
        try {
          await userProfileService.createUserProfile(userId, {
            full_name: userData.full_name,
            phone: userData.phone,
            gender: userData.gender || 'Male',
            date_of_birth: userData.date_of_birth,
            address: userData.address,
            avatar_url: userData.avatar_url || null
          });
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't throw error here as the user account was created successfully
        }
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to complete signup');
    }
  }

  async signIn(credentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        throw new Error(error.message || 'Sign in failed');
      }

      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      throw new Error(error.message || 'Sign out failed');
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  isAuthenticated() {
    // This method is deprecated - use the auth state listener in AuthContext instead
    return false;
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Change user password
  async changePassword(currentPassword, newPassword) {
    try {
      // First verify the current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update password');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to change password');
    }
  }

  // Change user email
  async changeEmail(newEmail, password) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify password before changing email
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      });

      if (signInError) {
        throw new Error('Password is incorrect');
      }

      // Update email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update email');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to change email');
    }
  }

  // Sign in with OAuth provider (Google)
  async signInWithProvider(provider) {
    try {
      // Determine the redirect URL - prioritize environment variable, then use current origin
      let baseUrl;
      
      if (typeof window !== 'undefined') {
        // Check if we have an environment variable set (for production builds)
        // React apps need REACT_APP_ prefix for environment variables
        const envUrl = process.env.REACT_APP_CLIENT_URL || process.env.REACT_APP_FRONTEND_URL;
        
        if (envUrl) {
          // Use environment variable if set (for production)
          baseUrl = envUrl;
          console.log(`🔗 Using environment URL for OAuth redirect: ${baseUrl}`);
        } else {
          // Fall back to current origin (works in both dev and prod)
          baseUrl = window.location.origin;
          console.log(`🔗 Using current origin for OAuth redirect: ${baseUrl}`);
        }
      } else {
        // Server-side rendering fallback
        baseUrl = process.env.REACT_APP_CLIENT_URL || process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
      }
      
      // Ensure we have a valid URL (remove trailing slash if present)
      baseUrl = baseUrl.replace(/\/$/, '');
      const redirectTo = `${baseUrl}/auth/callback`;
      
      console.log(`🔐 Initiating ${provider} OAuth with redirect to: ${redirectTo}`);
      
      // Supabase automatically handles scopes for OAuth providers
      // No need to manually specify scopes as Supabase adds them automatically
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase(),
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        console.error(`❌ ${provider} OAuth error:`, error);
        throw new Error(error.message || `Sign in with ${provider} failed`);
      }
      return { data };
    } catch (error) {
      console.error(`❌ ${provider} OAuth sign-in failed:`, error);
      throw new Error(error.message || `Sign in with ${provider} failed`);
    }
  }

  // Reset password (forgot password)
  async resetPasswordForEmail(email) {
    try {
      let baseUrl;
      
      if (typeof window !== 'undefined') {
        const envUrl = process.env.REACT_APP_CLIENT_URL || process.env.REACT_APP_FRONTEND_URL;
        baseUrl = envUrl || window.location.origin;
      } else {
        baseUrl = process.env.REACT_APP_CLIENT_URL || process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
      }
      
      baseUrl = baseUrl.replace(/\/$/, '');
      const redirectTo = `${baseUrl}/auth/reset-password`;
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
      });

      if (error) {
        throw new Error(error.message || 'Failed to send password reset email');
      }

      return { success: true, data };
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }
}

export default new AuthService();
