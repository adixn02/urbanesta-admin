import { API_BASE_URL, TOKEN_COOKIE } from '@/lib/config';

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
    
    // Fallback to localStorage if cookie not found
    try {
      const token = localStorage.getItem('token');
      if (token) {
        return token;
      }
    } catch (e) {
      // localStorage might not be available in some contexts
    }
  }
  return null;
}

export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  // Add Authorization header if token is available
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Request failed');
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return response.json();
}


