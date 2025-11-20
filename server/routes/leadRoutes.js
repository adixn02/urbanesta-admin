import express from "express";
import Lead from "../models/Lead.js";
// Ensure models are registered before using populate
import User from "../models/User.js";
import Managedproperty from "../models/property.js";
import XLSX from "xlsx";
import mongoose from "mongoose";
import { authenticateJWT } from "../middleware/jwtAuth.js";
import { requireLeadsAccess } from "../middleware/roleAuth.js";
import { escapeRegex } from "../utils/sanitize.js";
import { logActivity } from "../middleware/activityLogger.js";
import { sanitizeLeadResponse, sanitizeArray } from "../utils/responseSanitizer.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Apply authentication and role-based access to all lead routes
router.use(authenticateJWT);
router.use(requireLeadsAccess);

// GET /api/leads/export - Export leads to Excel
router.get("/export", logActivity, async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      formType, 
      assignedTo, 
      search,
      startDate,
      endDate
    } = req.query;
    
    // Build filter object - no isActive filter since leads don't have this field
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (formType) filter.formType = formType;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) {
      // SECURITY: Escape regex special characters to prevent ReDoS and injection attacks
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { phone: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    
    // Add date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        try {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            filter.createdAt.$gte = start;
          }
        } catch (e) {
          logger.warn('Invalid startDate in export request:', startDate);
        }
      }
      if (endDate) {
        try {
          // Ensure endDate includes the full day (23:59:59.999)
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            // Set to end of day
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
          }
        } catch (e) {
          logger.warn('Invalid endDate in export request:', endDate);
        }
      }
    }
    
    // Get all leads matching the filter (no pagination for export)
    // For export, we need full data but still exclude metadata
    // Fetch leads first, then batch populate only valid ObjectIds to avoid CastError
    let leads = await Lead.find(filter)
      .select('-__v -metadata') // Exclude metadata but keep email/phone for export
      .sort({ createdAt: -1 })
      .lean();
    
    // Collect all unique valid ObjectIds for batch population
    const validAssignedToIds = new Set();
    const validPropertyInterestIds = new Set();
    
    leads.forEach(lead => {
      if (lead.assignedTo && mongoose.Types.ObjectId.isValid(lead.assignedTo)) {
        validAssignedToIds.add(lead.assignedTo.toString());
      }
      if (lead.propertyInterest && mongoose.Types.ObjectId.isValid(lead.propertyInterest)) {
        validPropertyInterestIds.add(lead.propertyInterest.toString());
      }
    });
    
    // Batch fetch all users and properties in parallel
    const [usersMap, propertiesMap] = await Promise.all([
      validAssignedToIds.size > 0 
        ? User.find({ _id: { $in: Array.from(validAssignedToIds).map(id => new mongoose.Types.ObjectId(id)) } })
            .select('name')
            .lean()
            .then(users => {
              const map = new Map();
              users.forEach(user => map.set(user._id.toString(), user));
              return map;
            })
            .catch(() => new Map())
        : Promise.resolve(new Map()),
      validPropertyInterestIds.size > 0
        ? Managedproperty.find({ _id: { $in: Array.from(validPropertyInterestIds).map(id => new mongoose.Types.ObjectId(id)) } })
            .select('title projectName location fullAddress type')
            .lean()
            .then(properties => {
              const map = new Map();
              properties.forEach(property => map.set(property._id.toString(), property));
              return map;
            })
            .catch(() => new Map())
        : Promise.resolve(new Map())
    ]);
    
    // Map populated data back to leads
    const leadsWithPopulate = leads.map(lead => {
      const populatedLead = { ...lead };
      
      // Populate assignedTo
      if (lead.assignedTo && mongoose.Types.ObjectId.isValid(lead.assignedTo)) {
        populatedLead.assignedTo = usersMap.get(lead.assignedTo.toString()) || null;
      } else {
        populatedLead.assignedTo = null;
      }
      
      // Populate propertyInterest
      if (lead.propertyInterest && mongoose.Types.ObjectId.isValid(lead.propertyInterest)) {
        populatedLead.propertyInterest = propertiesMap.get(lead.propertyInterest.toString()) || null;
      } else {
        // If not a valid ObjectId, keep as is (might be stored as propertyName)
        populatedLead.propertyInterest = null;
      }
      
      return populatedLead;
    });
    
    // Prepare data for Excel - include all fields as they are stored
    // Note: Export contains full email/phone for business use, but API responses are masked
    const excelData = leadsWithPopulate.map(lead => {
      // Safely handle dates
      const formatDate = (date) => {
        if (!date) return '';
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';
          return d.toLocaleDateString();
        } catch (e) {
          return '';
        }
      };
      
      const formatDateTime = (date) => {
        if (!date) return '';
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';
          return d.toLocaleString();
        } catch (e) {
          return '';
        }
      };
      
      return {
        'Name': lead.name || '',
        'Email': lead.email || '',
        'Phone': lead.phone || '',
        'City': lead.city || '',
        'Property Interested': lead.propertyName || lead.propertyInterest?.title || lead.propertyInterest?.projectName || '',
        'Property ID': lead.propertyId || '',
        'Property URL': lead.propertyUrl || '',
        'Form Type': lead.formType ? lead.formType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '',
        'Status': lead.status ? lead.status.replace(/\b\w/g, l => l.toUpperCase()) : '',
        'Priority': lead.priority ? lead.priority.replace(/\b\w/g, l => l.toUpperCase()) : '',
        'Source': lead.source ? lead.source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '',
        'Message': lead.message || '',
        'Assigned To': (lead.assignedTo && typeof lead.assignedTo === 'object' && lead.assignedTo.name) ? lead.assignedTo.name : '',
        'Tags': lead.tags && Array.isArray(lead.tags) && lead.tags.length > 0 ? lead.tags.join(', ') : '',
        'Follow Up Date': formatDate(lead.followUpDate),
        // Excluded: IP Address and User Agent for security
        'Is Active': lead.isActive !== undefined && lead.isActive !== null ? (lead.isActive ? 'Yes' : 'No') : 'Yes',
        'Created At': formatDateTime(lead.createdAt),
        'Updated At': formatDateTime(lead.updatedAt)
      };
    });
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 15 }, // City
      { wch: 30 }, // Property Interested
      { wch: 20 }, // Property ID
      { wch: 50 }, // Property URL
      { wch: 20 }, // Form Type
      { wch: 15 }, // Status
      { wch: 15 }, // Priority
      { wch: 20 }, // Source
      { wch: 40 }, // Message
      { wch: 20 }, // Assigned To
      { wch: 20 }, // Tags
      { wch: 15 }, // Follow Up Date
      { wch: 15 }, // IP Address
      { wch: 30 }, // User Agent
      { wch: 10 }, // Is Active
      { wch: 20 }, // Created At
      { wch: 20 }  // Updated At
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leads-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    // Send the Excel file
    res.send(excelBuffer);
    
  } catch (error) {
    logger.error('Error exporting leads:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to export leads',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/leads - Get all leads with optional filtering
router.get("/", logActivity, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      priority, 
      formType, 
      assignedTo, 
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter object - no isActive filter since leads don't have this field
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (formType) filter.formType = formType;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) {
      // SECURITY: Escape regex special characters to prevent ReDoS and injection attacks
      const escapedSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { phone: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    
    // Add date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    
    // Get leads with pagination and populate references
    // Exclude sensitive metadata (IP, user agent) from query
    // Fetch leads first, then batch populate only valid ObjectIds to avoid CastError
    let leads = await Lead.find(filter)
      .select('-__v -metadata')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Collect all unique valid ObjectIds for batch population
    const validAssignedToIds = new Set();
    const validPropertyInterestIds = new Set();
    
    leads.forEach(lead => {
      if (lead.assignedTo && mongoose.Types.ObjectId.isValid(lead.assignedTo)) {
        validAssignedToIds.add(lead.assignedTo.toString());
      }
      if (lead.propertyInterest && mongoose.Types.ObjectId.isValid(lead.propertyInterest)) {
        validPropertyInterestIds.add(lead.propertyInterest.toString());
      }
    });
    
    // Batch fetch all users and properties in parallel
    const [usersMap, propertiesMap] = await Promise.all([
      validAssignedToIds.size > 0 
        ? User.find({ _id: { $in: Array.from(validAssignedToIds).map(id => new mongoose.Types.ObjectId(id)) } })
            .select('name')
            .lean()
            .then(users => {
              const map = new Map();
              users.forEach(user => map.set(user._id.toString(), user));
              return map;
            })
            .catch(() => new Map())
        : Promise.resolve(new Map()),
      validPropertyInterestIds.size > 0
        ? Managedproperty.find({ _id: { $in: Array.from(validPropertyInterestIds).map(id => new mongoose.Types.ObjectId(id)) } })
            .select('title projectName location fullAddress type')
            .lean()
            .then(properties => {
              const map = new Map();
              properties.forEach(property => map.set(property._id.toString(), property));
              return map;
            })
            .catch(() => new Map())
        : Promise.resolve(new Map())
    ]);
    
    // Map populated data back to leads
    leads = leads.map(lead => {
      const populatedLead = { ...lead };
      
      // Populate assignedTo
      if (lead.assignedTo && mongoose.Types.ObjectId.isValid(lead.assignedTo)) {
        populatedLead.assignedTo = usersMap.get(lead.assignedTo.toString()) || null;
      } else {
        populatedLead.assignedTo = null;
      }
      
      // Populate propertyInterest
      if (lead.propertyInterest && mongoose.Types.ObjectId.isValid(lead.propertyInterest)) {
        populatedLead.propertyInterest = propertiesMap.get(lead.propertyInterest.toString()) || null;
      } else {
        populatedLead.propertyInterest = null;
      }
      
      return populatedLead;
    });
    
    // Get total count for pagination
    const total = await Lead.countDocuments(filter);
    
    // Sanitize all lead responses - mask email and phone
    // Filter out any null items from sanitization
    const sanitizedLeads = sanitizeArray(leads, sanitizeLeadResponse, req.user?.role || 'admin').filter(lead => lead !== null);
    
    res.json({
      success: true,
      data: sanitizedLeads,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    logger.error('Error fetching leads:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/leads/stats - Get lead statistics
router.get("/stats", logActivity, async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const totalLeads = await Lead.countDocuments({});
    
    const todayLeads = await Lead.countDocuments({
      createdAt: {
        $gte: startOfToday,
        $lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    const leadsThisMonth = await Lead.countDocuments({
      createdAt: {
        $gte: startOfThisMonth
      }
    });
    
    const leadsLastMonth = await Lead.countDocuments({
      createdAt: {
        $gte: startOfLastMonth,
        $lt: startOfThisMonth
      }
    });
    
    res.json({
      success: true,
      data: {
        totalLeads,
        todayLeads,
        leadsThisMonth,
        leadsLastMonth
      }
    });
  } catch (error) {
    logger.error('Error fetching lead stats:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead statistics',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/leads/:id - Get single lead
router.get("/:id", logActivity, async (req, res) => {
  try {
    let lead = await Lead.findById(req.params.id)
      .select('-__v -metadata') // Exclude metadata (IP, user agent)
      .lean();
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    // Manually populate only valid ObjectIds to avoid CastError
    if (lead.assignedTo && mongoose.Types.ObjectId.isValid(lead.assignedTo)) {
      try {
        const user = await User.findById(lead.assignedTo).select('name').lean();
        lead.assignedTo = user;
      } catch (e) {
        lead.assignedTo = null;
      }
    } else if (lead.assignedTo) {
      lead.assignedTo = null;
    }
    
    if (lead.propertyInterest && mongoose.Types.ObjectId.isValid(lead.propertyInterest)) {
      try {
        const property = await Managedproperty.findById(lead.propertyInterest)
          .select('title projectName location fullAddress type')
          .lean();
        lead.propertyInterest = property;
      } catch (e) {
        lead.propertyInterest = null;
      }
    } else if (lead.propertyInterest) {
      lead.propertyInterest = null;
    }
    
    // Sanitize lead response - mask email and phone
    const sanitized = sanitizeLeadResponse(lead, req.user?.role);
    
    res.json({
      success: true,
      data: sanitized
    });
  } catch (error) {
    logger.error('Error fetching lead:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// POST /api/leads - Create new lead
router.post("/", logActivity, async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    
    // Sanitize response - mask email and phone
    const sanitized = sanitizeLeadResponse(lead, req.user?.role);
    
    res.status(201).json({
      success: true,
      data: sanitized
    });
  } catch (error) {
    logger.error('Error creating lead:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(400).json({
      success: false,
      error: 'Failed to create lead',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// PUT /api/leads/:id - Update lead
router.put("/:id", logActivity, async (req, res) => {
  try {
    const { $push, ...updateData } = req.body;
    
    // Handle notes separately if they exist
    if ($push && $push.notes) {
      const lead = await Lead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }
      
      // Add the new note
      lead.notes.push($push.notes);
      await lead.save();
      
      // Update other fields if they exist
      if (Object.keys(updateData).length > 0) {
        Object.assign(lead, updateData);
        await lead.save();
      }
      
      const updatedLead = await Lead.findById(req.params.id)
        .select('-__v -metadata')
        .populate({
          path: 'assignedTo',
          select: 'name',
          model: 'User'
        })
        .populate({
          path: 'propertyInterest',
          select: 'title projectName location fullAddress type',
          model: 'Managedproperty'
        })
        .lean();
      
      // Sanitize response
      const sanitized = sanitizeLeadResponse(updatedLead, req.user?.role);
      
      res.json({
        success: true,
        data: sanitized
      });
    } else {
      // Regular update without notes
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      )
        .select('-__v -metadata')
        .populate({
          path: 'assignedTo',
          select: 'name',
          model: 'User'
        })
        .populate({
          path: 'propertyInterest',
          select: 'title projectName location fullAddress type',
          model: 'Managedproperty'
        })
        .lean();
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }
      
      // Sanitize response
      const sanitized = sanitizeLeadResponse(lead, req.user?.role);
      
      res.json({
        success: true,
        data: sanitized
      });
    }
  } catch (error) {
    logger.error('Error updating lead:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(400).json({
      success: false,
      error: 'Failed to update lead',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// DELETE /api/leads/:id - Delete lead (soft delete)
router.delete("/:id", logActivity, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting lead:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

export default router;
