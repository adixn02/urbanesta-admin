'use client';
import React from 'react';

/**
 * Upload Progress Component
 * Shows a modal with upload progress information
 * 
 * @param {boolean} isVisible - Whether to show the modal
 * @param {string} status - Current status ('uploading', 'saving', 'success', 'error')
 * @param {string} message - Status message to display
 * @param {Array} files - Array of files being uploaded with their status
 * @param {number} progress - Upload progress percentage (0-100)
 */
export default function UploadProgress({ 
  isVisible, 
  status = 'uploading', 
  message = 'Uploading files...',
  files = [],
  progress = 0 
}) {
  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
      case 'saving':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
      case 'saving':
        return 'primary';
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      default:
        return 'primary';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading Images...';
      case 'saving':
        return 'Saving Data...';
      case 'success':
        return 'Completed!';
      case 'error':
        return 'Error Occurred';
      default:
        return 'Processing...';
    }
  };

  return (
    <div 
      className="modal fade show" 
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0">
            <h5 className="modal-title d-flex align-items-center">
              <span className="me-2" style={{ fontSize: '1.5rem' }}>{getStatusIcon()}</span>
              {getStatusText()}
            </h5>
          </div>
          <div className="modal-body">
            {/* Progress Bar */}
            {(status === 'uploading' || status === 'saving') && (
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">{message}</span>
                  <span className="text-muted fw-bold">{progress}%</span>
                </div>
                <div className="progress" style={{ height: '25px' }}>
                  <div
                    className={`progress-bar progress-bar-striped progress-bar-animated bg-${getStatusColor()}`}
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {progress}%
                  </div>
                </div>
              </div>
            )}

            {/* File List */}
            {files.length > 0 && (
              <div className="mb-3">
                <h6 className="mb-2">Files:</h6>
                <ul className="list-group">
                  {files.map((file, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <span className="text-truncate" style={{ maxWidth: '70%' }}>
                        {file.name || `File ${index + 1}`}
                      </span>
                      <span className={`badge bg-${file.status === 'completed' ? 'success' : file.status === 'error' ? 'danger' : 'primary'}`}>
                        {file.status === 'completed' ? '✓' : file.status === 'error' ? '✗' : '⏳'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Status Message */}
            {status === 'success' && (
              <div className="alert alert-success mb-0">
                <i className="bi bi-check-circle me-2"></i>
                {message || 'Upload completed successfully!'}
              </div>
            )}

            {status === 'error' && (
              <div className="alert alert-danger mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {message || 'An error occurred during upload.'}
              </div>
            )}

            {/* Loading Spinner */}
            {(status === 'uploading' || status === 'saving') && (
              <div className="text-center mt-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted small">Please wait...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
