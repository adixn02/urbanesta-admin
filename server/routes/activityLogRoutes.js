import express from 'express';
import ActivityLog from '../models/ActivityLog.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import { requireAdminOrSubAdmin } from '../middleware/roleAuth.js';

const router = express.Router();

// Apply authentication and role-based access to all activity log routes
router.use(authenticateJWT);
router.use(requireAdminOrSubAdmin);

// GET /api/admin/logs - Get activity logs with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 40,
      action,
      severity,
      userId,
      fromDate,
      toDate,
      status
    } = req.query;

    // Enforce maximum limit of 40 logs per page
    const maxLimit = 40;
    const finalLimit = Math.min(parseInt(limit) || 40, maxLimit);

    // Build filter object
    const filter = {};
    
    if (action) filter.action = action;
    if (severity) filter.severity = severity;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    
    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        filter.createdAt.$lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * finalLimit;
    
    // Get logs with pagination
    const logs = await ActivityLog.find(filter)
      .populate('userId', 'name email phoneNumber role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(finalLimit);

    // Get total count for pagination
    const total = await ActivityLog.countDocuments(filter);
    const pages = Math.ceil(total / finalLimit);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current: parseInt(page),
        pages,
        total,
        limit: finalLimit
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
      details: error.message
    });
  }
});

// GET /api/admin/logs/summary - Get activity summary
router.get('/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // Calculate date range
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));
    
    const filter = {
      createdAt: { $gte: fromDate }
    };

    const summary = await ActivityLog.getActivitySummary(filter);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity summary',
      details: error.message
    });
  }
});

// GET /api/admin/logs/stats - Get activity statistics
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Calculate date range
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));
    
    const stats = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      {
        $group: {
          _id: null,
          totalActivities: { $sum: 1 },
          successfulActivities: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failedActivities: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          blockedActivities: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          criticalActivities: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          highSeverityActivities: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          totalActivities: 1,
          successfulActivities: 1,
          failedActivities: 1,
          blockedActivities: 1,
          criticalActivities: 1,
          highSeverityActivities: 1,
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      }
    ]);

    const result = stats[0] || {
      totalActivities: 0,
      successfulActivities: 0,
      failedActivities: 0,
      blockedActivities: 0,
      criticalActivities: 0,
      highSeverityActivities: 0,
      uniqueUserCount: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity stats',
      details: error.message
    });
  }
});

// POST /api/admin/logs - Create a new activity log (for testing or manual logging)
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      userPhone,
      userName,
      userRole,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      severity = 'low',
      status = 'success',
      metadata = {}
    } = req.body;

    const log = await ActivityLog.logActivity({
      userId,
      userPhone,
      userName,
      userRole,
      action,
      resource,
      resourceId,
      details,
      ipAddress: ipAddress || req.ip || 'unknown',
      userAgent: userAgent || req.get('User-Agent') || 'unknown',
      severity,
      status,
      metadata
    });

    res.status(201).json({
      success: true,
      data: log,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create activity log',
      details: error.message
    });
  }
});

export default router;
