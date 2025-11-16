// API utility for activity logs
import { apiFetch } from '@/lib/fetcher';
import { API_BASE_URL } from '@/lib/config';

// Ensure we call the correct path regardless of whether API_BASE_URL ends with /api
const API_PREFIX = API_BASE_URL.endsWith('/api') ? '' : '/api';

export const fetchActivityLogs = async (filters = {}, page = 1, limit = 40) => {
  try {
    // Ensure limit doesn't exceed maximum of 40
    const maxLimit = 40;
    const finalLimit = Math.min(parseInt(limit) || 40, maxLimit);
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: finalLimit.toString(),
      ...filters
    });
    // Disable auto-redirect to prevent logout on insights page
    const data = await apiFetch(`${API_PREFIX}/admin/logs?${queryParams.toString()}`, {
      disableAutoRedirect: true
    });
    if (data.success) {
      return {
        logs: data.data,
        pagination: data.pagination
      };
    } else {
      throw new Error(data.error || 'Failed to fetch activity logs');
    }
  } catch (error) {
    // Error fetching activity logs - return empty data instead of crashing
    console.error('Error fetching activity logs:', error);
    return {
      logs: [],
      pagination: { current: 1, pages: 1, total: 0, limit: 40 }
    };
  }
};

export const fetchActivitySummary = async (days = 7) => {
  try {
    // Disable auto-redirect to prevent logout on insights page
    const data = await apiFetch(`${API_PREFIX}/admin/logs/summary?days=${days}`, {
      disableAutoRedirect: true
    });
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch activity summary');
    }
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    return [];
  }
};

export const fetchActivityStats = async (days = 30) => {
  try {
    const data = await apiFetch(`${API_PREFIX}/admin/logs/stats?days=${days}`);
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch activity stats');
    }
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    return {
      totalActivities: 0,
      successfulActivities: 0,
      failedActivities: 0,
      blockedActivities: 0,
      criticalActivities: 0,
      highSeverityActivities: 0,
      uniqueUserCount: 0
    };
  }
};

export const createActivityLog = async (logData) => {
  try {
    const data = await apiFetch(`${API_PREFIX}/admin/logs`, {
      method: 'POST',
      body: JSON.stringify(logData),
    });
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to create activity log');
    }
  } catch (error) {
    console.error('Error creating activity log:', error);
    throw error;
  }
};
