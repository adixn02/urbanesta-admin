import { API_BASE_URL, TOKEN_COOKIE } from '@/lib/config';
import apiCache, { invalidateCache } from '@/lib/apiCache';
import { APIError, handleError, retryAsync, safeStorage } from '@/lib/errorHandler';

// Session flag to prevent multiple simultaneous logout redirects
let isRedirectingToLogin = false;

// Helper function to get token from cookie or localStorage
function getAuthToken() {
  // Try to get token from cookie first (for non-httpOnly cookies)
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === TOKEN_COOKIE && value) {
        return value;
      }
    }
    
    // Fallback to localStorage if cookie not found with safe access
    return safeStorage.getItem('token', null);
  }
  return null;
}

/**
 * Production-ready API fetch with caching, retry, and error handling
 * @param {string} path - API endpoint path
 * @param {object} options - Fetch options
 * @param {object} cacheOptions - Caching options { cache: boolean, maxAge: number, forceRefresh: boolean }
 */
export async function apiFetch(path, options = {}, cacheOptions = {}) {
  // SECURITY: Check authentication BEFORE making any API call
  const token = getAuthToken();
  
  // Allow only public endpoints without token
  const publicEndpoints = [
    '/api/admin/login', 
    '/api/admin/send-otp', 
    '/api/admin/verify-otp',
    '/api/forgot-password',  // Forgot password endpoints (public)
    '/api/2factor',          // 2FA/OTP endpoints (public)
    '/api/auth'              // Auth endpoints (public)
  ];
  const isPublicEndpoint = publicEndpoints.some(endpoint => path.startsWith(endpoint));
  
  if (!token && !isPublicEndpoint) {
    console.warn('🔒 API call blocked: No authentication token found');
    
    // Clear any stale data
    if (typeof window !== 'undefined') {
      safeStorage.removeItem('token');
      safeStorage.removeItem('user');
      
      // Redirect to login if not already there
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        window.location.replace('/?redirect=' + encodeURIComponent(currentPath));
      }
    }
    
    throw new APIError('Authentication required', 401, 'UNAUTHORIZED');
  }
  
  const method = options.method || 'GET';
  const url = `${API_BASE_URL}${path}`;
  
  // Determine if request should be cached
  const shouldCache = cacheOptions.cache !== false && (method === 'GET' || method === 'HEAD');
  
  // Wrapper function for the actual fetch
  const fetchFunction = async () => {
    // Re-get token inside fetchFunction for freshness
    const freshToken = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    // Add Authorization header if token is available
    if (freshToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${freshToken}`;
    }

    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers,
        ...options,
      });

      // Handle authentication errors (401 Unauthorized, 403 Forbidden)
      if (response.status === 401 || response.status === 403) {
        console.log('🔴 Authentication failed - Token expired or invalid');
        
        // Clear cache on auth failure
        apiCache.clear();
        
        // Clear auth state
        if (typeof window !== 'undefined') {
          // Clear auth data
          safeStorage.removeItem('token');
          safeStorage.removeItem('user');
          document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          
          // Check if we should redirect
          const currentPath = window.location.pathname;
          const isAlreadyOnLogin = currentPath === '/';
          
          // Prevent multiple simultaneous redirects
          if (!isAlreadyOnLogin && !isRedirectingToLogin) {
            console.log('🔴 Redirecting to login from:', currentPath);
            isRedirectingToLogin = true;
            
            // Mark in sessionStorage that we're in auth failure state
            sessionStorage.setItem('auth_redirect', Date.now().toString());
            
            // Use setTimeout to avoid any race conditions with React state updates
            setTimeout(() => {
              window.location.href = `/?redirect=${encodeURIComponent(currentPath)}`;
            }, 100);
          } else {
            console.log('🔴 Already on login page or redirecting, not redirecting again');
          }
        }
        
        throw new APIError('Authentication failed. Please log in again.', response.status, 'AUTH_FAILED');
      }

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || 'Request failed';
        } catch {
          errorMessage = await response.text().catch(() => 'Request failed');
        }
        
        throw new APIError(
          errorMessage,
          response.status,
          response.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR'
        );
      }

      return response.json();
    } catch (error) {
      // Log error for debugging
      handleError(error, `API ${method} ${path}`);
      throw error;
    }
  };

  // Use caching for GET requests
  if (shouldCache) {
    return apiCache.fetch(url, fetchFunction, {
      cache: true,
      maxAge: cacheOptions.maxAge || 5 * 60 * 1000, // 5 minutes default
      forceRefresh: cacheOptions.forceRefresh || false
    });
  }

  // For mutations (POST, PUT, DELETE), invalidate related cache and retry on failure
  if (method !== 'GET' && method !== 'HEAD') {
    // Invalidate cache for this resource
    invalidateCache(path);
    
    // Retry on server errors
    return retryAsync(fetchFunction, {
      maxRetries: 2,
      baseDelay: 500,
      shouldRetry: (error) => error.status >= 500
    });
  }

  // Execute fetch without caching
  return fetchFunction();
}


