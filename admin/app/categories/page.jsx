'use client'
import React, { useEffect, useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Categories() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [propertyCounts, setPropertyCounts] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [originalCategoryName, setOriginalCategoryName] = useState('');
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [originalSubcategoryName, setOriginalSubcategoryName] = useState('');
  
  // Configuration management states
  const [showConfigurations, setShowConfigurations] = useState(null);
  const [showAddConfiguration, setShowAddConfiguration] = useState(false);
  const [newConfigurationType, setNewConfigurationType] = useState('');
  const [editingConfiguration, setEditingConfiguration] = useState(null);
  const [editConfigurationType, setEditConfigurationType] = useState('');

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

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  
  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch property count for a category
  const fetchPropertyCount = async (categoryId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/property-count`, {
        headers: getAuthHeaders()
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
    fetch(`${API_BASE_URL}/api/categories`, {
      headers: getAuthHeaders()
    })
      .then((res) => res.json())
      .then(async (response) => {
        // Handle both wrapped response {success, data} and direct array
        const data = Array.isArray(response) ? response : (response.data || response);
        // Ensure all categories have the expected structure
        const formattedData = Array.isArray(data) ? data.map(category => ({
          ...category,
          isActive: category.isActive !== undefined ? category.isActive : true,
          deepSubcategories: category.deepSubcategories || []
        })) : [];
        setCategories(formattedData);
        
        // Fetch property counts for all categories
        const counts = {};
        for (const category of formattedData) {
          counts[category._id] = await fetchPropertyCount(category._id);
        }
        setPropertyCounts(counts);
        // Categories fetched successfully
      })
      .catch((err) => {
        // Error fetching categories
        setCategories([]);
      });
  }, []);

  const toggleCategory = (_id) => {
    setExpandedCategory(expandedCategory === _id ? null : _id);
    setShowAddSubcategory(false);
    setNewSubcategoryName('');
    setEditingCategory(null);
    setEditingSubcategory(null);
    setShowConfigurations(null);
  };

  // Configuration management functions
  const toggleConfigurations = (categoryId, subcategoryId) => {
    const key = `${categoryId}-${subcategoryId}`;
    setShowConfigurations(showConfigurations === key ? null : key);
    setShowAddConfiguration(false);
    setNewConfigurationType('');
    setEditingConfiguration(null);
    setEditConfigurationType('');
  };

  const addConfiguration = async (categoryId, subcategoryId) => {
    if (!newConfigurationType.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/subcategories/${subcategoryId}/configurations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: newConfigurationType.trim(),
          isEnabled: true
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCategory = responseData.data || responseData;
        setCategories(prev => prev.map(cat => 
          cat._id === categoryId ? updatedCategory : cat
        ));
        setNewConfigurationType('');
        setShowAddConfiguration(false);
        showNotification('Configuration created successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to create configuration', 'danger');
      }
    } catch (error) {
      showNotification("Error creating configuration", 'danger');
    }
  };

  const updateConfiguration = async (categoryId, subcategoryId, configId) => {
    if (!editConfigurationType.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/subcategories/${subcategoryId}/configurations/${configId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: editConfigurationType.trim()
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCategory = responseData.data || responseData;
        setCategories(prev => prev.map(cat => 
          cat._id === categoryId ? updatedCategory : cat
        ));
        setEditingConfiguration(null);
        setEditConfigurationType('');
        showNotification('Configuration updated successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to update configuration', 'danger');
      }
    } catch (error) {
      showNotification("Error updating configuration", 'danger');
    }
  };

  const deleteConfiguration = async (categoryId, subcategoryId, configId) => {
    if (!confirm("Are you sure you want to delete this configuration?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/subcategories/${subcategoryId}/configurations/${configId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCategory = responseData.data || responseData;
        setCategories(prev => prev.map(cat => 
          cat._id === categoryId ? updatedCategory : cat
        ));
        showNotification('Configuration deleted successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to delete configuration', 'danger');
      }
    } catch (error) {
      showNotification("Error deleting configuration", 'danger');
    }
  };

  // Category CRUD
  const addNewCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newCategoryName.trim(),
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        // Extract category from response.data if it exists, otherwise use response directly
        const newCategory = responseData.data || responseData;
        // Ensure the new category has the expected structure
        const formattedCategory = {
          ...newCategory,
          isActive: newCategory.isActive !== undefined ? newCategory.isActive : true,
          deepSubcategories: newCategory.deepSubcategories || []
        };
        setCategories(prev => [...prev, formattedCategory]);
        setNewCategoryName('');
        setShowAddCategory(false);
        showNotification('Category created successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to create category', 'danger');
      }
    } catch (error) {
      showNotification("Error creating category", 'danger');
    }
  };

  const deleteCategory = async (_id) => {
    const category = categories.find(cat => cat._id === _id);
    if (!category) return;

    const propertyCount = propertyCounts[_id] || 0;
    if (propertyCount > 0) {
      showNotification(`Cannot delete category. ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} exist under this category.`, 'danger');
      return;
    }

    if (!window.confirm(`Delete "${category.name}" and all subcategories?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/categories/${_id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setCategories(prev => prev.filter(cat => cat._id !== _id));
        if (expandedCategory === _id) {
          setExpandedCategory(null);
        }
        showNotification('Category deleted successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to delete category', 'danger');
      }
    } catch (error) {
      showNotification("Error deleting category", 'danger');
    }
  };

  const startEditCategory = (category) => {
    setEditingCategory(category._id);
    setEditCategoryName(category.name);
    setOriginalCategoryName(category.name);
    setEditingSubcategory(null);
  };

  const saveEditCategory = async (_id) => {
    if (!editCategoryName.trim()) return;
    // Check if name actually changed
    if (editCategoryName.trim() === originalCategoryName.trim()) {
      return; // No changes, don't update
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/categories/${_id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editCategoryName.trim(),
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        // Extract category from response.data if it exists, otherwise use response directly
        const updatedCategory = responseData.data || responseData;
        // Ensure the updated category has the expected structure
        const formattedCategory = {
          ...updatedCategory,
          isActive: updatedCategory.isActive !== undefined ? updatedCategory.isActive : true,
          deepSubcategories: updatedCategory.deepSubcategories || []
        };
        setCategories(prev =>
          prev.map(cat =>
            cat._id === _id ? formattedCategory : cat
          )
        );
        setEditingCategory(null);
        setEditCategoryName('');
        setOriginalCategoryName('');
        showNotification('Category updated successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to update category', 'danger');
      }
    } catch (error) {
      showNotification("Error updating category", 'danger');
    }
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName('');
    setOriginalCategoryName('');
  };

  const toggleCategoryStatus = async (_id) => {
    try {
      const category = categories.find(cat => cat._id === _id);
      if (!category) return;

        const response = await fetch(`${API_BASE_URL}/api/categories/${_id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isActive: !category.isActive,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCategory = responseData.data || responseData;
        // Ensure the updated category has the expected structure
        const formattedCategory = {
          ...updatedCategory,
          isActive: updatedCategory.isActive !== undefined ? updatedCategory.isActive : true,
          deepSubcategories: updatedCategory.deepSubcategories || []
        };
        setCategories(prev =>
          prev.map(cat =>
            cat._id === _id ? formattedCategory : cat
          )
        );
        showNotification('Category status updated successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to toggle category status', 'danger');
      }
    } catch (error) {
      showNotification("Error toggling category status", 'danger');
    }
  };

  // Subcategory CRUD
  const addSubcategory = async (categoryId) => {
    if (!newSubcategoryName.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/subcategories`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newSubcategoryName.trim(),
          isActive: true
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        // Extract category from response.data if it exists, otherwise use response directly
        const updatedCategory = responseData.data || responseData;
        // Ensure the updated category has the expected structure
        const formattedCategory = {
          ...updatedCategory,
          isActive: updatedCategory.isActive !== undefined ? updatedCategory.isActive : true,
          deepSubcategories: updatedCategory.deepSubcategories || []
        };
        setCategories(prev =>
          prev.map(cat =>
            cat._id === categoryId ? formattedCategory : cat
          )
        );
        setNewSubcategoryName('');
        setShowAddSubcategory(false);
        showNotification('Subcategory created successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to create subcategory', 'danger');
      }
    } catch (error) {
      showNotification("Error creating subcategory", 'danger');
    }
  };

  const startEditSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory._id);
    setEditSubcategoryName(subcategory.name);
    setOriginalSubcategoryName(subcategory.name);
    setEditingCategory(null);
  };

  const saveEditSubcategory = async (categoryId, subId) => {
    if (!editSubcategoryName.trim()) return;
    // Check if name actually changed
    if (editSubcategoryName.trim() === originalSubcategoryName.trim()) {
      return; // No changes, don't update
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/subcategories/${subId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editSubcategoryName.trim(),
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCategory = responseData.data || responseData;
        // Ensure the updated category has the expected structure
        const formattedCategory = {
          ...updatedCategory,
          isActive: updatedCategory.isActive !== undefined ? updatedCategory.isActive : true,
          deepSubcategories: updatedCategory.deepSubcategories || []
        };
        setCategories(prev =>
          prev.map(cat =>
            cat._id === categoryId ? formattedCategory : cat
          )
        );
        setEditingSubcategory(null);
        setEditSubcategoryName('');
        setOriginalSubcategoryName('');
        showNotification('Subcategory updated successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to update subcategory', 'danger');
      }
    } catch (error) {
      showNotification("Error updating subcategory", 'danger');
    }
  };

  const cancelEditSubcategory = () => {
    setEditingSubcategory(null);
    setEditSubcategoryName('');
    setOriginalSubcategoryName('');
  };

  const toggleSubcategoryStatus = async (categoryId, subId) => {
    try {
      const category = categories.find(cat => cat._id === categoryId);
      if (!category) return;

      const subcategory = category.deepSubcategories.find(sub => sub._id === subId);
      if (!subcategory) return;

      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/subcategories/${subId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isActive: !subcategory.isActive,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCategory = responseData.data || responseData;
        // Ensure the updated category has the expected structure
        const formattedCategory = {
          ...updatedCategory,
          isActive: updatedCategory.isActive !== undefined ? updatedCategory.isActive : true,
          deepSubcategories: updatedCategory.deepSubcategories || []
        };
        setCategories(prev =>
          prev.map(cat =>
            cat._id === categoryId ? formattedCategory : cat
          )
        );
        showNotification('Subcategory status updated successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to toggle subcategory status', 'danger');
      }
    } catch (error) {
      showNotification("Error toggling subcategory status", 'danger');
    }
  };

  const deleteSubcategory = async (categoryId, subId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/subcategories/${subId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCategory = responseData.data || responseData;
        // Ensure the updated category has the expected structure
        const formattedCategory = {
          ...updatedCategory,
          isActive: updatedCategory.isActive !== undefined ? updatedCategory.isActive : true,
          deepSubcategories: updatedCategory.deepSubcategories || []
        };
        setCategories(prev =>
          prev.map(cat =>
            cat._id === categoryId ? formattedCategory : cat
          )
        );
        showNotification('Subcategory deleted successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to delete subcategory', 'danger');
      }
    } catch (error) {
      showNotification("Error deleting subcategory", 'danger');
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

      <div className="container my-5 pt-5 mt-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-4 fw-bold">Deep Category Management</h2>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowAddCategory(true);
              setShowAddSubcategory(false);
              setEditingCategory(null);
              setEditingSubcategory(null);
            }}
          >
            + Add New Category
          </button>
        </div>

        {/* Add Category Form */}
        {showAddCategory && (
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Add New Category</h5>
            </div>
            <div className="card-body">
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
                />
                <div className="d-flex gap-2 mt-2 mb-2">
                  <button className="btn btn-success" onClick={addNewCategory}>
                    Add Category
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddCategory(false);
                      setNewCategoryName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories List */}
        {categories.map((category, index) => (
          <div key={String(category._id || category.id || `category-${index}`)} className="card mb-3">
            <div
              className="card-header d-flex justify-content-between align-items-center"
              style={{ cursor: "pointer" }}
              onClick={() => toggleCategory(category._id)}
            >
              <div className="d-flex align-items-center gap-3">
                {editingCategory === category._id ? (
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      style={{ width: "300px" }}
                      onKeyPress={(e) => e.key === 'Enter' && saveEditCategory(category._id)}
                    />
                    <button 
                      className="btn btn-success btn-sm" 
                      onClick={() => saveEditCategory(category._id)}
                      disabled={editCategoryName.trim() === originalCategoryName.trim()}
                    >
                      Save
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={cancelEditCategory}>Cancel</button>
                  </div>
                ) : (
                  <h5 className="mb-0 fw-bold text-primary">{category.name}</h5>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className={`badge ${category.isActive ? "bg-success" : "bg-danger"}`}>
                  {category.isActive ? "Active" : "Inactive"}
                </span>
                <div className="btn-group">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditCategory(category);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategoryStatus(category._id);
                    }}
                  >
                    {category.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCategory(category._id);
                    }}
                    disabled={propertyCounts[category._id] > 0}
                    title={propertyCounts[category._id] > 0 ? `${propertyCounts[category._id]} propert${propertyCounts[category._id] === 1 ? 'y' : 'ies'} exist under this category` : `Delete "${category.name}" and all subcategories`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {expandedCategory === category._id && (
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>Deep Subcategories</h5>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddSubcategory(true);
                      setEditingSubcategory(null);
                    }}
                  >
                    + Add Subcategory
                  </button>
                </div>

                {showAddSubcategory && (
                  <div className="mb-4 p-3 border rounded">
                    <h6 className="mb-2">Add New Subcategory</h6>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter subcategory name"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addSubcategory(category._id)}
                      />
                      <div className="d-flex gap-2 mt-2">
                        <button className="btn btn-success btn-sm" onClick={() => addSubcategory(category._id)}>
                          Add
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setShowAddSubcategory(false);
                            setNewSubcategoryName('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {category.deepSubcategories?.length > 0 ? (
                  <ul className="list-group">
                    {category.deepSubcategories.map((sub, subIndex) => (
                      <li key={String(sub._id || sub.id || `${category._id || category.id}-sub-${subIndex}`)} className="list-group-item d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                          {editingSubcategory === sub._id ? (
                            <div className="d-flex gap-2 align-items-center">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={editSubcategoryName}
                                onChange={(e) => setEditSubcategoryName(e.target.value)}
                                style={{ width: "250px" }}
                                onKeyPress={(e) => e.key === 'Enter' && saveEditSubcategory(category._id, sub._id)}
                              />
                              <button 
                                className="btn btn-success btn-sm" 
                                onClick={() => saveEditSubcategory(category._id, sub._id)}
                                disabled={editSubcategoryName.trim() === originalSubcategoryName.trim()}
                              >
                                Save
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={cancelEditSubcategory}>Cancel</button>
                            </div>
                          ) : (
                            <span>{sub.name}</span>
                          )}
                        </div>

                        <div className="btn-group">
                          <button
                            className={`btn btn-sm me-2 ${sub.isActive ? "btn-success" : "btn-secondary"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubcategoryStatus(category._id, sub._id);
                            }}
                          >
                            {sub.isActive ? "Active" : "Inactive"}
                          </button>
                          <button
                            className="btn btn-outline-info btn-sm me-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleConfigurations(category._id, sub._id);
                            }}
                          >
                            Configurations ({sub.configurations?.length || 0})
                          </button>
                          <button
                            className="btn btn-outline-primary btn-sm me-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditSubcategory(sub);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete "${sub.name}"?`)) {
                                deleteSubcategory(category._id, sub._id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No subcategories yet.</p>
                )}

                {/* Configuration Management for each subcategory */}
                {category.deepSubcategories?.map((sub, configSubIndex) => {
                  const categoryId = String(category._id || category.id || 'cat');
                  const subId = String(sub._id || sub.id || `sub-${configSubIndex}`);
                  const configKey = `${categoryId}-${subId}`;
                  const isConfigOpen = showConfigurations === configKey;
                  
                  return (
                    <div key={`${categoryId}-config-${subId}`} className={`mt-3 ${isConfigOpen ? '' : 'd-none'}`}>
                      <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <h6 className="mb-0">Configurations for "{sub.name}"</h6>
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setShowAddConfiguration(!showAddConfiguration)}
                          >
                            {showAddConfiguration ? 'Cancel' : 'Add Configuration'}
                          </button>
                        </div>
                        <div className="card-body">
                          {/* Add Configuration Form */}
                          {showAddConfiguration && (
                            <div className="mb-3 p-3 border rounded bg-light">
                              <div className="row">
                                <div className="col-md-8">
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter configuration type (e.g., 1 BHK, 2 BHK)"
                                    value={newConfigurationType}
                                    onChange={(e) => setNewConfigurationType(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addConfiguration(category._id, sub._id)}
                                  />
                                </div>
                                <div className="col-md-4">
                                  <button
                                    className="btn btn-success me-2"
                                    onClick={() => addConfiguration(category._id, sub._id)}
                                    disabled={!newConfigurationType.trim()}
                                  >
                                    Add
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                      setShowAddConfiguration(false);
                                      setNewConfigurationType('');
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Configurations List */}
                          {sub.configurations?.length > 0 ? (
                            <div className="row">
                              {sub.configurations.map((config, configIndex) => {
                                const categoryId = String(category._id || category.id || 'cat');
                                const subId = String(sub._id || sub.id || 'sub');
                                const configId = String(config._id || config.id || `config-${configIndex}`);
                                return (
                                <div key={`${categoryId}-${subId}-${configId}`} className="col-md-6 col-lg-4 mb-3">
                                  <div className="card">
                                    <div className="card-body p-3">
                                      {editingConfiguration === config._id ? (
                                        <div className="d-flex gap-2 align-items-center">
                                          <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={editConfigurationType}
                                            onChange={(e) => setEditConfigurationType(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && updateConfiguration(category._id, sub._id, config._id)}
                                          />
                                          <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => updateConfiguration(category._id, sub._id, config._id)}
                                            disabled={!editConfigurationType.trim()}
                                          >
                                            Save
                                          </button>
                                          <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                              setEditingConfiguration(null);
                                              setEditConfigurationType('');
                                            }}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="fw-medium">{config.type}</span>
                                          <div className="btn-group btn-group-sm">
                                            <button
                                              className="btn btn-outline-primary"
                                              onClick={() => {
                                                setEditingConfiguration(config._id);
                                                setEditConfigurationType(config.type);
                                              }}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="btn btn-outline-danger"
                                              onClick={() => deleteConfiguration(category._id, sub._id, config._id)}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-muted">No configurations added yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
