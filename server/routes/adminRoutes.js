import express from 'express';
import Admin from '../models/Admin.js';
import ActivityLog from '../models/ActivityLog.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import { requireAdmin, requireRole } from '../middleware/roleAuth.js';
import { escapeRegex } from '../utils/sanitize.js';
import { logActivity } from '../middleware/activityLogger.js';
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
    
    const users = await Admin.find(filter)
      .select('-__v')
      .populate('createdBy', 'name phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Admin.countDocuments(filter);
    
    res.json({
      success: true,
      data: users,
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
    const { name, phoneNumber, email, role, permissions } = req.body;
    
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
    
    // Check if phone number already exists
    const existingUser = await Admin.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this phone number already exists'
      });
    }
    
    // Set permissions based on role
    let userPermissions = [];
    if (role === 'admin') {
      userPermissions = ['all'];
    } else if (role === 'subadmin') {
      userPermissions = permissions || ['dashboard', 'cities', 'builders', 'properties'];
    }
    
    const newUser = new Admin({
      name,
      phoneNumber,
      email: email || '',
      role,
      permissions: userPermissions,
      createdBy: req.user.id,
      isActive: true
    });
    
    await newUser.save();
    
    // Log activity
    req.activityData = {
      action: 'create_user',
      resource: 'User',
      resourceId: newUser._id,
      details: `Created ${role} user: ${name} (${phoneNumber})`,
      severity: 'medium'
    };
    
    res.status(201).json({
      success: true,
      data: newUser,
      message: `${role} user created successfully`
    });
  } catch (error) {
    logger.error('Error creating admin user:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create admin user'
    });
  }
});

// Update admin user
router.put('/users/:id', requireAdmin, logActivity, async (req, res) => {
  try {
    const { name, email, role, permissions, isActive } = req.body;
    const userId = req.params.id;
    
    // Don't allow changing the main admin (phone: 8198982098)
    const user = await Admin.findById(userId);
    if (user && user.phoneNumber === '8198982098') {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify the main admin account'
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
    
    const updatedUser = await Admin.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Log activity
    req.activityData = {
      action: 'update_user',
      resource: 'User',
      resourceId: updatedUser._id,
      details: `Updated user: ${updatedUser.name} (${updatedUser.phoneNumber})`,
      severity: 'medium'
    };
    
    res.json({
      success: true,
      data: updatedUser,
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
    
    // Don't allow deleting the main admin (phone: 8198982098)
    const user = await Admin.findById(userId);
    if (user && user.phoneNumber === '8198982098') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the main admin account'
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

export default router;
