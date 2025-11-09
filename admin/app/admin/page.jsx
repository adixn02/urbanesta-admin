'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { fetchAnalytics } from '@/lib/analytics';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';

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

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSignOut = async () => {
    try {
      // Import logout function dynamically to avoid SSR issues
      const { logout: apiLogout } = await import('@/lib/logout');
      await apiLogout();
      // Redirect to login page
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: clear storage and redirect
      localStorage.clear();
      document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/';
    }
  };

  // API_BASE_URL is imported from config, which uses NEXT_PUBLIC_API_URL env variable

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authentication token
      const token = localStorage.getItem('token');
      
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
          <button 
            className="btn btn-outline-primary btn-sm" 
            onClick={fetchDashboardData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
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
    </ProtectedRoute>
  );
}
