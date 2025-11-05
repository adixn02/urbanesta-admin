import express from 'express';
import Analytics from '../models/Analytics.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import { requireAdminOrSubAdmin } from '../middleware/roleAuth.js';

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
    console.error('Error fetching total views:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch total views',
      details: error.message
    });
  }
});

export default router;
