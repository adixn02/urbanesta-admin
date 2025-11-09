'use client';

import React from 'react';

/**
 * ErrorPopup Component
 * Displays error messages in a modal that requires user interaction to dismiss
 * 
 * @param {boolean} isVisible - Whether the error popup is visible
 * @param {string} title - Error title (default: "Error")
 * @param {string} message - Error message to display
 * @param {string} details - Optional detailed error information
 * @param {Function} onClose - Callback when user clicks OK
 */
export default function ErrorPopup({ 
  isVisible, 
  title = "Error", 
  message, 
  details = null,
  onClose 
}) {
  if (!isVisible || !message) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="modal fade show" 
      style={{ display: isVisible ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.5)' }}
      tabIndex="-1"
    >
      <div className={`modal-dialog modal-dialog-centered ${details ? 'modal-lg' : 'modal-md'}`}>
        <div className="modal-content">
          <div className="modal-header bg-danger text-white border-0">
            <h5 className="modal-title d-flex align-items-center mb-0">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {title}
            </h5>
          </div>
          <div className="modal-body">
            <div className="alert alert-danger mb-0">
              <p className="mb-0 fw-semibold">{message}</p>
            </div>
            
            {/* Only show error details in development mode for debugging */}
            {details && process.env.NODE_ENV === 'development' && (
              <details className="mt-3">
                <summary className="text-danger cursor-pointer fw-semibold" style={{ cursor: 'pointer' }}>
                  <i className="bi bi-info-circle me-2"></i>
                  Technical Details (Development Only)
                </summary>
                <pre className="bg-light p-3 mt-2 rounded" style={{ 
                  fontSize: '12px', 
                  overflow: 'auto',
                  maxHeight: '300px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
                </pre>
              </details>
            )}
          </div>
          <div className="modal-footer border-0">
            <button 
              type="button" 
              className="btn btn-danger"
              onClick={handleClose}
            >
              <i className="bi bi-check-circle me-2"></i>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

