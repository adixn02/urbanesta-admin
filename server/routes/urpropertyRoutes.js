import express from 'express';
import Managedproperty from '../models/property.js';
import Category from '../models/category.js';
import City from '../models/City.js';
import Builder from '../models/Builder.js';
import { convertToCloudFrontUrl } from '../utils/cloudfront.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import { requireAdminOrSubAdmin } from '../middleware/roleAuth.js';
import { logActivity } from '../middleware/activityLogger.js';
import { sanitizeObject, sanitizeString, escapeRegex } from '../utils/sanitize.js';
import { handleRouteError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication and role-based access to all property routes
router.use(authenticateJWT);
router.use(requireAdminOrSubAdmin);

// GET /api/properties/dropdown-data - Get all dropdown data for property form
router.get('/dropdown-data', async (req, res) => {
  try {
    // Fetch categories with subcategories
    const categories = await Category.find({ isActive: true })
      .select('name deepSubcategories')
      .populate('deepSubcategories', 'name isActive');
    
    // Fetch cities with localities
    const cities = await City.find({ isActive: true })
      .select('name state localities')
      .populate('localities', 'name isActive');
    
    // Fetch builders
    const builders = await Builder.find({ isActive: true })
      .select('name slug')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: {
        categories,
        cities,
        builders
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Failed to fetch dropdown data');
  }
});

// GET /api/properties/configurations/:categoryId/:subcategoryId - Get configurations for specific category and subcategory
router.get('/configurations/:categoryId/:subcategoryId', async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    const subcategory = category.deepSubcategories.id(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found'
      });
    }
    
    const configurations = subcategory.configurations || [];
    
    res.json({
      success: true,
      data: configurations
    });
  } catch (error) {
    handleRouteError(error, res, 'Failed to fetch configurations');
  }
});

// GET /api/properties - Get all properties with optional filtering
router.get('/', async (req, res) => {
  try {
    const { type, status, city, category, subcategory, name, builder, page = 1, limit = 50 } = req.query;
    
    // Build filter object
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (builder) filter.builder = builder;
    
    // Handle city filter - exact match by city ID
    if (city) {
      filter.city = city;
    }
    
    // Handle name filter - search in both title (regular) and projectName (builder)
    if (name) {
      // Escape regex special characters to prevent ReDoS and injection attacks
      const escapedName = escapeRegex(name);
      filter.$or = [
        { title: new RegExp(escapedName, 'i') },
        { projectName: new RegExp(escapedName, 'i') }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get properties with pagination and populate references
    const properties = await Managedproperty.find(filter)
      .populate('category', 'name deepSubcategories')
      .populate('city', 'name state localities')
      .populate('builder', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Convert to plain objects and add display images with CloudFront URLs
    const propertiesWithSubcategoryNames = properties.map(property => {
      const propertyObj = property.toObject();
      
      // If subcategoryName is not set, try to populate it from the category
      if (!propertyObj.subcategoryName && propertyObj.category && propertyObj.subcategory) {
        try {
          const category = propertyObj.category;
          if (category.deepSubcategories) {
            const subcategory = category.deepSubcategories.find(
              sub => sub._id.toString() === propertyObj.subcategory
            );
            if (subcategory) {
              propertyObj.subcategoryName = subcategory.name;
            }
          }
        } catch (error) {
          // Error populating subcategory name
        }
      }
      
      // Populate locality name for location field
      if (propertyObj.city && propertyObj.city.localities && propertyObj.location) {
        try {
          const locality = propertyObj.city.localities.find(
            loc => loc._id.toString() === propertyObj.location
          );
          if (locality) {
            propertyObj.localityName = locality.name;
          }
        } catch (error) {
          // Error populating locality name
        }
      }
      
      // Convert all image URLs to CloudFront URLs first
      if (propertyObj.projectImages) {
        propertyObj.projectImages = propertyObj.projectImages.map(img => convertToCloudFrontUrl(img));
      }
      if (propertyObj.images) {
        propertyObj.images = propertyObj.images.map(img => convertToCloudFrontUrl(img));
      }
      if (propertyObj.projectLogo) {
        propertyObj.projectLogo = convertToCloudFrontUrl(propertyObj.projectLogo);
      }
      if (propertyObj.wallpaperImage) {
        propertyObj.wallpaperImage = convertToCloudFrontUrl(propertyObj.wallpaperImage);
      }
      if (propertyObj.descriptionImage) {
        propertyObj.descriptionImage = convertToCloudFrontUrl(propertyObj.descriptionImage);
      }
      if (propertyObj.highlightImage) {
        propertyObj.highlightImage = convertToCloudFrontUrl(propertyObj.highlightImage);
      }
      if (propertyObj.floorPlan) {
        propertyObj.floorPlan = convertToCloudFrontUrl(propertyObj.floorPlan);
      }
      if (propertyObj.masterPlan) {
        propertyObj.masterPlan = convertToCloudFrontUrl(propertyObj.masterPlan);
      }
      
      // Get display image based on property type (after CloudFront conversion)
      let displayImage = null;
      if (propertyObj.type === 'regular') {
        // For regular properties, use first project image
        if (propertyObj.projectImages && propertyObj.projectImages.length > 0) {
          displayImage = propertyObj.projectImages[0];
        }
      } else if (propertyObj.type === 'builder') {
        // For builder properties, use wallpaper image
        displayImage = propertyObj.wallpaperImage;
      }
      
      // Set display image (already converted to CloudFront URL)
      if (displayImage) {
        propertyObj.displayImage = displayImage;
      }
      
      return propertyObj;
    });
    
    // Get total count for pagination
    const total = await Managedproperty.countDocuments(filter);
    
    res.json({
      success: true,
      data: propertiesWithSubcategoryNames,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Failed to fetch properties');
  }
});

// GET /api/properties/:id - Get single property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Managedproperty.findById(req.params.id)
      .populate('category', 'name')
      .populate('city', 'name state')
      .populate('builder', 'name slug');
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    logger.error('Error fetching property:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property',
      details: error.message
    });
  }
});

// POST /api/properties - Create new property
router.post('/', logActivity, async (req, res) => {
  try {
    // Sanitize input data
    const propertyData = sanitizeObject(req.body);
    
    // Remove _id if it's empty or invalid (for new properties)
    if (propertyData._id === '' || propertyData._id === null || propertyData._id === undefined) {
      delete propertyData._id;
    }
    
    // Validate required fields based on property type
    if (!propertyData.type || !['regular', 'builder'].includes(propertyData.type)) {
      return res.status(400).json({
        success: false,
        error: 'Property type is required and must be either "regular" or "builder"'
      });
    }
    
    // Common required fields
    const requiredFields = ['city', 'category', 'subcategory', 'description'];
    for (const field of requiredFields) {
      if (!propertyData[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`
        });
      }
    }
    
    // Title validation for regular properties only
    if (propertyData.type === 'regular' && !propertyData.title?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Property title is required for regular properties'
      });
    }
    
    // Type-specific validation
    if (propertyData.type === 'regular') {
      if (!propertyData.price || propertyData.price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid price is required for regular properties'
        });
      }
      if (!propertyData.location?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Location is required for regular properties'
        });
      }
      // Locality is optional for regular properties (some cities may not have localities)
      // if (!propertyData.locality) {
      //   return res.status(400).json({
      //     success: false,
      //     error: 'Locality is required for regular properties'
      //   });
      // }
    }
    
    if (propertyData.type === 'builder') {
      const builderRequiredFields = ['builder', 'projectName', 'about', 'reraNo', 'price', 'possessionDate', 'landArea', 'fullAddress'];
      for (const field of builderRequiredFields) {
        if (!propertyData[field]) {
          return res.status(400).json({
            success: false,
            error: `${field} is required for builder properties`
          });
        }
      }
      
      // Validate unit details array
      if (!propertyData.unitDetails || !Array.isArray(propertyData.unitDetails) || propertyData.unitDetails.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one unit detail is required for builder properties'
        });
      }
      
      // Validate each unit detail
      for (let i = 0; i < propertyData.unitDetails.length; i++) {
        const unit = propertyData.unitDetails[i];
        if (!unit.unitType || !unit.area || !unit.floorPlan) {
          return res.status(400).json({
            success: false,
            error: `Unit ${i + 1}: unitType, area, and floorPlan are required`
          });
        }
      }
      
      // Validate price
      const price = Number(propertyData.price);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid price is required'
        });
      }
    }
    
    // For all properties, store subcategory name for easier display
    if (propertyData.category && propertyData.subcategory) {
      try {
        const category = await Category.findById(propertyData.category).select('deepSubcategories');
        if (category && category.deepSubcategories) {
          const subcategory = category.deepSubcategories.find(
            sub => sub._id.toString() === propertyData.subcategory
          );
          if (subcategory) {
            propertyData.subcategoryName = subcategory.name;
            logger.debug(`Found subcategory name for ${propertyData.type} property:`, { subcategoryName: subcategory.name });
          } else {
            logger.warn(`Subcategory not found for ID: ${propertyData.subcategory}`);
          }
        }
      } catch (error) {
        logger.error('Error fetching subcategory name:', { 
          error: error.message, 
          stack: error.stack 
        });
      }
    }
    
    // Initialize new fields with default values if not provided
    if (!propertyData.amenities) propertyData.amenities = [];
    if (!propertyData.constructionDetails) propertyData.constructionDetails = {};
    if (!propertyData.configurations) propertyData.configurations = [];
    
    // Process connectivityPoints - ensure they are strings
    if (propertyData.connectivityPoints) {
      propertyData.connectivityPoints = propertyData.connectivityPoints.map(point => {
        if (typeof point === 'object' && point.text) {
          return point.text; // Extract text from object
        }
        return String(point); // Convert to string
      });
    }
    
    // Process amenities - ensure image field is string
    if (propertyData.amenities) {
      propertyData.amenities = propertyData.amenities.map(amenity => {
        if (typeof amenity === 'object') {
          return {
            name: amenity.name || '',
            image: typeof amenity.image === 'string' ? amenity.image : '',
            isActive: amenity.isActive !== false
          };
        }
        return amenity;
      });
    }
    
    const property = new Managedproperty(propertyData);
    await property.save();

    req.activityData = {
      action: 'create_property',
      resource: 'Property',
      resourceId: property._id,
      details: `Created property: ${property.title || property.projectName || property._id}`,
      severity: 'low'
    };
    
    res.status(201).json({
      success: true,
      data: property,
      message: 'Property created successfully'
    });
  } catch (error) {
    await handleRouteError(error, req, res, 'create_property', 'Property', 400);
  }
});

// PUT /api/properties/:id - Update property
router.put('/:id', logActivity, async (req, res) => {
  try {
    const propertyData = req.body;
    const propertyId = req.params.id;
    
    // Validate property exists
    const existingProperty = await Managedproperty.findById(propertyId);
    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    // Validate required fields based on property type
    if (propertyData.type && !['regular', 'builder'].includes(propertyData.type)) {
      return res.status(400).json({
        success: false,
        error: 'Property type must be either "regular" or "builder"'
      });
    }
    
    // Type-specific validation (same as create)
    if (propertyData.type === 'regular') {
      if (propertyData.price !== undefined && propertyData.price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid price is required for regular properties'
        });
      }
    }
    
    if (propertyData.type === 'builder') {
      const price = Number(propertyData.price);
      
      if (price && price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid price is required'
        });
      }
    }
    
    const updatedProperty = await Managedproperty.findByIdAndUpdate(
      propertyId,
      propertyData,
      { new: true, runValidators: true }
    );
    
    req.activityData = {
      action: 'update_property',
      resource: 'Property',
      resourceId: updatedProperty._id,
      details: `Updated property: ${updatedProperty.title || updatedProperty.projectName || updatedProperty._id}`,
      severity: 'medium'
    };

    res.json({
      success: true,
      data: updatedProperty,
      message: 'Property updated successfully'
    });
  } catch (error) {
    await handleRouteError(error, req, res, 'update_property', 'Property', 400);
  }
});

// DELETE /api/properties/:id - Delete property
router.delete('/:id', logActivity, async (req, res) => {
  try {
    const property = await Managedproperty.findByIdAndDelete(req.params.id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    req.activityData = {
      action: 'delete_property',
      resource: 'Property',
      resourceId: property._id,
      details: `Deleted property: ${property.title || property._id}`,
      severity: 'medium'
    };

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    await handleRouteError(error, req, res, 'delete_property', 'Property', 400);
  }
});

// GET /api/properties/stats/summary - Get property statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Managedproperty.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          regular: { $sum: { $cond: [{ $eq: ['$type', 'regular'] }, 1, 0] } },
          builder: { $sum: { $cond: [{ $eq: ['$type', 'builder'] }, 1, 0] } },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          sold: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
          rented: { $sum: { $cond: [{ $eq: ['$status', 'rented'] }, 1, 0] } }
        }
      }
    ]);
    
    const result = stats[0] || {
      total: 0,
      regular: 0,
      builder: 0,
      available: 0,
      sold: 0,
      rented: 0
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching property stats:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property statistics',
      details: error.message
    });
  }
});

// POST /api/properties/migrate-subcategory-names - Migrate existing properties to have subcategory names
router.post('/migrate-subcategory-names', async (req, res) => {
  try {
    logger.info('Starting subcategory name migration...');
    
    // Find all properties that don't have subcategoryName set
    const properties = await Managedproperty.find({ 
      subcategoryName: { $exists: false } 
    }).populate('category', 'deepSubcategories');
    
    logger.info(`Found ${properties.length} properties without subcategory names`);
    
    let updatedCount = 0;
    
    for (const property of properties) {
      if (property.category && property.category.deepSubcategories && property.subcategory) {
        const subcategory = property.category.deepSubcategories.find(
          sub => sub._id.toString() === property.subcategory
        );
        
        if (subcategory) {
          property.subcategoryName = subcategory.name;
          await property.save();
          updatedCount++;
          logger.debug(`Updated property ${property.title}: ${subcategory.name}`);
        }
      }
    }
    
    res.json({
      success: true,
      message: `Migration completed. Updated ${updatedCount} properties.`,
      updatedCount,
      totalFound: properties.length
    });
  } catch (error) {
    logger.error('Error during migration:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

// POST /api/properties/setup-sample-configurations - Add sample configurations to subcategories
router.post('/setup-sample-configurations', async (req, res) => {
  try {
    logger.info('Setting up sample configurations...');
    
    // Find all categories with subcategories
    const categories = await Category.find({ isActive: true }).select('name deepSubcategories');
    
    let updatedCount = 0;
    
    for (const category of categories) {
      for (const subcategory of category.deepSubcategories) {
        if (subcategory.isActive && (!subcategory.configurations || subcategory.configurations.length === 0)) {
          // Add sample configurations based on category type
          const sampleConfigurations = [
            { type: '1 BHK', isEnabled: true },
            { type: '2 BHK', isEnabled: true },
            { type: '3 BHK', isEnabled: true },
            { type: '4 BHK', isEnabled: true },
            { type: '5 BHK', isEnabled: true }
          ];
          
          subcategory.configurations = sampleConfigurations;
          await category.save();
          updatedCount++;
          logger.debug(`Added configurations to ${category.name} - ${subcategory.name}`);
        }
      }
    }
    
    res.json({
      success: true,
      message: `Sample configurations setup completed. Updated ${updatedCount} subcategories.`,
      updatedCount
    });
  } catch (error) {
    logger.error('Error setting up sample configurations:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to setup sample configurations',
      details: error.message
    });
  }
});

export default router;
