'use client';

import { useState, useEffect, useRef, useCallback } from "react";

// Helper function to normalize URLs (similar to FilePreview)
const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  let trimmedUrl = url.trim();
  if (!trimmedUrl) return url;
  
  // If URL starts with //, add https: protocol (common CloudFront pattern)
  if (trimmedUrl.startsWith('//')) {
    trimmedUrl = 'https:' + trimmedUrl;
  }
  // If URL doesn't have protocol but looks like a domain, add https://
  else if (!trimmedUrl.startsWith('http://') && 
           !trimmedUrl.startsWith('https://') && 
           !trimmedUrl.startsWith('/') &&
           !trimmedUrl.startsWith('blob:') &&
           trimmedUrl.includes('.')) {
    // Check if it looks like a domain (contains dots and no spaces)
    if (!trimmedUrl.includes(' ') && trimmedUrl.split('.').length >= 2) {
      trimmedUrl = 'https://' + trimmedUrl;
    }
  }
  
  return trimmedUrl;
};

// Image item structure: { id, type: 'url' | 'file', url?: string, file?: File, preview?: string, error?: string, loading?: boolean }

export default function MultipleFilePreview({ 
  label, 
  value = [], 
  onChange, 
  accept = "image/*", 
  minFiles = 2, 
  maxFiles = 5, 
  disabled = false 
}) {
  const blobUrlRefs = useRef(new Map()); // Map of id -> blob URL for cleanup
  const fileInputRef = useRef(null);
  const hasLocalFilesRef = useRef(false); // Track if we have locally selected files

  // Convert value prop to internal image items format
  const valueToImageItems = useCallback((val) => {
    if (!Array.isArray(val)) return [];
    
    return val.map((item, index) => {
      if (item instanceof File) {
        hasLocalFilesRef.current = true;
        const id = `file-${Date.now()}-${index}`;
        const blobUrl = URL.createObjectURL(item);
        blobUrlRefs.current.set(id, blobUrl);
        return {
          id,
          type: 'file',
          file: item,
          preview: blobUrl,
          loading: false,
          error: null
        };
      } else if (typeof item === 'string' && item.trim() !== '') {
        const normalizedUrl = normalizeUrl(item);
        return {
          id: `url-${normalizedUrl}-${index}`,
          type: 'url',
          url: normalizedUrl,
          preview: normalizedUrl,
          loading: false,
          error: null
        };
      }
      return null;
    }).filter(Boolean);
  }, []);

  const [imageItems, setImageItems] = useState(() => valueToImageItems(value));

  // Sync with external value changes (e.g., when editing property)
  useEffect(() => {
    const newItems = valueToImageItems(value);
    
    // Only update if values actually changed
    const currentIds = imageItems.map(item => item.id).sort().join(',');
    const newIds = newItems.map(item => item.id).sort().join(',');
    
    if (currentIds !== newIds) {
      // Cleanup old blob URLs that are no longer in the list
      imageItems.forEach(item => {
        if (item.type === 'file' && blobUrlRefs.current.has(item.id)) {
          const blobUrl = blobUrlRefs.current.get(item.id);
          if (blobUrl && blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl);
          }
          blobUrlRefs.current.delete(item.id);
        }
      });
      
      setImageItems(newItems);
    }
  }, [value, valueToImageItems]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlRefs.current.forEach((blobUrl) => {
        if (blobUrl && blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrl);
        }
      });
      blobUrlRefs.current.clear();
    };
  }, []);

  // Notify parent of changes
  const notifyChange = useCallback((items) => {
    const combinedValue = items.map(item => {
      if (item.type === 'file') {
        return item.file;
      } else {
        return item.url;
      }
    });
    onChange && onChange(combinedValue);
  }, [onChange]);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validate file count
    const totalCount = imageItems.length;
    if (totalCount + selectedFiles.length > maxFiles) {
      alert(`You can only upload a maximum of ${maxFiles} images. You currently have ${totalCount} images.`);
      event.target.value = '';
      return;
    }

    // Validate file types
    const invalidFiles = selectedFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
      const extension = file.name.toLowerCase().split('.').pop();
      return !validTypes.includes(file.type) && !validExtensions.includes(extension);
    });

    if (invalidFiles.length > 0) {
      alert(`Invalid file type. Please upload only image files (JPEG, PNG, WebP, GIF, or AVIF format).`);
      event.target.value = '';
      return;
    }

    // Create new image items for selected files
    const newItems = selectedFiles.map((file, index) => {
      const id = `file-${Date.now()}-${index}`;
      const blobUrl = URL.createObjectURL(file);
      blobUrlRefs.current.set(id, blobUrl);
      hasLocalFilesRef.current = true;
      return {
        id,
        type: 'file',
        file,
        preview: blobUrl,
        loading: false,
        error: null
      };
    });

    const updatedItems = [...imageItems, ...newItems];
    setImageItems(updatedItems);
    notifyChange(updatedItems);

    // Reset the file input
    event.target.value = '';
  };

  const removeImage = (idToRemove) => {
    const itemToRemove = imageItems.find(item => item.id === idToRemove);
    
    // Cleanup blob URL if it's a file
    if (itemToRemove && itemToRemove.type === 'file') {
      const blobUrl = blobUrlRefs.current.get(idToRemove);
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
      blobUrlRefs.current.delete(idToRemove);
    }

    const updatedItems = imageItems.filter(item => item.id !== idToRemove);
    setImageItems(updatedItems);
    notifyChange(updatedItems);
  };


  const handleImageError = (id) => {
    setImageItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, error: 'Failed to load image', preview: null }
        : item
    ));
  };

  const handleImageLoad = (id) => {
    setImageItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, loading: false, error: null }
        : item
    ));
  };

  const openImagePreview = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const totalImages = imageItems.length;
  const isMinFilesMet = totalImages >= minFiles;
  const isMaxFilesReached = totalImages >= maxFiles;

  return (
    <div className="mb-3">
      {label && (
        <label className="form-label fw-semibold text-dark d-block mb-2">
          {label} 
          <span className="text-danger">*</span>
          <small className="text-muted ms-2">
            ({minFiles}-{maxFiles} images required)
          </small>
        </label>
      )}

      {/* File Input */}
      <div className="d-flex align-items-center gap-3 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept === "image/*" ? "image/*,.webp,.avif" : accept}
          multiple
          onChange={handleFileChange}
          disabled={disabled || isMaxFilesReached}
          className="form-control"
        />
        {isMaxFilesReached && (
          <span className="text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            Maximum {maxFiles} images reached
          </span>
        )}
      </div>

      {/* Image Previews Grid */}
      {imageItems.length > 0 && (
        <div className="row g-2 mb-3">
          {imageItems.map((item, index) => (
            <div 
              key={item.id} 
              className="col-md-3 col-sm-4 col-6"
            >
              <div className="position-relative border rounded p-2 bg-light">
                {item.error ? (
                  <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '120px' }}>
                    <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '2rem' }}></i>
                    <small className="text-danger mt-2 text-center">{item.error}</small>
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      className="btn btn-sm btn-danger mt-2"
                    >
                      <i className="bi bi-trash me-1"></i>
                      Remove
                    </button>
                  </div>
                ) : item.preview ? (
                  <>
                    <img
                      src={item.preview}
                      alt={`Image ${index + 1}`}
                      className="img-thumbnail w-100"
                      style={{ 
                        height: "120px", 
                        objectFit: "cover",
                        aspectRatio: "1/1",
                        cursor: "pointer",
                        display: "block"
                      }}
                      onClick={() => openImagePreview(item.preview)}
                      onError={() => handleImageError(item.id)}
                      onLoad={() => handleImageLoad(item.id)}
                    />
                    {item.loading && (
                      <div className="position-absolute top-50 start-50 translate-middle">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      className="btn btn-sm btn-danger position-absolute"
                      style={{ 
                        top: "5px", 
                        right: "5px",
                        width: "28px",
                        height: "28px",
                        padding: "0",
                        borderRadius: "50%",
                        fontSize: "14px",
                        lineHeight: "1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      disabled={disabled}
                      title="Remove image"
                    >
                      ×
                    </button>
                    <div className="position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white text-center small py-1">
                      {index + 1} / {totalImages}
                      {item.type === 'file' && (
                        <span className="ms-2 badge bg-info">New</span>
                      )}
                    </div>
                    {item.type === 'file' && item.file && (
                      <div className="position-absolute top-0 start-0 bg-info text-white small px-2 py-1 rounded-bottom-end">
                        <small>{item.file.name}</small>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '120px' }}>
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <small className="text-muted mt-2">Loading preview...</small>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation Messages */}
      {!isMinFilesMet && totalImages > 0 && (
        <div className="alert alert-warning d-flex align-items-center mb-2">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <span>Please upload at least {minFiles} images. Currently have {totalImages}.</span>
        </div>
      )}

      {isMinFilesMet && (
        <div className="alert alert-success d-flex align-items-center mb-2">
          <i className="bi bi-check-circle me-2"></i>
          <span>{totalImages} images selected (minimum requirement met)</span>
        </div>
      )}

      {/* Empty State */}
      {totalImages === 0 && (
        <div className="text-center py-4 border border-dashed rounded bg-light">
          <i className="bi bi-images display-4 text-muted"></i>
          <p className="text-muted mt-2 mb-1">No images selected</p>
          <small className="text-muted">Select {minFiles}-{maxFiles} images to upload</small>
        </div>
      )}

      {/* Help Text */}
      {totalImages > 0 && (
        <div className="text-muted small mt-2">
          <i className="bi bi-info-circle me-1"></i>
          Tip: Click on an image to view it in full size. You can add up to {maxFiles} images and remove any image by clicking the × button.
        </div>
      )}
    </div>
  );
}
