/**
 * API Configuration
 * 
 * For Desktop/Browser Testing:
 * - Uses localhost:4000 (default)
 * 
 * For Mobile Device Testing:
 * - Set REACT_APP_API_URL=http://192.168.254.100:4000 in .env.local
 * - Or update DEFAULT_API_URL below to your computer's IP
 */

// Your computer's local IP address (for mobile testing)
// Update this to match your computer's IP on your Wi-Fi network
// Find it with: ipconfig (look for IPv4 Address under your Wi-Fi adapter)
const COMPUTER_IP = '172.20.10.3'; // Update this if needed

// Get API URL dynamically - checks window.location at runtime
// This ensures we always use the correct URL based on where the app is running
const getApiUrl = () => {
  // If REACT_APP_API_URL is explicitly set, use it (highest priority)
  if (process.env.REACT_APP_API_URL) {
    console.log('📌 Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Check if we're in a browser environment (always true in React apps)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    
    console.log('🌐 getApiUrl() - hostname:', hostname, 'origin:', origin);
    
    // If we're on localhost, use localhost:4000 for development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('📍 Detected localhost - using http://localhost:4000');
      return 'http://localhost:4000';
    }
    
    // For any other domain (production/deployment), use the same origin
    // The backend API is on the same domain (Render handles routing)
    console.log('📍 Detected production - using origin:', origin);
    return origin;
  }
  
  // Fallback for SSR or edge cases
  console.warn('⚠️ getApiUrl() - window not available, using fallback localhost:4000');
  return 'http://localhost:4000';
};

// Export a function that gets the API URL dynamically (for runtime calls)
export const getAPI_URL = getApiUrl;

// Export API_URL as a constant for backward compatibility
// This is evaluated at module load time in the browser, so window.location is available
export const API_URL = getApiUrl();

// For mobile testing, uncomment this line:
// export const API_URL = `http://${COMPUTER_IP}:4000`;

// Helper to check if running on mobile
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Log the API URL on startup (helpful for debugging)
// Use getAPI_URL() to get the runtime value
const runtimeApiUrl = getAPI_URL();
console.log('🔗 API URL:', runtimeApiUrl);
console.log('📱 Mobile Device:', isMobileDevice());
console.log('🌐 Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');
console.log('🌐 Origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A');

export default API_URL;


































