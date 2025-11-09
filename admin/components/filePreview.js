'use client';

import { useState, useEffect, useRef } from "react";

export default function FilePreview({ label, value, onChange, accept = "image/*" }) {
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const blobUrlRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasLocalFileRef = useRef(false); // Track if we have a locally selected file

  // Sync preview with value prop (for existing images or when value changes externally)
  // Only update if we don't have a local file selected
  useEffect(() => {
    // Don't override if we have a local file selected
    // This prevents clearing the preview when a new file is selected
    if (hasLocalFileRef.current) {
      return; // Keep the local file preview
    }

    if (value) {
      // If value is a File object, create blob URL
      if (value instanceof File) {
        // Cleanup previous blob URL if exists
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const blobUrl = URL.createObjectURL(value);
        blobUrlRef.current = blobUrl;
        setPreview(blobUrl);
        setFile(value);
        hasLocalFileRef.current = true;
      } 
      // If value is a string URL (existing image)
      else if (typeof value === 'string' && value.trim() !== '') {
        // Validate and normalize URL format before setting preview
        let trimmedValue = value.trim();
        
        // If URL starts with //, add https: protocol (common CloudFront pattern)
        if (trimmedValue.startsWith('//')) {
          trimmedValue = 'https:' + trimmedValue;
        }
        // If URL doesn't have protocol but looks like a domain, add https://
        else if (!trimmedValue.startsWith('http://') && 
                 !trimmedValue.startsWith('https://') && 
                 !trimmedValue.startsWith('/') &&
                 !trimmedValue.startsWith('blob:') &&
                 trimmedValue.includes('.')) {
          // Check if it looks like a domain (contains dots and no spaces)
          if (trimmedValue.split(' ').length === 1 && trimmedValue.includes('.')) {
            trimmedValue = 'https://' + trimmedValue;
          }
        }
        
        // Check if it's a valid URL format
        if (trimmedValue.startsWith('http://') || 
            trimmedValue.startsWith('https://') || 
            trimmedValue.startsWith('/') ||
            trimmedValue.startsWith('blob:')) {
          setPreview(trimmedValue);
          setFile(null);
          hasLocalFileRef.current = false;
        } else {
          // Invalid URL format, don't set preview
          setPreview("");
          setFile(null);
          hasLocalFileRef.current = false;
        }
      }
    } else {
      // Cleanup blob URL when value is cleared
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setPreview("");
      setFile(null);
      hasLocalFileRef.current = false;
    }
  }, [value]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Cleanup previous blob URL if exists
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    setFile(selectedFile);
    hasLocalFileRef.current = true; // Mark that we have a local file

    // Create preview URL
    const previewUrl = URL.createObjectURL(selectedFile);
    blobUrlRef.current = previewUrl;
    setPreview(previewUrl);
    
    // Call onChange with the file object
    onChange && onChange(selectedFile);
  };

  const removeFile = () => {
    // Cleanup blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setFile(null);
    setPreview("");
    hasLocalFileRef.current = false; // Reset local file flag
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange && onChange(null);
  };

  const handlePreviewClick = () => {
    if (preview) {
      setShowPreviewModal(true);
    }
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
  };

  return (
    <>
    <div className="mb-3">
      {label && <label className="form-label fw-semibold text-dark">{label}</label>}

        <div className="d-flex align-items-center gap-3 mb-2">
        <input
            ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="form-control"
            style={{ flex: 1 }}
        />

        {preview && (
            <>
              <button
                type="button"
                onClick={handlePreviewClick}
                className="btn btn-sm btn-outline-primary"
                title="Preview image"
              >
                <i className="bi bi-image me-1"></i>
                Preview
              </button>
          <button
            type="button"
            onClick={removeFile}
            className="btn btn-sm btn-outline-danger"
                title="Remove image"
          >
            Remove
          </button>
            </>
        )}
      </div>

      {preview && (
        <div className="mt-3">
            <div className="d-flex align-items-center gap-3">
              <div className="position-relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="img-thumbnail border"
                  style={{ 
                    width: "200px", 
                    height: "200px", 
                    objectFit: "cover",
                    cursor: "pointer",
                    display: "block"
                  }}
                  onClick={handlePreviewClick}
                  onError={(e) => {
                    // Silently handle image loading errors
                    e.target.style.display = 'none';
                    if (!e.target.parentElement.querySelector('.image-error')) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-danger small image-error';
                      errorDiv.textContent = 'Failed to load image preview';
                      e.target.parentElement.appendChild(errorDiv);
                    }
                  }}
                />
                <div 
                  className="position-absolute top-0 end-0 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    transform: 'translate(25%, -25%)'
                  }}
                  onClick={handlePreviewClick}
                  title="Click to view larger"
                >
                  <i className="bi bi-arrows-fullscreen"></i>
                </div>
              </div>
              <div className="flex-grow-1">
                <p className="mb-1 small text-muted">
                  <i className="bi bi-check-circle text-success me-1"></i>
                  Image selected
                </p>
                {file && (
                  <p className="mb-0 small text-muted">
                    <strong>File:</strong> {file.name}<br/>
                    <strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB<br/>
                    <strong>Type:</strong> {file.type}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && preview && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closePreviewModal}
        >
          <div 
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Image Preview</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closePreviewModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body text-center">
          <img
            src={preview}
            alt="Preview"
                  className="img-fluid"
                  style={{ maxHeight: '70vh', width: 'auto' }}
                  onError={(e) => {
                    // Silently handle image loading errors in modal
                    e.target.style.display = 'none';
                    if (!e.target.parentElement.querySelector('.image-error')) {
                      const errorDiv = document.createElement('p');
                      errorDiv.className = 'text-danger image-error';
                      errorDiv.textContent = 'Failed to load image';
                      e.target.parentElement.appendChild(errorDiv);
                    }
                  }}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closePreviewModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
