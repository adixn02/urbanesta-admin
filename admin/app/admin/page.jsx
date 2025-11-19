'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { fetchAnalytics } from '@/lib/analytics';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';
import AddVideo from '@/components/addvideo';
import logger from '@/lib/logger';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // Prevent multiple simultaneous requests
  const [hasInitialFetch, setHasInitialFetch] = useState(false); // Track initial fetch to prevent loops
  const [lastFetchTime, setLastFetchTime] = useState(0); // Track last fetch time to prevent rate limiting
  const [stats, setStats] = useState({
    totalViews: 0,
    totalUsers: 0,
    activeLeads: 0,
    newSignups: 0,
    totalProperties: 0
  });
  const [summaryData, setSummaryData] = useState({
    cities: { totalCities: 0, activeCities: 0, totalLocalities: 0 },
    builders: { totalBuilders: 0, activeBuilders: 0 },
    properties: { total: 0, regular: 0, builder: 0 }
  });
  const [error, setError] = useState(null);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [success, setSuccess] = useState('');

  // Prevent caching of this page for security
  useEffect(() => {
    // Disable browser back/forward cache
    window.onpageshow = function(event) {
      if (event.persisted) {
        // Page was loaded from cache (back button)
        // Check authentication again
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.replace('/');
        }
      }
    };

    return () => {
      window.onpageshow = null;
    };
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSignOut = async () => {
    try {
      // Immediately clear all auth data FIRST
      localStorage.clear();
      document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      sessionStorage.clear();
      
      // Then call API to log the logout (in background, don't wait)
      try {
        const { logout: apiLogout } = await import('@/lib/logout');
        apiLogout().catch(() => {}); // Fire and forget
      } catch (e) {
        // Ignore API errors during logout
      }
      
      // Force redirect with replace to prevent back navigation
      window.location.replace('/');
    } catch (error) {
      logger.error('Error during logout:', { error: error.message });
      // Force redirect even on error
      window.location.replace('/');
    }
  };

  const fetchCurrentVideo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/home-video/current`);
      const data = await response.json();
      
      if (data.success && data.video) {
        setCurrentVideo(data.video);
      }
    } catch (error) {
      logger.error('Failed to fetch current video:', { error: error.message });
    }
  };

  const handleUploadVideo = async (file, setUploading, setUploadProgress) => {
    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            setSuccess('Video uploaded successfully!');
            setShowAddVideoModal(false);
            fetchCurrentVideo(); // Refresh video data
          } else {
            setError(data.error || 'Failed to upload video');
          }
        } else {
          setError('Failed to upload video. Please try again.');
        }
        setUploading(false);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setError('Network error. Please check your connection and try again.');
        setUploading(false);
      });

      // Send request
      xhr.open('POST', `${API_BASE_URL}/api/home-video/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);
    } catch (error) {
      setError('Failed to upload video: ' + error.message);
      setUploading(false);
    }
  };

  // API_BASE_URL is imported from config, which uses NEXT_PUBLIC_API_URL env variable

  useEffect(() => {
    // Only fetch data once when user is authenticated and auth is ready
    // Prevent refresh loops by checking hasInitialFetch
    if (user && !authLoading && !isFetching && !hasInitialFetch) {
      // Increased delay to prevent rapid successive calls and rate limiting
      const timer = setTimeout(() => {
        fetchDashboardData();
        fetchCurrentVideo();
        setHasInitialFetch(true); // Mark as fetched
        setLastFetchTime(Date.now()); // Record fetch time
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]); // Only depend on user and authLoading, not isFetching

  // Refetch data when component becomes visible (e.g., after navigating back)
  // But only if initial fetch was done and enough time has passed (prevent rate limiting)
  useEffect(() => {
    let visibilityTimer;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && hasInitialFetch) {
        // Prevent refetch if less than 5 seconds have passed (rate limit protection)
        const timeSinceLastFetch = Date.now() - lastFetchTime;
        if (timeSinceLastFetch < 5000) {
          return; // Too soon, skip refetch
        }
        
        // Clear any existing timer
        if (visibilityTimer) clearTimeout(visibilityTimer);
        
        // Debounce visibility change to prevent rapid refetches
        visibilityTimer = setTimeout(() => {
          // Only refetch if not already fetching
          if (!isFetching) {
            fetchDashboardData();
            setLastFetchTime(Date.now()); // Update last fetch time
          }
        }, 2000); // Wait 2 seconds after becoming visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimer) clearTimeout(visibilityTimer);
    };
  }, [user, hasInitialFetch, lastFetchTime]); // Include lastFetchTime but not isFetching

  const fetchDashboardData = async (retryCount = 0) => {
    // Prevent multiple simultaneous requests
    if (isFetching) {
      logger.debug('Dashboard data fetch already in progress, skipping...');
      return;
    }

    try {
      // Double-check authentication before fetching
      const token = localStorage.getItem('token');
      if (!token || !user) {
        logger.warn('No token or user found, skipping dashboard data fetch');
        setError(null); // Clear any previous errors
        return;
      }

      setIsFetching(true);
      setLoading(true);
      setError(null); // Clear previous errors when starting fresh fetch
      
      // Fetch analytics data (with error handling)
      // Analytics is non-critical, so we handle errors gracefully
      let totalViews = 0;
      try {
        totalViews = await fetchAnalytics();
      } catch (analyticsError) {
        // Analytics errors (including rate limits) are non-critical
        // fetchAnalytics already returns 0 on error, so this catch is just for safety
        logger.warn('Analytics fetch failed (non-critical):', { error: analyticsError.message || analyticsError });
        // Continue with other data even if analytics fails
      }
      
      // Determine which stats to fetch based on user role
      const isAdmin = user?.role === 'admin';
      
      // Fetch all stats in parallel with authentication headers
      // Use Promise.allSettled to handle individual failures gracefully
      // Only fetch user/lead stats if user is admin
      const fetchPromises = [];
      
      if (isAdmin) {
        // Admin can access all stats
        fetchPromises.push(
          fetch(`${API_BASE_URL}/api/users/stats`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).then(async res => {
            if (res.status === 401 || res.status === 403) {
              // Token expired or invalid - clear auth and redirect
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.replace('/');
              return Promise.reject(new Error('Authentication expired'));
            }
            if (res.status === 429) {
              // Rate limited - retry with exponential backoff
              const retryAfter = res.headers.get('Retry-After') || 5;
              throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
            }
            return res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
          }),
          fetch(`${API_BASE_URL}/api/leads/stats`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).then(async res => {
            if (res.status === 401 || res.status === 403) {
              // Token expired or invalid - clear auth and redirect
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.replace('/');
              return Promise.reject(new Error('Authentication expired'));
            }
            if (res.status === 429) {
              // Rate limited - retry with exponential backoff
              const retryAfter = res.headers.get('Retry-After') || 5;
              throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
            }
            return res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
          })
        );
      } else {
        // Subadmin - skip user and lead stats
        fetchPromises.push(
          Promise.resolve({ status: 'skipped' }),
          Promise.resolve({ status: 'skipped' })
        );
      }
      
      // All users can access these stats
      fetchPromises.push(
        fetch(`${API_BASE_URL}/api/properties/stats/summary`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('/');
            return Promise.reject(new Error('Authentication expired'));
          }
          return res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
        }),
        fetch(`${API_BASE_URL}/api/cities/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('/');
            return Promise.reject(new Error('Authentication expired'));
          }
          return res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
        }),
        fetch(`${API_BASE_URL}/api/builders/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('/');
            return Promise.reject(new Error('Authentication expired'));
          }
          return res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
        })
      );
      
      const [userStatsResult, leadStatsResult, propertyStatsResult, cityStatsResult, builderStatsResult] = await Promise.allSettled(fetchPromises);

      // Extract data from results, using fallback values if any request failed
      const userStatsData = (userStatsResult.status === 'fulfilled' && 
                             userStatsResult.value.status !== 'skipped' && 
                             userStatsResult.value.success) 
        ? userStatsResult.value 
        : { success: false, data: { totalUsers: 0, newUsersThisMonth: 0 } };
      
      const leadStatsData = (leadStatsResult.status === 'fulfilled' && 
                             leadStatsResult.value.status !== 'skipped' && 
                             leadStatsResult.value.success) 
        ? leadStatsResult.value 
        : { success: false, data: { totalLeads: 0 } };
      
      const propertyStatsData = propertyStatsResult.status === 'fulfilled' && propertyStatsResult.value.success 
        ? propertyStatsResult.value 
        : { success: false, data: { total: 0, regular: 0, builder: 0 } };
      
      const cityStatsData = cityStatsResult.status === 'fulfilled' && cityStatsResult.value.success 
        ? cityStatsResult.value 
        : { success: false, data: { totalCities: 0, activeCities: 0, totalLocalities: 0 } };
      
      const builderStatsData = builderStatsResult.status === 'fulfilled' && builderStatsResult.value.success 
        ? builderStatsResult.value 
        : { success: false, data: { totalBuilders: 0, activeBuilders: 0 } };

      // Set stats with available data (even if some requests failed)
      setStats({
        totalViews: totalViews || 0,
        totalUsers: userStatsData.data?.totalUsers || 0,
        activeLeads: leadStatsData.data?.totalLeads || 0,
        newSignups: userStatsData.data?.newUsersThisMonth || 0,
        totalProperties: propertyStatsData.data?.total || 0
      });

      setSummaryData({
        cities: {
          totalCities: cityStatsData.data?.totalCities || 0,
          activeCities: cityStatsData.data?.activeCities || 0,
          totalLocalities: cityStatsData.data?.totalLocalities || 0
        },
        builders: {
          totalBuilders: builderStatsData.data?.totalBuilders || 0,
          activeBuilders: builderStatsData.data?.activeBuilders || 0
        },
        properties: {
          total: propertyStatsData.data?.total || 0,
          regular: propertyStatsData.data?.regular || 0,
          builder: propertyStatsData.data?.builder || 0
        }
      });

      // Show warning if some data failed to load, but don't throw error
      // Only mark as failed if request was rejected (not if it was skipped for subadmin)
      const failedRequests = [
        (userStatsResult.status === 'rejected' || (isAdmin && userStatsResult.status === 'fulfilled' && userStatsResult.value?.success === false)) && 'Users',
        (leadStatsResult.status === 'rejected' || (isAdmin && leadStatsResult.status === 'fulfilled' && leadStatsResult.value?.success === false)) && 'Leads',
        propertyStatsResult.status === 'rejected' && 'Properties',
        cityStatsResult.status === 'rejected' && 'Cities',
        builderStatsResult.status === 'rejected' && 'Builders'
      ].filter(Boolean);

      if (failedRequests.length > 0) {
        logger.warn('Some dashboard data failed to load:', { failedRequests: failedRequests.join(', ') });
        // Only show error if ALL requests failed
        if (failedRequests.length === 5) {
          setError(`Failed to load dashboard data. Please check your permissions and try again.`);
        } else {
          // Show a less severe warning that can be dismissed
          setError(`Some data may be incomplete. Failed to load: ${failedRequests.join(', ')}`);
        }
      } else {
        // Clear any previous errors if all requests succeeded
        setError(null);
      }
    } catch (err) {
      logger.error('Error fetching dashboard data:', { error: err.message, stack: err.stack });
      
      // Don't show error if it's an authentication issue (user will be redirected)
      if (err.message && err.message.includes('Authentication expired')) {
        // User will be redirected, don't set error
        setIsFetching(false);
        return;
      }
      
      // Handle rate limiting with retry
      if (err.message && err.message.includes('Rate limited')) {
        const retryAfter = parseInt(err.message.match(/\d+/)?.[0]) || 5;
        if (retryCount < 2) {
          // Retry after the specified delay (max 2 retries)
          logger.info(`Rate limited. Retrying after ${retryAfter} seconds...`);
          setTimeout(() => {
            fetchDashboardData(retryCount + 1);
          }, retryAfter * 1000);
          setIsFetching(false);
          return;
        } else {
          setError(`Rate limit exceeded. Please wait a few moments and refresh the page.`);
        }
      } else {
        setError(`Failed to load dashboard data: ${err.message}. Please check your connection and try again.`);
      }
      
      // Set fallback data
      setStats({
        totalViews: 0,
        totalUsers: 0,
        activeLeads: 0,
        newSignups: 0,
        totalProperties: 0
      });
      setSummaryData({
        cities: { totalCities: 0, activeCities: 0, totalLocalities: 0 },
        builders: { totalBuilders: 0, activeBuilders: 0 },
        properties: { total: 0, regular: 0, builder: 0 }
      });
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  // Filter stats cards based on user role
  // Subadmins can't access Users and Leads stats
  const allStatsCards = [
    { title: 'Total Views', value: stats.totalViews, icon: '👁️', color: 'secondary', roles: ['admin', 'subadmin'] },
    { title: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'primary', roles: ['admin'] },
    { title: 'Active Leads', value: stats.activeLeads, icon: '📋', color: 'success', roles: ['admin'] },
    { title: 'New Signups', value: stats.newSignups, icon: '🆕', color: 'warning', roles: ['admin'] },
    { title: 'Properties', value: stats.totalProperties, icon: '🏠', color: 'info', roles: ['admin', 'subadmin'] },
  ];

  // Filter cards based on user role
  const statsCards = allStatsCards.filter(card => {
    if (!card.roles) return true; // Show if no role restriction
    if (!user?.role) return true; // Show all if role not available yet
    return card.roles.includes(user.role);
  });

  return (
    <ProtectedRoute>
      <div className="d-flex">
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex-grow-1">
          <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />
          <main className="p-4 pt-5 mt-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className='fw-bold'>Welcome to Proprty Management System</h2>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-info btn-sm text-white"
              onClick={() => setShowAddVideoModal(true)}
            >
              <i className="bi bi-camera-video-fill me-2"></i>
              {currentVideo ? 'Update Home Video' : 'Add Home Video'}
            </button>
            <button 
              className="btn btn-outline-primary btn-sm" 
              onClick={fetchDashboardData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className={`alert ${error.includes('Some data may be incomplete') ? 'alert-info' : 'alert-warning'} alert-dismissible fade show`} role="alert">
            <strong>{error.includes('Some data may be incomplete') ? 'Info:' : 'Warning!'}</strong> {error}
            <div className="d-flex gap-2 mt-2">
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  setError(null);
                  fetchDashboardData();
                }}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Retry
              </button>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError(null)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}

        {success && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            <strong>Success!</strong> {success}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setSuccess('')}
            ></button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="row mb-4">
          {statsCards.map((stat) => (
            <div className="col-md-3 mb-3" key={stat.title}>
              <div className={`card text-white bg-${stat.color} h-100`}>
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="card-title">{stat.title}</h5>
                    <h3 className="card-text">
                      {loading ? (
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : (
                        stat.value
                      )}
                    </h3>
                  </div>
                  <div style={{ fontSize: '2rem' }}>{stat.icon}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Sections */}
        <div className="row mb-4">
          {/* City Summary */}
          <div className="col-md-3 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3" style={{ fontSize: '2rem' }}>🏙️</div>
                  <div>
                    <h6 className="card-title mb-0">City </h6>
                    <small className="text-muted">Location Management</small>
                  </div>
                </div>
                <div className="row text-center">
                  <div className="col-4">
                    <div className="border-end">
                      <h5 className="mb-0 text-primary">{loading ? '-' : summaryData.cities.totalCities}</h5>
                      <small className="text-muted">Total Cities</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="border-end">
                      <h5 className="mb-0 text-success">{loading ? '-' : summaryData.cities.activeCities}</h5>
                      <small className="text-muted">Active</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <h5 className="mb-0 text-info">{loading ? '-' : summaryData.cities.totalLocalities}</h5>
                    <small className="text-muted">Localities</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Builder Summary */}
          <div className="col-md-3 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3" style={{ fontSize: '2rem' }}>🏗️</div>
                  <div>
                    <h6 className="card-title mb-0">Builders</h6>
                    <small className="text-muted">Builder Management</small>
                  </div>
                </div>
                <div className="row text-center">
                  <div className="col-6">
                    <div className="border-end">
                      <h5 className="mb-0 text-primary">{loading ? '-' : summaryData.builders.totalBuilders}</h5>
                      <small className="text-muted">Total Builders</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <h5 className="mb-0 text-success">{loading ? '-' : summaryData.builders.activeBuilders}</h5>
                    <small className="text-muted">Active</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regular Property Summary */}
          <div className="col-md-3 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3" style={{ fontSize: '2rem' }}>🏠</div>
                  <div>
                    <h6 className="card-title mb-0">Regular Property</h6>
                    <small className="text-muted">Individual Properties</small>
                  </div>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 text-primary">{loading ? '-' : summaryData.properties.regular}</h5>
                  <small className="text-muted">Total Regular Properties</small>
                </div>
              </div>
            </div>
          </div>

          {/* Builder Property Summary */}
          <div className="col-md-3 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3" style={{ fontSize: '2rem' }}>🏢</div>
                  <div>
                    <h6 className="card-title mb-0">Builder Property</h6>
                    <small className="text-muted">Builder Projects</small>
                  </div>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 text-info">{loading ? '-' : summaryData.properties.builder}</h5>
                  <small className="text-muted">Total Builder Properties</small>
                </div>
              </div>
            </div>
          </div>
        </div>
          </main>
        </div>
      </div>

      {/* Add/Update Video Modal */}
      {showAddVideoModal && (
        <AddVideo
          onClose={() => setShowAddVideoModal(false)}
          onUploadVideo={handleUploadVideo}
          currentVideo={currentVideo}
          error={error}
          setError={setError}
        />
      )}
    </ProtectedRoute>
  );
}
