'use client'
import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import AddSubadmin from '@/components/addsubadmin';
import ChangeAdmin from '@/components/changeadmin';

export default function Settings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalSubAdmins: 0,
    activeAdmins: 0,
    recentActivity: 0,
    maxUsers: 10
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    role: 'subadmin',
    permissions: []
  });
  const [otpModal, setOtpModal] = useState({
    show: false,
    type: '', // 'create' or 'edit'
    sessionId: '',
    phoneNumber: '',
    userData: null,
    currentAdminName: '',
    currentAdminPhone: ''
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showAddSubadminModal, setShowAddSubadminModal] = useState(false);
  const [showChangeAdminModal, setShowChangeAdminModal] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSignOut = async () => {
    try {
      const { logout: apiLogout } = await import('@/lib/logout');
      await apiLogout();
      window.location.href = '/';
    } catch (error) {
      localStorage.clear();
      document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/';
    }
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  useEffect(() => {
    fetchUsersData();
    fetchStats();
  }, []);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data || []);
    } catch (error) {
      setError('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      // Error fetching stats
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');

    // Only allow subadmin creation with OTP verification
    if (newUser.role === 'subadmin') {
      await sendOTPForUser(newUser, 'create');
    } else {
      setError('Only subadmin creation is allowed. Admin role cannot be created.');
    }
  };

  const sendOTPForUser = async (userData, type) => {
    try {
      setOtpLoading(true);
      setOtpError('');
      setError('');

      // Format phone number for OTP service
      let formattedPhone = userData.phoneNumber;
      if (!formattedPhone.startsWith('+91') && !formattedPhone.startsWith('91')) {
        formattedPhone = '+91' + formattedPhone;
      } else if (formattedPhone.startsWith('91')) {
        formattedPhone = '+' + formattedPhone;
      }

      // Use admin endpoint for user creation (bypasses phone registration check)
      const response = await fetch(`${API_BASE_URL}/api/admin/send-otp-for-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });

      const data = await response.json();

      if (data.success) {
        setOtpModal({
          show: true,
          type: type,
          sessionId: data.sessionId,
          phoneNumber: formattedPhone,
          userData: userData
        });
        setOtpCode('');
        setShowAddModal(false);
        setEditingUser(null);
        setShowChangeAdminModal(false);
        setShowAddSubadminModal(false);
      } else {
        setOtpError(data.error || 'Failed to send OTP');
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      setOtpError('Failed to send OTP: ' + error.message);
      setError('Failed to send OTP: ' + error.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const createUserDirectly = async (userData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('User created successfully');
        setShowAddModal(false);
        setNewUser({ name: '', phoneNumber: '', email: '', role: 'subadmin', permissions: [] });
        fetchUsersData();
        fetchStats();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (error) {
      setError('Failed to create user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setError('');

    // For role changes to admin, require OTP verification
    if (editingUser.role === 'admin') {
      await sendOTPForUser(editingUser, 'edit');
    } else {
      // For other updates, proceed directly
      await updateUserDirectly(editingUser);
    }
  };

  const updateUserDirectly = async (userData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userData._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('User updated successfully');
        setEditingUser(null);
        fetchUsersData();
        fetchStats();
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (error) {
      setError('Failed to update user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u._id === userId);
    const userName = user?.name || 'this subadmin';
    
    if (!confirm(`Are you sure you want to remove ${userName}? This action cannot be undone.`)) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Subadmin ${userName} removed successfully`);
        fetchUsersData();
        fetchStats();
      } else {
        setError(data.error || 'Failed to remove subadmin');
      }
    } catch (error) {
      setError('Failed to remove subadmin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchUsersData();
        fetchStats();
      } else {
        setError(data.error || 'Failed to update user status');
      }
    } catch (error) {
      setError('Failed to update user status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-danger',
      subadmin: 'bg-warning',
      user: 'bg-secondary'
    };
    return badges[role] || 'bg-secondary';
  };

  const getStatusBadge = (isActive) => {
    return isActive ? 'bg-success' : 'bg-danger';
  };

  const handleOTPVerification = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');

    try {
      // Use admin-specific OTP verification endpoint
      const response = await fetch(`${API_BASE_URL}/api/admin/verify-otp-for-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId: otpModal.sessionId,
          otp: otpCode
        })
      });

      const data = await response.json();

      if (data.success) {
        // OTP verified successfully, now proceed with user creation/update
        if (otpModal.type === 'create') {
          await createUserDirectly(otpModal.userData);
        } else if (otpModal.type === 'edit') {
          await updateUserDirectly(otpModal.userData);
        }
        
        setOtpModal({ show: false, type: '', sessionId: '', phoneNumber: '', userData: null });
        setOtpCode('');
        setSuccess('OTP verified and user operation completed successfully');
      } else {
        setOtpError(data.error || 'Invalid OTP');
      }
    } catch (error) {
      setOtpError('Failed to verify OTP: ' + error.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpModal.userData && otpModal.currentAdminName) {
      const currentAdmin = users.find(user => user.role === 'admin');
      if (currentAdmin) {
        await sendOTPToCurrentAdmin(currentAdmin, otpModal.userData, otpModal.type);
      }
    }
  };

  const closeOTPModal = () => {
    setOtpModal({ show: false, type: '', sessionId: '', phoneNumber: '', userData: null, currentAdminName: '', currentAdminPhone: '' });
    setOtpCode('');
    setOtpError('');
  };

  const handleAddSubadmin = async (subadminData) => {
    // Find the current admin user
    const currentAdmin = users.find(user => user.role === 'admin');
    if (!currentAdmin) {
      setError('Admin user not found');
      return;
    }

    const newSubadminData = {
      ...subadminData,
      role: 'subadmin',
      permissions: ['dashboard', 'cities', 'builders', 'properties']
    };
    
    // Send OTP to current admin's phone, not new subadmin's phone
    await sendOTPToCurrentAdmin(currentAdmin, newSubadminData, 'create');
  };

  const handleUpdateAdmin = async (newAdminData) => {
    // Find the current admin user
    const currentAdmin = users.find(user => user.role === 'admin');
    if (!currentAdmin) {
      setError('Admin user not found');
      return;
    }

    const updatedAdminData = {
      ...currentAdmin,
      ...newAdminData,
      role: 'admin',
      permissions: ['all']
    };
    
    // Send OTP to current admin's phone, not new admin's phone
    await sendOTPToCurrentAdmin(currentAdmin, updatedAdminData, 'edit');
  };

  const sendOTPToCurrentAdmin = async (currentAdmin, userData, type) => {
    try {
      setOtpLoading(true);
      setOtpError('');
      setError('');

      // Format current admin's phone number for OTP service
      let formattedPhone = currentAdmin.phoneNumber;
      if (!formattedPhone.startsWith('+91') && !formattedPhone.startsWith('91')) {
        formattedPhone = '+91' + formattedPhone;
      } else if (formattedPhone.startsWith('91')) {
        formattedPhone = '+' + formattedPhone;
      }

      // Use admin endpoint to send OTP to current admin
      const response = await fetch(`${API_BASE_URL}/api/admin/send-otp-for-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });

      const data = await response.json();

      if (data.success) {
        setOtpModal({
          show: true,
          type: type,
          sessionId: data.sessionId,
          phoneNumber: formattedPhone,
          userData: userData,
          currentAdminName: currentAdmin.name,
          currentAdminPhone: currentAdmin.phoneNumber
        });
        setOtpCode('');
        setShowChangeAdminModal(false);
        setShowAddSubadminModal(false);
      } else {
        setOtpError(data.error || 'Failed to send OTP');
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      setOtpError('Failed to send OTP: ' + error.message);
      setError('Failed to send OTP: ' + error.message);
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="d-flex">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-grow-1">
        <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />
        
        <div className="container pt-5 mt-5 p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className='fw-bold'>User Management</h2>
            
          </div>

          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h4>{stats.totalAdmins}</h4>
                      <p className="mb-0">Admins</p>
                    </div>
                    <i className="bi bi-shield-check fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h4>{stats.totalSubAdmins}</h4>
                      <p className="mb-0">Sub Admins</p>
                    </div>
                    <i className="bi bi-people fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h4>{stats.activeAdmins}</h4>
                      <p className="mb-0">Active Users</p>
                    </div>
                    <i className="bi bi-person-check fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h4>{stats.recentActivity}</h4>
                      <p className="mb-0">Recent Activity</p>
                    </div>
                    <i className="bi bi-activity fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-center gap-3">
                    <button 
                      className="btn btn-danger btn-lg px-4"
                      onClick={() => setShowChangeAdminModal(true)}
                    >
                      <i className="bi bi-person-gear me-2"></i>
                      Update Admin
                    </button>
                    <button 
                      className="btn btn-warning btn-lg px-4"
                      onClick={() => setShowAddSubadminModal(true)}
                    >
                      <i className="bi bi-person-plus me-2"></i>
                      Add Subadmin
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          {/* Subadmin Users Table */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Subadmin Users</h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(user => user.role === 'subadmin').length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            <i className="bi bi-people fs-1 d-block mb-2"></i>
                            <p className="mb-0">No subadmins found. Click "Add Subadmin" to create one.</p>
                          </td>
                        </tr>
                      ) : (
                        users.filter(user => user.role === 'subadmin').map((user) => (
                          <tr key={user._id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar-sm bg-warning text-white rounded-circle d-flex align-items-center justify-content-center me-2">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                {user.name}
                              </div>
                            </td>
                            <td>{user.phoneNumber}</td>
                            <td>{user.email || 'N/A'}</td>
                            <td>
                              <span className={`badge ${getStatusBadge(user.isActive)}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {user.lastLogin 
                                ? new Date(user.lastLogin).toLocaleDateString()
                                : 'Never'
                              }
                            </td>
                            <td>
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteUser(user._id)}
                                title="Remove Subadmin"
                              >
                                <i className="bi bi-trash me-1"></i>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Add New Subadmin (OTP Required)
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddUser}>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <i className="bi bi-shield-exclamation me-2"></i>
                    <strong>OTP Verification Required:</strong> Creating a subadmin requires OTP verification via SMS/Voice call to the provided phone number.
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={newUser.phoneNumber}
                      onChange={(e) => setNewUser({...newUser, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                      maxLength="10"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : (newUser.role === 'subadmin' ? 'Send OTP & Create Subadmin' : 'Create Admin')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit User</h5>
                <button type="button" className="btn-close" onClick={() => setEditingUser(null)}></button>
              </div>
              <form onSubmit={handleEditUser}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={editingUser.phoneNumber}
                      onChange={(e) => setEditingUser({...editingUser, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                      maxLength="10"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                    >
                      <option value="admin">Admin</option>
                      <option value="subadmin">Sub Admin</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={editingUser.isActive}
                        onChange={(e) => setEditingUser({...editingUser, isActive: e.target.checked})}
                      />
                      <label className="form-check-label">
                        Active
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {otpModal.show && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-shield-check me-2"></i>
                  OTP Verification Required
                </h5>
                <button type="button" className="btn-close" onClick={closeOTPModal}></button>
              </div>
              <form onSubmit={handleOTPVerification}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    {otpModal.type === 'create' && (
                      <>
                        <strong>OTP sent to Admin:</strong> An OTP has been sent to <strong>{otpModal.currentAdminName}</strong> ({otpModal.currentAdminPhone}) for verification.
                        <br />
                        <small className="d-block mt-2">Please verify to create the subadmin account.</small>
                      </>
                    )}
                    {otpModal.type === 'edit' && (
                      <>
                        <strong>OTP sent to Admin:</strong> An OTP has been sent to <strong>{otpModal.currentAdminName}</strong> ({otpModal.currentAdminPhone}) for verification.
                        <br />
                        <small className="d-block mt-2">Please verify to update the admin details.</small>
                      </>
                    )}
                  </div>
                  
                  {otpError && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {otpError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Enter OTP</label>
                    <input
                      type="text"
                      className="form-control form-control-lg text-center"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="Enter 4-8 digit OTP"
                      maxLength="8"
                      required
                      autoFocus
                    />
                    <div className="form-text">
                      <small>OTP is valid for 2 minutes</small>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleResendOTP}
                      disabled={otpLoading}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Resend OTP
                    </button>
                    <div className="text-muted">
                      <small>Didn't receive? Check SMS or wait for voice call</small>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeOTPModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={otpLoading || !otpCode}>
                    {otpLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Verify OTP
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Admin Modal */}
      {showChangeAdminModal && (
        <ChangeAdmin
          currentAdmin={users.find(user => user.role === 'admin')}
          onClose={() => setShowChangeAdminModal(false)}
          onUpdateAdmin={handleUpdateAdmin}
          error={error}
          setError={setError}
        />
      )}

      {/* Add Subadmin Modal */}
      {showAddSubadminModal && (
        <AddSubadmin
          onClose={() => setShowAddSubadminModal(false)}
          onAddSubadmin={handleAddSubadmin}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );
}