'use client';
import React, { useState } from 'react';

export default function AddAdmin({ onClose, onAddAdmin, error, setError }) {
  const [newAdminData, setNewAdminData] = useState({
    name: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('8+ characters');
    if (!/[A-Z]/.test(password)) errors.push('Uppercase (A-Z)');
    if (!/[a-z]/.test(password)) errors.push('Lowercase (a-z)');
    if (!/[0-9]/.test(password)) errors.push('Number (0-9)');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Special (!@#$...)');
    return errors;
  };

  const handlePasswordChange = (password) => {
    setNewAdminData({...newAdminData, password});
    setPasswordErrors(validatePassword(password));
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setError('');

    // Validate name
    if (!newAdminData.name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate phone number
    if (newAdminData.phoneNumber.length !== 10 || !/^\d+$/.test(newAdminData.phoneNumber)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    // Validate password strength
    if (passwordErrors.length > 0) {
      setError('Password does not meet all requirements');
      return;
    }

    // Validate passwords match
    if (newAdminData.password !== newAdminData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    await onAddAdmin(newAdminData);
    onClose();
    setNewAdminData({ name: '', phoneNumber: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">
              <i className="bi bi-person-plus-fill me-2"></i>
              Add New Admin
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleAddAdmin}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              {/* Name Field */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-person me-2"></i>
                  Admin Name *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newAdminData.name}
                  onChange={(e) => setNewAdminData({...newAdminData, name: e.target.value})}
                  placeholder="Enter admin full name"
                  required
                />
              </div>

              {/* Phone Number Field */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-telephone me-2"></i>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  className="form-control"
                  value={newAdminData.phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setNewAdminData({...newAdminData, phoneNumber: value});
                    }
                  }}
                  placeholder="Enter 10-digit phone number"
                  required
                  maxLength="10"
                />
                <div className="form-text">
                  Enter 10-digit phone number (e.g., 9876543210)
                </div>
              </div>

              {/* Password Field */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-lock me-2"></i>
                  Password *
                </label>
                <div className="position-relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-control ${passwordErrors.length > 0 && newAdminData.password ? 'is-invalid' : newAdminData.password && passwordErrors.length === 0 ? 'is-valid' : ''}`}
                    value={newAdminData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter strong password"
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      border: 'none',
                      background: 'transparent',
                      padding: '0.25rem 0.5rem',
                      textDecoration: 'none'
                    }}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '1rem' }}></i>
                  </button>
                </div>
                
                {/* Password Requirements */}
                {newAdminData.password && (
                  <div className="mt-2">
                    <small className="text-muted fw-semibold">Password must contain:</small>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      <span className={`badge ${passwordErrors.includes('8+ characters') ? 'bg-danger' : 'bg-success'}`}>
                        <i className={`bi ${passwordErrors.includes('8+ characters') ? 'bi-x' : 'bi-check'} me-1`}></i>
                        8+ characters
                      </span>
                      <span className={`badge ${passwordErrors.includes('Uppercase (A-Z)') ? 'bg-danger' : 'bg-success'}`}>
                        <i className={`bi ${passwordErrors.includes('Uppercase (A-Z)') ? 'bi-x' : 'bi-check'} me-1`}></i>
                        Uppercase (A-Z)
                      </span>
                      <span className={`badge ${passwordErrors.includes('Lowercase (a-z)') ? 'bg-danger' : 'bg-success'}`}>
                        <i className={`bi ${passwordErrors.includes('Lowercase (a-z)') ? 'bi-x' : 'bi-check'} me-1`}></i>
                        Lowercase (a-z)
                      </span>
                      <span className={`badge ${passwordErrors.includes('Number (0-9)') ? 'bg-danger' : 'bg-success'}`}>
                        <i className={`bi ${passwordErrors.includes('Number (0-9)') ? 'bi-x' : 'bi-check'} me-1`}></i>
                        Number (0-9)
                      </span>
                      <span className={`badge ${passwordErrors.includes('Special (!@#$...)') ? 'bg-danger' : 'bg-success'}`}>
                        <i className={`bi ${passwordErrors.includes('Special (!@#$...)') ? 'bi-x' : 'bi-check'} me-1`}></i>
                        Special (!@#$...)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-lock-fill me-2"></i>
                  Confirm Password *
                </label>
                <div className="position-relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-control ${newAdminData.confirmPassword && newAdminData.password !== newAdminData.confirmPassword ? 'is-invalid' : newAdminData.confirmPassword && newAdminData.password === newAdminData.confirmPassword ? 'is-valid' : ''}`}
                    value={newAdminData.confirmPassword}
                    onChange={(e) => setNewAdminData({...newAdminData, confirmPassword: e.target.value})}
                    placeholder="Re-enter password"
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted"
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ 
                      border: 'none',
                      background: 'transparent',
                      padding: '0.25rem 0.5rem',
                      textDecoration: 'none'
                    }}
                  >
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '1rem' }}></i>
                  </button>
                </div>
                {newAdminData.confirmPassword && newAdminData.password === newAdminData.confirmPassword && (
                  <div className="mt-1">
                    <small className="text-success">
                      <i className="bi bi-check-circle-fill me-1"></i>
                      Passwords match
                    </small>
                  </div>
                )}
              </div>

              <div className="alert alert-info border-info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Note:</strong> A new admin user will be created with full permissions. An OTP will be sent to the current admin for verification.
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                <i className="bi bi-x-circle me-2"></i>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={passwordErrors.length > 0 || !newAdminData.name || !newAdminData.phoneNumber || !newAdminData.password || !newAdminData.confirmPassword || newAdminData.password !== newAdminData.confirmPassword}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

