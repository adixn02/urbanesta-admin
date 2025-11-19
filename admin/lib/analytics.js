// API utility for analytics
import { API_BASE_URL } from './config';

export const fetchAnalytics = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/total-views`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Check for rate limiting before parsing JSON
    if (response.status === 429) {
      console.warn('Rate limit hit for analytics. Returning 0.');
      return 0; // Return 0 instead of throwing to prevent dashboard from breaking
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data.totalViews;
    } else {
      // Check if it's a rate limit error in the response
      if (data.error && data.error.includes('Too many requests')) {
        console.warn('Rate limit hit for analytics. Returning 0.');
        return 0; // Return 0 instead of throwing to prevent dashboard from breaking
      }
      throw new Error(data.error || 'Failed to fetch analytics');
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    // If it's a rate limit error, return 0 instead of throwing
    if (error.message && error.message.includes('Too many requests')) {
      console.warn('Rate limit hit for analytics. Returning 0.');
      return 0;
    }
    // For other errors, return 0 to prevent dashboard from breaking
    return 0;
  }
};
