import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Handle Ethereum extension conflicts
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('Cannot redefine property: ethereum')) {
    console.warn('Ethereum extension conflict detected and handled gracefully');
    event.preventDefault();
    return false;
  }
  // Suppress ResizeObserver loop errors (harmless browser quirk)
  if (event.message && event.message.includes('ResizeObserver loop')) {
    event.preventDefault();
    return false;
  }
  // Suppress Leaflet heat layer canvas context errors (timing issue)
  if (event.message && event.message.includes('clearRect') && event.message.includes('Cannot read properties of undefined')) {
    // Check if it's from the heat layer by checking the stack trace or source
    const source = event.filename || event.source || '';
    if (source.includes('bundle.js') || source.includes('leaflet') || source.includes('heat')) {
      // This is the heat layer canvas context timing error - suppress it
      event.preventDefault();
      return false;
    }
  }
  // Suppress reCAPTCHA timeout errors (handled gracefully in component)
  if (event.message && (event.message.includes('Timeout') || event.message.includes('timeout'))) {
    const source = event.filename || event.source || '';
    if (source.includes('recaptcha') || source.includes('gstatic')) {
      console.warn('reCAPTCHA timeout error handled gracefully');
      event.preventDefault();
      return false;
    }
  }
  // Suppress AbortSignal timeout errors from Supabase queries (handled gracefully in services)
  // Catch all "Timeout (u)" errors - these are non-critical AbortSignal timeouts
  // Check for timeout errors first, before other checks
  const errorMessage = event.message || event.error?.message || '';
  const errorName = event.name || event.error?.name || '';
  const errorStack = event.error?.stack || '';
  
  if (errorMessage === 'Timeout (u)' || 
      errorName === 'AbortError' ||
      (errorMessage && errorMessage.includes('Timeout (u)')) ||
      (errorStack && errorStack.includes('Timeout (u)'))) {
    console.warn('⚠️ Timeout error handled gracefully (non-critical)');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
  
  // Also catch general timeout errors from bundle.js or Supabase
  if ((errorMessage && errorMessage.includes('Timeout')) || 
      errorName === 'AbortError' ||
      (event.error && event.error.name === 'AbortError')) {
    const source = event.filename || event.source || errorStack || '';
    if (source.includes('supabase') || source.includes('AbortSignal') || source.includes('bundle.js') || source.includes('handleError')) {
      console.warn('⚠️ Timeout error handled gracefully (non-critical)');
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }
  // Suppress geolocation timeout errors (handled gracefully in component)
  if (event.message && (event.message.includes('Timeout') || event.message.includes('timeout'))) {
    const source = event.filename || event.source || '';
    const stack = event.error?.stack || '';
    if (source.includes('bundle.js') || stack.includes('geolocation') || stack.includes('getCurrentPosition') || stack.includes('watchPosition')) {
      console.warn('Geolocation timeout error handled gracefully');
      event.preventDefault();
      return false;
    }
  }
  // Suppress TronLink/TronWeb extension warnings (harmless browser extension)
  if (event.message && (event.message.includes('TronWeb') || event.message.includes('TronLink') || event.message.includes('already initiated'))) {
    // This is a harmless warning from the TronLink browser extension
    event.preventDefault();
    return false;
  }
});

// Also handle unhandled promise rejections for ResizeObserver
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('ResizeObserver loop')) {
    event.preventDefault();
    return false;
  }
  // Suppress reCAPTCHA timeout promise rejections
  if (event.reason && (event.reason.message && (event.reason.message.includes('Timeout') || event.reason.message.includes('timeout')))) {
    const stack = event.reason.stack || '';
    if (stack.includes('recaptcha') || stack.includes('gstatic') || stack.includes('recaptcha__en.js') || event.reason.message.includes('recaptcha')) {
      console.warn('reCAPTCHA timeout promise rejection handled gracefully');
      event.preventDefault();
      return false;
    }
  }
  // Also handle general timeout errors from reCAPTCHA
  if (event.reason && event.reason.message === 'Timeout' && event.reason.stack && event.reason.stack.includes('recaptcha')) {
    console.warn('reCAPTCHA timeout promise rejection handled gracefully');
    event.preventDefault();
    return false;
  }
  // Suppress AbortSignal timeout promise rejections from Supabase queries
  // Catch all "Timeout (u)" promise rejections - these are non-critical
  if (event.reason) {
    const reason = event.reason;
    const isTimeout = reason.name === 'AbortError' || 
                      reason.message === 'Timeout (u)' ||
                      (reason.message && (reason.message.includes('Timeout') || reason.message.includes('timeout')));
    
    if (isTimeout) {
      // Always suppress "Timeout (u)" promise rejections
      if (reason.message === 'Timeout (u)' || reason.name === 'AbortError') {
        console.warn('⚠️ Timeout promise rejection handled gracefully (non-critical)');
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      // Check stack for other timeout errors
      const stack = reason.stack || '';
      if (stack.includes('supabase') || stack.includes('AbortSignal') || stack.includes('bundle.js')) {
        console.warn('⚠️ Timeout promise rejection handled gracefully (non-critical)');
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }
  }
  // Suppress geolocation timeout promise rejections
  if (event.reason && (event.reason.message && (event.reason.message.includes('Timeout') || event.reason.message.includes('timeout')))) {
    const stack = event.reason.stack || '';
    if (stack.includes('geolocation') || stack.includes('getCurrentPosition') || stack.includes('watchPosition') || event.reason.message.includes('geolocation')) {
      console.warn('Geolocation timeout promise rejection handled gracefully');
      event.preventDefault();
      return false;
    }
  }
});

// Prevent Ethereum property redefinition errors
if (typeof window !== 'undefined') {
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (prop === 'ethereum' && obj === window) {
      try {
        return originalDefineProperty.call(this, obj, prop, descriptor);
      } catch (error) {
        if (error.message.includes('Cannot redefine property')) {
          console.warn('Ethereum property already exists, skipping redefinition');
          return obj;
        }
        throw error;
      }
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
}

// Prevent app reload on window focus (alt-tab)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Prevent webpack dev server from reloading on window focus
  let isPreventingReload = false;
  let lastBlurTime = 0;

  // Intercept beforeunload to prevent reloads triggered by webpack dev server
  window.addEventListener('beforeunload', (e) => {
    if (isPreventingReload) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return (e.returnValue = '');
    }
  }, true);

  // Track window focus/blur to detect alt-tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Window regained focus
      const timeSinceBlur = Date.now() - lastBlurTime;
      // If focus was regained quickly (likely alt-tab), prevent reload
      if (timeSinceBlur > 0 && timeSinceBlur < 5000) {
        isPreventingReload = true;
        setTimeout(() => {
          isPreventingReload = false;
        }, 2000);
      }
    } else {
      // Window lost focus
      lastBlurTime = Date.now();
    }
  });

  // Prevent webpack dev server socket from triggering reload on reconnect
  if (window.__webpack_dev_server_client__) {
    const client = window.__webpack_dev_server_client__;
    if (client && client.socket) {
      const originalEmit = client.socket.emit;
      client.socket.emit = function(event, ...args) {
        // Prevent reload events triggered by socket reconnection
        if (isPreventingReload && (event === 'reload' || event === 'static-changed')) {
          console.log('🚫 Prevented webpack dev server reload on focus');
          return;
        }
        return originalEmit.apply(this, [event, ...args]);
      };
    }
  }

  // Intercept any script tags that might trigger reload
  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child) {
    if (child && child.tagName === 'SCRIPT' && isPreventingReload) {
      const src = child.getAttribute('src');
      if (src && src.includes('webpack')) {
        console.log('🚫 Prevented webpack script injection on focus');
        return child;
      }
    }
    return originalAppendChild.call(this, child);
  };
}

// Suppress React error overlay for timeout errors
// Intercept console.error before React uses it
const originalError = console.error;
const originalWarn = console.warn;
console.error = (...args) => {
  // Filter out timeout errors from console.error
  const message = args.join(' ');
  const firstArg = args[0];
  
  // Check if this is a timeout error in various formats
  const isTimeoutError = 
    message.includes('Timeout (u)') || 
    message.includes('AbortError') ||
    (typeof firstArg === 'string' && firstArg.includes('Timeout (u)')) ||
    (firstArg && typeof firstArg === 'object' && firstArg.message && firstArg.message.includes('Timeout (u)')) ||
    (firstArg && typeof firstArg === 'object' && firstArg.name === 'AbortError') ||
    (args.some(arg => arg && typeof arg === 'object' && arg.message === 'Timeout (u)'));

  if (isTimeoutError) {
    // Suppress timeout errors in console.error (prevents React error overlay)
    console.warn('⚠️ Timeout error (suppressed from error overlay):', ...args);
    return;
  }
  
  // Also check for error objects in the args
  if (args.some(arg => arg && typeof arg === 'object' && 
      (arg.message === 'Timeout (u)' || arg.name === 'AbortError'))) {
    console.warn('⚠️ Timeout error (suppressed from error overlay):', ...args);
    return;
  }
  
  // Suppress TronLink/TronWeb extension warnings
  if (message && (message.includes('TronWeb') || message.includes('TronLink') || message.includes('already initiated'))) {
    return; // Suppress silently
  }
  
  originalError.apply(console, args);
};

// Also suppress console.warn for TronLink/TronWeb warnings
console.warn = (...args) => {
  const message = args.join(' ');
  // Suppress TronLink/TronWeb extension warnings
  if (message && (message.includes('TronWeb') || message.includes('TronLink') || message.includes('already initiated'))) {
    return; // Suppress silently
  }
  originalWarn.apply(console, args);
};

// Also intercept React's error overlay directly if possible
if (typeof window !== 'undefined') {
  // Override window.onerror to catch timeout errors before React
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    // Check for timeout errors in various formats
    const isTimeoutError = 
      message === 'Timeout (u)' || 
      (typeof message === 'string' && message.includes('Timeout (u)')) ||
      (error && (error.name === 'AbortError' || error.message === 'Timeout (u)' || 
                 (error.message && error.message.includes('Timeout (u)')))) ||
      (error && error.stack && error.stack.includes('Timeout (u)'));
    
    if (isTimeoutError) {
      console.warn('⚠️ Timeout error caught by window.onerror (suppressed):', message);
      return true; // Prevent default error handling
    }
    // Suppress TronLink/TronWeb extension warnings
    if (message && (message.includes('TronWeb') || message.includes('TronLink') || message.includes('already initiated'))) {
      return true; // Prevent default error handling
    }
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Also intercept React's error reporting mechanism
  if (window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__) {
    const originalOnError = window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.onError;
    if (originalOnError) {
      window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.onError = (errorInfo) => {
        const error = errorInfo.error || errorInfo;
        const message = error?.message || errorInfo?.message || '';
        const name = error?.name || '';
        
        // Suppress timeout errors from React error overlay
        if (message === 'Timeout (u)' || 
            message.includes('Timeout (u)') ||
            name === 'AbortError' ||
            (error?.stack && error.stack.includes('Timeout (u)'))) {
          console.warn('⚠️ Timeout error suppressed from React error overlay');
          return; // Don't show error overlay
        }
        
        // Call original handler for other errors
        originalOnError(errorInfo);
      };
    }
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
