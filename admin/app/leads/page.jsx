'use client'
import React,{useState, useEffect} from "react";
import Link from "next/link";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";


export default function Leads() {
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    formType: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({});
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
};

const handleSignOut = async () => {
    try {
      const { logout: apiLogout } = await import('@/lib/logout');
      await apiLogout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      localStorage.clear();
      document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/';
    }
};

  useEffect(() => {
    fetchForms();
    fetchStats();
  }, [filters]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      
      // API base URL - adjust this based on your server configuration
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

      // Build query parameters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      console.log('Fetching leads from:', `${API_BASE_URL}/api/leads?${queryParams}`);
      
      const response = await fetch(`${API_BASE_URL}/api/leads?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Leads data received:', data);

      if (data.success) {
        setForms(data.data || []);
        setPagination(data.pagination || {});
      } else {
        throw new Error(data.error || 'Failed to fetch leads');
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      // Set empty array on error to show "No leads found" message
      setForms([]);
      // Show user-friendly error message
      alert(`Failed to load leads: ${error.message}. Please make sure the server is running on port 3002.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

      console.log('Fetching stats from:', `${API_BASE_URL}/api/leads/stats`);
      
      const response = await fetch(`${API_BASE_URL}/api/leads/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Stats data received:', data);

      if (data.success) {
        setStats(data.data || {});
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
      setStats({
        totalLeads: 0,
        todayLeads: 0,
        leadsThisMonth: 0,
        leadsLastMonth: 0
      });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const clearFilters = () => {
    setFilters(prev => ({
      ...prev,
      startDate: '',
      endDate: '',
      page: 1,
      limit: 50
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const exportLeads = async () => {
    // Validate that both start and end dates are selected
    if (!filters.startDate || !filters.endDate) {
      alert('Please select both start and end dates before downloading.');
      return;
    }

    // Validate that end date is not in the future
    const today = new Date();
    const endDate = new Date(filters.endDate);
    if (endDate > today) {
      alert('End date cannot be in the future. Please select a date up to today.');
      return;
    }

    // Validate that start date is not after end date
    const startDate = new Date(filters.startDate);
    if (startDate > endDate) {
      alert('Start date cannot be after end date.');
      return;
    }

    try {
      setExportLoading(true);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

      // Build query parameters for export
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/leads/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (response.ok) {
        // Check if response is actually an Excel file
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `leads-export-${filters.startDate}-to-${filters.endDate}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          alert('Leads exported successfully!');
        } else {
          // If not Excel, try to parse as JSON to get error message
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.details || 'Invalid response from server');
        }
      } else {
        // Try to get error message from response
        let errorMessage = 'Export failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          errorMessage = `Export failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error exporting leads:', error);
      alert(`Failed to export leads: ${error.message}. Please try again or contact support if the issue persists.`);
    } finally {
      setExportLoading(false);
    }
  };

  const openLeadModal = (lead) => {
    setSelectedLead(lead);
    setEditForm({
      status: lead.status,
      priority: lead.priority,
      notes: lead.notes?.map(note => note.note).join('\n') || '',
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
      tags: lead.tags?.join(', ') || ''
    });
    setShowModal(true);
    setEditMode(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    setEditMode(false);
    setEditForm({});
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveLeadChanges = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

      const updateData = {
        status: editForm.status,
        priority: editForm.priority,
        followUpDate: editForm.followUpDate ? new Date(editForm.followUpDate) : null,
        tags: editForm.tags ? editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      // Add notes if they exist
      if (editForm.notes && editForm.notes.trim()) {
        updateData.$push = {
          notes: {
            note: editForm.notes,
            addedAt: new Date()
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/${selectedLead._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // Refresh the leads list
        fetchForms();
        closeModal();
        alert('Lead updated successfully!');
      } else {
        throw new Error('Failed to update lead');
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead. Please try again.');
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
    <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />


    
      {/* lead page content */}
     <div className="container py-4 mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h2 fw-bold text-dark">Leads Management</h2>
        <div className="text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Manage and export your leads data
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3 col-sm-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="p-2 bg-primary bg-opacity-10 rounded-3 me-3">
                  <i className="bi bi-people-fill text-primary fs-4"></i>
                </div>
                <div>
                  <p className="text-muted small mb-1">Total Leads</p>
                  <h4 className="fw-bold text-dark mb-0">{stats.totalLeads || 0}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="p-2 bg-success bg-opacity-10 rounded-3 me-3">
                  <i className="bi bi-calendar-day text-success fs-4"></i>
                </div>
                <div>
                  <p className="text-muted small mb-1">Today's Leads</p>
                  <h4 className="fw-bold text-dark mb-0">{stats.todayLeads || 0}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="p-2 bg-warning bg-opacity-10 rounded-3 me-3">
                  <i className="bi bi-calendar-check text-warning fs-4"></i>
                </div>
                <div>
                  <p className="text-muted small mb-1">This Month</p>
                  <h4 className="fw-bold text-dark mb-0">{stats.leadsThisMonth || 0}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="p-2 bg-info bg-opacity-10 rounded-3 me-3">
                  <i className="bi bi-calendar-minus text-info fs-4"></i>
                </div>
                <div>
                  <p className="text-muted small mb-1">Last Month</p>
                  <h4 className="fw-bold text-dark mb-0">{stats.leadsLastMonth || 0}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            <i className="bi bi-calendar-range me-2"></i>Filter Leads by Date Range
          </h5>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-medium">From Date <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-medium">To Date <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="col-md-4">
              <div className="d-flex gap-2">
                <button
                  onClick={clearFilters}
                  className="btn btn-outline-secondary"
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Clear
                </button>
                <button
                  onClick={exportLeads}
                  disabled={exportLoading || !filters.startDate || !filters.endDate}
                  className="btn btn-success"
                  title={!filters.startDate || !filters.endDate ? "Please select both start and end dates" : ""}
                >
                  {exportLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-1" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-download me-1"></i>
                      Download Excel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white border-bottom">
          <h5 className="card-title mb-0">
            <i className="bi bi-list-ul me-2"></i>
            All Leads ({pagination.total || forms.length})
          </h5>
        </div>

        {loading ? (
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Loading leads...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="card-body text-center py-5">
            <i className="bi bi-inbox display-1 text-muted"></i>
            <p className="text-muted mt-2">No leads found</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">City</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Property Interested</th>
                  <th scope="col">Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((item) => (
                  <tr key={item._id}>
                    <td className="fw-medium">{item.name}</td>
                    <td>{item.city || 'N/A'}</td>
                    <td>{item.phone}</td>
                    <td>
                      <span className="text-primary fw-medium">
                        {item.propertyName || item.propertyInterest || 'N/A'}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="card-footer bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Showing {((pagination.current - 1) * filters.limit) + 1} to {Math.min(pagination.current * filters.limit, pagination.total)} of {pagination.total} results
              </div>
              <nav aria-label="Page navigation">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${pagination.current <= 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.current - 1)}
                      disabled={pagination.current <= 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  
                  {Array.from({ length: Math.min(5, Math.min(20, pagination.pages)) }, (_, i) => {
                    const pageNum = Math.max(1, pagination.current - 2) + i;
                    const maxPages = Math.min(20, pagination.pages);
                    if (pageNum > maxPages) return null;
                    
                    return (
                      <li key={pageNum} className={`page-item ${pageNum === pagination.current ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${pagination.current >= pagination.pages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.current + 1)}
                      disabled={pagination.current >= pagination.pages}
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

      {/* Lead Detail Modal */}
      {showModal && selectedLead && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-person-lines-fill me-2"></i>
                  {editMode ? 'Edit Lead' : 'Lead Details'}
                </h5>
                <div className="d-flex gap-2">
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="btn btn-primary btn-sm"
                    >
                      <i className="bi bi-pencil me-1"></i>
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    aria-label="Close"
                  ></button>
                </div>
              </div>

              <div className="modal-body">
                {/* Basic Information */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Name</label>
                    <p className="form-control-plaintext">{selectedLead.name}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Email</label>
                    <p className="form-control-plaintext">{selectedLead.email}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Phone</label>
                    <p className="form-control-plaintext">{selectedLead.phone}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">City</label>
                    <p className="form-control-plaintext">{selectedLead.city || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Property Interested</label>
                    <p className="form-control-plaintext text-primary fw-medium">
                      {selectedLead.propertyName || selectedLead.propertyInterest || 'N/A'}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Property ID</label>
                    <p className="form-control-plaintext text-muted small">
                      {selectedLead.propertyId || 'N/A'}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Source</label>
                    <p className="form-control-plaintext">
                      {selectedLead.source ? selectedLead.source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Form Type</label>
                    <p className="form-control-plaintext">
                      {selectedLead.formType ? selectedLead.formType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Status</label>
                    {editMode ? (
                      <select
                        className="form-select"
                        value={editForm.status}
                        onChange={(e) => handleEditChange('status', e.target.value)}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="in-progress">In Progress</option>
                        <option value="qualified">Qualified</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    ) : (
                      <p className="form-control-plaintext">
                        {selectedLead.status ? selectedLead.status.replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-medium">Priority</label>
                    {editMode ? (
                      <select
                        className="form-select"
                        value={editForm.priority}
                        onChange={(e) => handleEditChange('priority', e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    ) : (
                      <p className="form-control-plaintext">
                        {selectedLead.priority ? selectedLead.priority.replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message */}
                {selectedLead.message && (
                  <div className="mb-4">
                    <label className="form-label fw-medium">Message</label>
                    <div className="bg-light p-3 rounded">
                      <p className="mb-0">{selectedLead.message}</p>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Property URL</label>
                    <p className="form-control-plaintext">
                      {selectedLead.propertyUrl ? (
                        <a href={selectedLead.propertyUrl} target="_blank" rel="noopener noreferrer" className="text-primary">
                          {selectedLead.propertyUrl}
                        </a>
                      ) : 'N/A'}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">IP Address</label>
                    <p className="form-control-plaintext text-muted small">
                      {selectedLead.metadata?.ipAddress || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                {selectedLead.metadata && (
                  <div className="mb-4">
                    <label className="form-label fw-medium">Metadata</label>
                    <div className="bg-light p-3 rounded">
                      <pre className="mb-0 small text-muted">
                        {JSON.stringify(selectedLead.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Follow Up Date */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Follow Up Date</label>
                  {editMode ? (
                    <input
                      type="date"
                      className="form-control"
                      value={editForm.followUpDate}
                      onChange={(e) => handleEditChange('followUpDate', e.target.value)}
                    />
                  ) : (
                    <p className="form-control-plaintext">
                      {selectedLead.followUpDate ? new Date(selectedLead.followUpDate).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Tags</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.tags}
                      onChange={(e) => handleEditChange('tags', e.target.value)}
                      placeholder="Enter tags separated by commas"
                    />
                  ) : (
                    <p className="form-control-plaintext">
                      {selectedLead.tags && selectedLead.tags.length > 0 ? selectedLead.tags.join(', ') : 'No tags'}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Notes</label>
                  {editMode ? (
                    <textarea
                      className="form-control"
                      value={editForm.notes}
                      onChange={(e) => handleEditChange('notes', e.target.value)}
                      placeholder="Add a new note..."
                      rows={3}
                    />
                  ) : (
                    <div className="bg-light p-3 rounded">
                      {selectedLead.notes && selectedLead.notes.length > 0 ? (
                        selectedLead.notes.map((note, index) => (
                          <div key={index} className="mb-2 last:mb-0">
                            <p className="mb-1">{note.note}</p>
                            <small className="text-muted">
                              {new Date(note.addedAt).toLocaleString()}
                            </small>
                          </div>
                        ))
                      ) : (
                        'No notes'
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="row g-3 text-muted small">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Created</label>
                    <p className="form-control-plaintext">{new Date(selectedLead.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Last Updated</label>
                    <p className="form-control-plaintext">{new Date(selectedLead.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              {editMode && (
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditMode(false)}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={saveLeadChanges}
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
     
    
    </ProtectedRoute>
  );
}
