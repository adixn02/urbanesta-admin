import express from 'express';
import VideoChangeLog from '../models/VideoChangeLog.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get video change logs with pagination and filters
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    if (req.query.action) {
      filter.action = req.query.action;
    }
    
    if (req.query.fromDate || req.query.toDate) {
      filter.changedAt = {};
      if (req.query.fromDate) {
        filter.changedAt.$gte = new Date(req.query.fromDate);
      }
      if (req.query.toDate) {
        const toDate = new Date(req.query.toDate);
        toDate.setHours(23, 59, 59, 999);
        filter.changedAt.$lte = toDate;
      }
    }

    // Get total count
    const total = await VideoChangeLog.countDocuments(filter);

    // Fetch logs with population
    const logs = await VideoChangeLog.find(filter)
      .populate('changedBy', 'name email phone')
      .sort({ changedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      logs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    logger.error('Error fetching video change logs:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video change logs'
    });
  }
});

// Get video change log summary
router.get('/summary', authenticateJWT, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const summary = await VideoChangeLog.aggregate([
      {
        $match: {
          changedAt: { $gte: fromDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalChanges = await VideoChangeLog.countDocuments({
      changedAt: { $gte: fromDate }
    });

    res.json({
      success: true,
      summary: {
        totalChanges,
        byAction: summary.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Error fetching video change log summary:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary'
    });
  }
});

// Get recent video changes
router.get('/recent', authenticateJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const recentLogs = await VideoChangeLog.find()
      .populate('changedBy', 'name email phone')
      .sort({ changedAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      logs: recentLogs
    });
  } catch (error) {
    logger.error('Error fetching recent video changes:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent changes'
    });
  }
});

export default router;

