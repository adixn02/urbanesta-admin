'use client'
import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import AddSubadmin from '@/components/addsubadmin';
import AddAdmin from '@/components/addadmin';
import ChangePassword from '@/components/changepassword';

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
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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
    
    // Get current user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
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
      // Remove confirmPassword before sending to backend (if it exists)
      const { confirmPassword, ...dataToSend } = userData || {};
      
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('User created successfully');
        setShowAddSubadminModal(false); // Close subadmin modal
        setShowAddAdminModal(false); // Close add admin modal
        setShowAddModal(false);
        setNewUser({ name: '', phoneNumber: '', role: 'subadmin', permissions: [] });
        fetchUsersData();
        fetchStats();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error); // Debug log
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
      // Remove confirmPassword and _id from body (send _id only in URL)
      const { confirmPassword, _id, ...dataToSend } = userData || {};
      
      console.log('Updating user with data:', { _id, dataToSend }); // Debug log
      
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();
      console.log('Update user response:', data); // Debug log

      if (data.success) {
        setSuccess('User updated successfully');
        setEditingUser(null);
        fetchUsersData();
        fetchStats();
        
        // If admin updated their own details, update localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser._id === _id) {
          const updatedUser = { ...currentUser, ...dataToSend };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update user error:', error); // Debug log
      setError('Failed to update user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u._id === userId);
    const userName = user?.name || 'this user';
    const userRole = user?.role === 'admin' ? 'Admin' : 'Subadmin';
    
    // Extra protection for protected super admins
    // Protected phone numbers: 9181989882098, 8198982098 (main admin), 9650089892 (Anil Mann - super admin)
    const protectedPhones = ['9181989882098', '8198982098', '9650089892'];
    if (user && protectedPhones.includes(user.phoneNumber)) {
      setError('Cannot delete protected super admin account!');
      return;
    }
    
    // Prevent deleting yourself (currently logged-in user)
    // Compare IDs as strings to handle both ObjectId and string formats
    const currentUserId = currentUser?._id?.toString();
    const targetUserId = user?._id?.toString();
    if (currentUser && currentUserId === targetUserId) {
      setError('You cannot delete your own account! Please ask another admin to delete your account if needed.');
      return;
    }
    
    // Also check by phone number as backup
    if (currentUser && user?.phoneNumber === currentUser.phoneNumber) {
      setError('You cannot delete your own account! Please ask another admin to delete your account if needed.');
      return;
    }
    
    if (!confirm(`⚠️ Are you sure you want to DELETE ${userName} (${userRole})?\n\nThis action CANNOT be undone!`)) return;

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
        setSuccess(`${userRole} "${userName}" has been permanently deleted successfully`);
        fetchUsersData();
        fetchStats();
      } else {
        setError(data.error || `Failed to delete ${userRole.toLowerCase()}`);
      }
    } catch (error) {
      setError(`Failed to delete ${userRole.toLowerCase()}: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    setLoading(true);
    setError('');

    // Prevent admin from deactivating themselves
    // Compare IDs as strings to handle both ObjectId and string formats
    const currentUserId = currentUser?._id?.toString();
    const targetUserId = userId?.toString();
    
    // Find the user being toggled to check phone number as well
    const targetUser = users.find(u => u._id?.toString() === targetUserId);
    
    // Check by ID
    if (currentUser && currentUserId === targetUserId && currentStatus === true) {
      setError('You cannot deactivate your own account. Please ask another admin to deactivate your account if needed.');
      setLoading(false);
      return;
    }
    
    // Also check by phone number as backup protection
    if (currentUser && targetUser && targetUser.phoneNumber === currentUser.phoneNumber && currentStatus === true) {
      setError('You cannot deactivate your own account. Please ask another admin to deactivate your account if needed.');
      setLoading(false);
      return;
    }

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
    if (otpModal.userData && otpModal.currentAdminName && currentUser) {
      await sendOTPToCurrentAdmin(currentUser, otpModal.userData, otpModal.type);
    }
  };

  const closeOTPModal = () => {
    setOtpModal({ show: false, type: '', sessionId: '', phoneNumber: '', userData: null, currentAdminName: '', currentAdminPhone: '' });
    setOtpCode('');
    setOtpError('');
  };

  const handleAddSubadmin = async (subadminData) => {
    // Get the currently logged-in admin
    if (!currentUser) {
      setError('Please login again');
      return;
    }

    // Remove confirmPassword before storing in pending action
    const { confirmPassword, ...cleanSubadminData } = subadminData;

    const newSubadminData = {
      ...cleanSubadminData,
      role: 'subadmin',
      permissions: ['dashboard', 'cities', 'builders', 'properties']
    };
    
    console.log('Adding subadmin with data:', newSubadminData); // Debug log
    
    // Send OTP to current logged-in admin's phone, not new subadmin's phone
    await sendOTPToCurrentAdmin(currentUser, newSubadminData, 'create');
  };

  const handleAddAdmin = async (adminData) => {
    // Get the currently logged-in admin for OTP verification
    if (!currentUser) {
      setError('Please login again');
      return;
    }

    // Remove confirmPassword before storing in pending action
    const { confirmPassword, ...cleanAdminData } = adminData;

    const newAdminData = {
      ...cleanAdminData,
      role: 'admin',
      permissions: ['all']
    };
    
    console.log('Adding new admin with data:', newAdminData); // Debug log
    
    // Send OTP to current logged-in admin's phone for verification
    await sendOTPToCurrentAdmin(currentUser, newAdminData, 'create');
  };

  const handleChangePassword = async (passwordData) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/api/admin/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password changed successfully!');
        setShowChangePasswordModal(false);
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setError('Failed to change password: ' + error.message);
    } finally {
      setLoading(false);
    }
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
    <ProtectedRoute>
      <div className="d-flex">
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-grow-1">
        <Header toggleSidebar={toggleSidebar} handleSignOut={handleSignOut} />
        
        <div className="container pt-5 mt-5 p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className='fw-bold'>Settings</h2>
            
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
                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <button 
                      className="btn btn-success btn-lg px-4"
                      onClick={() => setShowAddAdminModal(true)}
                    >
                      <i className="bi bi-person-plus-fill me-2"></i>
                      Add Admin
                    </button>
                    <button 
                      className="btn btn-warning btn-lg px-4"
                      onClick={() => setShowAddSubadminModal(true)}
                    >
                      <i className="bi bi-person-plus me-2"></i>
                      Add Subadmin
                    </button>
                    <button 
                      className="btn btn-primary btn-lg px-4"
                      onClick={() => setShowChangePasswordModal(true)}
                    >
                      <i className="bi bi-key me-2"></i>
                      Change Password
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

          {/* Admin Users Table */}
          <div className="card mb-4">
            <div className="card-header bg-danger text-white">
              <h5 className="mb-0">
                <i className="bi bi-shield-fill-check me-2"></i>
                Admin Users
              </h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-danger" role="status">
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
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(user => user.role === 'admin').length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-muted">
                            <i className="bi bi-shield-exclamation fs-1 d-block mb-2"></i>
                            <p className="mb-0">No admin users found.</p>
                          </td>
                        </tr>
                      ) : (
                        users.filter(user => user.role === 'admin').map((user) => (
                          <tr key={user._id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <strong>{user.name}</strong>
                                {(() => {
                                  const protectedPhones = ['9181989882098', '8198982098', '9650089892'];
                                  if (protectedPhones.includes(user.phoneNumber)) {
                                    return (
                                      <span className="badge bg-primary ms-2">
                                        <i className="bi bi-star-fill me-1"></i>
                                        Super Admin
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </td>
                            <td>
                              <i className="bi bi-telephone me-1"></i>
                              {user.phoneNumber}
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadge(user.isActive)}`}>
                                <i className={`bi ${user.isActive ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {user.lastLogin 
                                ? new Date(user.lastLogin).toLocaleDateString() + ' ' + new Date(user.lastLogin).toLocaleTimeString()
                                : 'Never'
                              }
                            </td>
                            <td>
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              {(() => {
                                // Protected super admin phone numbers
                                const protectedPhones = ['9181989882098', '8198982098', '9650089892'];
                                const isProtected = protectedPhones.includes(user.phoneNumber);
                                const isCurrentUser = currentUser && (user._id?.toString() === currentUser._id?.toString() || user.phoneNumber === currentUser.phoneNumber);
                                
                                if (isProtected) {
                                  return (
                                    <span className="badge bg-secondary">
                                      <i className="bi bi-shield-lock me-1"></i>
                                      Protected
                                    </span>
                                  );
                                } else if (isCurrentUser) {
                                  return (
                                    <span className="badge bg-info">
                                      <i className="bi bi-person-check me-1"></i>
                                      You (Cannot deactivate)
                                    </span>
                                  );
                                } else {
                                  return (
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => toggleUserStatus(user._id, user.isActive)}
                                      title={user.isActive ? 'Deactivate Admin' : 'Activate Admin'}
                                    >
                                      <i className={`bi ${user.isActive ? 'bi-pause-circle' : 'bi-play-circle'} me-1`}></i>
                                      {user.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                  );
                                }
                              })()}
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

          {/* Subadmin Users Table */}
          <div className="card">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Subadmin Users
              </h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-warning" role="status">
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
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(user => user.role === 'subadmin').length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-muted">
                            <i className="bi bi-people fs-1 d-block mb-2"></i>
                            <p className="mb-0">No subadmins found. Click "Add Subadmin" to create one.</p>
                          </td>
                        </tr>
                      ) : (
                        users.filter(user => user.role === 'subadmin').map((user) => (
                          <tr key={user._id}>
                            <td>
                              {user.name}
                            </td>
                            <td>{user.phoneNumber}</td>
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
                              {(() => {
                                // Protected super admin phone numbers
                                const protectedPhones = ['9181989882098', '8198982098', '9650089892'];
                                const isProtected = protectedPhones.includes(user.phoneNumber);
                                const isCurrentUser = currentUser && (user._id?.toString() === currentUser._id?.toString() || user.phoneNumber === currentUser.phoneNumber);
                                
                                if (isProtected) {
                                  return (
                                    <span className="badge bg-secondary">
                                      <i className="bi bi-shield-lock me-1"></i>
                                      Protected
                                    </span>
                                  );
                                } else if (isCurrentUser) {
                                  return (
                                    <span className="badge bg-info">
                                      <i className="bi bi-person-circle me-1"></i>
                                      You (Can't Delete Self)
                                    </span>
                                  );
                                } else {
                                  return (
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDeleteUser(user._id)}
                                      title="Delete Subadmin"
                                    >
                                      <i className="bi bi-trash me-1"></i>
                                      Delete
                                    </button>
                                  );
                                }
                              })()}
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

      {/* Add Subadmin Modal */}
      {showAddSubadminModal && (
        <AddSubadmin
          onClose={() => setShowAddSubadminModal(false)}
          onAddSubadmin={handleAddSubadmin}
          error={error}
          setError={setError}
          currentAdmin={currentUser}
        />
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <AddAdmin
          onClose={() => setShowAddAdminModal(false)}
          onAddAdmin={handleAddAdmin}
          error={error}
          setError={setError}
        />
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <ChangePassword
          user={currentUser}
          onClose={() => setShowChangePasswordModal(false)}
          onChangePassword={handleChangePassword}
          error={error}
          setError={setError}
        />
      )}

      </div>
    </ProtectedRoute>
  );
}