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
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation function
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('One number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('One special character');
    }
    
    return errors;
  };

  const handlePasswordChange = (password) => {
    setNewSubadmin({...newSubadmin, password});
    setPasswordErrors(validatePassword(password));
  };

  const handleAddSubadmin = async (e) => {
    e.preventDefault();
    setError('');

    if (!newSubadmin.name || !newSubadmin.phoneNumber || !newSubadmin.password || !newSubadmin.confirmPassword) {
      setError('All fields are required');
      return;
    }

    // Validate phone number
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    if (!phoneRegex.test(newSubadmin.phoneNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    // Validate password
    const passwordValidationErrors = validatePassword(newSubadmin.password);
    if (passwordValidationErrors.length > 0) {
      setError('Password does not meet requirements: ' + passwordValidationErrors.join(', '));
      return;
    }

    // Check if passwords match
    if (newSubadmin.password !== newSubadmin.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Call the parent function to handle OTP and creation
    await onAddSubadmin(newSubadmin);
    
    onClose();
    setNewSubadmin({ name: '', phoneNumber: '', password: '', confirmPassword: '' });
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
                <strong>Important:</strong> Please enter a <strong>proper and meaningful name</strong> for the subadmin. This name will be used in activity logs and system records. Use full name format (e.g., &quot;John Doe&quot; or &quot;Rajesh Kumar&quot;) for better tracking and logging.
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
                <label className="form-label">
                  Phone Number <span className="text-danger">*</span>
                </label>
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

              <div className="mb-3">
                <label className="form-label">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-control ${passwordErrors.length > 0 && newSubadmin.password ? 'is-invalid' : newSubadmin.password && passwordErrors.length === 0 ? 'is-valid' : ''}`}
                    value={newSubadmin.password}
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
                <div className="mt-2">
                  <small className="text-muted d-block mb-1">Password must contain:</small>
                  <div className="d-flex flex-wrap gap-2">
                    <span className={`badge ${newSubadmin.password.length >= 8 ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${newSubadmin.password.length >= 8 ? 'bi-check' : 'bi-x'} me-1`}></i>
                      8+ characters
                    </span>
                    <span className={`badge ${/[A-Z]/.test(newSubadmin.password) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[A-Z]/.test(newSubadmin.password) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Uppercase (A-Z)
                    </span>
                    <span className={`badge ${/[a-z]/.test(newSubadmin.password) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[a-z]/.test(newSubadmin.password) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Lowercase (a-z)
                    </span>
                    <span className={`badge ${/[0-9]/.test(newSubadmin.password) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[0-9]/.test(newSubadmin.password) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Number (0-9)
                    </span>
                    <span className={`badge ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newSubadmin.password) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newSubadmin.password) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Special (!@#$...)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Confirm Password <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-control ${newSubadmin.confirmPassword && newSubadmin.password === newSubadmin.confirmPassword ? 'is-valid' : newSubadmin.confirmPassword ? 'is-invalid' : ''}`}
                    value={newSubadmin.confirmPassword}
                    onChange={(e) => setNewSubadmin({...newSubadmin, confirmPassword: e.target.value})}
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
                {newSubadmin.confirmPassword && newSubadmin.password !== newSubadmin.confirmPassword && (
                  <div className="invalid-feedback d-block">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Passwords do not match
                  </div>
                )}
                {newSubadmin.confirmPassword && newSubadmin.password === newSubadmin.confirmPassword && (
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