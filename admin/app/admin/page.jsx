'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { fetchAnalytics } from '@/lib/analytics';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';
import AddVideo from '@/components/addvideo';

export default function Admin() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
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
      console.error('Error during logout:', error);
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
      console.error('Failed to fetch current video:', error);
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
    // Only fetch data if user is authenticated
    if (user) {
      fetchDashboardData();
      fetchCurrentVideo();
    }
  }, [user]); // Re-fetch when user changes

  const fetchDashboardData = async () => {
    try {
      // Double-check authentication before fetching
      const token = localStorage.getItem('token');
      if (!token || !user) {
        console.warn('No token or user found, skipping dashboard data fetch');
        return;
      }

      setLoading(true);
      setError(null);
      
      // Fetch analytics data (with error handling)
      let totalViews = 0;
      try {
        totalViews = await fetchAnalytics();
      } catch (analyticsError) {
        console.warn('Failed to fetch analytics:', analyticsError);
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
          }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))),
          fetch(`${API_BASE_URL}/api/leads/stats`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
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
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))),
        fetch(`${API_BASE_URL}/api/cities/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))),
        fetch(`${API_BASE_URL}/api/builders/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
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
      // Don't include skipped requests (for subadmin)
      const failedRequests = [
        (userStatsResult.status === 'rejected' || (userStatsResult.value?.status === 'skipped' && isAdmin)) && 'Users',
        (leadStatsResult.status === 'rejected' || (leadStatsResult.value?.status === 'skipped' && isAdmin)) && 'Leads',
        propertyStatsResult.status === 'rejected' && 'Properties',
        cityStatsResult.status === 'rejected' && 'Cities',
        builderStatsResult.status === 'rejected' && 'Builders'
      ].filter(Boolean);

      if (failedRequests.length > 0) {
        console.warn('Some dashboard data failed to load:', failedRequests.join(', '));
        // Only show error if ALL requests failed
        if (failedRequests.length === 5) {
          setError(`Failed to load dashboard data. Please check your permissions and try again.`);
        } else {
          // Show a less severe warning
          setError(`Some data may be incomplete. Failed to load: ${failedRequests.join(', ')}`);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Failed to load dashboard data: ${err.message}. Please check your connection and try again.`);
      
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
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setError(null)}
            ></button>
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
