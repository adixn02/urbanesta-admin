import React from 'react';

const UploadProgress = ({ 
  isVisible, 
  progress = 0, 
  message = 'Uploading...', 
  onCancel 
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.7)', 
        zIndex: 10000 
      }}
    >
      <div className="bg-white rounded-3 p-4 shadow-lg" style={{ minWidth: '400px' }}>
        <div className="text-center mb-3">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="mb-2">{message}</h5>
          <p className="text-muted mb-0">Please wait while we upload your files...</p>
        </div>
        
        {/* Progress Bar */}
        <div className="progress mb-3" style={{ height: '8px' }}>
          <div 
            className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
            role="progressbar" 
            style={{ width: `${progress}%` }}
            aria-valuenow={progress} 
            aria-valuemin="0" 
            aria-valuemax="100"
          >
            <span className="visually-hidden">{progress}% complete</span>
          </div>
        </div>
        
        {/* Progress Text */}
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">{Math.round(progress)}% complete</small>
          {onCancel && (
            <button 
              className="btn btn-sm btn-outline-danger"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;
