'use client'
import React, { useState } from 'react';

export default function AddSubadmin({ 
  onClose, 
  onAddSubadmin, 
  error, 
  setError,
  currentAdmin
}) {
  const [newSubadmin, setNewSubadmin] = useState({
    name: '',
    phoneNumber: ''
  });

  const handleAddSubadmin = async (e) => {
    e.preventDefault();
    setError('');

    if (!newSubadmin.name || !newSubadmin.phoneNumber) {
      setError('Name and phone number are required');
      return;
    }

    // Validate phone number
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    if (!phoneRegex.test(newSubadmin.phoneNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    // Call the parent function to handle OTP and creation
    await onAddSubadmin(newSubadmin);
    
    onClose();
    setNewSubadmin({ name: '', phoneNumber: '' });
  };

  return (
    <div className="modal show d-block" tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-person-plus me-2"></i>
              Add New Subadmin
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleAddSubadmin}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}

              <div className="alert alert-warning">
                <i className="bi bi-shield-exclamation me-2"></i>
                <strong>Security Notice:</strong> OTP will be sent to the current admin <strong>{currentAdmin?.name}</strong> ({currentAdmin?.phoneNumber}) for verification. Only the admin can authorize adding a new subadmin.
              </div>

              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Important:</strong> Please enter a <strong>proper and meaningful name</strong> for the subadmin. This name will be used in activity logs and system records. Use full name format (e.g., "John Doe" or "Rajesh Kumar") for better tracking and logging.
              </div>
              
              <div className="mb-3">
                <label className="form-label">
                  Name <span className="text-danger">*</span>
                  <small className="text-muted d-block">Enter full name for proper logging</small>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newSubadmin.name}
                  onChange={(e) => setNewSubadmin({...newSubadmin, name: e.target.value})}
                  placeholder="Enter full name (e.g., John Doe)"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={newSubadmin.phoneNumber}
                  onChange={(e) => setNewSubadmin({...newSubadmin, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-warning">
                <i className="bi bi-shield-check me-2"></i>
                Send OTP & Create Subadmin
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}