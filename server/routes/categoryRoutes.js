// backend/routes/categoryRoutes.js
import express from "express";
import Category from "../models/category.js";
import Managedproperty from "../models/property.js";
import { authenticateJWT } from "../middleware/jwtAuth.js";
import { requireAdminOrSubAdmin } from "../middleware/roleAuth.js";
import { logActivity } from "../middleware/activityLogger.js";
import { sanitizeObject } from "../utils/sanitize.js";
import { handleRouteError } from "../utils/errorHandler.js";

const router = express.Router();

// Apply authentication and role-based access to all category routes
router.use(authenticateJWT);
router.use(requireAdminOrSubAdmin);

// ✅ Create a new category
router.post("/", logActivity, async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedBody = sanitizeObject(req.body);
    const category = new Category(sanitizedBody);
    await category.save();

    req.activityData = {
      action: 'create_category',
      resource: 'Category',
      resourceId: category._id,
      details: `Created category: ${category.name || category._id}`,
      severity: 'low'
    };

    res.status(201).json({ success: true, data: category, message: 'Category created successfully' });
  } catch (err) {
    await handleRouteError(err, req, res, 'create_category', 'Category', 400);
  }
});

// ✅ Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get a single category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update a category
router.put("/:id", logActivity, async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedBody = sanitizeObject(req.body);
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      sanitizedBody,
      { new: true } // returns updated doc
    );
    if (!category) return res.status(404).json({ success: false, error: "Category not found" });

    req.activityData = {
      action: 'update_category',
      resource: 'Category',
      resourceId: category._id,
      details: `Updated category: ${category.name || category._id}`,
      severity: 'medium'
    };

    res.json({ success: true, data: category, message: 'Category updated successfully' });
  } catch (err) {
    await handleRouteError(err, req, res, 'update_category', 'Category', 400);
  }
});

// Get property count for a category
router.get("/:id/property-count", async (req, res) => {
  try {
    const propertyCount = await Managedproperty.countDocuments({ category: req.params.id });
    res.json({ success: true, count: propertyCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Delete a category
router.delete("/:id", logActivity, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: "Category not found" });

    // Check if any properties exist for this category
    const propertyCount = await Managedproperty.countDocuments({ category: req.params.id });
    if (propertyCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete category. ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} exist under this category.` 
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    req.activityData = {
      action: 'delete_category',
      resource: 'Category',
      resourceId: category._id,
      details: `Deleted category: ${category.name || category._id}`,
      severity: 'medium'
    };

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    await handleRouteError(err, req, res, 'delete_category', 'Category', 400);
  }
});

// ✅ Add subcategory to a category
router.post("/:id/subcategories", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    
    category.deepSubcategories.push(req.body);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update subcategory
router.put("/:id/subcategories/:subId", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    
    const subcategory = category.deepSubcategories.id(req.params.subId);
    if (!subcategory) return res.status(404).json({ error: "Subcategory not found" });
    
    Object.assign(subcategory, req.body);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete subcategory
router.delete("/:id/subcategories/:subId", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    
    category.deepSubcategories.pull(req.params.subId);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add configuration to subcategory
router.post("/:id/subcategories/:subId/configurations", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    
    const subcategory = category.deepSubcategories.id(req.params.subId);
    if (!subcategory) return res.status(404).json({ error: "Subcategory not found" });
    
    subcategory.configurations.push(req.body);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update configuration in subcategory
router.put("/:id/subcategories/:subId/configurations/:configId", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    
    const subcategory = category.deepSubcategories.id(req.params.subId);
    if (!subcategory) return res.status(404).json({ error: "Subcategory not found" });
    
    const configuration = subcategory.configurations.id(req.params.configId);
    if (!configuration) return res.status(404).json({ error: "Configuration not found" });
    
    Object.assign(configuration, req.body);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete configuration from subcategory
router.delete("/:id/subcategories/:subId/configurations/:configId", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    
    const subcategory = category.deepSubcategories.id(req.params.subId);
    if (!subcategory) return res.status(404).json({ error: "Subcategory not found" });
    
    subcategory.configurations.pull(req.params.configId);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get configurations for a specific subcategory
router.get("/:id/subcategories/:subId/configurations", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    
    const subcategory = category.deepSubcategories.id(req.params.subId);
    if (!subcategory) return res.status(404).json({ error: "Subcategory not found" });
    
    res.json({
      success: true,
      data: subcategory.configurations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
