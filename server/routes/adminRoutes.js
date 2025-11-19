import express from 'express';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import ActivityLog from '../models/ActivityLog.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import { requireAdmin, requireRole } from '../middleware/roleAuth.js';
import { escapeRegex } from '../utils/sanitize.js';
import { logActivity } from '../middleware/activityLogger.js';
import { sanitizeAdminResponse, sanitizeArray } from '../utils/responseSanitizer.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateJWT);

// Get all admin users (only accessible by admin)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    // Build filter for admin users only
    const filter = {
      $or: [
        { role: 'admin' },
        { role: 'subadmin' }
      ]
    };
    
    if (role && ['admin', 'subadmin'].includes(role)) {
      filter.$or = [{ role }];
    }
    
    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$and = [
        { $or: [{ role: 'admin' }, { role: 'subadmin' }] },
        {
          $or: [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { phoneNumber: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } }
          ]
        }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Exclude sensitive fields - never expose phoneNumber, password, login data
    const users = await Admin.find(filter)
      .select('-__v -password -phoneNumber -lastLogin -lastActivity -loginCount')
      .populate('createdBy', 'name') // Only name, not phoneNumber
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Admin.countDocuments(filter);
    
    // Sanitize all user responses
    const sanitizedUsers = sanitizeArray(users, sanitizeAdminResponse, req.user?.role, req.user);
    
    res.json({
      success: true,
      data: sanitizedUsers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    logger.error('Error fetching admin users:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin users'
    });
  }
});

// Get user statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalAdmins = await Admin.countDocuments({ role: 'admin' });
    const totalSubAdmins = await Admin.countDocuments({ role: 'subadmin' });
    const activeAdmins = await Admin.countDocuments({ 
      role: { $in: ['admin', 'subadmin'] }, 
      isActive: true 
    });
    
    // Get recent activity count
    const recentActivity = await ActivityLog.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    res.json({
      success: true,
      data: {
        totalAdmins,
        totalSubAdmins,
        activeAdmins,
        recentActivity,
        maxUsers: 10
      }
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics'
    });
  }
});

// Create new admin/subadmin
router.post('/users', requireAdmin, logActivity, async (req, res) => {
  try {
    const { name, phoneNumber, role, permissions, password } = req.body;
    
    // Validate role
    if (!['admin', 'subadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be admin or subadmin'
      });
    }
    
    // Check user limit (max 10 users)
    const totalUsers = await Admin.countDocuments({
      $or: [{ role: 'admin' }, { role: 'subadmin' }]
    });
    
    if (totalUsers >= 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum user limit reached (10 users)'
      });
    }
    
    // Normalize phone number (remove all non-digits, keep only last 10 digits for Indian numbers)
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    let normalizedPhone;
    
    if (cleanedPhone.length === 10) {
      // 10 digits: assume Indian number without country code
      normalizedPhone = cleanedPhone;
    } else if (cleanedPhone.length === 12 && cleanedPhone.startsWith('91')) {
      // 12 digits starting with 91: remove country code
      normalizedPhone = cleanedPhone.substring(2);
    } else if (cleanedPhone.length >= 10) {
      // Take last 10 digits
      normalizedPhone = cleanedPhone.slice(-10);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Must be 10 digits.'
      });
    }
    
    // Check if phone number already exists (check multiple formats)
    const phoneFormats = [
      normalizedPhone, // 9034779597
      `91${normalizedPhone}`, // 919034779597
      `+91${normalizedPhone}`, // +919034779597
    ];
    
    const existingUser = await Admin.findOne({ 
      phoneNumber: { $in: phoneFormats } 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this phone number already exists'
      });
    }
    
    // Validate password (required for both admin and subadmin)
    if (!password) {
      return res.status(400).json({
        success: false,
        error: `Password is required for ${role}`
      });
    }
    
    // Validate password strength (allow all common special characters)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
      });
    }
    
    // Set permissions based on role
    let userPermissions = [];
    if (role === 'admin') {
      userPermissions = ['all'];
    } else if (role === 'subadmin') {
      userPermissions = permissions || ['dashboard', 'cities', 'builders', 'properties'];
    }
    
    // Build user data object (NO EMAIL - explicitly exclude email field)
    const userData = {
      name,
      phoneNumber: normalizedPhone, // Use normalized phone number (10 digits)
      password: password, // Password is now required
      role,
      permissions: userPermissions,
      createdBy: req.user.id,
      isActive: true
    };
    
    // Explicitly ensure email is not included (even if somehow set)
    delete userData.email;

    // Hash password before saving (since we'll use insertOne directly)
    const bcrypt = (await import('bcryptjs')).default;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Use native MongoDB insertOne to avoid email field being set to null
    // This prevents duplicate key errors with old email unique index
    const insertData = {
      name,
      phoneNumber: normalizedPhone,
      password: hashedPassword,
      role,
      permissions: userPermissions,
      createdBy: new mongoose.Types.ObjectId(req.user.id), // Convert to ObjectId
      isActive: true,
      lastActivity: new Date(),
      loginCount: 0,
      preferences: {
        notifications: {
          email: true,
          sms: false
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Explicitly do NOT include email field
    const result = await Admin.collection.insertOne(insertData);
    
    // Fetch the created user using Mongoose to get proper document (exclude sensitive fields)
    const newUser = await Admin.findById(result.insertedId)
      .select('-__v -password -phoneNumber -lastLogin -lastActivity -loginCount')
      .lean();
    
    if (!newUser) {
      throw new Error('Failed to retrieve created user');
    }
    
    // Log activity
    req.activityData = {
      action: 'create_user',
      resource: 'User',
      resourceId: newUser._id,
      details: `Created ${role} user: ${name} (${normalizedPhone})`,
      severity: 'medium'
    };
    
    // Sanitize response
    const sanitized = sanitizeAdminResponse(newUser, req.user);
    
    res.status(201).json({
      success: true,
      data: sanitized,
      message: `${role} user created successfully`
    });
  } catch (error) {
    logger.error('Error creating admin user:', { 
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      phoneNumber: req.body.phoneNumber
    });
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const duplicateValue = error.keyValue || {};
      
      logger.error('Duplicate key error:', {
        field,
        duplicateValue,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
      
      // Handle email field error (email is not used in current schema but may exist in DB)
      // This happens when database has old email unique index
      if (field === 'email') {
        // Get phone number from request body to check if it's actually a phone duplicate
        const requestPhone = req.body.phoneNumber?.replace(/\D/g, '').slice(-10);
        if (requestPhone) {
          // Check multiple phone formats
          const phoneFormats = [
            requestPhone,
            `91${requestPhone}`,
            `+91${requestPhone}`
          ];
          
          // Check if it's actually a phone number duplicate by checking the phone number
          const phoneCheck = await Admin.findOne({ 
            phoneNumber: { $in: phoneFormats }
          });
          
          if (phoneCheck) {
            return res.status(400).json({
              success: false,
              error: 'User with this phone number already exists'
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: 'Failed to create user. Please contact administrator to fix database configuration.'
        });
      }
      
      // Handle phone number duplicate
      if (field === 'phoneNumber') {
        return res.status(400).json({
          success: false,
          error: 'User with this phone number already exists'
        });
      }
      
      return res.status(400).json({
        success: false,
        error: `User with this ${field} already exists`
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create admin user'
    });
  }
});

// Update admin user
router.put('/users/:id', requireAdmin, logActivity, async (req, res) => {
  try {
    const { name, email, role, permissions, isActive, password } = req.body;
    const userId = req.params.id;
    const currentUserId = req.user._id.toString(); // Currently logged-in admin
    
    // Don't allow modifying protected super admins
    // Protected phone numbers: 9181989882098, 8198982098 (main admin), 9650089892 (Anil Mann - super admin)
    const user = await Admin.findById(userId);
    const protectedPhones = ['9181989882098', '8198982098', '9650089892'];
    if (user && protectedPhones.includes(user.phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify protected super admin account'
      });
    }
    
    // Prevent admin from deactivating themselves
    if (userId === currentUserId && isActive === false) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account. Please ask another admin to deactivate your account if needed.'
      });
    }
    
    // Validate role
    if (role && !['admin', 'subadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be admin or subadmin'
      });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role) {
      updateData.role = role;
      updateData.isAdmin = role === 'admin';
    }
    if (permissions) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update password if provided
    if (password) {
      // Validate password strength (allow all common special characters)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
        });
      }
      updateData.password = password;
    }
    
    const updatedUser = await Admin.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .select('-__v -password -phoneNumber -lastLogin -lastActivity -loginCount')
      .lean();
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Log activity (use phoneNumber from request or existing user, not from response)
    const userForLog = await Admin.findById(userId).select('phoneNumber').lean();
    req.activityData = {
      action: 'update_user',
      resource: 'User',
      resourceId: updatedUser._id,
      details: `Updated user: ${updatedUser.name}${userForLog?.phoneNumber ? ` (${userForLog.phoneNumber})` : ''}`,
      severity: 'medium'
    };
    
    // Sanitize response
    const sanitized = sanitizeAdminResponse(updatedUser, req.user);
    
    res.json({
      success: true,
      data: sanitized,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Error updating admin user:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update admin user'
    });
  }
});

// Delete admin user
router.delete('/users/:id', requireAdmin, logActivity, async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id?.toString(); // Currently logged-in admin
    
    // Prevent admin from deleting themselves
    // Compare IDs as strings to handle both ObjectId and string formats
    if (userId && currentUserId && userId.toString() === currentUserId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account. Please ask another admin to delete your account if needed.'
      });
    }
    
    // Don't allow deleting protected super admins
    // Protected phone numbers: 9181989882098, 8198982098 (main admin), 9650089892 (Anil Mann - super admin)
    const user = await Admin.findById(userId);
    const protectedPhones = ['9181989882098', '8198982098', '9650089892'];
    if (user && protectedPhones.includes(user.phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete protected super admin account'
      });
    }
    
    // Double-check by phone number (if current user phone matches target user phone)
    if (user && req.user.phoneNumber && user.phoneNumber === req.user.phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account! Please ask another admin to delete your account if needed.'
      });
    }
    
    const deletedUser = await Admin.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Log activity
    req.activityData = {
      action: 'delete_user',
      resource: 'User',
      resourceId: deletedUser._id,
      details: `Deleted user: ${deletedUser.name} (${deletedUser.phoneNumber})`,
      severity: 'high'
    };
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting admin user:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete admin user'
    });
  }
});

// Get activity logs (only accessible by admin)
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 40, action, severity, userId, fromDate, toDate } = req.query;
    
    // Enforce maximum limit of 40 logs per page
    const maxLimit = 40;
    const finalLimit = Math.min(parseInt(limit) || 40, maxLimit);
    
    const filter = {};
    if (action) filter.action = action;
    if (severity) filter.severity = severity;
    if (userId) filter.userId = userId;
    
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate + 'T23:59:59.999Z');
    }
    
    const skip = (parseInt(page) - 1) * finalLimit;
    
    const logs = await ActivityLog.find(filter)
      .populate('userId', 'name phoneNumber role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(finalLimit);
    
    const total = await ActivityLog.countDocuments(filter);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / finalLimit),
        total,
        limit: finalLimit
      }
    });
  } catch (error) {
    logger.error('Error fetching activity logs:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
});

// Get activity summary
router.get('/logs/summary', requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const summary = await ActivityLog.getActivitySummary({
      createdAt: { $gte: fromDate }
    });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error fetching activity summary:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity summary'
    });
  }
});

// Send OTP for new user creation (admin only)
router.post('/send-otp-for-user', requireAdmin, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Import twoFactorService here to avoid circular dependency
    const twoFactorService = (await import('../services/twoFactorService.js')).default;
    
    // Send OTP using 2Factor service
    const result = await twoFactorService.sendOTP(phoneNumber);

    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'OTP sent successfully',
        sessionId: result.sessionId,
        otpType: result.type || 'sms',
        isFallback: result.fallback || false,
        expiresIn: 120, // 2 minutes
        expiresAt: new Date(Date.now() + 120 * 1000).toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP'
      });
    }
  } catch (error) {
    logger.error('Error sending OTP for user creation:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    });
  }
});

// Verify OTP for new user creation (admin only)
router.post('/verify-otp-for-user', requireAdmin, async (req, res) => {
  try {
    const { sessionId, otp } = req.body;
    
    if (!sessionId || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and OTP are required'
      });
    }

    // Enhanced OTP validation
    const otpRegex = /^\d{4,8}$/;
    if (!otpRegex.test(otp)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP format. OTP must be 4-8 digits' 
      });
    }

    // Import twoFactorService here to avoid circular dependency
    const twoFactorService = (await import('../services/twoFactorService.js')).default;
    
    // Verify OTP using 2Factor service
    const result = await twoFactorService.verifyOTP(sessionId, otp);

    if (result.success) {
      res.json({
        success: true,
        message: 'OTP verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Invalid OTP'
      });
    }
  } catch (error) {
    logger.error('Error verifying OTP for user creation:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP'
    });
  }
});

// Get blocked IPs endpoint (admin only)
router.get('/blocked-ips', requireAdmin, async (req, res) => {
  try {
    // Import getBlockedIPs from ipBlocking utility
    const { getBlockedIPs } = await import('../utils/ipBlocking.js');
    
    const blockedIPs = getBlockedIPs();
    
    res.json({
      success: true,
      data: blockedIPs,
      total: blockedIPs.length
    });
  } catch (error) {
    logger.error('Error fetching blocked IPs:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blocked IPs'
    });
  }
});

// Release (unblock) IP endpoint (admin only)
router.post('/blocked-ips/release', requireAdmin, logActivity, async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }
    
    // Import releaseIP and isIPBlocked from ipBlocking utility
    const { releaseIP, isIPBlocked } = await import('../utils/ipBlocking.js');
    
    // Check if IP is actually blocked
    const blockedCheck = isIPBlocked(ip);
    if (!blockedCheck.blocked) {
      return res.status(400).json({
        success: false,
        error: 'IP address is not currently blocked'
      });
    }
    
    // Release the IP
    const released = releaseIP(ip);
    
    if (!released) {
      return res.status(404).json({
        success: false,
        error: 'IP address not found in blocked list'
      });
    }
    
    // Log activity
    req.activityData = {
      action: 'release_ip',
      resource: 'Security',
      resourceId: ip,
      details: `Released blocked IP: ${ip}`,
      severity: 'medium'
    };
    
    logger.info(`IP ${ip} released by admin ${req.user.name} (${req.user.id})`);
    
    res.json({
      success: true,
      message: `IP ${ip} has been released and can now access the admin panel`,
      data: {
        ip: ip,
        releasedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error releasing IP:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to release IP'
    });
  }
});

// Change password endpoint
router.post('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // Get user with password
    const user = await Admin.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: 'No password set for this account. Please contact administrator.'
      });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Validate new password strength (allow all common special characters)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed successfully for user: ${user.name} (${user.phoneNumber})`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing password:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

export default router;
