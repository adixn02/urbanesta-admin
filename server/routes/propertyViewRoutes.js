import express from 'express';
import PropertyView from '../models/PropertyView.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import { requireAdminOrSubAdmin } from '../middleware/roleAuth.js';

const router = express.Router();

// Apply authentication and role-based access to all property view routes
router.use(authenticateJWT);
router.use(requireAdminOrSubAdmin);

// GET /api/property-views/all - Get all property views with property details
router.get('/all', async (req, res) => {
  try {
    const propertyViews = await PropertyView.getAllPropertyViews();
    
    res.json({
      success: true,
      data: propertyViews
    });
  } catch (error) {
    console.error('Error fetching property views:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property views',
      details: error.message
    });
  }
});

// GET /api/property-views/total - Get total views across all properties
router.get('/total', async (req, res) => {
  try {
    const totalViews = await PropertyView.getTotalPropertyViews();
    
    res.json({
      success: true,
      data: {
        totalViews: totalViews
      }
    });
  } catch (error) {
    console.error('Error fetching total property views:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch total property views',
      details: error.message
    });
  }
});

// GET /api/property-views/:propertyId - Get view count for specific property
router.get('/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const viewCount = await PropertyView.getPropertyViewCount(propertyId);
    
    res.json({
      success: true,
      data: {
        propertyId: propertyId,
        viewCount: viewCount
      }
    });
  } catch (error) {
    console.error('Error fetching property view count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property view count',
      details: error.message
    });
  }
});

export default router;
