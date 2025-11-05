// API utility for property views
import { API_BASE_URL } from '@/lib/config';

// Ensure we call the correct path regardless of whether API_BASE_URL ends with /api
const API_PREFIX = API_BASE_URL.endsWith('/api') ? '' : '/api';

export const fetchAllPropertyViews = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/property-views/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch property views: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch property views');
    }
  } catch (error) {
    console.error('Error fetching property views:', error);
    return []; // Return empty array as fallback
  }
};

export const fetchTotalPropertyViews = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/property-views/total`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch total property views: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data.totalViews;
    } else {
      throw new Error(data.error || 'Failed to fetch total property views');
    }
  } catch (error) {
    console.error('Error fetching total property views:', error);
    return 0; // Return 0 as fallback
  }
};

export const fetchPropertyViewCount = async (propertyId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/property-views/${propertyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch property view count: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data.viewCount;
    } else {
      throw new Error(data.error || 'Failed to fetch property view count');
    }
  } catch (error) {
    console.error('Error fetching property view count:', error);
    return 0; // Return 0 as fallback
  }
};
