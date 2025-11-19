import express from "express";
import City from "../models/City.js";
import Managedproperty from "../models/property.js";
import upload from "../middleware/upload.js";
import { convertToCloudFrontUrl } from "../utils/cloudfront.js";
import { deleteImageFromS3 } from "../utils/s3Delete.js";
import { authenticateJWT } from "../middleware/jwtAuth.js";
import { requireAdminOrSubAdmin } from "../middleware/roleAuth.js";
import { logActivity } from "../middleware/activityLogger.js";
import { sanitizeObject, sanitizeString } from "../utils/sanitize.js";
import { handleRouteError, getErrorMessage } from "../utils/errorHandler.js";
import { sanitizeCityResponse } from "../utils/responseSanitizer.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Apply authentication and role-based access to all city routes
router.use(authenticateJWT);
router.use(requireAdminOrSubAdmin);

// Get all cities
router.get("/", async (req, res) => {
  try {
    const cities = await City.find()
      .select('-__v -createdAt -updatedAt')
      .sort({ createdAt: -1 })
      .lean();
    
    // Sanitize and convert S3 URLs to CloudFront URLs
    const citiesWithCloudFrontUrls = cities.map(city => {
      const sanitized = sanitizeCityResponse(city, req.user?.role);
      sanitized.backgroundImage = convertToCloudFrontUrl(city.backgroundImage);
      return sanitized;
    });
    
    res.json(citiesWithCloudFrontUrls);
  } catch (error) {
    logger.error("Error fetching city:", { error: error.message });
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch city') });
  }
});

// GET /api/cities/stats - Get city statistics
router.get("/stats", async (req, res) => {
  try {
    const totalCities = await City.countDocuments();
    const activeCities = await City.countDocuments({ isActive: true });
    const totalLocalities = await City.aggregate([
      { $unwind: "$localities" },
      { $count: "total" }
    ]);
    
    const citiesByState = await City.aggregate([
      {
        $group: {
          _id: "$state",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalCities,
        activeCities,
        totalLocalities: totalLocalities[0]?.total || 0,
        citiesByState
      }
    });
  } catch (error) {
    logger.error("Error fetching city stats:", { error: error.message });
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch city statistics') });
  }
});

// Get single city by ID
router.get("/:id", async (req, res) => {
  try {
    const city = await City.findById(req.params.id)
      .select('-__v -createdAt -updatedAt')
      .lean();
    
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }
    
    // Sanitize and convert S3 URL to CloudFront URL
    const sanitized = sanitizeCityResponse(city, req.user?.role);
    sanitized.backgroundImage = convertToCloudFrontUrl(city.backgroundImage);
    
    res.json(sanitized);
  } catch (error) {
    logger.error("Error fetching city:", { error: error.message });
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch city') });
  }
});

// Create new city
router.post("/", upload.single("backgroundImage"), logActivity, async (req, res) => {
  try {
    // Set activity data for logging
    req.activityData = {
      action: 'create_city',
      resource: 'City',
      resourceId: null, // Will be set after creation
      details: `Created city: ${req.body.name}`,
      severity: 'low'
    };

    // Sanitize input data
    const sanitizedBody = sanitizeObject(req.body);
    const { name, state, country, isActive, localities, backgroundImageUrl } = sanitizedBody;
    
    // Validate required fields
    if (!name || !sanitizeString(name).trim()) {
      return res.status(400).json({
        success: false,
        error: 'City name is required'
      });
    }
    
    const cityData = {
      name,
      state,
      country: country || "India",
      isActive: isActive === "true" || isActive === true,
      localities: localities ? JSON.parse(localities) : []
    };

    // Add background image URL - prioritize uploaded file over existing URL
    if (req.file) {
      cityData.backgroundImage = req.file.location;
    } else if (backgroundImageUrl) {
      cityData.backgroundImage = sanitizeString(backgroundImageUrl);
    }

    const city = new City(cityData);
    await city.save();
    
    // Update activity data with created city ID
    req.activityData.resourceId = city._id;
    
    // Sanitize, convert S3 URL to CloudFront URL for response
    const sanitized = sanitizeCityResponse(city, req.user?.role);
    sanitized.backgroundImage = convertToCloudFrontUrl(city.backgroundImage);
    
    res.status(201).json({
      success: true,
      data: sanitized,
      message: 'City created successfully'
    });
  } catch (error) {
    await handleRouteError(error, req, res, 'create_city', 'City', 400);
  }
});

// Update city
router.put("/:id", upload.single("backgroundImage"), logActivity, async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedBody = sanitizeObject(req.body);
    const { name, state, country, isActive, localities, backgroundImageUrl } = sanitizedBody;
    
    // First, get the existing city to check for old image
    const existingCity = await City.findById(req.params.id);
    if (!existingCity) {
      return res.status(404).json({ error: "City not found" });
    }

    const updateData = {
      name,
      state,
      country: country || "India",
      isActive: isActive === "true" || isActive === true,
      localities: localities ? JSON.parse(localities) : []
    };

    // Handle background image update
    let newImageUrl = null;
    if (req.file) {
      // New file uploaded
      newImageUrl = req.file.location;
      updateData.backgroundImage = newImageUrl;
    } else if (backgroundImageUrl) {
      // Using existing URL
      newImageUrl = sanitizeString(backgroundImageUrl);
      updateData.backgroundImage = newImageUrl;
    }

    // If we have a new image and the old image is different, delete the old one
    if (newImageUrl && existingCity.backgroundImage && existingCity.backgroundImage !== newImageUrl) {
      await deleteImageFromS3(existingCity.backgroundImage);
    }

    const city = await City.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Sanitize, convert S3 URL to CloudFront URL for response
    const sanitized = sanitizeCityResponse(city, req.user?.role);
    sanitized.backgroundImage = convertToCloudFrontUrl(city.backgroundImage);
    
    // Set activity log data
    req.activityData = {
      action: 'update_city',
      resource: 'City',
      resourceId: city._id,
      details: `Updated city: ${city.name}`,
      severity: 'medium'
    };

    res.json({ success: true, data: sanitized, message: 'City updated successfully' });
  } catch (error) {
    await handleRouteError(error, req, res, 'update_city', 'City', 400);
  }
});

// Get property count for a city
router.get("/:id/property-count", async (req, res) => {
  try {
    const propertyCount = await Managedproperty.countDocuments({ city: req.params.id });
    res.json({ success: true, count: propertyCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete city
router.delete("/:id", logActivity, async (req, res) => {
  try {
    // First, get the city to access the background image
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }

    // Check if any properties exist for this city
    const propertyCount = await Managedproperty.countDocuments({ city: req.params.id });
    if (propertyCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete city. ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} exist under this city.` 
      });
    }

    // Delete the background image from S3 if it exists
    if (city.backgroundImage) {
      const imageDeleted = await deleteImageFromS3(city.backgroundImage);
      if (imageDeleted) {
        // Image deleted successfully
      } else {
        // Failed to delete image but continuing with city deletion
      }
    }

    // Delete the city from database
    await City.findByIdAndDelete(req.params.id);
    
    req.activityData = {
      action: 'delete_city',
      resource: 'City',
      resourceId: city._id,
      details: `Deleted city: ${city.name}`,
      severity: 'medium'
    };
    res.json({ success: true, message: "City and associated image deleted successfully" });
  } catch (error) {
    await handleRouteError(error, req, res, 'delete_city', 'City', 400);
  }
});

// Add locality to city
router.post("/:id/localities", async (req, res) => {
  try {
    const { name, isActive } = req.body;
    
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }

    city.localities.push({
      name,
      isActive: isActive === "true" || isActive === true
    });

    await city.save();
    
    // Sanitize response
    const sanitized = sanitizeCityResponse(city, req.user?.role);
    sanitized.backgroundImage = convertToCloudFrontUrl(city.backgroundImage);
    res.json(sanitized);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update locality
router.put("/:cityId/localities/:localityId", async (req, res) => {
  try {
    const { name, isActive } = req.body;
    
    const city = await City.findById(req.params.cityId);
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }

    const locality = city.localities.id(req.params.localityId);
    if (!locality) {
      return res.status(404).json({ error: "Locality not found" });
    }

    locality.name = name;
    locality.isActive = isActive === "true" || isActive === true;

    await city.save();
    
    // Sanitize response
    const sanitized = sanitizeCityResponse(city, req.user?.role);
    sanitized.backgroundImage = convertToCloudFrontUrl(city.backgroundImage);
    res.json(sanitized);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete locality
router.delete("/:cityId/localities/:localityId", async (req, res) => {
  try {
    const city = await City.findById(req.params.cityId);
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }

    city.localities.pull(req.params.localityId);
    await city.save();
    
    // Sanitize response
    const sanitized = sanitizeCityResponse(city, req.user?.role);
    sanitized.backgroundImage = convertToCloudFrontUrl(city.backgroundImage);
    res.json(sanitized);
  } catch (error) {
    logger.error("Error fetching city:", { error: error.message });
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch city') });
  }
});

export default router;
