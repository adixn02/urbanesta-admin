import express from 'express';
import Analytics from '../models/Analytics.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import { requireAdminOrSubAdmin } from '../middleware/roleAuth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication and role-based access to all analytics routes
router.use(authenticateJWT);
router.use(requireAdminOrSubAdmin);

// GET /api/analytics/total-views - Get total views count
router.get('/total-views', async (req, res) => {
  try {
    const totalViews = await Analytics.getTotalViews();
    
    res.json({
      success: true,
      data: {
        totalViews: totalViews
      }
    });
  } catch (error) {
    logger.error('Error fetching total views:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch total views',
      details: error.message
    });
  }
});

export default router;
