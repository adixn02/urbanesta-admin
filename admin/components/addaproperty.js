import React, { useState, useEffect } from 'react';
import ImageUpload from './imageUpload';
import FilePreview from './filePreview';
import MultipleFilePreview from './multipleFilePreview';
import { ButtonSpinner } from './LoadingSpinner';
import UploadProgress from './UploadProgress';
import ErrorPopup from './ErrorPopup';

export default function AddPropertyForm({ property, onSave, isLoading = false, dropdownData = { categories: [], cities: [], builders: [] }, onSaveSuccess, onSaveError }) {
  const isEditing = !!property?._id || !!property?.id;

  // Helper function to get nested property values
  const getPropertyValue = (path, defaultValue = '') => {
    if (!property) return defaultValue;
    
    const keys = path.split('.');
    let value = property;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value || defaultValue;
  };

  // Helper function to get array values safely
  const getArrayValue = (path, defaultValue = []) => {
    const value = getPropertyValue(path, defaultValue);
    return Array.isArray(value) ? value : defaultValue;
  };

  const [formType, setFormType] = useState(property?.type || 'regular');
  
  // Debug logging removed for production

  const [formData, setFormData] = useState({
    // Basic info
    _id: property?._id || property?.id || '',
    type: property?.type || 'regular',
    title: getPropertyValue('title', ''),
    city: getPropertyValue('city._id') || getPropertyValue('city', ''),
    location: getPropertyValue('location', ''),
    category: getPropertyValue('category._id') || getPropertyValue('category', ''),
    subcategory: getPropertyValue('subcategory', ''),
    price: getPropertyValue('price', ''),
    propertyAction: getPropertyValue('propertyAction', 'Sale'),
    area: getPropertyValue('area', ''),
    status: getPropertyValue('status', 'available'),
    description: getPropertyValue('description', ''),
    builder: getPropertyValue('builder._id') || getPropertyValue('builder', ''),
    possessionDate: getPropertyValue('possessionDate', ''),
    
    // Arrays and complex fields
    highlights: getArrayValue('highlights', ['']),
    connectivityPoints: (() => {
      const points = getArrayValue('connectivityPoints', [{ text: '' }]);
      // Convert strings to objects if needed (for backward compatibility)
      return points.map(point => 
        typeof point === 'string' ? { text: point } : (point?.text !== undefined ? point : { text: '' })
      );
    })(),
    images: getArrayValue('images', []),
    projectImages: getArrayValue('projectImages', []),
    
    // Builder specific fields
    projectName: getPropertyValue('projectName', ''),
    projectLogo: getPropertyValue('projectLogo', ''),
    wallpaperImage: getPropertyValue('wallpaperImage', ''),
    fullAddress: getPropertyValue('fullAddress', ''),
    googleMapUrl: getPropertyValue('googleMapUrl', ''),
    landArea: getPropertyValue('landArea', ''),
    descriptionImage: getPropertyValue('descriptionImage', ''),
    highlightImage: getPropertyValue('highlightImage', ''),
    masterPlan: getPropertyValue('masterPlan', ''),
    
    // Unit details
    unitDetails: getArrayValue('unitDetails', property?.type === 'builder' ? [{ unitType: '', area: '', floorPlan: null }] : []),
    
    // Regular property specific fields
    locality: getPropertyValue('locality._id') || getPropertyValue('locality', ''),
    
    // Builder property specific fields
    about: getPropertyValue('about', ''),
    areaType: getPropertyValue('areaType', ''),
    reraNo: getPropertyValue('reraNo', ''),
    
    // Amenities and construction details
    amenities: getArrayValue('amenities', []),
    constructionDetails: getPropertyValue('constructionDetails', {
      status: 'upcoming',
      reraDescription: ''
    }),
    
    // Configurations
    selectedConfigurations: getArrayValue('selectedConfigurations', []),
  });

  const [errors, setErrors] = useState({});

  // Clear errors when formData changes (especially when editing property)
  useEffect(() => {
    if (property && formData.city && formData.locality) {
      // Clear locality error when data is loaded
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors.locality) {
          delete newErrors.locality;
        }
        return newErrors;
      });
    }
  }, [property, formData.city, formData.locality, dropdownData.cities]);
  // Error popup state
  const [errorPopup, setErrorPopup] = useState({
    visible: false,
    title: 'Error',
    message: '',
    details: null
  });

  // Helper function to make error messages user-friendly (hide technical details)
  const makeUserFriendlyError = (errorMessage) => {
    if (!errorMessage) return 'An error occurred. Please try again.';
    
    // Remove technical MIME type references like "image/avif"
    let friendly = errorMessage
      .replace(/image\/\w+/gi, '') // Remove all "image/xxx" references
      .replace(/Invalid file type:.*?\. Only/, 'Invalid file type. Please upload only')
      .replace(/\. Only image files \(.*?\) are allowed\./g, ' image files (JPEG, PNG, WebP, GIF, or AVIF format).')
      .replace(/Invalid file type\. Please upload only\s+image files/, 'Invalid file type. Please upload only image files')
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();
    
    // If message is empty after cleaning, provide default
    if (!friendly || friendly.length < 10) {
      friendly = 'Invalid file type. Please upload only image files (JPEG, PNG, WebP, GIF, or AVIF format).';
    }
    
    return friendly;
  };

  const [uploadProgress, setUploadProgress] = useState({ 
    visible: false, 
    status: 'uploading', 
    message: '', 
    files: [], 
    progress: 0 
  });

  // Sync formData when property prop changes (e.g., when editing different property)
  useEffect(() => {
    if (property) {
      setFormData({
        // Basic info
        _id: property._id || property.id || '',
        type: property.type || 'regular',
        title: getPropertyValue('title', ''),
        city: getPropertyValue('city._id') || getPropertyValue('city', ''),
        locality: getPropertyValue('locality._id') || getPropertyValue('locality', ''),
        location: getPropertyValue('location', ''),
        category: getPropertyValue('category._id') || getPropertyValue('category', ''),
        subcategory: getPropertyValue('subcategory', ''),
        price: getPropertyValue('price', ''),
        propertyAction: getPropertyValue('propertyAction', 'Sale'),
        area: getPropertyValue('area', ''),
        status: getPropertyValue('status', 'available'),
        description: getPropertyValue('description', ''),
        builder: getPropertyValue('builder._id') || getPropertyValue('builder', ''),
        possessionDate: getPropertyValue('possessionDate', ''),
        
        // Arrays and complex fields
        highlights: getArrayValue('highlights', ['']),
        connectivityPoints: (() => {
          const points = getArrayValue('connectivityPoints', [{ text: '' }]);
          return points.map(point => 
            typeof point === 'string' ? { text: point } : (point?.text !== undefined ? point : { text: '' })
          );
        })(),
        images: getArrayValue('images', []),
        projectImages: getArrayValue('projectImages', []),
        
        // Builder specific fields
        projectName: getPropertyValue('projectName', ''),
        projectLogo: getPropertyValue('projectLogo', ''),
        wallpaperImage: getPropertyValue('wallpaperImage', ''),
        fullAddress: getPropertyValue('fullAddress', ''),
        googleMapUrl: getPropertyValue('googleMapUrl', ''),
        landArea: getPropertyValue('landArea', ''),
        descriptionImage: getPropertyValue('descriptionImage', ''),
        highlightImage: getPropertyValue('highlightImage', ''),
        masterPlan: getPropertyValue('masterPlan', ''),
        
        // Builder property specific fields
        about: getPropertyValue('about', ''),
        areaType: getPropertyValue('areaType', ''),
        reraNo: getPropertyValue('reraNo', ''),
        
        // Unit details
        unitDetails: getArrayValue('unitDetails', []),
        
        // Amenities and construction details
        amenities: getArrayValue('amenities', []),
        constructionDetails: getPropertyValue('constructionDetails', {
          status: 'upcoming',
          reraDescription: ''
        }),
        
        // Configurations
        selectedConfigurations: getArrayValue('selectedConfigurations', []),
      });
      setFormType(property.type || 'regular');
    } else {
      // Reset form when property is null (new property)
      setFormData({
        _id: '',
        type: 'regular',
        title: '',
        city: '',
        locality: '',
        location: '',
        category: '',
        subcategory: '',
        price: '',
        propertyAction: 'Sale',
        area: '',
        status: 'available',
        description: '',
        builder: '',
        possessionDate: '',
        highlights: [''],
        connectivityPoints: [{ text: '' }],
        images: [],
        projectImages: [],
        projectName: '',
        projectLogo: '',
        wallpaperImage: '',
        fullAddress: '',
        googleMapUrl: '',
        landArea: '',
        descriptionImage: '',
        highlightImage: '',
        masterPlan: '',
        about: '',
        areaType: '',
        reraNo: '',
        unitDetails: [],
        amenities: [],
        constructionDetails: {
          status: 'upcoming',
          reraDescription: ''
        },
        selectedConfigurations: [],
      });
      setFormType('regular');
    }
  }, [property?._id, property?.id]); // Only re-run when property ID changes
  const [availableConfigurations, setAvailableConfigurations] = useState([]);
  const [loadingConfigurations, setLoadingConfigurations] = useState(false);

  // Fetch configurations when category and subcategory change
  useEffect(() => {
    if (formData.category && formData.subcategory) {
      fetchConfigurations(formData.category, formData.subcategory);
    } else {
      setAvailableConfigurations([]);
    }
  }, [formData.category, formData.subcategory]);

  // Load configurations when editing a property
  useEffect(() => {
    if (isEditing && formData.category && formData.subcategory) {
      fetchConfigurations(formData.category, formData.subcategory);
    }
  }, [isEditing, formData.category, formData.subcategory]);

  // Get subcategories based on selected category
  const getSubcategories = () => {
    if (!formData.category) return [];
    const selectedCategory = dropdownData.categories.find(cat => cat._id === formData.category);
    return selectedCategory ? selectedCategory.deepSubcategories.filter(sub => sub.isActive) : [];
  };

  // Get localities based on selected city
  const getLocalities = () => {
    if (!formData.city) return [];
    const selectedCity = dropdownData.cities.find(city => city._id === formData.city);
    return selectedCity ? selectedCity.localities.filter(locality => locality.isActive) : [];
  };

  // Fetch configurations for selected category and subcategory
  const fetchConfigurations = async (categoryId, subcategoryId) => {
    if (!categoryId || !subcategoryId) {
      setAvailableConfigurations([]);
      return;
    }

    try {
      setLoadingConfigurations(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/properties/configurations/${categoryId}/${subcategoryId}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Configurations loaded successfully
        setAvailableConfigurations(data.data || []);
        // Reset selected configurations when category/subcategory changes (only for new properties)
        if (!isEditing) {
          setFormData(prev => ({
            ...prev,
            selectedConfigurations: []
          }));
        }
      } else {
        // Failed to fetch configurations - use fallback
        setAvailableConfigurations(getFallbackConfigurations());
      }
    } catch (error) {
      // Error fetching configurations - use fallback
      setAvailableConfigurations(getFallbackConfigurations());
    } finally {
      setLoadingConfigurations(false);
    }
  };

  // Fallback configurations when API fails
  const getFallbackConfigurations = () => {
    return [
      { type: '1 BHK', isEnabled: true },
      { type: '2 BHK', isEnabled: true },
      { type: '3 BHK', isEnabled: true },
      { type: '4 BHK', isEnabled: true },
      { type: '5 BHK', isEnabled: true },
      { type: 'Villa', isEnabled: true },
      { type: 'Penthouse', isEnabled: true },
      { type: 'Studio', isEnabled: true }
    ];
  };

  // Dummy locality data based on cities
  const localityData = {
    'Delhi': ['Connaught Place', 'Karol Bagh', 'Lajpat Nagar', 'Saket', 'Vasant Kunj'],
    'Gurgaon': ['Sector 14', 'Sector 29', 'Sector 45', 'Cyber City', 'MG Road'],
    'Noida': ['Sector 18', 'Sector 62', 'Sector 137', 'Greater Noida', 'Sector 15'],
    'Mumbai': ['Andheri West', 'Bandra West', 'Powai', 'Malad West', 'Goregaon West'],
    'Pune': ['Baner', 'Hinjewadi', 'Koregaon Park', 'Viman Nagar', 'Kharadi'],
    'Bangalore': ['Whitefield', 'Electronic City', 'Koramangala', 'Indiranagar', 'HSR Layout']
  };

  // Reset form when property type changes
  useEffect(() => {
    if (formType !== formData.type) {
      setFormData(prev => ({
        ...prev,
        type: formType,
        // Reset type-specific fields when switching types
        ...(formType === 'builder' ? {
          builder: '',
          price: '',
          possessionDate: '',
          highlights: [''],
          connectivityPoints: [{ text: '' }],
          projectName: '',
          projectLogo: '',
          wallpaperImage: '',
          fullAddress: '',
          googleMapUrl: '',
          landArea: '',
          descriptionImage: '',
          highlightImage: '',
          unitType: '',
          about: '',
          areaType: '',
          reraNo: '',
          floorPlan: '',
          masterPlan: '',
          unitDetails: [{ unitType: '', area: '', floorPlan: null }],
          amenities: [],
          constructionDetails: {
            status: 'upcoming',
            reraDescription: ''
          }
        } : {
          price: 0,
          area: '',
          locality: '',
          unitDetails: [{ unitType: '', area: '', floorPlan: null }],
          amenities: [],
          constructionDetails: {
            status: 'upcoming',
            reraDescription: ''
          }
        })
      }));
    }
  }, [formType]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle number inputs
    if (name === 'price') {
      const numValue = value === '' ? 0 : parseFloat(value) || 0;
      setFormData({ ...formData, [name]: numValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Reset locality when city changes
    if (name === 'city') {
      setFormData(prev => ({ ...prev, locality: '' }));
    }
    
    // Reset subcategory when category changes
    if (name === 'category') {
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Handle unit details changes
  const handleUnitDetailChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      unitDetails: prev.unitDetails.map((unit, i) => 
        i === index ? { ...unit, [field]: value } : unit
      )
    }));
  };

  // Add new unit detail
  const addUnitDetail = () => {
    setFormData(prev => ({
      ...prev,
      unitDetails: [...prev.unitDetails, { unitType: '', area: '', floorPlan: null }]
    }));
  };

  // Remove unit detail
  const removeUnitDetail = (index) => {
    if (formData.unitDetails.length > 1) {
      setFormData(prev => ({
        ...prev,
        unitDetails: prev.unitDetails.filter((_, i) => i !== index)
      }));
    }
  };

  const handleArrayChange = (index, value, field) => {
    const arr = [...formData[field]];
    arr[index] = value;
    setFormData({ ...formData, [field]: arr });
  };

  const addArrayField = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayField = (index, field) => {
    const arr = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: arr });
  };

  // Construction details handlers
  const handleConstructionDetailChange = (field, value) => {
    setFormData({
      ...formData,
      constructionDetails: {
        ...formData.constructionDetails,
        [field]: value
      }
    });
  };

  // Configuration handlers
  const handleConfigurationChange = (configType, isEnabled) => {
    const existingIndex = formData.selectedConfigurations.findIndex(config => config.type === configType);
    
    if (isEnabled) {
      // Add or update configuration
      if (existingIndex >= 0) {
        const updatedConfigs = [...formData.selectedConfigurations];
        updatedConfigs[existingIndex] = { type: configType, isEnabled: true };
        setFormData({ ...formData, selectedConfigurations: updatedConfigs });
      } else {
        setFormData({ 
          ...formData, 
          selectedConfigurations: [...formData.selectedConfigurations, { type: configType, isEnabled: true }]
        });
      }
    } else {
      // Remove configuration
      if (existingIndex >= 0) {
        const updatedConfigs = formData.selectedConfigurations.filter((_, index) => index !== existingIndex);
        setFormData({ ...formData, selectedConfigurations: updatedConfigs });
      }
    }
  };

  const isConfigurationSelected = (configType) => {
    if (!formData.selectedConfigurations || !Array.isArray(formData.selectedConfigurations)) {
      return false;
    }
    const isSelected = formData.selectedConfigurations.some(config => 
      (typeof config === 'string' ? config === configType : config.type === configType) && 
      (config.isEnabled !== false)
    );
    
    // Debug logging for configuration selection
    if (isEditing) {
      // Configuration check
    }
    
    return isSelected;
  };

  // Highlight handlers
  const handleHighlightChange = (index, value) => {
    const highlights = [...formData.highlights];
    highlights[index] = value;
    setFormData({ ...formData, highlights });
  };

  const addHighlight = () => {
    if (formData.highlights.length < 5) {
      setFormData({ ...formData, highlights: [...formData.highlights, ''] });
    }
  };

  const removeHighlight = (index) => {
    if (formData.highlights.length > 1) {
      const highlights = formData.highlights.filter((_, i) => i !== index);
      setFormData({ ...formData, highlights });
    }
  };

  // Connectivity point handlers
  const handleConnectivityPointChange = (index, field, value) => {
    const connectivityPoints = [...formData.connectivityPoints];
    connectivityPoints[index] = { ...connectivityPoints[index], [field]: value };
    setFormData({ ...formData, connectivityPoints });
  };

  const addConnectivityPoint = () => {
    setFormData({ 
      ...formData, 
      connectivityPoints: [...formData.connectivityPoints, { text: '' }] 
    });
  };

  const removeConnectivityPoint = (index) => {
    if (formData.connectivityPoints.length > 1) {
      const connectivityPoints = formData.connectivityPoints.filter((_, i) => i !== index);
      setFormData({ ...formData, connectivityPoints });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validation
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.subcategory) newErrors.subcategory = 'Subcategory is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    
    // Title validation for regular properties only
    if (formType === 'regular' && !formData.title?.trim()) {
      newErrors.title = 'Property name is required';
    }

    // Validation logging removed for production

    // Regular property validation
    if (formType === 'regular') {
      if (!formData.price || formData.price <= 0) newErrors.price = 'Valid price is required';
      
      // Only require locality if the selected city has localities available
      // Don't validate if dropdown data isn't loaded yet (to avoid false errors when editing)
      const availableLocalities = getLocalities();
      if (dropdownData.cities && dropdownData.cities.length > 0) {
        // Only validate if we have dropdown data loaded
      if (availableLocalities.length > 0 && !formData.locality) {
        newErrors.locality = 'Locality is required';
        } else if (formData.locality && availableLocalities.length > 0) {
          // Validate that the selected locality exists in the available localities
          const localityExists = availableLocalities.some(loc => loc._id === formData.locality || loc._id?.toString() === formData.locality?.toString());
          if (!localityExists) {
            // Locality doesn't match - might be from different city or data mismatch
            // Only show error if we're sure the data is loaded
            newErrors.locality = 'Selected locality is not available for this city. Please select a valid locality.';
          }
        }
      }
      
      if (!formData.location?.trim()) newErrors.location = 'Nearby location is required';
      // Google Map URL is optional for regular properties
      // For regular properties, images are stored in formData.images, not projectImages
      if (!formData.images || formData.images.length < 2) {
        newErrors.images = 'At least 2 property images are required';
      }
      if (formData.images && formData.images.length > 5) {
        newErrors.images = 'Maximum 5 property images allowed';
      }
    }

    // Builder property validation
    if (formType === 'builder') {
      
      if (!formData.builder) newErrors.builder = 'Builder name is required';
      if (!formData.projectName?.trim()) newErrors.projectName = 'Project name is required';
      if (!formData.about?.trim()) newErrors.about = 'Project about is required';
      if (!formData.reraNo?.trim()) newErrors.reraNo = 'Project RERA No is required';
      if (!formData.fullAddress?.trim()) newErrors.fullAddress = 'Full address is required';
      
      // Validate price field
      if (!formData.price || formData.price <= 0) {
        newErrors.price = 'Valid price is required';
      }
      
      if (!formData.possessionDate) newErrors.possessionDate = 'Possession date is required';
      if (!formData.landArea?.trim()) newErrors.landArea = 'Land area is required';
      // Validate unit details array
      if (!formData.unitDetails || formData.unitDetails.length === 0) {
        newErrors.unitDetails = 'At least one unit detail is required';
      } else {
        formData.unitDetails.forEach((unit, index) => {
          if (!unit.unitType?.trim()) {
            newErrors[`unitDetails.${index}.unitType`] = 'Unit type is required';
          }
          if (!unit.area?.trim()) {
            newErrors[`unitDetails.${index}.area`] = 'Area is required';
          }
          if (!unit.floorPlan) {
            newErrors[`unitDetails.${index}.floorPlan`] = 'Floor plan image is required';
          }
        });
      }
      if (!formData.masterPlan) newErrors.masterPlan = 'Master plan image is required';
      
      // Validate highlights
      const validHighlights = formData.highlights.filter(h => h?.trim() !== '');
      if (validHighlights.length === 0) newErrors.highlights = 'At least one highlight is required';
      
      // Validate connectivity points - only require text description
      const validConnectivity = formData.connectivityPoints.filter(c => c?.text?.trim() !== '');
      if (validConnectivity.length === 0) {
        newErrors.connectivityPoints = 'At least one connectivity point with description is required';
      }
      
      // Validate individual connectivity points
      formData.connectivityPoints.forEach((point, index) => {
        if (!point.text?.trim()) {
          newErrors[`connectivityPoints.${index}.text`] = 'Description is required for this connectivity point';
        }
      });
      
      // Validate project images - make it more lenient for testing
      if (!formData.projectImages || formData.projectImages.length < 1) {
        newErrors.projectImages = 'At least 1 project image is required';
      }
      if (formData.projectImages && formData.projectImages.length > 5) {
        newErrors.projectImages = 'Maximum 5 project images allowed';
      }
    }

    setErrors(newErrors);
    // Validation complete
    return Object.keys(newErrors).length === 0;
  };

  const uploadFilesToS3 = async (files) => {
    if (!files || files.length === 0) return [];

    try {
      // Show upload progress
      const filesToUpload = files.map(file => ({ name: file.name, status: 'uploading' }));
      setUploadProgress({ 
        visible: true, 
        status: 'uploading', 
        message: 'Uploading images to server...', 
        files: filesToUpload, 
        progress: 0 
      });

      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        if (progress < 90) {
          setUploadProgress(prev => ({ ...prev, progress }));
        }
      }, 200);
      
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/upload/multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to upload images';
        let errorDetails = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || errorData.type || null;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Hide upload progress
        setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });
        
        // Show error popup (doesn't auto-hide) - hide technical details
        setErrorPopup({
          visible: true,
          title: 'Upload Error',
          message: makeUserFriendlyError(errorMessage) || 'Failed to upload images. Please try again.',
          details: null // Don't show technical details to users
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Update progress to show completion
      setUploadProgress({ 
        visible: true, 
        status: 'uploading', 
        message: 'Images uploaded successfully!', 
        files: filesToUpload.map(f => ({ ...f, status: 'completed' })), 
        progress: 100 
      });
      
      // Wait a moment before hiding
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });

      return data.imageUrls || [];
    } catch (error) {
      // Hide upload progress
      setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });
      
      // Show error popup (doesn't auto-hide) - hide technical details
      setErrorPopup({
        visible: true,
        title: 'Upload Error',
        message: makeUserFriendlyError(error.message) || 'Failed to upload images. Please try again.',
        details: null // Don't show stack trace to users
      });
      
      throw error; // Re-throw original error with message
    }
  };

  const uploadSingleFileToS3 = async (file) => {
    if (!file) return null;

    try {
      // Show upload progress
      setUploadProgress({ 
        visible: true, 
        status: 'uploading', 
        message: 'Uploading image...', 
        files: [{ name: file.name, status: 'uploading' }], 
        progress: 0 
      });

      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 15;
        if (progress < 90) {
          setUploadProgress(prev => ({ ...prev, progress }));
        }
      }, 200);
      
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/upload/single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to upload image';
        let errorDetails = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || errorData.type || null;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        // Hide upload progress
        setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });
        
        // Show error popup (doesn't auto-hide) - hide technical details
        setErrorPopup({
          visible: true,
          title: 'Upload Error',
          message: makeUserFriendlyError(errorMessage) || 'Failed to upload images. Please try again.',
          details: null // Don't show technical details to users
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Update progress to show completion
      setUploadProgress({ 
        visible: true, 
        status: 'uploading', 
        message: 'Image uploaded successfully!', 
        files: [{ name: file.name, status: 'completed' }], 
        progress: 100 
      });
      
      // Wait a moment before hiding
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });

      return data.imageUrl || null;
    } catch (error) {
      // Hide upload progress
      setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });
      
      // Show error popup (doesn't auto-hide) - hide technical details
      setErrorPopup({
        visible: true,
        title: 'Upload Error',
        message: makeUserFriendlyError(error.message) || 'Failed to upload image. Please try again.',
        details: null // Don't show stack trace to users
      });
      
      throw error; // Re-throw original error with message
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Form submission started
    
    if (!validateForm()) {
      // Form validation failed
      return;
    }
    
    // Form validation passed
    

    try {
      // Upload project images to S3 if they exist and are file objects
      let projectImageUrls = [];
      if (formData.projectImages && formData.projectImages.length > 0) {
        // Check if images are file objects (new uploads) or URLs (existing images)
        const fileObjects = formData.projectImages.filter(img => img instanceof File);
        const existingUrls = formData.projectImages.filter(img => typeof img === 'string' && img.trim() !== '');
        
        if (fileObjects.length > 0) {
          const uploadedUrls = await uploadFilesToS3(fileObjects);
          projectImageUrls = [...existingUrls, ...uploadedUrls];
        } else {
          projectImageUrls = existingUrls;
        }
      }

      // Upload regular property images (for regular properties)
      let regularImageUrls = [];
      if (formType === 'regular' && formData.images && formData.images.length > 0) {
        // Check if images are file objects (new uploads) or URLs (existing images)
        const fileObjects = formData.images.filter(img => img instanceof File);
        const existingUrls = formData.images.filter(img => typeof img === 'string' && img.trim() !== '');
        
        if (fileObjects.length > 0) {
          const uploadedUrls = await uploadFilesToS3(fileObjects);
          regularImageUrls = [...existingUrls, ...uploadedUrls];
        } else {
          regularImageUrls = existingUrls;
        }
      }

      // Upload single images to S3 for builder properties
      let projectLogoUrl = formData.projectLogo;
      let wallpaperImageUrl = formData.wallpaperImage;
      let descriptionImageUrl = formData.descriptionImage;
      let highlightImageUrl = formData.highlightImage;
      let floorPlanUrl = formData.floorPlan;
      let masterPlanUrl = formData.masterPlan;

      if (formType === 'builder') {
        // Upload single images in parallel (only if they are file objects)
        const uploadPromises = [];
        
        if (formData.projectLogo && formData.projectLogo instanceof File) {
          uploadPromises.push(uploadSingleFileToS3(formData.projectLogo).then(url => ({ field: 'projectLogo', url })));
        }
        if (formData.wallpaperImage && formData.wallpaperImage instanceof File) {
          uploadPromises.push(uploadSingleFileToS3(formData.wallpaperImage).then(url => ({ field: 'wallpaperImage', url })));
        }
        if (formData.descriptionImage && formData.descriptionImage instanceof File) {
          uploadPromises.push(uploadSingleFileToS3(formData.descriptionImage).then(url => ({ field: 'descriptionImage', url })));
        }
        if (formData.highlightImage && formData.highlightImage instanceof File) {
          uploadPromises.push(uploadSingleFileToS3(formData.highlightImage).then(url => ({ field: 'highlightImage', url })));
        }
        if (formData.floorPlan && formData.floorPlan instanceof File) {
          uploadPromises.push(uploadSingleFileToS3(formData.floorPlan).then(url => ({ field: 'floorPlan', url })));
        }
        if (formData.masterPlan && formData.masterPlan instanceof File) {
          uploadPromises.push(uploadSingleFileToS3(formData.masterPlan).then(url => ({ field: 'masterPlan', url })));
        }

        if (uploadPromises.length > 0) {
          const uploadResults = await Promise.all(uploadPromises);
          
          // Process upload results
          uploadResults.forEach(({ field, url }) => {
            switch (field) {
              case 'projectLogo':
                projectLogoUrl = url;
                break;
              case 'wallpaperImage':
                wallpaperImageUrl = url;
                break;
              case 'descriptionImage':
                descriptionImageUrl = url;
                break;
              case 'highlightImage':
                highlightImageUrl = url;
                break;
              case 'floorPlan':
                floorPlanUrl = url;
                break;
              case 'masterPlan':
                masterPlanUrl = url;
                break;
            }
          });
        }
      }

      // Upload unit details floor plan files for builder properties
      let processedUnitDetails = formData.unitDetails;
      if (formType === 'builder' && formData.unitDetails && formData.unitDetails.length > 0) {
        const unitDetailsUploadPromises = formData.unitDetails.map(async (unit, index) => {
          if (unit.floorPlan && unit.floorPlan instanceof File) {
            try {
              const floorPlanUrl = await uploadSingleFileToS3(unit.floorPlan);
              return {
                ...unit,
                floorPlan: floorPlanUrl
              };
            } catch (error) {
              throw new Error(`Failed to upload floor plan for unit ${index + 1}`);
            }
          }
          return unit;
        });

        processedUnitDetails = await Promise.all(unitDetailsUploadPromises);
      }

      // Process connectivity points - extract text only (for both regular and builder properties)
      // Schema expects array of strings, but form stores as array of objects with text property
      let processedConnectivityPoints = [];
      if (formData.connectivityPoints && formData.connectivityPoints.length > 0) {
        // Convert connectivity points to strings (text only, no images)
        // Handle both object format { text: '...' } and string format
        processedConnectivityPoints = formData.connectivityPoints
          .map(point => {
            // If it's already a string, use it directly
            if (typeof point === 'string') {
              return point.trim();
            }
            // If it's an object with text property, extract the text
            if (point && typeof point === 'object' && point.text) {
              return point.text.trim();
            }
            // If it's an object but no text property, try to stringify (fallback)
            return null;
          })
          .filter(point => point && point !== ''); // Remove empty strings
      }

      // Filter out empty string values for non-required fields based on property type
      const cleanedFormData = { ...formData };
      
      // For regular properties, remove builder field if it's empty since it's not needed
      if (formType === 'regular' && cleanedFormData.builder === '') {
        delete cleanedFormData.builder;
      }

      // Build submit data, ensuring arrays are never undefined
      const submitData = {
        ...cleanedFormData,
        type: formType,
        highlights: formData.highlights ? formData.highlights.filter(h => h?.trim() !== '') : [],
        connectivityPoints: processedConnectivityPoints || [],
        // Set images based on property type
        ...(formType === 'builder' ? {
          projectImages: projectImageUrls || [], // Replace file objects with S3 URLs
        // Replace single image file objects with S3 URLs for builder properties
          projectLogo: projectLogoUrl || '',
          wallpaperImage: wallpaperImageUrl || '',
          descriptionImage: descriptionImageUrl || '',
          highlightImage: highlightImageUrl || '',
          floorPlan: floorPlanUrl || '',
          masterPlan: masterPlanUrl || '',
          unitDetails: processedUnitDetails || [], // Use processed unit details with uploaded floor plan URLs
        } : {
          images: regularImageUrls || [], // Regular property images
        }),
        // Include new fields
        amenities: formData.amenities || [],
        constructionDetails: formData.constructionDetails || {
          status: 'upcoming',
          reraDescription: ''
        },
        selectedConfigurations: formData.selectedConfigurations || []
      };

      // Remove any undefined or null values and File objects that might cause validation issues
      Object.keys(submitData).forEach(key => {
        const value = submitData[key];
        
        // Remove File objects (they should have been converted to URLs already)
        if (value instanceof File) {
          console.warn(`File object found in ${key}, removing before API call`);
          delete submitData[key];
          return;
        }
        
        // Handle arrays - ensure no File objects remain
        if (Array.isArray(value)) {
          const hasFiles = value.some(item => item instanceof File);
          if (hasFiles) {
            console.warn(`File objects found in ${key} array, filtering out`);
            submitData[key] = value.filter(item => !(item instanceof File));
          }
        }
        
        if (value === undefined || value === null) {
          // For arrays, set to empty array
          if (key === 'images' || key === 'projectImages' || key === 'highlights' || 
              key === 'amenities' || key === 'selectedConfigurations' || key === 'unitDetails') {
            submitData[key] = [];
          } else if (key === 'connectivityPoints') {
            submitData[key] = [];
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            // For objects, keep empty object or delete if not needed
            if (key === 'constructionDetails') {
              submitData[key] = { status: 'upcoming', reraDescription: '' };
            } else {
              delete submitData[key];
            }
          } else {
            // For other values, delete if null/undefined
            delete submitData[key];
          }
        }
      });

      // If editing, preserve the ID (parent will extract it for URL)
      if (isEditing && formData._id) {
        submitData._id = formData._id;
      }

      // Show saving progress
      setUploadProgress({
        visible: true,
        status: 'saving',
        message: isEditing ? 'Updating property...' : 'Saving property...',
        files: [],
        progress: 0
      });

      // Final submit data prepared - call onSave and handle success/error
      try {
        await onSave(submitData);
        
        // Show success
        setUploadProgress({
          visible: true,
          status: 'success',
          message: isEditing ? 'Property updated successfully!' : 'Property created successfully!',
          files: [],
          progress: 100
        });
        
        // Wait a moment to show success message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Hide progress modal
        setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });
        
        // Call success callback if provided
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } catch (saveError) {
        // Hide upload progress
        setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });
        
        // Show error popup (doesn't auto-hide) - hide technical details
        setErrorPopup({
          visible: true,
          title: 'Save Error',
          message: makeUserFriendlyError(saveError.message) || 'Failed to save property. Please try again.',
          details: null // Don't show stack trace to users
        });
        
        // Call error callback if provided
        if (onSaveError) {
          onSaveError(saveError);
        }
        throw saveError;
      }
    } catch (error) {
      // Hide upload progress
      setUploadProgress({ visible: false, status: 'uploading', message: '', files: [], progress: 0 });
      
      // Show error popup (doesn't auto-hide) - hide technical details
      setErrorPopup({
        visible: true,
        title: 'Error',
        message: makeUserFriendlyError(error.message) || 'Failed to save property. Please try again.',
        details: null // Don't show stack trace to users
      });
      
      throw error;
    }
  };

  return (
    <>
      <UploadProgress 
        isVisible={uploadProgress.visible}
        status={uploadProgress.status}
        message={uploadProgress.message}
        files={uploadProgress.files}
        progress={uploadProgress.progress}
      />
      <ErrorPopup
        isVisible={errorPopup.visible}
        title={errorPopup.title}
        message={errorPopup.message}
        details={errorPopup.details}
        onClose={() => setErrorPopup({ visible: false, title: 'Error', message: '', details: null })}
      />
      <form onSubmit={handleSubmit}>
      {/* Property Type Selection */}
      <div className="mb-5">
        <label className="form-label fw-semibold">Property Type</label>
        <div className="d-flex gap-2 w-100" role="group">
          <button
            type="button"
            className={`btn ${formType === 'regular' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFormType('regular')}
            disabled={isLoading}
          >
            <i className="bi bi-house me-2"></i>
            Regular Property
          </button>
          <button
            type="button"
            className={`btn ${formType === 'builder' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setFormType('builder')}
            disabled={isLoading}
          >
            <i className="bi bi-building me-2"></i>
            Builder Property
          </button>
        </div>
      </div>

      {/* REGULAR PROPERTY FORM */}
      {formType === 'regular' && (
        <div>
          
          {/* Row 1: Category and Subcategory */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Category *</label>
              <select 
                name="category" 
                value={formData.category} 
                onChange={handleChange}
                className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                disabled={isLoading}
              >
                <option value="">Select Category</option>
                {dropdownData.categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && <div className="invalid-feedback">{errors.category}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Subcategory *</label>
              <select 
                name="subcategory" 
                value={formData.subcategory} 
                onChange={handleChange}
                className={`form-select ${errors.subcategory ? 'is-invalid' : ''}`}
                disabled={isLoading}
              >
                <option value="">{formData.category ? 'Select Subcategory' : 'Select Category First'}</option>
                {getSubcategories().map((subcategory) => (
                  <option key={subcategory._id} value={subcategory._id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              {errors.subcategory && <div className="invalid-feedback">{errors.subcategory}</div>}
            </div>
          </div>

          {/* Row 2: City and Locality */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">City *</label>
              <select 
                name="city" 
                value={formData.city} 
                onChange={handleChange}
                className={`form-select ${errors.city ? 'is-invalid' : ''}`}
                disabled={isLoading}
              >
                <option value="">Select City</option>
                {dropdownData.cities.map((city) => (
                  <option key={city._id} value={city._id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {errors.city && <div className="invalid-feedback">{errors.city}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">
                Locality {getLocalities().length > 0 ? '*' : '(Optional)'}
              </label>
              <select 
                name="locality" 
                value={formData.locality} 
                onChange={handleChange}
                className={`form-select ${errors.locality ? 'is-invalid' : ''}`}
                disabled={isLoading || !formData.city}
              >
                <option value="">
                  {!formData.city ? 'Select City First' : 
                   getLocalities().length === 0 ? 'No localities available for this city' : 
                   'Select Locality'}
                </option>
                {getLocalities().map((locality) => (
                  <option key={locality._id} value={locality._id}>{locality.name}</option>
                ))}
              </select>
              {errors.locality && <div className="invalid-feedback">{errors.locality}</div>}
            </div>
          </div>

          {/* Row 3: Location */}
          <div className="row mb-3">
            <div className="col-12">
              <label className="form-label fw-semibold">Nearby Location *</label>
              <input 
                type="text" 
                name="location" 
                value={formData.location || ''} 
                onChange={handleChange}
                className={`form-control ${errors.location ? 'is-invalid' : ''}`}
                placeholder="Enter nearby location or area (e.g., Near Metro Station, Close to Mall)"
                disabled={isLoading}
              />
              {errors.location && <div className="invalid-feedback">{errors.location}</div>}
            </div>
          </div>

          {/* Row 4: Property Name and Price */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Property Name *</label>
              <input 
                type="text" 
                name="title" 
                value={formData.title || ''} 
                onChange={handleChange} 
                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                placeholder="Enter property name"
                disabled={isLoading}
              />
              {errors.title && <div className="invalid-feedback">{errors.title}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Price *</label>
              <input 
                type="number" 
                name="price" 
                value={formData.price || ''} 
                onChange={handleChange}
                className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                placeholder="Enter property price"
                disabled={isLoading}
              />
              {errors.price && <div className="invalid-feedback">{errors.price}</div>}
            </div>
          </div>

          {/* Row 5: Project Description */}
          <div className="row mb-3">
            <div className="col-12">
              <label className="form-label fw-semibold">Project Description *</label>
              <textarea 
                name="description" 
                value={formData.description || ''} 
                onChange={handleChange}
                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                rows="3" 
                placeholder="Enter project description"
                disabled={isLoading}
              ></textarea>
              {errors.description && <div className="invalid-feedback">{errors.description}</div>}
            </div>
            </div>

          {/* Row 6: Property Images */}
          <div className="row mb-4">
            <div className="col-12">
              <MultipleFilePreview 
                label="Property Images"
                value={formData.images}
                onChange={(files) => setFormData({...formData, images: files})}
                accept="image/*"
                minFiles={2}
                maxFiles={5}
                disabled={isLoading}
              />
              {errors.images && <div className="text-danger small mt-1">{errors.images}</div>}
            </div>
          </div>

          {/* Configuration Options */}
          <div className="row mb-4">
            <div className="col-12">
              <label className="form-label fw-bold">Configuration Options</label>
              <div className="border rounded p-3 bg-light">
                {!formData.category || !formData.subcategory ? (
                  <p className="text-muted small mb-0">Please select a category and subcategory to see available configurations</p>
                ) : loadingConfigurations ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Loading configurations...
                  </div>
                ) : availableConfigurations.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-muted small mb-2">No configurations available for the selected category and subcategory</p>
                    <p className="text-info small mb-0">You can still add the property without specific configurations</p>
                  </div>
                ) : (
                  <>
                    <p className="text-muted small mb-3">Select which property configurations are available for this property</p>
                    <div className="row">
                      {availableConfigurations.map((config, i) => (
                        <div key={i} className="col-md-6 col-lg-4 mb-3">
                          <div className="card h-100">
                            <div className="card-body p-3 d-flex justify-content-between align-items-center">
                              <h6 className="mb-0">{config.type}</h6>
                              <div className="form-check form-switch">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  checked={isConfigurationSelected(config.type)}
                                  onChange={(e) => handleConfigurationChange(config.type, e.target.checked)}
                                  id={`configEnabledRegular${i}`}
                                  disabled={isLoading}
                                  style={{ transform: 'scale(1.2)' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* BUILDER PROPERTY FORM */}
      {formType === 'builder' && (
        <div>
          {/* SECTION 1: Project Info */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Project Info</h5>
            </div>
            <div className="card-body">
          
          {/* Row 1: Category and Subcategory */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Category *</label>
              <select 
                name="category" 
                value={formData.category} 
                onChange={handleChange}
                className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                disabled={isLoading}
              >
                <option value="">Select Category</option>
                {dropdownData.categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && <div className="invalid-feedback">{errors.category}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Subcategory *</label>
              <select 
                name="subcategory" 
                value={formData.subcategory} 
                onChange={handleChange}
                className={`form-select ${errors.subcategory ? 'is-invalid' : ''}`}
                disabled={isLoading}
              >
                <option value="">{formData.category ? 'Select Subcategory' : 'Select Category First'}</option>
                {getSubcategories().map((subcategory) => (
                  <option key={subcategory._id} value={subcategory._id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              {errors.subcategory && <div className="invalid-feedback">{errors.subcategory}</div>}
            </div>
          </div>

          {/* Row 2: Builder and Project Name */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Builder *</label>
              <select 
                name="builder" 
                value={formData.builder} 
                onChange={handleChange}
                className={`form-select ${errors.builder ? 'is-invalid' : ''}`}
                disabled={isLoading}
              >
                <option value="">Select Builder</option>
                {dropdownData.builders.map((builder) => (
                  <option key={builder._id} value={builder._id}>
                    {builder.name}
                  </option>
                ))}
              </select>
              {errors.builder && <div className="invalid-feedback">{errors.builder}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Project Name *</label>
          <input 
            type="text" 
                name="projectName" 
                value={formData.projectName || ''} 
                onChange={handleChange}
                className={`form-control ${errors.projectName ? 'is-invalid' : ''}`}
                placeholder="Enter project name"
                disabled={isLoading}
              />
              {errors.projectName && <div className="invalid-feedback">{errors.projectName}</div>}
            </div>
          </div>

          {/* Row 4: Project Logo and Wallpaper Image */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Project Logo</label>
              <FilePreview 
                label=""
                value={formData.projectLogo}
                onChange={(file) => setFormData({...formData, projectLogo: file})}
                accept="image/*"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Wallpaper Image</label>
              <FilePreview 
                label=""
                value={formData.wallpaperImage}
                onChange={(file) => setFormData({...formData, wallpaperImage: file})}
                accept="image/*"
              />
            </div>
          </div>

          {/* Row 5: City and Locality */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">City *</label>
              <select 
            name="city" 
            value={formData.city} 
            onChange={handleChange} 
                className={`form-select ${errors.city ? 'is-invalid' : ''}`}
            disabled={isLoading}
              >
                <option value="">Select City</option>
                {dropdownData.cities.map((city) => (
                  <option key={city._id} value={city._id}>
                    {city.name}
                  </option>
                ))}
              </select>
          {errors.city && <div className="invalid-feedback">{errors.city}</div>}
        </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Locality *</label>
              <select 
            name="locality" 
            value={formData.locality} 
            onChange={handleChange}
                className={`form-select ${errors.locality ? 'is-invalid' : ''}`}
                disabled={isLoading || !formData.city}
              >
                <option value="">{formData.city ? 'Select Locality' : 'Select City First'}</option>
                {getLocalities().map((locality) => (
                  <option key={locality._id} value={locality._id}>{locality.name}</option>
                ))}
              </select>
          {errors.locality && <div className="invalid-feedback">{errors.locality}</div>}
        </div>
      </div>

          {/* Row 6: Full Address and Google Map URL */}
            <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Full Address *</label>
              <textarea 
                name="fullAddress" 
                value={formData.fullAddress || ''} 
                onChange={handleChange}
                className={`form-control ${errors.fullAddress ? 'is-invalid' : ''}`}
                rows="2" 
                placeholder="Enter full address"
                disabled={isLoading}
              ></textarea>
              {errors.fullAddress && <div className="invalid-feedback">{errors.fullAddress}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Google Map URL</label>
              <input 
                type="url" 
                name="googleMapUrl" 
                value={formData.googleMapUrl || ''} 
                onChange={handleChange}
                className="form-control"
                placeholder="Paste Google Maps link"
                disabled={isLoading}
              />
            </div>
          </div>
            </div>
          </div>

          {/* SECTION 2: Project Description */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Project Description</h5>
            </div>
            <div className="card-body">


              {/* Row 1: Project About and Land Area */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Project About *</label>
                  <input 
                    type="text" 
                    name="about" 
                    value={formData.about || ''} 
                    onChange={handleChange}
                    className={`form-control ${errors.about ? 'is-invalid' : ''}`}
                    placeholder="e.g. 816 Units, 2 Towers, 15 Floors"
                    disabled={isLoading}
                  />
                  {errors.about && <div className="invalid-feedback">{errors.about}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Land Area *</label>
                  <input 
                    type="text" 
                    name="landArea" 
                    value={formData.landArea || ''} 
                    onChange={handleChange}
                    className={`form-control ${errors.landArea ? 'is-invalid' : ''}`}
                    placeholder="e.g. 20 Acres"
                    disabled={isLoading}
                  />
                  {errors.landArea && <div className="invalid-feedback">{errors.landArea}</div>}
                </div>
              </div>

              {/* Row 2: Price and Possession Date */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Price *</label>
                  <input 
                    type="number" 
                    name="price" 
                    value={formData.price || ''} 
                    onChange={handleChange}
                    className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                    placeholder="e.g. 15000000"
                    disabled={isLoading}
                  />
                  {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Possession Date *</label>
                  <input 
                    type="month" 
                    name="possessionDate" 
                    value={formData.possessionDate || ''} 
                    onChange={handleChange}
                    className={`form-control ${errors.possessionDate ? 'is-invalid' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.possessionDate && <div className="invalid-feedback">{errors.possessionDate}</div>}
                </div>
              </div>

              {/* Row 3: Construction Status and RERA No */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Construction Status</label>
                  <select
                    value={formData.constructionDetails?.status || 'upcoming'}
                    onChange={(e) => handleConstructionDetailChange('status', e.target.value)}
                    className="form-select"
                    disabled={isLoading}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ready-to-move">Ready to Move</option>
                    <option value="under-construction">Under Construction</option>
                    <option value="new-launch">New Launch</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">RERA No *</label>
                  <input 
                    type="text" 
                    name="reraNo" 
                    value={formData.reraNo || ''} 
                    onChange={handleChange}
                    className={`form-control ${errors.reraNo ? 'is-invalid' : ''}`}
                    placeholder="e.g. HARERA Registration No. 21"
                    disabled={isLoading}
                  />
                  {errors.reraNo && <div className="invalid-feedback">{errors.reraNo}</div>}
                </div>
              </div>

              {/* Row 4: RERA Description */}
              <div className="row mb-3">
                <div className="col-12">
                  <label className="form-label fw-semibold">RERA Description</label>
                  <input
                    type="text"
                    value={formData.constructionDetails?.reraDescription || ''}
                    onChange={(e) => handleConstructionDetailChange('reraDescription', e.target.value)}
                    className="form-control"
                    placeholder="e.g. RERA approved project"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Row 5: Project Description */}
              <div className="row mb-3">
                <div className="col-12">
                  <label className="form-label fw-semibold">Project Description *</label>
                  <textarea 
                    name="description" 
                    value={formData.description || ''} 
                    onChange={handleChange}
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    rows="3" 
                    placeholder="Enter project description"
                    disabled={isLoading}
                  ></textarea>
                  {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                </div>
              </div>

              {/* Row 6: Description Image and Highlight Image */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Description Image</label>
                  <FilePreview 
                    label=""
                    value={formData.descriptionImage}
                    onChange={(file) => setFormData({...formData, descriptionImage: file})}
                    accept="image/*"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Highlight Image</label>
                  <FilePreview 
                    label=""
                    value={formData.highlightImage}
                    onChange={(file) => setFormData({...formData, highlightImage: file})}
                    accept="image/*"
                  />
                </div>
              </div>

              {/* Row 7: Project Highlights (Max 5) */}
              <div className="row mb-3">
                <div className="col-12">
                  <label className="form-label fw-semibold">Project Highlights (Max 5) *</label>
                  {formData.highlights.map((highlight, index) => (
                    <div key={index} className="input-group mb-2">
                      <input
                        type="text"
                        className="form-control"
                        value={highlight}
                        onChange={(e) => handleHighlightChange(index, e.target.value)}
                        placeholder={`Highlight ${index + 1}`}
                        disabled={isLoading}
                      />
                      {formData.highlights.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeHighlight(index)}
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.highlights.length < 5 && (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={addHighlight}
                      disabled={isLoading}
                    >
                      Add Highlight
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* SECTION 3: Project Unit Details */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Project Unit Details</h5>
            </div>
            <div className="card-body">

          {/* Unit Details Array */}
          {formData.unitDetails.map((unit, index) => (
            <div key={index} className="border rounded p-3 mb-3 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Unit {index + 1}</h6>
                {formData.unitDetails.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeUnitDetail(index)}
                    disabled={isLoading}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                )}
              </div>

              {/* Unit Type and Area */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Unit Type *</label>
                  <input 
                    type="text" 
                    value={unit.unitType} 
                    onChange={(e) => handleUnitDetailChange(index, 'unitType', e.target.value)}
                    className={`form-control ${errors[`unitDetails.${index}.unitType`] ? 'is-invalid' : ''}`}
                    placeholder="e.g. 1 BHK, 2 BHK, 3 BHK"
                    disabled={isLoading}
                  />
                  {errors[`unitDetails.${index}.unitType`] && (
                    <div className="invalid-feedback">{errors[`unitDetails.${index}.unitType`]}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Area (Sq.ft.) *</label>
                  <input 
                    type="text" 
                    value={unit.area} 
                    onChange={(e) => handleUnitDetailChange(index, 'area', e.target.value)}
                    className={`form-control ${errors[`unitDetails.${index}.area`] ? 'is-invalid' : ''}`}
                    placeholder="e.g. 1200 sq ft, 1500 sq ft"
                    disabled={isLoading}
                  />
                  {errors[`unitDetails.${index}.area`] && (
                    <div className="invalid-feedback">{errors[`unitDetails.${index}.area`]}</div>
                  )}
                </div>
              </div>

              {/* Floor Plan Upload */}
              <div className="row">
                <div className="col-12">
                  <label className="form-label fw-semibold">Floor Plan Image *</label>
                  <FilePreview 
                    label=""
                    value={unit.floorPlan}
                    onChange={(file) => handleUnitDetailChange(index, 'floorPlan', file)}
                    accept="image/*"
                  />
                  {errors[`unitDetails.${index}.floorPlan`] && (
                    <div className="text-danger small mt-1">{errors[`unitDetails.${index}.floorPlan`]}</div>
                  )}
                </div>
              </div>
            </div>
          ))}

              {/* Add Unit Button */}
              <div className="row mb-4">
                <div className="col-12">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={addUnitDetail}
                    disabled={isLoading}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Another Unit Type
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Project Configuration Options */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Project Configuration Options</h5>
            </div>
            <div className="card-body">
              <div className="row mb-4">
                <div className="col-12">
                  <label className="form-label fw-bold">Configuration Options</label>
                  <div className="border rounded p-3 bg-light">
                    {!formData.category || !formData.subcategory ? (
                      <p className="text-muted small mb-0">Please select a category and subcategory to see available configurations</p>
                    ) : loadingConfigurations ? (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Loading configurations...
                      </div>
                    ) : availableConfigurations.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-muted small mb-2">No configurations available for the selected category and subcategory</p>
                        <p className="text-info small mb-0">You can still add the property without specific configurations</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-muted small mb-3">Select which property configurations are available for this property</p>
                        <div className="row">
                          {availableConfigurations.map((config, i) => (
                            <div key={i} className="col-md-6 col-lg-4 mb-3">
                              <div className="card h-100">
                                <div className="card-body p-3 d-flex justify-content-between align-items-center">
                                  <h6 className="mb-0">{config.type}</h6>
                                  <div className="form-check form-switch">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      role="switch"
                                      checked={isConfigurationSelected(config.type)}
                                      onChange={(e) => handleConfigurationChange(config.type, e.target.checked)}
                                      id={`configEnabledBuilder${i}`}
                                      disabled={isLoading}
                                      style={{ transform: 'scale(1.2)' }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: Project Gallery */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Project Gallery</h5>
            </div>
            <div className="card-body">
              <div className="row mb-4">
                <div className="col-12">
                  <MultipleFilePreview 
                    label="Project Gallery"
                    value={formData.projectImages}
                    onChange={(files) => setFormData({...formData, projectImages: files})}
                    accept="image/*"
                    minFiles={2}
                    maxFiles={5}
                    disabled={isLoading}
                  />
                  {errors.projectImages && <div className="text-danger small mt-1">{errors.projectImages}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: Project Connectivity */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Project Connectivity</h5>
            </div>
            <div className="card-body">

              {/* Connectivity Points */}
              <div className="row mb-4">
                <div className="col-12">
                  <label className="form-label fw-semibold">Connectivity Points *</label>
                  <p className="text-muted small mb-3">Add connectivity points with descriptions</p>
                  {formData.connectivityPoints.map((point, idx) => (
                    <div key={idx} className="border rounded p-3 mb-3 bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">Connectivity Point {idx + 1}</h6>
                        {formData.connectivityPoints.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeConnectivityPoint(idx)}
                            disabled={isLoading}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <label className="form-label fw-semibold">Description *</label>
                          <input
                            type="text"
                            className={`form-control ${errors[`connectivityPoints.${idx}.text`] ? 'is-invalid' : ''}`}
                            value={point.text || ''}
                            onChange={(e) => handleConnectivityPointChange(idx, 'text', e.target.value)}
                            placeholder={`e.g. Metro Station - 2 km`}
                            disabled={isLoading}
                          />
                          {errors[`connectivityPoints.${idx}.text`] && (
                            <div className="invalid-feedback">{errors[`connectivityPoints.${idx}.text`]}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={addConnectivityPoint} 
                    className="btn btn-sm btn-outline-primary"
                    disabled={isLoading}
                  >
                    <i className="bi bi-plus me-1"></i>
                    Add Connectivity Point
                  </button>
                  {errors.connectivityPoints && <div className="text-danger small mt-1">{errors.connectivityPoints}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 8: Project Master Plan */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Project Master Plan</h5>
            </div>
            <div className="card-body">
              {/* Master Plan Upload */}
              <div className="row mb-4">
                <div className="col-12">
                  <label className="form-label fw-semibold">Master Plan Image *</label>
                  <FilePreview 
                    label=""
                    value={formData.masterPlan}
                    onChange={(file) => setFormData({...formData, masterPlan: file})}
                    accept="image/*"
                  />
                  {errors.masterPlan && <div className="text-danger small mt-1">{errors.masterPlan}</div>}
                </div>
              </div>
            </div>
          </div>




        </div>
      )}

      {/* Submit Buttons */}
      <div className="d-flex justify-content-end gap-2 mt-4">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={() => onSave(null)}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ButtonSpinner size="sm" color="white" />
              {isEditing ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              {isEditing ? 'Update Property' : 'Add Property'}
            </>
          )}
        </button>
      </div>
    </form>
    </>
  );
}