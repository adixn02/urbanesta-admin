import React, { useState } from 'react';

export default function ChangeAdmin({ currentAdmin, onClose, onUpdateAdmin, error, setError }) {
  const [newAdminData, setNewAdminData] = useState({
    name: '',
    phoneNumber: ''
  });

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    setError('');

    if (!newAdminData.name || !newAdminData.phoneNumber) {
      setError('Name and phone number are required');
      return;
    }

    // Validate phone number
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    if (!phoneRegex.test(newAdminData.phoneNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    // Call the parent function to handle OTP and update
    await onUpdateAdmin(newAdminData);
  };

  return (
    <div className="modal show d-block" tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-person-gear me-2"></i>
              Update Admin Details
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleUpdateAdmin}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}
              
              {/* Current Admin Details */}
              <div className="card bg-light mb-3">
                <div className="card-body">
                  <h6 className="card-title mb-3">
                    <i className="bi bi-person-check me-2"></i>
                    Current Admin Details
                  </h6>
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Name:</strong></p>
                      <p className="text-muted">{currentAdmin?.name || 'N/A'}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Phone Number:</strong></p>
                      <p className="text-muted">{currentAdmin?.phoneNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning">
                <i className="bi bi-shield-exclamation me-2"></i>
                <strong>Security Notice:</strong> OTP will be sent to the current admin's phone number ({currentAdmin?.phoneNumber}) for verification. This ensures only authorized admin can update admin details.
              </div>

              <h6 className="mb-3 mt-4">
                <i className="bi bi-person-gear me-2"></i>
                New Admin Details
              </h6>
              
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newAdminData.name}
                  onChange={(e) => setNewAdminData({...newAdminData, name: e.target.value})}
                  placeholder="Enter new admin name"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={newAdminData.phoneNumber}
                  onChange={(e) => setNewAdminData({...newAdminData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  placeholder="Enter new admin phone number"
                  maxLength="10"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger">
                <i className="bi bi-shield-check me-2"></i>
                Send OTP & Update Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
