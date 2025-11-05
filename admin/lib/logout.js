import { apiFetch } from './fetcher';
import { API_BASE_URL } from './config';

/**
 * Logout function that calls the API to log the activity
 * and then clears local storage and cookies
 */
export async function logout() {
  try {
    // Ensure we call the correct path regardless of whether API_BASE_URL ends with /api
    const API_PREFIX = API_BASE_URL.endsWith('/api') ? '' : '/api';
    
    // Try to call the logout API to log the activity
    // This will fail silently if user is already logged out or token is invalid
    try {
      await apiFetch(`${API_PREFIX}/2factor/logout`, {
        method: 'POST'
      });
    } catch (error) {
      // If API call fails (e.g., token expired), continue with local logout
      console.log('Logout API call failed (user may already be logged out):', error.message);
    }
  } catch (error) {
    console.error('Error during logout API call:', error);
  } finally {
    // Always clear local storage and cookies regardless of API call result
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
  }
}

