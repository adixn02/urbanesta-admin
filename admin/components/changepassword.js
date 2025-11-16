'use client'
import React, { useState } from 'react';

export default function ChangePassword({ user, onClose, onChangePassword, error, setError }) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);

  // Password validation
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('One special character');
    return errors;
  };

  const handleNewPasswordChange = (password) => {
    setPasswordData({...passwordData, newPassword: password});
    setPasswordErrors(validatePassword(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    // Validate new password
    const passwordValidationErrors = validatePassword(passwordData.newPassword);
    if (passwordValidationErrors.length > 0) {
      setError('New password does not meet requirements: ' + passwordValidationErrors.join(', '));
      return;
    }

    // Check if passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Check if new password is same as current
    if (passwordData.currentPassword === passwordData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    // Call parent function
    await onChangePassword(passwordData);
  };

  return (
    <div className="modal show d-block" tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-key me-2"></i>
              Change Password
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>User:</strong> {user?.name} ({user?.phoneNumber})
              </div>

              <div className="mb-3">
                <label className="form-label">Current Password <span className="text-danger">*</span></label>
                <div className="position-relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="form-control"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    placeholder="Enter current password"
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted"
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{ 
                      border: 'none',
                      background: 'transparent',
                      padding: '0.25rem 0.5rem',
                      textDecoration: 'none'
                    }}
                  >
                    <i className={`bi ${showCurrentPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '1rem' }}></i>
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">New Password <span className="text-danger">*</span></label>
                <div className="position-relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className={`form-control ${passwordErrors.length > 0 && passwordData.newPassword ? 'is-invalid' : passwordData.newPassword && passwordErrors.length === 0 ? 'is-valid' : ''}`}
                    value={passwordData.newPassword}
                    onChange={(e) => handleNewPasswordChange(e.target.value)}
                    placeholder="Enter new password"
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted"
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ 
                      border: 'none',
                      background: 'transparent',
                      padding: '0.25rem 0.5rem',
                      textDecoration: 'none'
                    }}
                  >
                    <i className={`bi ${showNewPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '1rem' }}></i>
                  </button>
                </div>
                <div className="mt-2">
                  <small className="text-muted d-block mb-1">Password must contain:</small>
                  <div className="d-flex flex-wrap gap-2">
                    <span className={`badge ${passwordData.newPassword.length >= 8 ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${passwordData.newPassword.length >= 8 ? 'bi-check' : 'bi-x'} me-1`}></i>
                      8+ characters
                    </span>
                    <span className={`badge ${/[A-Z]/.test(passwordData.newPassword) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[A-Z]/.test(passwordData.newPassword) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Uppercase (A-Z)
                    </span>
                    <span className={`badge ${/[a-z]/.test(passwordData.newPassword) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[a-z]/.test(passwordData.newPassword) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Lowercase (a-z)
                    </span>
                    <span className={`badge ${/[0-9]/.test(passwordData.newPassword) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[0-9]/.test(passwordData.newPassword) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Number (0-9)
                    </span>
                    <span className={`badge ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Special (!@#$...)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Confirm New Password <span className="text-danger">*</span></label>
                <div className="position-relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-control ${passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword ? 'is-valid' : passwordData.confirmPassword ? 'is-invalid' : ''}`}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder="Re-enter new password"
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
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <div className="invalid-feedback d-block">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Passwords do not match
                  </div>
                )}
                {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                  <div className="valid-feedback d-block">
                    <i className="bi bi-check-circle me-1"></i>
                    Passwords match
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-check-circle me-2"></i>
                Change Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

