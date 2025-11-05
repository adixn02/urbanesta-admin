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

    const data = await response.json();
    
    if (data.success) {
      return data.data.totalViews;
    } else {
      throw new Error(data.error || 'Failed to fetch analytics');
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return 0; // Return 0 as fallback
  }
};
