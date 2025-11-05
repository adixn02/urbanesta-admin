'use client'
import React,{useState, useEffect} from "react";
import Link from "next/link";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";


export default function Users() {
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [loading, setLoading] = useState(true);
const [users, setUsers] = useState([]);
const [stats, setStats] = useState({
  totalUniqueUsers: 0,
  activeUsers: 0,
  newUsersThisMonth: 0,
});
const [error, setError] = useState(null);
const [pagination, setPagination] = useState({
  current: 1,
  pages: 1,
  total: 0
});
const [filters, setFilters] = useState({
  fromDate: '',
  toDate: ''
});
const [isExporting, setIsExporting] = useState(false);

const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
};

const handleSignOut = async () => {
    try {
      const { logout: apiLogout } = await import('@/lib/logout');
      await apiLogout();
      window.location.href = '/';
    } catch (error) {
      localStorage.clear();
      document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/';
    }
};

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

useEffect(() => {
  fetchUsersData();
}, [pagination.current, filters]);

const fetchUsersData = async () => {
  try {
    setLoading(true);
    setError(null);

    // Build query parameters
    const queryParams = new URLSearchParams({
      page: pagination.current.toString(),
      limit: '10',
      ...(filters.fromDate && { fromDate: filters.fromDate }),
      ...(filters.toDate && { toDate: filters.toDate })
    });

    // Fetch users and stats in parallel
    const token = localStorage.getItem('token');
    const [usersResponse, statsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${API_BASE_URL}/api/users/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    const usersData = await usersResponse.json();
    const statsData = await statsResponse.json();

    if (usersData.success && statsData.success) {
      setUsers(usersData.data || []);
      setPagination(usersData.pagination || { current: 1, pages: 1, total: 0 });
      setStats({
        totalUniqueUsers: statsData.data.totalUsers || 0,
        activeUsers: statsData.data.activeUsers || 0,
        newUsersThisMonth: statsData.data.newUsersThisMonth || 0,
      });
    } else {
      throw new Error('Failed to fetch users data');
    }
    } catch (err) {
      setError('Failed to load users data. Please try again later.');
      setUsers([]);
      setStats({
        totalUniqueUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
      });
    } finally {
    setLoading(false);
  }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Build query parameters for export
      const queryParams = new URLSearchParams({
        ...(filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.toDate && { toDate: filters.toDate })
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'users_report.xlsx';

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      setError('Failed to export users. Please try again later.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
    <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* user page content */}
     <div className="container my-5 mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">User Management</h2>
          <p className="text-muted mb-0">Manage and organize your user accounts</p>
        </div>
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

      {/* Filter Controls */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Filter Users</h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label htmlFor="fromDate" className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                id="fromDate"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="toDate" className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                id="toDate"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
              />
            </div>
            <div className="col-md-6 d-flex align-items-end gap-2 justify-content-end">
              <button
                className="btn btn-outline-secondary flex-grow-1"
                onClick={clearFilters}
              >
                <i className="bi bi-x-circle me-1"></i>
                Clear Filters
              </button>
              <button 
                className="btn btn-success flex-grow-1" 
                onClick={handleExport}
                disabled={isExporting || loading}
              >
                {isExporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Exporting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-download me-1"></i>
                    Download Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="text-primary">Total Users</h6>
              <h3>
                {loading ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  stats.totalUniqueUsers
                )}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="text-success">Active Users</h6>
              <h3>
                {loading ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  stats.activeUsers
                )}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h6 className="text-info">New This Month</h6>
              <h3>
                {loading ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  stats.newUsersThisMonth
                )}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <span>All Users</span>
            <span className="badge bg-secondary ms-2">{pagination.total}</span>
            {pagination.total > 0 && (
              <small className="text-muted ms-2">
                (Page {pagination.current} of {pagination.pages})
              </small>
            )}
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading users...</span>
              </div>
              <p className="mt-2 text-muted">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
              <h5>No users found</h5>
              <p>There are no users to display at the moment.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Last Login</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <strong>{user.name || 'N/A'}</strong>
                      </td>
                      <td>{user.email || 'N/A'}</td>
                      <td>{user.phoneNumber || 'N/A'}</td>
                      <td>{user.city || 'N/A'}</td>
                      <td>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Never'}
                      </td>
                      <td>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="card-footer bg-white border-top">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted">
                Showing {((pagination.current - 1) * 10) + 1} to {Math.min(pagination.current * 10, pagination.total || users.length)} of {pagination.total || users.length} users
              </div>
              <nav aria-label="User pagination">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.current - 1)}
                      disabled={pagination.current === 1 || loading}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  
                  {/* Show page numbers - smart pagination (max 10 pages) */}
                  {Array.from({ length: Math.min(10, Math.max(1, pagination.pages || 1)) }, (_, i) => {
                    let pageNum;
                    const totalPages = pagination.pages || 1;
                    if (totalPages <= 10) {
                      pageNum = i + 1;
                    } else if (pagination.current <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.current >= totalPages - 4) {
                      pageNum = totalPages - 9 + i;
                    } else {
                      pageNum = pagination.current - 4 + i;
                    }
                    
                    return (
                      <li key={pageNum} className={`page-item ${pagination.current === pageNum ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${pagination.current === (pagination.pages || 1) ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.current + 1)}
                      disabled={pagination.current === (pagination.pages || 1) || loading}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
     
    
    </ProtectedRoute>
  );
}
