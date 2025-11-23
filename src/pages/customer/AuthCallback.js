import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have hash parameters in the URL (OAuth callback)
        const hashParams = window.location.hash.substring(1);
        const hasHashParams = hashParams.includes('access_token') || hashParams.includes('error');
        
        // Check for error in hash params first
        if (hashParams.includes('error=')) {
          const errorParams = new URLSearchParams(hashParams);
          const errorDescription = errorParams.get('error_description') || errorParams.get('error') || 'Authentication failed';
          console.error('OAuth error in callback:', errorDescription);
          setError(errorDescription);
          // Clean up hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => navigate('/'), 3000);
          return;
        }
        
        if (hasHashParams) {
          // Supabase will automatically extract tokens from hash and set session
          // Wait a moment for Supabase to process the hash
          // Increased delay to ensure Supabase has time to process
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Get the session - Supabase will extract from hash if present
        // Try multiple times if needed (with exponential backoff)
        let session = null;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts && !session) {
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Auth callback error:', sessionError);
            setError(sessionError.message || 'Failed to authenticate');
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => navigate('/'), 3000);
            return;
          }
          
          if (currentSession?.user) {
            session = currentSession;
            break;
          }
          
          // Wait before retrying
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 300 * attempts));
          }
        }
        
        if (session?.user) {
          // Clean up hash from URL after successful auth
          window.history.replaceState(null, '', window.location.pathname);
          
          // Wait a moment for AuthContext to process the session
          await new Promise(resolve => setTimeout(resolve, 200));
          
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
          // No session found after retries
          console.error('No session found after OAuth callback');
          setError('Authentication failed. Please try again.');
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        setError(error.message || 'An unexpected error occurred');
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => navigate('/'), 3000);
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
      {error ? (
        <>
          <div style={{ color: '#e74c3c', fontSize: '18px', fontWeight: 'bold' }}>
            ❌ Authentication Error
          </div>
          <p style={{ color: '#7f8c8d', textAlign: 'center', maxWidth: '400px' }}>
            {error}
          </p>
          <p style={{ color: '#95a5a6', fontSize: '14px' }}>
            Redirecting to home page...
          </p>
        </>
      ) : (
        <>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Completing sign in...</p>
        </>
      )}
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


