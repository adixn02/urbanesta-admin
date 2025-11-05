// admin/app/buildermanagement/page.jsx
'use client'
import React,{useState, useEffect} from "react";
import FilePreview from "@/components/filePreview";
import BuildersTable from "@/components/BuildersTable";
import logo from "../../public/img/logo.jpg";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';


export default function BuilderManagement() {
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

const showNotification = (message, type = 'success') => {
  setNotification({ show: true, message, type });
  setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
};

const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
};

const handleSignOut = async () => {
    try {
      const { logout: apiLogout } = await import('@/lib/logout');
      await apiLogout();
      window.location.href = '/';
    } catch (error) {
      // Error during logout - clear local storage
      localStorage.clear();
      document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/';
    }
};

  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertyCounts, setPropertyCounts] = useState({});

  // Fetch property count for a builder
  const fetchPropertyCount = async (builderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/builders/${builderId}/property-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  };

  useEffect(() => {
    const fetchBuilders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/builders`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setBuilders(data);
          
          // Fetch property counts for all builders
          const counts = {};
          for (const builder of data) {
            counts[builder._id] = await fetchPropertyCount(builder._id);
          }
          setPropertyCounts(counts);
        } else {
          showNotification("Failed to load builders. Please check if the server is running.", 'danger');
        }
      } catch (error) {
        showNotification("Error loading builders. Please check your connection.", 'danger');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBuilders();
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editingBuilder, setEditingBuilder] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [originalFormData, setOriginalFormData] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  function emptyForm() {
    return {
      name: "",
      description: "",
      logo: "",
      backgroundImage: "",
      isActive: true,
      displayOrder: 0,
      establishedYear: "",
      headquarters: "",
      website: ""
    };
  }

  const uploadBuilderImages = async (logoFile, backgroundFile) => {
    const formData = new FormData();
    
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    if (backgroundFile) {
      formData.append('backgroundImage', backgroundFile);
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/upload/builder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return data.files;
  };

  // Check if form has changes
  const hasFormChanges = () => {
    if (!editingBuilder || !originalFormData) {
      return true; // Always enabled for new entries
    }

    // Compare form data with original
    const currentData = {
      name: formData.name || "",
      description: formData.description || "",
      logo: formData.logo || "",
      backgroundImage: formData.backgroundImage || "",
      isActive: formData.isActive !== undefined ? formData.isActive : true,
      establishedYear: String(formData.establishedYear || ""),
      headquarters: formData.headquarters || "",
      website: formData.website || "",
      displayOrder: formData.displayOrder || 0
    };

    const originalData = {
      name: originalFormData.name || "",
      description: originalFormData.description || "",
      logo: originalFormData.logo || "",
      backgroundImage: originalFormData.backgroundImage || "",
      isActive: originalFormData.isActive !== undefined ? originalFormData.isActive : true,
      establishedYear: String(originalFormData.establishedYear || ""),
      headquarters: originalFormData.headquarters || "",
      website: originalFormData.website || "",
      displayOrder: originalFormData.displayOrder || 0
    };

    // Check if any field changed
    const formChanged = JSON.stringify(currentData) !== JSON.stringify(originalData);
    
    // Also check if new files were selected
    const filesChanged = logoFile !== null || backgroundFile !== null;

    return formChanged || filesChanged;
  };

  // Validate Builder Form
  const validateBuilderForm = () => {
    const errors = {};
    
    // Validate mandatory fields
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Name is required';
    }
    
    // Validate established year - handle both string and number types
    const establishedYearStr = formData.establishedYear ? String(formData.establishedYear).trim() : '';
    if (!establishedYearStr || establishedYearStr === '') {
      errors.establishedYear = 'Established year is required';
    } else {
      const year = parseInt(establishedYearStr);
      if (isNaN(year) || year < 1800 || year > new Date().getFullYear()) {
        errors.establishedYear = 'Please enter a valid year';
      }
    }
    
    if (!formData.headquarters || formData.headquarters.trim() === '') {
      errors.headquarters = 'Headquarters is required';
    }
    
    if (!formData.website || formData.website.trim() === '') {
      errors.website = 'Website is required';
    } else {
      // Basic URL validation
      try {
        new URL(formData.website);
      } catch {
        errors.website = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }
    
    if (!formData.description || formData.description.trim() === '') {
      errors.description = 'Description is required';
    }
    
    // Validate logo - must have either existing URL or new file
    if ((!formData.logo || formData.logo.trim() === '') && !logoFile) {
      errors.logo = 'Logo is required';
    }
    
    // Validate background image - must have either existing URL or new file
    if ((!formData.backgroundImage || formData.backgroundImage.trim() === '') && !backgroundFile) {
      errors.backgroundImage = 'Background image is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateBuilderForm()) {
      showNotification('Please fill all mandatory fields', 'danger');
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload images first (only if new files are selected)
      let logoUrl = formData.logo;
      let backgroundUrl = formData.backgroundImage;

      if (logoFile || backgroundFile) {
        const uploadedFiles = await uploadBuilderImages(logoFile, backgroundFile);
        logoUrl = uploadedFiles.logo || logoUrl;
        backgroundUrl = uploadedFiles.backgroundImage || backgroundUrl;
      }

      // Prepare builder data (exclude specialties)
      const builderData = {
        name: formData.name,
        description: formData.description,
        logo: logoUrl,
        backgroundImage: backgroundUrl,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
        establishedYear: formData.establishedYear,
        headquarters: formData.headquarters,
        website: formData.website
      };

      const url = editingBuilder ? `${API_BASE_URL}/api/builders/${editingBuilder._id}` : `${API_BASE_URL}/api/builders`;
      const method = editingBuilder ? "PUT" : "POST";

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(builderData),
      });

      if (response.ok) {
        const result = await response.json();
        const savedBuilder = (result && typeof result === 'object' && 'success' in result)
          ? result.data
          : result;

        if (editingBuilder) {
          setBuilders(
            builders.map((b) =>
              b._id === editingBuilder._id ? savedBuilder : b
            )
          );
        } else {
          setBuilders([...builders, savedBuilder]);
        }

        setFormData(emptyForm());
        setOriginalFormData(null);
        setLogoFile(null);
        setBackgroundFile(null);
        setEditingBuilder(null);
        setFormErrors({});
        setShowForm(false);
        showNotification(editingBuilder ? 'Builder updated successfully!' : 'Builder created successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to save builder', 'danger');
      }
    } catch (error) {
      showNotification("Failed to save builder. Please try again.", 'danger');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (builder) => {
    setEditingBuilder(builder);
    const initialFormData = {
      name: builder.name || "",
      description: builder.description || "",
      logo: builder.logo || "",
      backgroundImage: builder.backgroundImage || "",
      isActive: builder.isActive !== undefined ? builder.isActive : true,
      establishedYear: builder.establishedYear || "",
      headquarters: builder.headquarters || "",
      website: builder.website || "",
      displayOrder: builder.displayOrder || 0
    };
    setFormData(initialFormData);
    setOriginalFormData(JSON.parse(JSON.stringify(initialFormData))); // Deep copy
    setLogoFile(null);
    setBackgroundFile(null);
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const propertyCount = propertyCounts[id] || 0;
    if (propertyCount > 0) {
      showNotification(`Cannot delete builder. ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} exist under this builder.`, 'danger');
      return;
    }

    if (confirm("Delete this builder?")) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/builders/${id}`, {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setBuilders(builders.filter((b) => b._id !== id));
          showNotification('Builder deleted successfully!', 'success');
        } else {
          const errorData = await response.json();
          showNotification(errorData.error || 'Failed to delete builder', 'danger');
        }
      } catch (error) {
        showNotification("Failed to delete builder. Please try again.", 'danger');
      }
    }
  };




  const refreshBuilders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/builders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBuilders(data);
      } else {
        console.error("Failed to fetch builders");
        alert("Failed to load builders. Please check if the server is running.");
      }
    } catch (error) {
      console.error("Error fetching builders:", error);
      alert("Error loading builders. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop functionality
  const [localBuilders, setLocalBuilders] = useState(builders);
  const [hasChanges, setHasChanges] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update local state when builders prop changes
  React.useEffect(() => {
    setLocalBuilders(builders);
    setHasChanges(false);
  }, [builders]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setLocalBuilders((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update displayOrder for each item based on new position
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          displayOrder: index
        }));
        
        setHasChanges(true);
        return updatedItems;
      });
    }
  };

  const handleSaveOrder = async () => {
    try {
      setIsUpdatingOrder(true);
      
      // Prepare builders data with new display order
      const buildersData = localBuilders.map((builder, index) => ({
        id: builder._id,
        displayOrder: index
      }));
      

      // Use the bulk update endpoint
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/builders/order`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ builders: buildersData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // API Error
        throw new Error(`Failed to save builder order: ${errorData.error || 'Unknown error'}`);
      }

      setHasChanges(false);
      await refreshBuilders();
      setShowSuccessPopup(true);
      
      // Auto-hide success popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    } catch (error) {
      // Error saving builder order
      setErrorMessage(error.message);
      setShowErrorPopup(true);
      
      // Auto-hide error popup after 5 seconds
      setTimeout(() => {
        setShowErrorPopup(false);
      }, 5000);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  return (
    <ProtectedRoute>
      {notification.show && (
        <div className={`alert alert-${notification.type === 'danger' ? 'danger' : 'success'} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`} style={{zIndex: 9999, minWidth: '300px'}} role="alert">
          {notification.message}
          <button type="button" className="btn-close" onClick={() => setNotification({ show: false, message: '', type: 'success' })}></button>
        </div>
      )}
      <div className="d-flex">
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex-grow-1">
          <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />

      {/* builder page content */}
      <div className="container py-4 mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">Builder Management</h2>
        <button className="btn btn-primary" onClick={() => {
          setFormData(emptyForm());
          setOriginalFormData(null);
          setLogoFile(null);
          setBackgroundFile(null);
          setEditingBuilder(null);
          setFormErrors({});
          setShowForm(true);
        }}>
          + Add Builder
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            {editingBuilder ? "Edit Builder" : "Add Builder"}
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              {/* Name */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: '' });
                    }
                  }}
                  className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                  placeholder="Enter builder name"
                />
                {formErrors.name && (
                  <div className="invalid-feedback">{formErrors.name}</div>
                )}
              </div>

              {/* Established Year */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Established Year <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={formData.establishedYear}
                  onChange={(e) => {
                    setFormData({ ...formData, establishedYear: e.target.value });
                    if (formErrors.establishedYear) {
                      setFormErrors({ ...formErrors, establishedYear: '' });
                    }
                  }}
                  className={`form-control ${formErrors.establishedYear ? 'is-invalid' : ''}`}
                  placeholder="1990"
                  min="1800"
                  max={new Date().getFullYear()}
                />
                {formErrors.establishedYear && (
                  <div className="invalid-feedback">{formErrors.establishedYear}</div>
                )}
              </div>

              {/* Headquarters */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Headquarters <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.headquarters}
                  onChange={(e) => {
                    setFormData({ ...formData, headquarters: e.target.value });
                    if (formErrors.headquarters) {
                      setFormErrors({ ...formErrors, headquarters: '' });
                    }
                  }}
                  className={`form-control ${formErrors.headquarters ? 'is-invalid' : ''}`}
                  placeholder="Mumbai, India"
                />
                {formErrors.headquarters && (
                  <div className="invalid-feedback">{formErrors.headquarters}</div>
                )}
              </div>

              {/* Website */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Website <span className="text-danger">*</span>
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => {
                    setFormData({ ...formData, website: e.target.value });
                    if (formErrors.website) {
                      setFormErrors({ ...formErrors, website: '' });
                    }
                  }}
                  className={`form-control ${formErrors.website ? 'is-invalid' : ''}`}
                  placeholder="https://example.com"
                />
                {formErrors.website && (
                  <div className="invalid-feedback">{formErrors.website}</div>
                )}
              </div>

              {/* Description */}
              <div className="col-12">
                <label className="form-label fw-semibold">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (formErrors.description) {
                      setFormErrors({ ...formErrors, description: '' });
                    }
                  }}
                  className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                  rows="4"
                  placeholder="Enter builder description"
                />
                {formErrors.description && (
                  <div className="invalid-feedback">{formErrors.description}</div>
                )}
              </div>

              {/* Images */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Upload Logo <span className="text-danger">*</span>
                </label>
                <FilePreview
                  label=""
                  value={formData.logo}
                  onChange={(file) => {
                    setLogoFile(file);
                    if (formErrors.logo) {
                      setFormErrors({ ...formErrors, logo: '' });
                    }
                  }}
                />
                {formErrors.logo && (
                  <div className="text-danger small mt-1">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {formErrors.logo}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Upload Background <span className="text-danger">*</span>
                </label>
                <FilePreview
                  label=""
                  value={formData.backgroundImage}
                  onChange={(file) => {
                    setBackgroundFile(file);
                    if (formErrors.backgroundImage) {
                      setFormErrors({ ...formErrors, backgroundImage: '' });
                    }
                  }}
                />
                {formErrors.backgroundImage && (
                  <div className="text-danger small mt-1">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {formErrors.backgroundImage}
                  </div>
                )}
              </div>



              {/* Active toggle */}
              <div className="col-12 form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  id="isActive"
                />
                <label className="form-check-label" htmlFor="isActive">
                  Active
                </label>
              </div>

              <div className="col-12">
                <button 
                  type="submit" 
                  className="btn btn-success me-2"
                  disabled={isUploading || (editingBuilder && !hasFormChanges())}
                >
                  {isUploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {editingBuilder ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingBuilder ? "Update" : "Create"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(emptyForm());
                    setOriginalFormData(null);
                    setLogoFile(null);
                    setBackgroundFile(null);
                    setEditingBuilder(null);
                    setFormErrors({});
                    setShowForm(false);
                  }}
                  className="btn btn-secondary"
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Builders List</h5>
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Drag and drop to reorder builders. The first builder will appear first on the website.
          </small>
        </div>
        <div className="card-body p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="table table-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "60px" }}>Drag</th>
                  <th style={{ width: "100px" }}>Logo</th>
                  <th>Builder</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={localBuilders.map((builder, i) => builder?._id || builder?.id || `${builder?.name || 'builder'}-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <BuildersTable
                    builders={localBuilders}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    hasChanges={hasChanges}
                    isUpdatingOrder={isUpdatingOrder}
                    onSaveOrder={handleSaveOrder}
                    onReset={() => {
                      setLocalBuilders(builders);
                      setHasChanges(false);
                    }}
                    propertyCounts={propertyCounts}
                  />
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
      </div>
    </div>

    {/* Success Popup */}
    {showSuccessPopup && (
      <div className="position-fixed top-0 start-50 translate-middle-x" style={{ zIndex: 9999, marginTop: '20px' }}>
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          <strong>Success!</strong> Builder order has been saved successfully.
          <button
            type="button"
            className="btn-close"
            onClick={() => setShowSuccessPopup(false)}
          ></button>
        </div>
      </div>
    )}

    {/* Error Popup */}
    {showErrorPopup && (
      <div className="position-fixed top-0 start-50 translate-middle-x" style={{ zIndex: 9999, marginTop: '20px' }}>
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Error!</strong> {errorMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setShowErrorPopup(false)}
          ></button>
        </div>
      </div>
    )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
