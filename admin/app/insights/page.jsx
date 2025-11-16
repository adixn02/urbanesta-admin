'use client'
import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { fetchActivityLogs, fetchActivitySummary } from '@/lib/activityLogs';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/lib/config';

export default function Logs() {
  const { logout, user, isAuthenticated, loading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    fromDate: '',
    toDate: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    action: '',
    fromDate: '',
    toDate: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' or 'video'
  const [videoLogs, setVideoLogs] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoPagination, setVideoPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSignOut = () => {
    logout();
  };

  useEffect(() => {
    // Only fetch data if user is authenticated and not loading
    if (!authLoading && isAuthenticated && user) {
      // Double-check token exists before making API calls
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, skipping insights data fetch');
        return;
      }
      
      // Add a small delay to ensure authentication is fully ready
      const timer = setTimeout(() => {
        fetchSummary();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (!authLoading && isAuthenticated && user) {
      if (activeTab === 'activity') {
        fetchLogs();
      } else if (activeTab === 'video') {
        fetchVideoLogs();
      }
    }
  }, [pagination.current, appliedFilters, activeTab, videoPagination.current, authLoading, isAuthenticated, user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      // Check token before making API call
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found in localStorage');
        setError('Authentication required. Please refresh the page.');
        return;
      }
      
      console.log('🔍 Fetching logs with token:', token.substring(0, 20) + '...');
      
      const result = await fetchActivityLogs(appliedFilters, pagination.current, 40);
      
      if (result && result.logs) {
        console.log('✅ Logs fetched successfully:', result.logs.length, 'logs');
        setLogs(result.logs);
        setPagination(result.pagination);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ Error in fetchLogs:', {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name
      });
      
      // Show error message to user
      if (error.status === 401 || error.status === 403 || error.code === 'AUTH_FAILED') {
        setError('Authentication failed. Your session may have expired. Please refresh the page to log in again.');
      } else if (error.message) {
        setError('Failed to fetch logs: ' + error.message);
      } else {
        setError('Unable to load logs. Please check your connection and try again.');
      }
      
      // Set empty data on error
      setLogs([]);
      setPagination({ current: 1, pages: 1, total: 0, limit: 40 });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      // Check token before making API call
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No token found, skipping summary fetch');
        return;
      }
      
      console.log('🔍 Fetching summary with token:', token.substring(0, 20) + '...');
      
      const summary = await fetchActivitySummary(7);
      
      if (Array.isArray(summary)) {
        console.log('✅ Summary fetched successfully:', summary.length, 'items');
        setSummary(summary);
      } else {
        console.warn('⚠️ Invalid summary format, setting empty array');
        setSummary([]);
      }
    } catch (error) {
      // Error fetching summary - log but don't show error as it's not critical
      console.error('❌ Error fetching activity summary:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      setSummary([]);
    }
  };

  const fetchVideoLogs = async () => {
    try {
      setVideoLoading(true);
      const token = localStorage.getItem('token');
      
      // Check if token exists before making API call
      if (!token) {
        console.warn('No token found, skipping video logs fetch');
        return;
      }
      
      const queryParams = new URLSearchParams({
        page: videoPagination.current,
        limit: 40,
        ...(appliedFilters.action && { action: appliedFilters.action }),
        ...(appliedFilters.fromDate && { fromDate: appliedFilters.fromDate }),
        ...(appliedFilters.toDate && { toDate: appliedFilters.toDate })
      });

      const response = await fetch(`${API_BASE_URL}/api/video-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies in request
      });

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn('Authentication failed for video logs, user will be redirected by ProtectedRoute');
        // Don't set error, let ProtectedRoute handle the redirect
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch video logs');
      }

      const data = await response.json();
      setVideoLogs(data.logs);
      setVideoPagination(data.pagination);
    } catch (error) {
      // Only set error if it's not an authentication error
      if (!error.message.includes('401') && !error.message.includes('403')) {
        setError('Failed to fetch video logs: ' + error.message);
      }
    } finally {
      setVideoLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    const emptyFilters = {
      action: '',
      fromDate: '',
      toDate: ''
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  return (
    <ProtectedRoute>
      <div className="container d-flex mt-2 pt-5">
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex-grow-1">
          <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />
        
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className='fw-bold'>Activity Logs</h2>
            <button 
              className="btn btn-outline-primary"
              onClick={fetchLogs}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="card mb-4">
            <div className="card-header p-0">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                  >
                    <i className="bi bi-activity me-2"></i>
                    Activity Logs
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'video' ? 'active' : ''}`}
                    onClick={() => setActiveTab('video')}
                  >
                    <i className="bi bi-camera-video-fill me-2"></i>
                    Home Video Changes
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Summary Cards */}
          {activeTab === 'activity' && summary.length > 0 && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Activity Summary (Last 7 Days)</h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {summary.map((item, index) => (
                        <div key={index} className="col-md-3 mb-3">
                          <div className="card bg-light">
                            <div className="card-body text-center">
                              <h6 className="card-title text-capitalize">
                                {(item._id.action || '').split('_').join(' ')}
                              </h6>
                              <h4 className={`text-${item._id.status === 'success' ? 'success' : 'danger'}`}>
                                {item.count}
                              </h4>
                              <small className="text-muted">
                                {item._id.status} • {formatDate(item.lastActivity)}
                              </small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Filters</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Action</label>
                  <select
                    className="form-select"
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                  >
                    {activeTab === 'activity' ? (
                      <>
                        <option value="">All Actions</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="create_user">Create User</option>
                        <option value="update_user">Update User</option>
                        <option value="delete_user">Delete User</option>
                        <option value="create_city">Create City</option>
                        <option value="update_city">Update City</option>
                        <option value="delete_city">Delete City</option>
                        <option value="create_builder">Create Builder</option>
                        <option value="update_builder">Update Builder</option>
                        <option value="delete_builder">Delete Builder</option>
                        <option value="create_property">Create Property</option>
                        <option value="update_property">Update Property</option>
                        <option value="delete_property">Delete Property</option>
                        <option value="export_data">Export Data</option>
                        <option value="view_logs">View Logs</option>
                        <option value="access_settings">Access Settings</option>
                        <option value="unauthorized_access">Unauthorized Access</option>
                        <option value="failed_login">Failed Login</option>
                        <option value="suspicious_activity">Suspicious Activity</option>
                      </>
                    ) : (
                      <>
                        <option value="">All Actions</option>
                        <option value="uploaded">Uploaded</option>
                        <option value="updated">Updated</option>
                        <option value="deleted">Deleted</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end gap-2">
                  <button
                    className="btn btn-primary flex-fill"
                    onClick={applyFilters}
                    disabled={activeTab === 'activity' ? loading : videoLoading}
                  >
                    Apply Filters
                  </button>
                  <button
                    className="btn btn-outline-secondary flex-fill"
                    onClick={clearFilters}
                    disabled={activeTab === 'activity' ? loading : videoLoading}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Logs Table */}
          {activeTab === 'activity' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Activity Logs ({pagination.total} total)</h5>
              <span className="badge bg-info">40 logs per page</span>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>User</th>
                          <th>Action</th>
                          <th>Resource</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log._id}>
                            <td>
                              <small>{formatDate(log.createdAt)}</small>
                            </td>
                            <td>
                              <div>
                                <div className="fw-bold">{log.userName || log.userId?.name || 'Unknown'}</div>
                                <small className="text-muted">{log.userPhone || log.userId?.phoneNumber || '-'}</small>
                                <br />
                                <span className={`badge ${((log.userRole || log.userId?.role) === 'admin') ? 'bg-danger' : 'bg-warning'}`}>
                                  {log.userRole || log.userId?.role || 'user'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="text-capitalize">
                                {(log.action || '').split('_').join(' ')}
                              </span>
                            </td>
                            <td>{log.resource}</td>
                            <td>
                              <div className="text-wrap" style={{ maxWidth: '400px' }} title={log.details}>
                                {log.details}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted">
                        Showing {((pagination.current - 1) * 40) + 1} to {Math.min(pagination.current * 40, pagination.total)} of {pagination.total} logs
                      </div>
                      <nav aria-label="Logs pagination">
                        <ul className="pagination mb-0">
                          <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                              disabled={pagination.current === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => {
                            let pageNum;
                            if (pagination.pages <= 10) {
                              pageNum = i + 1;
                            } else if (pagination.current <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.current >= pagination.pages - 4) {
                              pageNum = pagination.pages - 9 + i;
                            } else {
                              pageNum = pagination.current - 4 + i;
                            }
                            return (
                              <li key={pageNum} className={`page-item ${pagination.current === pageNum ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setPagination(prev => ({ ...prev, current: pageNum }))}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            );
                          })}
                          <li className={`page-item ${pagination.current === pagination.pages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                              disabled={pagination.current === pagination.pages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          )}

          {/* Video Logs Table */}
          {activeTab === 'video' && (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-camera-video-fill me-2"></i>
                Home Video Change History
              </h5>
            </div>
            <div className="card-body">
              {videoLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading video logs...</p>
                </div>
              ) : videoLogs.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-2">No video change logs found</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover table-striped">
                      <thead className="table-light">
                        <tr>
                          <th>Date & Time</th>
                          <th>Admin</th>
                          <th>Action</th>
                          <th>Video File</th>
                          <th>File Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videoLogs.map((log) => (
                          <tr key={log._id}>
                            <td>
                              <small>{formatDate(log.changedAt)}</small>
                            </td>
                            <td>
                              <div>
                                <div className="fw-bold">{log.changedByName || 'Unknown'}</div>
                                <span className={`badge ${log.changedByRole === 'admin' ? 'bg-danger' : 'bg-warning'}`}>
                                  {log.changedByRole}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${
                                log.action === 'uploaded' ? 'bg-success' : 
                                log.action === 'updated' ? 'bg-info' : 
                                'bg-danger'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td>
                              <div>
                                <div className="fw-bold" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {log.fileName}
                                </div>
                                <a 
                                  href={log.videoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary text-decoration-none small"
                                >
                                  <i className="bi bi-box-arrow-up-right me-1"></i>
                                  View Video
                                </a>
                              </div>
                            </td>
                            <td>
                              <small>{(log.fileSize / (1024 * 1024)).toFixed(2)} MB</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Video Logs Pagination */}
                  {videoPagination.pages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted">
                        Showing {((videoPagination.current - 1) * 40) + 1} to {Math.min(videoPagination.current * 40, videoPagination.total)} of {videoPagination.total} changes
                      </div>
                      <nav aria-label="Video logs pagination">
                        <ul className="pagination mb-0">
                          <li className={`page-item ${videoPagination.current === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setVideoPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                              disabled={videoPagination.current === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {Array.from({ length: Math.min(videoPagination.pages, 5) }, (_, i) => {
                            let pageNum;
                            if (videoPagination.pages <= 5) {
                              pageNum = i + 1;
                            } else {
                              const current = videoPagination.current;
                              const total = videoPagination.pages;
                              if (current <= 3) {
                                pageNum = i + 1;
                              } else if (current >= total - 2) {
                                pageNum = total - 4 + i;
                              } else {
                                pageNum = current - 2 + i;
                              }
                            }
                            return (
                              <li key={pageNum} className={`page-item ${videoPagination.current === pageNum ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setVideoPagination(prev => ({ ...prev, current: pageNum }))}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            );
                          })}
                          <li className={`page-item ${videoPagination.current === videoPagination.pages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setVideoPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                              disabled={videoPagination.current === videoPagination.pages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}