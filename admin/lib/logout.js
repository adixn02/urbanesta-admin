import { apiFetch } from './fetcher';
import { API_BASE_URL } from './config';

/**
 * Logout function that calls the API to log the activity
 * and then clears local storage and cookies
 */
export async function logout() {
  // Always clear local storage and cookies first (before API call)
  // This ensures logout works even if API call fails
  try {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      // Clear cookies
      document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      document.cookie = 'urbanesta_2factor_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    }
  } catch (error) {
    console.error('Error clearing storage:', error);
  }

  // Try to call the logout API to log the activity (fire and forget)
  // This will fail silently if user is already logged out or token is invalid
  try {
    const API_PREFIX = API_BASE_URL.endsWith('/api') ? '' : '/api';
    
    // Use fetch directly instead of apiFetch to avoid error logging
    // This prevents console errors when token is expired
    fetch(`${API_BASE_URL}${API_PREFIX}/2factor/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(() => {
      // Silently ignore fetch errors - logout should always succeed
    });
  } catch (error) {
    // Silently ignore - logout should always succeed
  }
}

