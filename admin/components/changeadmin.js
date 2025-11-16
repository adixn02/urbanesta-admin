import React, { useState } from 'react';

export default function ChangeAdmin({ currentAdmin, onClose, onUpdateAdmin, error, setError }) {
  const [newAdminData, setNewAdminData] = useState({
    name: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
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

  const handlePasswordChange = (password) => {
    setNewAdminData({...newAdminData, password});
    setPasswordErrors(validatePassword(password));
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    setError('');

    if (!newAdminData.name || !newAdminData.phoneNumber || !newAdminData.password || !newAdminData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    // Validate phone number
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    if (!phoneRegex.test(newAdminData.phoneNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    // Validate password
    const passwordValidationErrors = validatePassword(newAdminData.password);
    if (passwordValidationErrors.length > 0) {
      setError('Password does not meet requirements: ' + passwordValidationErrors.join(', '));
      return;
    }

    // Check if passwords match
    if (newAdminData.password !== newAdminData.confirmPassword) {
      setError('Passwords do not match');
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
                <strong>Security Notice:</strong> OTP will be sent to the current admin&apos;s phone number ({currentAdmin?.phoneNumber}) for verification. This ensures only authorized admin can update admin details.
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
                <label className="form-label">Phone Number <span className="text-danger">*</span></label>
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

              <div className="mb-3">
                <label className="form-label">Password <span className="text-danger">*</span></label>
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
                <div className="mt-2">
                  <small className="text-muted d-block mb-1">Password must contain:</small>
                  <div className="d-flex flex-wrap gap-2">
                    <span className={`badge ${newAdminData.password.length >= 8 ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${newAdminData.password.length >= 8 ? 'bi-check' : 'bi-x'} me-1`}></i>
                      8+ characters
                    </span>
                    <span className={`badge ${/[A-Z]/.test(newAdminData.password) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[A-Z]/.test(newAdminData.password) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Uppercase (A-Z)
                    </span>
                    <span className={`badge ${/[a-z]/.test(newAdminData.password) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[a-z]/.test(newAdminData.password) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Lowercase (a-z)
                    </span>
                    <span className={`badge ${/[0-9]/.test(newAdminData.password) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[0-9]/.test(newAdminData.password) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Number (0-9)
                    </span>
                    <span className={`badge ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newAdminData.password) ? 'bg-success' : 'bg-secondary'}`}>
                      <i className={`bi ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newAdminData.password) ? 'bi-check' : 'bi-x'} me-1`}></i>
                      Special (!@#$...)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                <div className="position-relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-control ${newAdminData.confirmPassword && newAdminData.password === newAdminData.confirmPassword ? 'is-valid' : newAdminData.confirmPassword ? 'is-invalid' : ''}`}
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
                {newAdminData.confirmPassword && newAdminData.password !== newAdminData.confirmPassword && (
                  <div className="invalid-feedback d-block">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Passwords do not match
                  </div>
                )}
                {newAdminData.confirmPassword && newAdminData.password === newAdminData.confirmPassword && (
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
