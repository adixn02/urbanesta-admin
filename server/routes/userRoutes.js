import express from "express";
import User from "../models/User.js";
import ExcelJS from "exceljs";
import { authenticateJWT } from "../middleware/jwtAuth.js";
import { requireUserManagementAccess } from "../middleware/roleAuth.js";
import { escapeRegex } from "../utils/sanitize.js";
import { logActivity } from "../middleware/activityLogger.js";

const router = express.Router();

// Apply authentication and role-based access to all user routes
router.use(authenticateJWT);
router.use(requireUserManagementAccess);

// GET /api/users - Get all users with optional filtering
router.get("/", logActivity, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search, fromDate, toDate } = req.query;
    
    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    
    // Add date filtering for lastLogin
    if (fromDate || toDate) {
      filter.lastLogin = {};
      if (fromDate) {
        filter.lastLogin.$gte = new Date(fromDate);
      }
      if (toDate) {
        filter.lastLogin.$lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get users with pagination
    const users = await User.find(filter)
      .select('-__v')
      .sort({ lastLogin: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
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
    logger.error('Error fetching users:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// GET /api/users/stats - Get user statistics
router.get("/stats", logActivity, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      details: error.message
    });
  }
});

// GET /api/users/export - Export users to Excel
router.get("/export", logActivity, async (req, res) => {
  try {
    const { fromDate, toDate, role, isActive } = req.query;
    
    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    // Add date filtering for lastLogin
    if (fromDate || toDate) {
      filter.lastLogin = {};
      if (fromDate) {
        filter.lastLogin.$gte = new Date(fromDate);
      }
      if (toDate) {
        filter.lastLogin.$lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }
    
    // Get all users matching the filter
    const users = await User.find(filter)
      .select('-__v')
      .sort({ lastLogin: -1, createdAt: -1 });
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users Report');
    
    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phoneNumber', width: 15 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Last Login', key: 'lastLogin', width: 20 },
      { header: 'Login Count', key: 'loginCount', width: 12 },
      { header: 'Created Date', key: 'createdAt', width: 20 }
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data rows
    users.forEach(user => {
      worksheet.addRow({
        name: user.name || 'N/A',
        email: user.email || 'N/A',
        phoneNumber: user.phoneNumber || 'N/A',
        city: user.city || 'N/A',
        role: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User',
        status: user.isActive ? 'Active' : 'Inactive',
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Never',
        loginCount: user.loginCount || 0,
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) : 'N/A'
      });
    });
    
    // Generate filename with date range
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    let filename = `users_report_${dateStr}`;
    
    if (fromDate && toDate) {
      filename = `users_report_${fromDate}_to_${toDate}`;
    } else if (fromDate) {
      filename = `users_report_from_${fromDate}`;
    } else if (toDate) {
      filename = `users_report_until_${toDate}`;
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export users',
      details: error.message
    });
  }
});

// GET /api/users/:id - Get single user
router.get("/:id", logActivity, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      details: error.message
    });
  }
});

// POST /api/users - Create new user
router.post("/", logActivity, async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create user',
      details: error.message
    });
  }
});

// PUT /api/users/:id - Update user
router.put("/:id", logActivity, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update user',
      details: error.message
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete("/:id", logActivity, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error.message
    });
  }
});

export default router;
