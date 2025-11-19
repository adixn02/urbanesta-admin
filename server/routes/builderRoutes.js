import express from "express";
import Builder from "../models/Builder.js";
import Managedproperty from "../models/property.js";
import { convertToCloudFrontUrl } from "../utils/cloudfront.js";
import { authenticateJWT } from "../middleware/jwtAuth.js";
import { requireAdminOrSubAdmin } from "../middleware/roleAuth.js";
import { logActivity } from "../middleware/activityLogger.js";
import { sanitizeObject, sanitizeString } from "../utils/sanitize.js";
import { handleRouteError, getErrorMessage } from "../utils/errorHandler.js";
import { sanitizeBuilderResponse } from "../utils/responseSanitizer.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Apply authentication and role-based access to all builder routes
router.use(authenticateJWT);
router.use(requireAdminOrSubAdmin);

// ✅ Get all builders
router.get("/", async (req, res) => {
  try {
    const builders = await Builder.find()
      .select('-__v -createdAt -updatedAt -contactInfo')
      .sort({ displayOrder: 1 })
      .lean();
    
    // Sanitize and convert image fields to CloudFront URLs
    const buildersWithCloudFrontUrls = builders.map((builder) => {
      const sanitized = sanitizeBuilderResponse(builder, req.user?.role);
      sanitized.logo = builder.logo ? convertToCloudFrontUrl(builder.logo) : "";
      sanitized.backgroundImage = builder.backgroundImage ? convertToCloudFrontUrl(builder.backgroundImage) : "";
      return sanitized;
    });
    res.json(buildersWithCloudFrontUrls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/builders/stats - Get builder statistics
router.get("/stats", async (req, res) => {
  try {
    const totalBuilders = await Builder.countDocuments();
    const activeBuilders = await Builder.countDocuments({ isActive: true });
    
    const buildersByYear = await Builder.aggregate([
      { $match: { establishedYear: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$establishedYear",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalBuilders,
        activeBuilders,
        buildersByYear
      }
    });
  } catch (error) {
    logger.error("Error fetching builder stats:", { error: error.message });
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch builder statistics') });
  }
});

// ✅ Get single builder by slug
router.get("/:slug", async (req, res) => {
  try {
    const builder = await Builder.findOne({ slug: req.params.slug })
      .select('-__v -createdAt -updatedAt -contactInfo')
      .lean();
    
    if (!builder) {
      return res.status(404).json({ error: "Builder not found" });
    }
    
    // Sanitize and convert images before returning
    const sanitized = sanitizeBuilderResponse(builder, req.user?.role);
    sanitized.logo = builder.logo ? convertToCloudFrontUrl(builder.logo) : "";
    sanitized.backgroundImage = builder.backgroundImage ? convertToCloudFrontUrl(builder.backgroundImage) : "";
    
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update builder display order
router.put("/order", async (req, res) => {
  try {
    const { builders } = req.body;
    
    if (!Array.isArray(builders)) {
      return res.status(400).json({ error: "Builders array is required" });
    }

    // Update display order for each builder
    const updatePromises = builders.map(({ id, displayOrder }) => 
      Builder.findByIdAndUpdate(id, { displayOrder }, { new: true })
    );

    await Promise.all(updatePromises);
    res.json({ message: "Builder order updated successfully" });
  } catch (err) {
    logger.error("Error updating builder order:", { 
      error: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add new builder
router.post("/", logActivity, async (req, res) => {
  try {
    // Set activity data for logging
    req.activityData = {
      action: 'create_builder',
      resource: 'Builder',
      resourceId: null, // Will be set after creation
      details: `Created builder: ${req.body.name}`,
      severity: 'low'
    };

    // Sanitize input data
    const sanitizedBody = sanitizeObject(req.body);
    const { name, description, logo, backgroundImage, isActive, establishedYear, headquarters, website, displayOrder } = sanitizedBody;
    
    // Validation
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || !sanitizedName.trim()) {
      return res.status(400).json({ success: false, error: "Builder name is required" });
    }
    
    // Check if builder with same name already exists
    const existingBuilder = await Builder.findOne({ name: name.trim() });
    if (existingBuilder) {
      return res.status(400).json({ error: "Builder with this name already exists" });
    }
    
    // Generate slug from name with collision handling
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    // Check for slug collisions and append number if needed
    while (await Builder.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Determine next display order if not provided
    let resolvedDisplayOrder = displayOrder;
    if (resolvedDisplayOrder === undefined || resolvedDisplayOrder === null || isNaN(resolvedDisplayOrder)) {
      const last = await Builder.findOne().sort({ displayOrder: -1 }).select('displayOrder').lean();
      resolvedDisplayOrder = ((last && typeof last.displayOrder === 'number') ? last.displayOrder : -1) + 1;
    }

    const newBuilder = new Builder({
      name: sanitizedName.trim(),
      slug,
      description: sanitizeString(description || ""),
      logo: sanitizeString(logo || ""),
      backgroundImage: sanitizeString(backgroundImage || ""),
      isActive: isActive !== false,
      establishedYear: establishedYear ? parseInt(establishedYear) : undefined,
      headquarters: sanitizeString(headquarters || ""),
      website: sanitizeString(website || ""),
      displayOrder: resolvedDisplayOrder,
      amenities: [],
      constructionDetails: {},
      configurations: []
    });
    
    await newBuilder.save();
    
    // Update activity data with created builder ID
    req.activityData.resourceId = newBuilder._id;
    
    // Sanitize response
    const sanitized = sanitizeBuilderResponse(newBuilder, req.user?.role);
    sanitized.logo = newBuilder.logo ? convertToCloudFrontUrl(newBuilder.logo) : "";
    sanitized.backgroundImage = newBuilder.backgroundImage ? convertToCloudFrontUrl(newBuilder.backgroundImage) : "";
    
    res.status(201).json({
      success: true,
      data: sanitized,
      message: 'Builder created successfully'
    });
  } catch (err) {
    await handleRouteError(err, req, res, 'create_builder', 'Builder', 400);
  }
});

// ✅ Update builder
router.put("/:id", logActivity, async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedBody = sanitizeObject(req.body);
    const { name, description, logo, backgroundImage, isActive, establishedYear, headquarters, website, displayOrder } = sanitizedBody;
    
    // Validation
    if (name) {
      const sanitizedName = sanitizeString(name);
      if (!sanitizedName.trim()) {
        return res.status(400).json({ success: false, error: "Builder name cannot be empty" });
      }
    }
    
    const updateData = {};
    
    // Only update fields that are provided
    if (description !== undefined) updateData.description = description.trim();
    if (logo !== undefined) updateData.logo = logo;
    if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (establishedYear !== undefined) updateData.establishedYear = establishedYear ? parseInt(establishedYear) : undefined;
    if (headquarters !== undefined) updateData.headquarters = headquarters.trim();
    if (website !== undefined) updateData.website = website.trim();
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    
    // If name is being updated, generate new slug and check for duplicates
    if (name) {
      const trimmedName = name.trim();
      const existingBuilder = await Builder.findOne({ 
        name: trimmedName, 
        _id: { $ne: req.params.id } 
      });
      if (existingBuilder) {
        return res.status(400).json({ error: "Builder with this name already exists" });
      }
      updateData.name = trimmedName;
      
      // Generate new slug with collision handling
      let baseSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let newSlug = baseSlug;
      let counter = 1;
      
      // Check for slug collisions and append number if needed
      while (await Builder.findOne({ slug: newSlug, _id: { $ne: req.params.id } })) {
        newSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      updateData.slug = newSlug;
    }
    
    const builder = await Builder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!builder) {
      return res.status(404).json({ error: "Builder not found" });
    }
    
    // Set activity log data
    req.activityData = {
      action: 'update_builder',
      resource: 'Builder',
      resourceId: builder._id,
      details: `Updated builder: ${builder.name}`,
      severity: 'medium'
    };

    // Sanitize response
    const sanitized = sanitizeBuilderResponse(builder, req.user?.role);
    sanitized.logo = builder.logo ? convertToCloudFrontUrl(builder.logo) : "";
    sanitized.backgroundImage = builder.backgroundImage ? convertToCloudFrontUrl(builder.backgroundImage) : "";

    res.json({ success: true, data: sanitized, message: 'Builder updated successfully' });
  } catch (err) {
    await handleRouteError(err, req, res, 'update_builder', 'Builder', 400);
  }
});

// Get property count for a builder
router.get("/:id/property-count", async (req, res) => {
  try {
    const propertyCount = await Managedproperty.countDocuments({ builder: req.params.id });
    res.json({ success: true, count: propertyCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Delete builder
router.delete("/:id", logActivity, async (req, res) => {
  try {
    const builder = await Builder.findById(req.params.id);
    if (!builder) {
      return res.status(404).json({ success: false, error: "Builder not found" });
    }

    // Check if any properties exist for this builder
    const propertyCount = await Managedproperty.countDocuments({ builder: req.params.id });
    if (propertyCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete builder. ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} exist under this builder.` 
      });
    }

    await Builder.findByIdAndDelete(req.params.id);

    // Set activity log data for deletion
    req.activityData = {
      action: 'delete_builder',
      resource: 'Builder',
      resourceId: builder._id,
      details: `Deleted builder: ${builder.name}`,
      severity: 'medium'
    };

    res.json({ success: true, message: "Builder deleted successfully" });
  } catch (err) {
    await handleRouteError(err, req, res, 'delete_builder', 'Builder', 400);
  }
});

export default router;
