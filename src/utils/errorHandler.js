/**
 * Global error handler to suppress known harmless errors from third-party libraries
 * Specifically handles echarts-for-react ResizeObserver cleanup errors
 */

const originalConsoleError = console.error;

// List of error patterns to suppress (harmless errors from third-party libraries)
const SUPPRESSED_ERROR_PATTERNS = [
  /Cannot read properties of undefined \(reading 'disconnect'\)/,
  /ResizeObserver loop limit exceeded/,
  /ResizeObserver loop completed with undelivered notifications/
];

/**
 * Check if an error should be suppressed
 */
const shouldSuppressError = (error) => {
  if (!error) return false;
  
  const errorString = typeof error === 'string' 
    ? error 
    : error.toString?.() || String(error);
  
  return SUPPRESSED_ERROR_PATTERNS.some(pattern => pattern.test(errorString));
};

/**
 * Enhanced console.error that suppresses known harmless errors
 */
console.error = (...args) => {
  // Check if any argument matches suppressed patterns
  const shouldSuppress = args.some(arg => {
    if (typeof arg === 'string') {
      return shouldSuppressError(arg);
    }
    if (arg instanceof Error) {
      return shouldSuppressError(arg.message) || shouldSuppressError(arg.stack);
    }
    return false;
  });

  if (!shouldSuppress) {
    originalConsoleError.apply(console, args);
  } else {
    // Optionally log in debug mode
    if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_ERRORS === 'true') {
      console.debug('Suppressed harmless error:', ...args);
    }
  }
};

/**
 * Global error handler for unhandled errors
 */
if (typeof window !== 'undefined') {
  const originalErrorHandler = window.onerror;
  
  window.onerror = (message, source, lineno, colno, error) => {
    if (shouldSuppressError(message) || shouldSuppressError(error?.message)) {
      // Suppress the error
      return true; // Return true to prevent default error handling
    }
    
    // Call original error handler if it exists
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (shouldSuppressError(error?.message) || shouldSuppressError(String(error))) {
      event.preventDefault(); // Suppress the error
      if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_ERRORS === 'true') {
        console.debug('Suppressed unhandled promise rejection:', error);
      }
    }
  });
}

export default {
  shouldSuppressError,
  SUPPRESSED_ERROR_PATTERNS
};



