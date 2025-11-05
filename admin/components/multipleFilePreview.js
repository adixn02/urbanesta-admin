'use client';

import { useState, useEffect } from "react";

export default function MultipleFilePreview({ 
  label, 
  value = [], 
  onChange, 
  accept = "image/*", 
  minFiles = 2, 
  maxFiles = 5, 
  disabled = false 
}) {
  // Separate existing URLs (strings) from new File objects
  const initialFiles = (value || []).filter(item => item instanceof File);
  const initialUrls = (value || []).filter(item => typeof item === 'string' && item.trim() !== '');
  
  const [files, setFiles] = useState(initialFiles);
  const [urls, setUrls] = useState(initialUrls);
  const [previews, setPreviews] = useState([]);

  // Initialize previews for new files
  useEffect(() => {
    const filePreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isFile: true
    }));
    setPreviews(filePreviews);
    
    // Cleanup function to revoke object URLs
    return () => {
      filePreviews.forEach(preview => {
        if (preview.preview && preview.preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview.preview);
        }
      });
    };
  }, [files]);

  // Sync with external value changes (e.g., when editing)
  useEffect(() => {
    const newFiles = (value || []).filter(item => item instanceof File);
    const newUrls = (value || []).filter(item => typeof item === 'string' && item.trim() !== '');
    
    setFiles(newFiles);
    setUrls(newUrls);
  }, [value]);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    // Check if adding these files would exceed the maximum (count both files and URLs)
    const totalCount = files.length + urls.length;
    if (totalCount + selectedFiles.length > maxFiles) {
      alert(`You can only upload a maximum of ${maxFiles} images. You currently have ${totalCount} images.`);
      return;
    }

    // Create preview URLs for new files
    const newPreviews = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isFile: true
    }));

    const updatedFiles = [...files, ...selectedFiles];
    const updatedPreviews = [...previews, ...newPreviews];

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    
    // Combine existing URLs with new files for onChange
    onChange && onChange([...urls, ...updatedFiles]);

    // Reset the file input
    event.target.value = '';
  };

  const removeFile = (indexToRemove, isUrl = false) => {
    if (isUrl) {
      // Remove URL (existing image)
      const updatedUrls = urls.filter((_, index) => index !== indexToRemove);
      setUrls(updatedUrls);
      // Combine remaining URLs with files
      onChange && onChange([...updatedUrls, ...files]);
    } else {
      // Remove file (new upload)
      if (previews[indexToRemove]) {
        URL.revokeObjectURL(previews[indexToRemove].preview);
      }

      const updatedFiles = files.filter((_, index) => index !== indexToRemove);
      const updatedPreviews = previews.filter((_, index) => index !== indexToRemove);

      setFiles(updatedFiles);
      setPreviews(updatedPreviews);
      // Combine URLs with remaining files
      onChange && onChange([...urls, ...updatedFiles]);
    }
  };

  const totalImages = files.length + urls.length;
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
          type="file"
          accept={accept === "image/*" ? "image/*,.webp" : accept}
          multiple
          onChange={handleFileChange}
          disabled={disabled || isMaxFilesReached}
          className="form-control"
        />
        {isMaxFilesReached && (
          <span className="text-muted small">Maximum {maxFiles} images reached</span>
        )}
      </div>

      {/* Image Previews */}
      {(urls.length > 0 || previews.length > 0) && (
        <div className="row g-2">
          {/* Existing URLs (when editing) */}
          {urls.map((url, index) => (
            <div key={`url-${index}`} className="col-md-3 col-sm-4 col-6">
              <div className="position-relative">
                <img
                  src={url}
                  alt={`Existing image ${index + 1}`}
                  className="img-thumbnail w-100"
                  style={{ 
                    height: "120px", 
                    objectFit: "cover",
                    aspectRatio: "1/1"
                  }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeFile(index, true)}
                  className="btn btn-sm btn-danger position-absolute"
                  style={{ 
                    top: "5px", 
                    right: "5px",
                    width: "24px",
                    height: "24px",
                    padding: "0",
                    borderRadius: "50%",
                    fontSize: "12px"
                  }}
                  disabled={disabled}
                  title="Remove image"
                >
                  ×
                </button>
                <div className="position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white text-center small py-1">
                  {index + 1}
                </div>
              </div>
            </div>
          ))}
          {/* New file previews */}
          {previews.map((previewData, index) => (
            <div key={`file-${index}`} className="col-md-3 col-sm-4 col-6">
              <div className="position-relative">
                <img
                  src={previewData.preview}
                  alt={`Preview ${index + 1}`}
                  className="img-thumbnail w-100"
                  style={{ 
                    height: "120px", 
                    objectFit: "cover",
                    aspectRatio: "1/1"
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeFile(index, false)}
                  className="btn btn-sm btn-danger position-absolute"
                  style={{ 
                    top: "5px", 
                    right: "5px",
                    width: "24px",
                    height: "24px",
                    padding: "0",
                    borderRadius: "50%",
                    fontSize: "12px"
                  }}
                  disabled={disabled}
                  title="Remove image"
                >
                  ×
                </button>
                <div className="position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white text-center small py-1">
                  {urls.length + index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation Messages */}
      {!isMinFilesMet && totalImages > 0 && (
        <div className="text-danger small mt-2">
          <i className="bi bi-exclamation-triangle me-1"></i>
          Please upload at least {minFiles} images. Currently have {totalImages}.
        </div>
      )}

      {isMinFilesMet && (
        <div className="text-success small mt-2">
          <i className="bi bi-check-circle me-1"></i>
          {totalImages} images selected (minimum requirement met)
        </div>
      )}

      {/* Empty State */}
      {totalImages === 0 && (
        <div className="text-center py-4 border border-dashed rounded">
          <i className="bi bi-images display-4 text-muted"></i>
          <p className="text-muted mt-2 mb-0">No images selected</p>
          <small className="text-muted">Select {minFiles}-{maxFiles} images</small>
        </div>
      )}
    </div>
  );
}
