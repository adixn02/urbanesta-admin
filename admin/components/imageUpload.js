'use client';

import { useState, useEffect, useRef } from "react";

export default function ImageUpload({ label, value, onChange }) {
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const blobUrlRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasLocalFileRef = useRef(false);

  // Sync preview with value prop (for existing images)
  useEffect(() => {
    if (hasLocalFileRef.current) {
      return; // Keep the local file preview
    }

    if (value) {
      if (value instanceof File) {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const blobUrl = URL.createObjectURL(value);
        blobUrlRef.current = blobUrl;
        setPreview(blobUrl);
        setFile(value);
        hasLocalFileRef.current = true;
      } else if (typeof value === 'string' && value.trim() !== '') {
        let trimmedValue = value.trim();
        if (trimmedValue.startsWith('//')) {
          trimmedValue = 'https:' + trimmedValue;
        } else if (!trimmedValue.startsWith('http://') && 
                   !trimmedValue.startsWith('https://') && 
                   !trimmedValue.startsWith('/') &&
                   !trimmedValue.startsWith('blob:') &&
                   trimmedValue.includes('.')) {
          if (trimmedValue.split(' ').length === 1 && trimmedValue.includes('.')) {
            trimmedValue = 'https://' + trimmedValue;
          }
        }
        setPreview(trimmedValue);
        setFile(null);
        hasLocalFileRef.current = false;
      }
    } else {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setPreview("");
      setFile(null);
      hasLocalFileRef.current = false;
      }
  }, [value]);

  // Cleanup blob URL on unmount - delay to allow images to finish loading
  useEffect(() => {
    const currentBlobUrl = blobUrlRef.current;
    return () => {
      // Use a small delay to allow any in-flight image loads to complete
      // This prevents ERR_FILE_NOT_FOUND errors when images are still loading
      const timeoutId = setTimeout(() => {
        if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(currentBlobUrl);
          } catch (error) {
            // Silently handle errors if URL was already revoked
          }
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
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
    hasLocalFileRef.current = true;

    // Create preview URL
    const previewUrl = URL.createObjectURL(selectedFile);
    blobUrlRef.current = previewUrl;
    setPreview(previewUrl);
    
    // Call onChange with the file object (not URL) - upload will happen on save
    onChange && onChange(selectedFile);
  };

  const removeImage = () => {
    // Cleanup blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setFile(null);
    setPreview("");
    hasLocalFileRef.current = false;
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange && onChange(null);
  };

  return (
    <div className="mb-3">
      {label && <label className="form-label fw-semibold text-dark">{label}</label>}

      <div className="d-flex align-items-center gap-3 mb-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.webp"
          onChange={handleFileChange}
          className="form-control"
          style={{ flex: 1 }}
        />

        {preview && (
          <button
            type="button"
            onClick={removeImage}
            className="btn btn-sm btn-outline-danger"
            title="Remove image"
          >
            Remove
          </button>
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
                onError={(e) => {
                  // Handle blob URL errors gracefully
                  if (preview && preview.startsWith('blob:')) {
                    // Blob URL might have been revoked, try to recreate if we have the file
                    if (file) {
                      try {
                        const newBlobUrl = URL.createObjectURL(file);
                        blobUrlRef.current = newBlobUrl;
                        e.target.src = newBlobUrl;
                        return;
                      } catch (error) {
                        // If we can't recreate, show error
                      }
                    }
                  }
                  // Silently handle other image loading errors
                  e.target.style.display = 'none';
                  if (!e.target.parentElement.querySelector('.image-error')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'text-danger small image-error';
                    errorDiv.textContent = 'Failed to load image preview';
                    e.target.parentElement.appendChild(errorDiv);
                  }
                }}
          />
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
  );
}
