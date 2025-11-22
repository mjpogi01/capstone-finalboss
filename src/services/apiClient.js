import { supabase } from '../lib/supabase';

async function getAccessToken() {
  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Failed to retrieve Supabase session:', error);
      
      // Check if it's a network/connectivity error
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('network') ||
          error.name === 'AuthRetryableFetchError') {
        const networkError = new Error('Network error: Unable to connect to Supabase authentication service. Please check your internet connection.');
        networkError.isNetworkError = true;
        networkError.originalError = error;
        throw networkError;
      }
      
      throw new Error('Unable to retrieve authentication session');
    }

    if (!session?.access_token) {
      const authError = new Error('User not authenticated. Please log in again.');
      authError.isAuthError = true;
      throw authError;
    }

    return session.access_token;
  } catch (error) {
    // Re-throw if it's already a custom error
    if (error.isNetworkError || error.isAuthError) {
      throw error;
    }
    
    // Handle unexpected errors
    console.error('Unexpected error in getAccessToken:', error);
    throw new Error('Authentication error: ' + (error.message || 'Unknown error'));
  }
}

export async function authFetch(url, options = {}) {
  try {
    const token = await getAccessToken();

    const mergedHeaders = {
      ...(options.headers || {}),
      Authorization: options.headers?.Authorization || `Bearer ${token}`
    };

    return fetch(url, {
      ...options,
      headers: mergedHeaders
    });
  } catch (error) {
    // If it's a network error getting the token, create a fetch-like error response
    if (error.isNetworkError) {
      console.error('Network error preventing authentication:', error.message);
      throw error;
    }
    
    // If it's an auth error, throw it as is
    if (error.isAuthError) {
      console.error('Authentication error:', error.message);
      throw error;
    }
    
    // Re-throw other errors
    throw error;
  }
}

export async function authJsonFetch(url, options = {}) {
  try {
    const response = await authFetch(url, options);

    let payload = null;
    try {
      payload = await response.json();
    } catch (err) {
      console.warn('authJsonFetch: response parsing failed, returning empty payload');
    }

    if (!response.ok) {
      // Handle 401 specifically - might mean token expired
      if (response.status === 401) {
        const error = new Error(payload?.error || 'Authentication failed. Please refresh your browser and log in again.');
        error.status = response.status;
        error.payload = payload;
        error.isAuthError = true;
        throw error;
      }
      
      const error = new Error(payload?.error || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  } catch (error) {
    // Re-throw if it's already marked (network or auth error)
    if (error.isNetworkError || error.isAuthError) {
      throw error;
    }
    
    // If it's a fetch error (network issue), mark it
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      error.isNetworkError = true;
      error.message = 'Network error: Unable to connect to server. Please check your internet connection.';
    }
    
    throw error;
  }
}

