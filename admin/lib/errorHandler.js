/**
 * Production-ready error handling utilities
 * Prevents crashes and provides graceful error recovery
 */

/**
 * Global error handler for API errors
 */
export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Safe async function wrapper
 * Prevents unhandled promise rejections
 */
export function safeAsync(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('[SafeAsync] Error caught:', error);
      handleError(error);
      throw error;
    }
  };
}

/**
 * Centralized error handler
 */
export function handleError(error, context = '') {
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] Error in ${context || 'App'}:`, {
    message: error.message,
    stack: error.stack,
    status: error.status,
    code: error.code
  });

  // In production, you could send to error tracking service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'exception', {
      description: error.message,
      fatal: false
    });
  }

  return {
    error: true,
    message: getErrorMessage(error)
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  if (error instanceof APIError) {
    switch (error.status) {
      case 400:
        return error.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (error.message === 'Failed to fetch' || error.message === 'Network request failed') {
    return 'Network error. Please check your internet connection.';
  }

  return error.message || 'An unexpected error occurred.';
}

/**
 * Retry failed requests with exponential backoff
 */
export async function retryAsync(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => error.status >= 500
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Debounce function to prevent excessive API calls
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit API call rate
 */
export function throttle(func, limit = 1000) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Safe JSON parse that won't crash
 */
export function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * Safe localStorage access (prevents SSR errors)
 */
export const safeStorage = {
  getItem(key, defaultValue = null) {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      
      // Token is stored as plain string, not JSON - don't parse it
      if (key === 'token') {
        return item;
      }
      
      // Try to parse as JSON, but if it fails and it's a string, return the string
      try {
        return JSON.parse(item);
      } catch (parseError) {
        // If parsing fails, it might be a plain string (like token)
        // Return the original string value
        return item;
      }
    } catch (error) {
      console.error(`localStorage.getItem error for key "${key}":`, error);
      return defaultValue;
    }
  },

  setItem(key, value) {
    try {
      if (typeof window === 'undefined') return false;
      // Token should be stored as plain string, not JSON
      if (key === 'token') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error(`localStorage.setItem error for key "${key}":`, error);
      return false;
    }
  },

  removeItem(key) {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`localStorage.removeItem error for key "${key}":`, error);
      return false;
    }
  },

  clear() {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('localStorage.clear error:', error);
      return false;
    }
  }
};

/**
 * Memory leak prevention - cleanup timers and listeners
 */
export class CleanupManager {
  constructor() {
    this.timers = new Set();
    this.listeners = new Set();
  }

  setTimeout(callback, delay) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  setInterval(callback, delay) {
    const timer = setInterval(callback, delay);
    this.timers.add(timer);
    return timer;
  }

  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this.listeners.add({ element, event, handler, options });
  }

  cleanup() {
    // Clear all timers
    for (const timer of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.clear();

    // Remove all listeners
    for (const { element, event, handler, options } of this.listeners) {
      element.removeEventListener(event, handler, options);
    }
    this.listeners.clear();
  }
}

export default {
  APIError,
  safeAsync,
  handleError,
  getErrorMessage,
  retryAsync,
  debounce,
  throttle,
  safeJSONParse,
  safeStorage,
  CleanupManager
};

