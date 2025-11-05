'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { fetchAnalytics } from '@/lib/analytics';
import { API_BASE_URL } from '@/lib/config';

export default function Admin() {
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
      console.log('Dashboard - Token from localStorage:', token);
      
      // Fetch analytics data
      const totalViews = await fetchAnalytics();
      
      // Fetch all stats in parallel with authentication headers
      const [userStatsResponse, leadStatsResponse, propertyStatsResponse, cityStatsResponse, builderStatsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/leads/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/properties/stats/summary`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/cities/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/builders/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const [userStatsData, leadStatsData, propertyStatsData, cityStatsData, builderStatsData] = await Promise.all([
        userStatsResponse.json(),
        leadStatsResponse.json(),
        propertyStatsResponse.json(),
        cityStatsResponse.json(),
        builderStatsResponse.json()
      ]);

      if (userStatsData.success && leadStatsData.success && propertyStatsData.success && cityStatsData.success && builderStatsData.success) {
        setStats({
          totalViews: totalViews || 0,
          totalUsers: userStatsData.data.totalUsers || 0,
          activeLeads: leadStatsData.data.totalLeads || 0,
          newSignups: userStatsData.data.newUsersThisMonth || 0,
          totalProperties: propertyStatsData.data.total || 0
        });

        setSummaryData({
          cities: {
            totalCities: cityStatsData.data.totalCities || 0,
            activeCities: cityStatsData.data.activeCities || 0,
            totalLocalities: cityStatsData.data.totalLocalities || 0
          },
          builders: {
            totalBuilders: builderStatsData.data.totalBuilders || 0,
            activeBuilders: builderStatsData.data.activeBuilders || 0
          },
          properties: {
            total: propertyStatsData.data.total || 0,
            regular: propertyStatsData.data.regular || 0,
            builder: propertyStatsData.data.builder || 0
          }
        });

      } else {
        throw new Error('Failed to fetch dashboard data');
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

  const statsCards = [
    { title: 'Total Views', value: stats.totalViews, icon: '👁️', color: 'secondary' },
    { title: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'primary' },
    { title: 'Active Leads', value: stats.activeLeads, icon: '📋', color: 'success' },
    { title: 'New Signups', value: stats.newSignups, icon: '🆕', color: 'warning' },
    { title: 'Properties', value: stats.totalProperties, icon: '🏠', color: 'info' },
  ];

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
          <div className="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>Warning!</strong> {error}
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
