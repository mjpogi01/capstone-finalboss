import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have hash parameters in the URL (OAuth callback)
        const hashParams = window.location.hash.substring(1);
        const hasHashParams = hashParams.includes('access_token') || hashParams.includes('error');
        
        if (hasHashParams) {
          // Supabase will automatically extract tokens from hash and set session
          // Wait a moment for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Get the session - Supabase will extract from hash if present
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          // Clean up hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/');
          return;
        }

        if (session?.user) {
          // Clean up hash from URL after successful auth
          window.history.replaceState(null, '', window.location.pathname);
          
          // Redirect based on user role
          const role = session.user.user_metadata?.role || 'customer';
          
          if (role === 'owner') {
            navigate('/owner');
          } else if (role === 'admin') {
            navigate('/admin');
          } else if (role === 'artist') {
            navigate('/artist');
          } else {
            navigate('/');
          }
        } else {
          // No session found, redirect to home
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="spinner" style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p>Completing sign in...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;


