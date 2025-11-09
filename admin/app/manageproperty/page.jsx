'use client'
import React, { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import AddPropertyForm from "@/components/addaproperty";
import LoadingSpinner, { FullPageSpinner, TableSpinner, ButtonSpinner } from "@/components/LoadingSpinner";
import ProtectedRoute from "@/components/ProtectedRoute";
import { fetchAllPropertyViews } from "@/lib/propertyViews";

export default function ManageProperty() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [propertyViews, setPropertyViews] = useState([]);

  const [filters, setFilters] = useState({ city: '', type: '', name: '', builder: '' });
  const [appliedFilters, setAppliedFilters] = useState({ city: '', type: '', name: '', builder: '' });
  const [editingProperty, setEditingProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0, limit: 50 });
  const [hasMounted, setHasMounted] = useState(false);
  
  // Dropdown data state
  const [dropdownData, setDropdownData] = useState({
    categories: [],
    cities: [],
    builders: []
  });

  // API Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
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

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Fetch property views from API
  const fetchPropertyViews = async () => {
    try {
      const views = await fetchAllPropertyViews();
      setPropertyViews(views);
    } catch (error) {
      // Error fetching property views
    }
  };

  // Fetch properties from API
  const fetchProperties = async (page = 1, isInitial = false) => {
    try {
      if (isInitial) {
        setIsInitialLoading(true);
      } else {
        setIsLoading(true);
      }
      
      const queryParams = new URLSearchParams();
      if (appliedFilters.type) queryParams.append('type', appliedFilters.type);
      if (appliedFilters.city) queryParams.append('city', appliedFilters.city);
      if (appliedFilters.name) queryParams.append('name', appliedFilters.name);
      if (appliedFilters.builder) queryParams.append('builder', appliedFilters.builder);
      queryParams.append('page', page);
      queryParams.append('limit', '50');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/properties?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setProperties(data.data);
        setPagination(data.pagination);
      } else {
        showNotification('Failed to fetch properties', 'danger');
      }
    } catch (error) {
      showNotification('Error fetching properties', 'danger');
    } finally {
      if (isInitial) {
        setIsInitialLoading(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Fetch dropdown data from API
  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/properties/dropdown-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setDropdownData(data.data);
      } else {
        // Failed to fetch dropdown data
      }
    } catch (error) {
      // Error fetching dropdown data
    }
  };

  // Helper function to get view count for a property
  const getPropertyViewCount = (propertyId) => {
    const propertyView = propertyViews.find(pv => pv.propertyId && pv.propertyId._id === propertyId);
    return propertyView ? propertyView.viewCount : 0;
  };

  // Load properties and dropdown data on component mount
  useEffect(() => {
    fetchProperties(1, true);
    fetchDropdownData();
    fetchPropertyViews();
    setHasMounted(true);
  }, []); // Only run once on mount

  // Refetch when appliedFilters change (but not on initial mount)
  useEffect(() => {
    if (hasMounted) {
      fetchProperties(1, false);
    }
  }, [appliedFilters]);

  // Create or update property
  const saveProperty = async (propertyData) => {
    try {
      setIsSaving(true);
      
      // Extract _id before sending (it goes in URL, not body)
      const propertyId = propertyData._id;
      const url = propertyId 
        ? `${API_BASE_URL}/api/properties/${propertyId}`
        : `${API_BASE_URL}/api/properties`;
      
      const method = propertyId ? 'PUT' : 'POST';
      
      // Remove _id from body (it's only used in URL for updates)
      const { _id, ...bodyData } = propertyData;
      
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });
      
      // Check for 401/403 errors before parsing JSON
      if (response.status === 401 || response.status === 403) {
        throw new Error('AUTH_EXPIRED');
      }
      
      const data = await response.json();
      
      if (data.success) {
        showNotification(
          propertyData._id ? 'Property updated successfully' : 'Property added successfully', 
          'success'
        );
        fetchProperties(); // Refresh the list
        fetchPropertyViews(); // Refresh property views
        setEditingProperty(null);
        setShowModal(false);
      } else {
        // Check if it's a token expiration error
        if (data.code === 'AUTH_FAILED' || data.error?.includes('jwt expired') || data.error?.includes('token expired')) {
          showNotification('Your session has expired. Please log in again.', 'danger');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          showNotification(data.error || 'Failed to save property', 'danger');
        }
      }
    } catch (error) {
      // Check for expired token errors
      if (error.message === 'AUTH_EXPIRED' || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        showNotification('Your session has expired. Please log in again.', 'danger');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        showNotification('Error saving property. Please try again.', 'danger');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Delete property
  const deleteProperty = async (id) => {
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Property deleted successfully', 'success');
        fetchProperties(); // Refresh the list
      } else {
        showNotification(data.error || 'Failed to delete property', 'danger');
      }
    } catch (error) {
      showNotification('Error deleting property', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      deleteProperty(id);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to page 1
  };

  const clearFilters = () => {
    const emptyFilters = { city: '', type: '', name: '', builder: '' };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to page 1
  };

  // No need for client-side filtering since we're using server-side pagination
  const filteredProperties = properties;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'sold': return 'danger';
      case 'rented': return 'primary';
      default: return 'secondary';
    }
  };

  const handleSaveProperty = async (property) => {
    if (property === null) {
      setEditingProperty(null);
      setShowModal(false);
      return;
    }

    try {
      await saveProperty(property);
    } catch (error) {
      // Re-throw error so AddPropertyForm can handle it and show in UploadProgress
      throw error;
    }
  };

  const openModal = (type = 'regular', property = null) => {
    setEditingProperty(property || { type });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProperty(null);
  };

  return (
    <ProtectedRoute>
      <div className="d-flex">
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex-grow-1">
          <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />
          
          {/* Full page loading spinner */}
          {isInitialLoading && <FullPageSpinner text="Loading properties..." />}
          
          <div className="container mb-5">
            {/* Notification Toast */}
            {notification.show && (
              <div className={`toast-container position-fixed top-0 end-0 p-3`} style={{ zIndex: 9999 }}>
                <div className={`toast show`} role="alert">
                  <div className={`toast-header bg-${notification.type === 'success' ? 'success' : 'danger'} text-white`}>
                    <strong className="me-auto">
                      {notification.type === 'success' ? 'Success' : 'Error'}
                    </strong>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white" 
                      onClick={() => setNotification({ show: false, message: '', type: '' })}
                    ></button>
                  </div>
                  <div className="toast-body">
                    {notification.message}
                  </div>
                </div>
              </div>
            )}

            <div className="container-fluid mt-5 pt-5">
              {/* Header Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                      <h2 className="mb-1 fw-bold">Manage Properties</h2>
                      <p className="text-muted mb-0">Manage and organize your property listings</p>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      <button 
                        className="btn btn-success d-flex align-items-center gap-2" 
                        onClick={() => openModal('regular')}
                        disabled={isLoading || isSaving || isDeleting}
                      >
                        <i className="bi bi-plus-circle"></i>
                        Add Regular Property
                      </button>
                      <button 
                        className="btn btn-primary d-flex align-items-center gap-2" 
                        onClick={() => openModal('builder')}
                        disabled={isLoading || isSaving || isDeleting}
                      >
                        <i className="bi bi-building"></i>
                        Add Builder Property
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-light">
                <h5 className="card-title mb-0">
                  <i className="bi bi-funnel me-2"></i>
                  Filters & Search
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Property Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by property name..."
                      name="name"
                      value={filters.name}
                      onChange={handleFilterChange}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Property Type</label>
                    <select
                      className="form-select"
                      name="type"
                      value={filters.type}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Types</option>
                      <option value="regular">Regular Property</option>
                      <option value="builder">Builder Property</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">City</label>
                    <select
                      className="form-select"
                      name="city"
                      value={filters.city}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Cities</option>
                      {dropdownData.cities.map(city => (
                        <option key={city._id} value={city._id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Builder</label>
                    <select
                      className="form-select"
                      name="builder"
                      value={filters.builder}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Builders</option>
                      {dropdownData.builders.map(builder => (
                        <option key={builder._id} value={builder._id}>
                          {builder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-12 d-flex justify-content-end gap-2">
                    <button 
                      className="btn btn-outline-secondary" 
                      onClick={clearFilters}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Clear Filters
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={applyFilters}
                      disabled={isLoading}
                    >
                      <i className="bi bi-funnel-fill me-1"></i>
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* Properties Table */}
        <div className="container card shadow-sm mb-5">
          <div className="card-header bg-white border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                Properties ({properties.length})
              </h5>
              <div className="text-muted small">
                Page {pagination.current} of {pagination.pages}
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0" style={{width: '60px'}}>Image</th>
                    <th className="border-0">Property</th>
                    <th className="border-0">Type</th>
                    <th className="border-0">Location</th>
                    <th className="border-0">Category</th>
                    {/* <th className="border-0">Status</th> */}
                    <th className="border-0">Views</th>
                    <th className="border-0">Created</th>
                    <th className="border-0 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableSpinner colSpan="9" text="Loading properties..." />
                  ) : filteredProperties.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5">
                        <div className="text-muted">
                          <i className="bi bi-search display-4 d-block mb-3"></i>
                          <h5>No properties found</h5>
                          <p>
                            {Object.values(appliedFilters).some(v => v !== '') 
                              ? 'No properties match your current filters. Try adjusting your search criteria or clearing filters.'
                              : 'Try adjusting your filters or add a new property.'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProperties.map(p => (
                    <tr key={p._id} className="align-middle">
                      <td>
                        {(() => {
                          // Get the best available image URL
                          const imageUrl = p.displayImage || 
                                         (p.projectImages && p.projectImages[0]) || 
                                         p.wallpaperImage || 
                                         (p.images && p.images[0]);

                          return imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={p.title}
                              className="img-thumbnail"
                              style={{width: '50px', height: '50px', objectFit: 'cover'}}
                            />
                          ) : (
                            <div 
                              className="d-flex align-items-center justify-content-center bg-light text-muted"
                              style={{
                                width: '50px', 
                                height: '50px', 
                                fontSize: '12px'
                              }}
                            >
                              <i className="bi bi-image"></i>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold">
                            {p.type === 'builder' ? p.projectName : p.title}
                          </div>
                          {p.builder && <small className="text-muted">by {p.builder?.name || p.builder}</small>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${p.type === 'regular' ? 'bg-info' : 'bg-warning'} text-dark`}>
                          {p.type === 'regular' ? 'Regular' : 'Builder'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div>{p.city?.name || p.city}</div>
                          <small className="text-muted">{p.localityName || p.locality?.name || p.location}</small>
                        </div>
                      </td>
                      <td>
                        {p.type === 'regular' ? (
                          <div>
                            <div className="fw-semibold">{p.category?.name || p.category}</div>
                            <small className="text-muted">{p.subcategoryName || p.subcategory}</small>
                          </div>
                        ) : (
                          <>
                           <div className="fw-semibold">{p.category?.name || p.category}</div>
                           <small className="text-muted">{p.subcategoryName || p.subcategory}</small>
                           {p.areaType && (
                             <div className="mt-1">
                               <span className="badge bg-light text-dark">
                                 <i className="bi bi-rulers me-1"></i>
                                 {p.areaType}
                               </span>
                             </div>
                           )}
                          </>
                         
                        )}
                      </td>
                      {/* <td>
                        <span className={`badge bg-${getStatusBadge(p.status)}`}>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td> */}
                      <td>
                        <div className="d-flex align-items-center">
                          <i className="bi bi-eye me-1 text-muted"></i>
                          <span className="fw-semibold">{getPropertyViewCount(p._id)}</span>
                        </div>
                      </td>
                      <td>
                        <small>{typeof window !== 'undefined' ? new Date(p.createdAt).toLocaleDateString() : p.createdAt}</small>
                      </td>
                      <td className="text-center">
                        <div className="btn-group" role="group">
                          <button 
                            className="btn btn-sm btn-outline-primary" 
                            onClick={() => openModal(p.type, p)}
                            title="Edit Property"
                            disabled={isLoading || isSaving || isDeleting}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger" 
                            onClick={() => handleDelete(p._id)}
                            title="Delete Property"
                            disabled={isLoading || isSaving || isDeleting}
                          >
                            {isDeleting ? <ButtonSpinner size="sm" color="danger" /> : <i className="bi bi-trash"></i>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {properties.length > 0 && (
            <div className="card-footer bg-white border-top">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-muted">
                  Showing {((pagination.current - 1) * pagination.limit) + 1} to {Math.min(pagination.current * pagination.limit, pagination.total || properties.length)} of {pagination.total || properties.length} properties
                </div>
                <nav aria-label="Properties pagination">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => fetchProperties(pagination.current - 1)}
                        disabled={pagination.current === 1 || isLoading}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, Math.max(1, pagination.pages || 1)) }, (_, i) => {
                      let pageNum;
                      const totalPages = pagination.pages || 1;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.current <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.current >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = pagination.current - 2 + i;
                      }
                      
                      return (
                        <li key={pageNum} className={`page-item ${pagination.current === pageNum ? 'active' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => fetchProperties(pageNum)}
                            disabled={isLoading}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    
                    <li className={`page-item ${pagination.current === (pagination.pages || 1) ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => fetchProperties(pagination.current + 1)}
                        disabled={pagination.current === (pagination.pages || 1) || isLoading}
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

          {/* Bootstrap Modal */}
          {showModal && (
            <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-xl">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="bi bi-building me-2"></i>
                      {editingProperty?._id ? 'Edit Property' : 'Add New Property'}
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={closeModal}
                      disabled={isLoading}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <AddPropertyForm 
                      property={editingProperty} 
                      onSave={handleSaveProperty}
                      isLoading={isSaving}
                      dropdownData={dropdownData}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
