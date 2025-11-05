'use client'
import React, { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import ImageUpload from "@/components/imageUpload";
import ProtectedRoute from "@/components/ProtectedRoute";
import Image from "next/image";
import logo from "../../public/img/logo.jpg";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function City() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertyCounts, setPropertyCounts] = useState({});

  const [selectedCity, setSelectedCity] = useState(null);
  const [showCityForm, setShowCityForm] = useState(false);
  const [showLocalityForm, setShowLocalityForm] = useState(false);

  const [formCity, setFormCity] = useState({
    _id: null,
    name: "",
    state: "",
    country: "India",
    isActive: true,
    backgroundImage: "",
    localities: [],
  });
  
  const [originalFormCity, setOriginalFormCity] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const [formLocality, setFormLocality] = useState({
    _id: null,
    name: "",
    isActive: true,
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
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

  // Fetch property count for a city
  const fetchPropertyCount = async (cityId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/cities/${cityId}/property-count`, {
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

  // Fetch cities from API
  const fetchCities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/cities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCities(data);
        
        // Fetch property counts for all cities
        const counts = {};
        for (const city of data) {
          counts[city._id] = await fetchPropertyCount(city._id);
        }
        setPropertyCounts(counts);
      } else {
        // Failed to fetch cities
      }
    } catch (error) {
      // Error fetching cities
    } finally {
      setLoading(false);
    }
  };

  // Load cities on component mount
  useEffect(() => {
    fetchCities();
  }, []);

  // Check if city form has changes
  const hasCityFormChanges = () => {
    if (!formCity._id || !originalFormCity) {
      return true; // Always enabled for new entries
    }

    // Compare form data with original
    const currentData = {
      name: formCity.name || "",
      state: formCity.state || "",
      country: formCity.country || "India",
      isActive: formCity.isActive !== undefined ? formCity.isActive : true,
      backgroundImage: formCity.backgroundImage || ""
    };

    const originalData = {
      name: originalFormCity.name || "",
      state: originalFormCity.state || "",
      country: originalFormCity.country || "India",
      isActive: originalFormCity.isActive !== undefined ? originalFormCity.isActive : true,
      backgroundImage: originalFormCity.backgroundImage || ""
    };

    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  };

  // Validate City Form
  const validateCityForm = () => {
    const errors = {};
    
    // Validate mandatory fields
    if (!formCity.name || formCity.name.trim() === '') {
      errors.name = 'City name is required';
    }
    
    if (!formCity.state || formCity.state.trim() === '') {
      errors.state = 'State is required';
    }
    
    if (!formCity.country || formCity.country.trim() === '') {
      errors.country = 'Country is required';
    }
    
    if (!formCity.backgroundImage || formCity.backgroundImage.trim() === '') {
      errors.backgroundImage = 'Background image is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ Save City
  const handleSaveCity = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateCityForm()) {
      showNotification('Please fill all mandatory fields', 'danger');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('name', formCity.name);
      formData.append('state', formCity.state);
      formData.append('country', formCity.country);
      formData.append('isActive', formCity.isActive);
      formData.append('localities', JSON.stringify(formCity.localities));
      
      // Handle background image - if it's a URL, we need to convert it to a file
      if (formCity.backgroundImage) {
        if (formCity.backgroundImage.startsWith('http')) {
          // It's already an S3 URL, just add it as a string
          formData.append('backgroundImageUrl', formCity.backgroundImage);
        } else if (formCity.backgroundImage.startsWith('data:')) {
          // It's a data URL, convert to file
          const response = await fetch(formCity.backgroundImage);
          const blob = await response.blob();
          formData.append('backgroundImage', blob, 'image.jpg');
        } else if (formCity.backgroundImage instanceof File) {
          // It's a file object
          formData.append('backgroundImage', formCity.backgroundImage);
        }
      }

      const url = formCity._id ? `${API_BASE_URL}/api/cities/${formCity._id}` : `${API_BASE_URL}/api/cities`;
      const method = formCity._id ? 'PUT' : 'POST';

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.ok) {
        await fetchCities(); // Refresh the list
        setShowCityForm(false);
        setFormErrors({});
        setOriginalFormCity(null);
        showNotification('City saved successfully!', 'success');
        setFormCity({
          _id: null,
          name: "",
          state: "",
          country: "India",
          isActive: true,
          backgroundImage: "",
          localities: [],
        });
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to save city';
        showNotification(errorMessage, 'danger');
      }
    } catch (error) {
      showNotification('Failed to save city. Please try again.', 'danger');
    }
  };

  // ✅ Delete City
  const handleDeleteCity = async (id) => {
    const propertyCount = propertyCounts[id] || 0;
    if (propertyCount > 0) {
      showNotification(`Cannot delete city. ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} exist under this city.`, 'danger');
      return;
    }

    if (window.confirm("Delete this city?")) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/cities/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          await fetchCities(); // Refresh the list
          showNotification('City deleted successfully!', 'success');
          if (selectedCity?._id === id) {
            setSelectedCity(null);
            setShowLocalityForm(false);
          }
        } else {
          const errorData = await response.json();
          showNotification(errorData.error || 'Failed to delete city', 'danger');
        }
      } catch (error) {
        showNotification('Failed to delete city. Please try again.', 'danger');
      }
    }
  };

  // ✅ Save Locality (per city)
  const handleSaveLocality = async (e) => {
    e.preventDefault();
    try {
      const url = formLocality._id 
        ? `${API_BASE_URL}/api/cities/${selectedCity._id}/localities/${formLocality._id}`
        : `${API_BASE_URL}/api/cities/${selectedCity._id}/localities`;
      
      const method = formLocality._id ? 'PUT' : 'POST';

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formLocality.name,
          isActive: formLocality.isActive,
        }),
      });

      if (response.ok) {
        await fetchCities(); // Refresh the list
        // Update selectedCity with the latest data
        const updatedCity = await response.json();
        setSelectedCity(updatedCity);
        setShowLocalityForm(false);
        showNotification('Locality saved successfully!', 'success');
        setFormLocality({ _id: null, name: "", isActive: true });
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to save locality', 'danger');
      }
    } catch (error) {
      showNotification('Failed to save locality. Please try again.', 'danger');
    }
  };

  // ✅ Delete Locality (per city)
  const handleDeleteLocality = async (id) => {
    if (confirm("Delete this locality?")) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/cities/${selectedCity._id}/localities/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          await fetchCities(); // Refresh the list
          showNotification('Locality deleted successfully!', 'success');
          // Update selectedCity with the latest data
          const updatedCity = await response.json();
          setSelectedCity(updatedCity);
        } else {
          const errorData = await response.json();
          showNotification(errorData.error || 'Failed to delete locality', 'danger');
        }
      } catch (error) {
        showNotification('Failed to delete locality. Please try again.', 'danger');
      }
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
      <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="container py-4 mt-5 pt-5">
        <div className="d-flex justify-content-between">
          <h2 className="mb-4 fw-bold">City Management</h2>
          <button
            className="btn btn-primary mb-3"
            onClick={() => {
              setShowCityForm(true);
              setFormCity({
                _id: null,
                name: "",
                state: "",
                country: "India",
                isActive: true,
                backgroundImage: "",
                localities: [],
              });
              setOriginalFormCity(null);
              setFormErrors({});
            }}
          >
            + Add City
          </button>
        </div>

        {/* ✅ City Form */}
        {showCityForm && (
          <form onSubmit={handleSaveCity} className="card card-body mb-4">
            <h5 className="mb-3">{formCity._id ? "Edit City" : "Add New City"}</h5>
            
            {/* City Name */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                City Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                placeholder="Enter city name"
                value={formCity.name}
                onChange={(e) => {
                  setFormCity({ ...formCity, name: e.target.value });
                  if (formErrors.name) {
                    setFormErrors({ ...formErrors, name: '' });
                  }
                }}
              />
              {formErrors.name && (
                <div className="invalid-feedback">{formErrors.name}</div>
              )}
            </div>
            
            {/* State */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                State <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${formErrors.state ? 'is-invalid' : ''}`}
                placeholder="Enter state name"
                value={formCity.state}
                onChange={(e) => {
                  setFormCity({ ...formCity, state: e.target.value });
                  if (formErrors.state) {
                    setFormErrors({ ...formErrors, state: '' });
                  }
                }}
              />
              {formErrors.state && (
                <div className="invalid-feedback">{formErrors.state}</div>
              )}
            </div>
            
            {/* Country */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Country <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${formErrors.country ? 'is-invalid' : ''}`}
                placeholder="Enter country name"
                value={formCity.country}
                onChange={(e) => {
                  setFormCity({ ...formCity, country: e.target.value });
                  if (formErrors.country) {
                    setFormErrors({ ...formErrors, country: '' });
                  }
                }}
              />
              {formErrors.country && (
                <div className="invalid-feedback">{formErrors.country}</div>
              )}
            </div>
            
            {/* Active Status */}
            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="cityActive"
                checked={formCity.isActive}
                onChange={(e) =>
                  setFormCity({ ...formCity, isActive: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="cityActive">
                Active
              </label>
            </div>
            
            {/* Background Image */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Background Image <span className="text-danger">*</span>
              </label>
              <ImageUpload
                label=""
                value={formCity.backgroundImage}
                onChange={(url) => {
                  setFormCity({ ...formCity, backgroundImage: url });
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
            <div className="d-flex mb-4">
              <button 
                className="btn btn-success me-2" 
                type="submit"
                disabled={formCity._id && !hasCityFormChanges()}
              >
                {formCity._id ? 'Update' : 'Save'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setShowCityForm(false);
                  setFormErrors({});
                  setOriginalFormCity(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ✅ Cities Table */}
        <table className="table table-striped border">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Name</th>
              <th>State</th>
              <th>Country</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : cities.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted">
                  No cities found
                </td>
              </tr>
            ) : (
              cities.map((city) => (
                <tr key={city._id}>
                  <td style={{ width: "50px" }}>
                    <Image
                      src={city.backgroundImage || logo}
                      alt={city.name}
                      width={50}
                      height={50}
                      style={{ objectFit: "cover" }}
                    />
                  </td>
                  <td>{city.name}</td>
                  <td>{city.state}</td>
                  <td>{city.country}</td>
                  <td>
                    <span
                      className={`badge ${
                        city.isActive ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {city.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => {
                        const cityData = {
                          _id: city._id,
                          name: city.name || "",
                          state: city.state || "",
                          country: city.country || "India",
                          isActive: city.isActive !== undefined ? city.isActive : true,
                          backgroundImage: city.backgroundImage || "",
                          localities: city.localities || []
                        };
                        setFormCity(cityData);
                        setOriginalFormCity(JSON.parse(JSON.stringify(cityData))); // Deep copy
                        setFormErrors({});
                        setShowCityForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-success me-2"
                      onClick={() => {
                        setSelectedCity(city);
                        setShowLocalityForm(true);
                      }}
                    >
                      Add Locality
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteCity(city._id)}
                      disabled={propertyCounts[city._id] > 0}
                      title={propertyCounts[city._id] > 0 ? `${propertyCounts[city._id]} propert${propertyCounts[city._id] === 1 ? 'y' : 'ies'} exist under this city` : 'Delete city'}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ✅ Locality Form */}
        {showLocalityForm && selectedCity && (
          <form onSubmit={handleSaveLocality} className="card card-body mt-4">
            <h5>
              {formLocality._id
                ? "Edit Locality"
                : `Add Locality for ${selectedCity?.name}`}
            </h5>
            <input
              className="form-control mb-2"
              placeholder="Locality Name"
              value={formLocality.name}
              onChange={(e) =>
                setFormLocality({ ...formLocality, name: e.target.value })
              }
              required
            />
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={formLocality.isActive}
                onChange={(e) =>
                  setFormLocality({
                    ...formLocality,
                    isActive: e.target.checked,
                  })
                }
              />
              <label className="form-check-label">Active</label>
            </div>
            <div className="d-flex mb-4">
              <button className="btn btn-success me-2" type="submit">
                Save
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowLocalityForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ✅ Localities Table (only for selected city) */}
        {selectedCity && (
          <div className="mt-4">
            <h4>Localities for {selectedCity.name}</h4>
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedCity.localities && selectedCity.localities.length > 0 ? (
                  selectedCity.localities.map((loc) => (
                    <tr key={loc._id}>
                      <td>{loc.name}</td>
                      <td>
                        <span
                          className={`badge ${
                            loc.isActive ? "bg-success" : "bg-danger"
                          }`}
                        >
                          {loc.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => {
                            setFormLocality(loc);
                            setShowLocalityForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteLocality(loc._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-muted">
                      No localities yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
