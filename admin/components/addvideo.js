'use client';
import React, { useState, useRef } from 'react';

export default function AddVideo({ onClose, onUploadVideo, error, setError, currentVideo }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentVideo?.url || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showFileInput, setShowFileInput] = useState(!currentVideo); // Hide file input if current video exists
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError('Video file size must be less than 100MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }

    await onUploadVideo(selectedFile, setUploading, setUploadProgress);
  };

  const handleRemoveVideo = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowFileInput(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChangeVideo = () => {
    setShowFileInput(true);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-camera-video-fill me-2"></i>
              {currentVideo ? 'Update Home Screen Video' : 'Add Home Screen Video'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={uploading}></button>
          </div>
          
          <form onSubmit={handleUpload}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              {/* Current Video Preview */}
              {previewUrl && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-play-circle me-2"></i>
                    {currentVideo && !selectedFile ? 'Current Home Screen Video' : 'Video Preview'}
                  </label>
                  {currentVideo && !selectedFile && (
                    <div className="alert alert-info mb-2">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Uploaded:</strong> {new Date(currentVideo.uploadedAt).toLocaleDateString()} at {new Date(currentVideo.uploadedAt).toLocaleTimeString()}
                      <br />
                      <small className="text-muted">Video URL: {previewUrl}</small>
                    </div>
                  )}
                  <div className="position-relative">
                    <video
                      src={previewUrl}
                      controls
                      preload="metadata"
                      className="w-100 rounded border"
                      style={{ maxHeight: '400px', objectFit: 'contain', backgroundColor: '#000' }}
                      onLoadedMetadata={() => {
                        console.log('Video loaded successfully:', previewUrl);
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                    {selectedFile && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2"
                        onClick={handleRemoveVideo}
                        disabled={uploading}
                      >
                        <i className="bi bi-x-circle me-1"></i>
                        Remove
                      </button>
                    )}
                  </div>
                  {selectedFile && (
                    <div className="mt-2 text-muted small">
                      <i className="bi bi-file-earmark-play me-1"></i>
                      <strong>New File:</strong> {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                  {currentVideo && !selectedFile && !showFileInput && (
                    <div className="mt-3 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary flex-fill"
                        onClick={handleChangeVideo}
                        disabled={uploading}
                      >
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Change Video
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={handleRemoveVideo}
                        disabled={uploading}
                      >
                        <i className="bi bi-trash me-2"></i>
                        Remove & Upload New
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* File Input - Only show when needed */}
              {showFileInput && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-upload me-2"></i>
                    {currentVideo ? 'Select New Video File' : 'Select Video File'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="form-control"
                    accept="video/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <div className="form-text">
                    <i className="bi bi-info-circle me-1"></i>
                    Supported formats: MP4, WebM, MOV, AVI. Max size: 100MB
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">Upload Progress</label>
                  <div className="progress" style={{ height: '25px' }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated"
                      role="progressbar"
                      style={{ width: `${uploadProgress}%` }}
                      aria-valuenow={uploadProgress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {uploadProgress}%
                    </div>
                  </div>
                </div>
              )}

              <div className="alert alert-warning border-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Important:</strong> This video will be displayed on the website home screen. Make sure it&apos;s appropriate and high quality.
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={uploading}
              >
                <i className="bi bi-x-circle me-2"></i>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-upload me-2"></i>
                    {currentVideo ? 'Update Video' : 'Upload Video'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

