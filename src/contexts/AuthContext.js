import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import authService from '../services/authService';
import { useNotification } from './NotificationContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showLoginSuccess, showLogoutSuccess, showWelcome, showError } = useNotification();
  const isInitialLoadRef = useRef(true);
  const isProcessingSignOutRef = useRef(false);
  const isWindowHiddenRef = useRef(false);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check if email is confirmed
          const isEmailConfirmed = session.user.email_confirmed_at || session.user.confirmed_at;
          
          if (isEmailConfirmed) {
            setUser(session.user);
          } else {
            // Email not confirmed - set flag to prevent cascade and clear user
            console.log('⚠️ User email not confirmed during initial load');
            isProcessingSignOutRef.current = true;
            setUser(null);
            // Don't call signOut() here to prevent cascade - just clear user state
            // The session will expire naturally or be cleared on next auth check
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setUser(null);
      } finally {
        // Mark initial load as complete after a brief delay to let any auth events settle
        setTimeout(() => {
          isInitialLoadRef.current = false;
          setIsLoading(false);
        }, 100);
      }
    };

    getInitialSession();

    // Track window visibility to ignore auth state changes when out of focus
    const handleVisibilityChange = () => {
      isWindowHiddenRef.current = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip processing during initial load to prevent race condition
        if (isInitialLoadRef.current) {
          console.log('🔐 Auth state changed during initial load, skipping:', event);
          return;
        }

        // Ignore auth state changes when window is out of focus (e.g., alt-tab)
        // Only process important events (SIGNED_IN, SIGNED_OUT) when window is hidden
        // This prevents constant state changes when window loses focus
        if (isWindowHiddenRef.current && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
          console.log('🔐 Auth state changed while window hidden, skipping:', event);
          return;
        }

        console.log('🔐 Auth state changed:', event, session?.user?.email, session?.user?.id);
        
        // Helper function to check email confirmation
        const isEmailConfirmed = (user) => {
          return !!(user?.email_confirmed_at || user?.confirmed_at);
        };

        // Handle SIGNED_IN event
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if email is confirmed before allowing authentication
          if (!isEmailConfirmed(session.user)) {
            console.log('⚠️ User signed in but email not confirmed, signing out');
            // Set flag to prevent cascade
            isProcessingSignOutRef.current = true;
            // Sign out immediately if email is not confirmed
            await supabase.auth.signOut();
            setUser(null);
            setIsLoading(false);
            // Reset flag after a delay
            setTimeout(() => {
              isProcessingSignOutRef.current = false;
            }, 500);
            return;
          }
          
          // Check if manual login flag is set (user manually logged in via form or OAuth)
          const manualLogin = localStorage.getItem('manualLogin');
          
          // Only show welcome notifications if it's a manual login
          // Skip if it's initial session restoration or tab switch
          if (manualLogin === 'true') {
            const currentTime = Date.now();
            const userId = session.user.id;
            
            // Track first login time per user (using user ID as key)
            const firstLoginKey = `firstLoginTime_${userId}`;
            const lastLoginKey = `lastLoginTime_${userId}`;
            const firstLoginTime = localStorage.getItem(firstLoginKey);
            
            // Check if this is a new signup flow (suppress welcome notification during signup)
            const isNewSignup = localStorage.getItem('isNewSignup');
            
            // Determine if this is user's first time logging in (ever)
            const isFirstTimeUser = !firstLoginTime;
            
            if (isNewSignup) {
              // Suppress notification during signup flow (user already sees signup success message)
              localStorage.removeItem('isNewSignup');
              // Still set first login time to mark them as returning user for next login
              if (isFirstTimeUser) {
                localStorage.setItem(firstLoginKey, currentTime.toString());
              }
            } else {
              // Manual login (not during signup flow)
              const userName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
              
              if (isFirstTimeUser) {
                // NEW USER: First time logging in - show "Welcome" notification
                showWelcome(userName);
                localStorage.setItem(firstLoginKey, currentTime.toString());
              } else {
                // RETURNING USER: Has logged in before - show "Welcome Back" notification
                showLoginSuccess(userName);
              }
            }
            
            // Update last login time
            localStorage.setItem(lastLoginKey, currentTime.toString());
            
            // Clean up manual login flag
            localStorage.removeItem('manualLogin');
          } else {
            // Not a manual login - just update last login time without showing notification
            const userId = session.user.id;
            const lastLoginKey = `lastLoginTime_${userId}`;
            localStorage.setItem(lastLoginKey, Date.now().toString());
          }
          
          // Set user state (email is already confirmed at this point)
          setUser(session.user);
          setIsLoading(false);
        } 
        // Handle SIGNED_OUT event
        else if (event === 'SIGNED_OUT') {
          // Skip if we're processing a sign-out we initiated (to prevent cascade)
          if (isProcessingSignOutRef.current) {
            console.log('🔐 Sign-out event from our own action, skipping notification');
            setUser(null);
            setIsLoading(false);
            // Reset flag after a delay
            setTimeout(() => {
              isProcessingSignOutRef.current = false;
            }, 500);
            return;
          }
          
          // Check if silent logout flag is set (for terms disagreement)
          // This flag is set when user disagrees with terms during signup
          const silentLogout = localStorage.getItem('silentLogout');
          
          // Check if manual logout flag is set (user clicked logout button)
          const manualLogout = localStorage.getItem('manualLogout');
          
          // Only show logout notification if:
          // 1. It's not a silent logout (terms disagreement)
          // 2. It's a manual logout (user clicked logout button from inside website)
          if (silentLogout !== 'true' && manualLogout === 'true') {
            showLogoutSuccess();
          }
          
          // Clean up flags
          if (silentLogout === 'true') {
            localStorage.removeItem('silentLogout');
          }
          if (manualLogout === 'true') {
            localStorage.removeItem('manualLogout');
          }
          
          // Clear user state
          setUser(null);
          setIsLoading(false);
          // Note: We don't remove lastLoginTime here to track returning users
        }
        // Handle other events (TOKEN_REFRESHED, USER_UPDATED, etc.)
        else if (session?.user) {
          // For other events, only set user if email is confirmed
          if (isEmailConfirmed(session.user)) {
            setUser(session.user);
          } else {
            setUser(null);
          }
          setIsLoading(false);
        } 
        // No session
        else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showLoginSuccess, showLogoutSuccess, showWelcome]);

  const login = async (credentials) => {
    try {
      // Set manual login flag before signing in
      // This ensures we only show welcome notification when user explicitly logs in
      localStorage.setItem('manualLogin', 'true');
      
      const result = await authService.signIn(credentials);
      // User will be set by the auth state listener
      return result;
    } catch (error) {
      // Remove manual login flag if login fails
      localStorage.removeItem('manualLogin');
      showError('Login Failed', error.message || 'Invalid credentials. Please try again.');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const result = await authService.signUp(userData);
      // User will be set by the auth state listener
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Set manual logout flag before signing out
      // This ensures we only show logout notification when user explicitly logs out
      localStorage.setItem('manualLogout', 'true');
      
      await authService.signOut();
      // User will be cleared by the auth state listener
    } catch (error) {
      console.error('Error during logout:', error);
      // Remove manual logout flag if logout fails
      localStorage.removeItem('manualLogout');
      showError('Logout Failed', 'There was an error logging out. Please try again.');
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  // Sign in with Google
  const signInWithProvider = async (provider) => {
    try {
      // Set manual login flag before signing in with provider
      // This ensures we show welcome notification after OAuth redirect
      localStorage.setItem('manualLogin', 'true');
      
      const result = await authService.signInWithProvider(provider);
      // No need to handle user setting, as the redirect happens and onAuthStateChange will manage user after login
      return result;
    } catch (error) {
      // Remove manual login flag if OAuth fails
      localStorage.removeItem('manualLogin');
      showError(`Sign in with ${provider} failed`, error.message);
      throw error;
    }
  };

  // Role-based helper functions
  const isOwner = () => user?.user_metadata?.role === 'owner';
  const isAdmin = () => user?.user_metadata?.role === 'admin';
  const isArtist = () => user?.user_metadata?.role === 'artist';
  const isCustomer = () => user?.user_metadata?.role === 'customer';
  const hasAdminAccess = () => user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'owner';
  const canAccessAdmin = () => hasAdminAccess();

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    isOwner,
    isAdmin,
    isArtist,
    isCustomer,
    hasAdminAccess,
    canAccessAdmin,
    signInWithProvider
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
