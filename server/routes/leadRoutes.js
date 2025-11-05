import express from "express";
import Lead from "../models/Lead.js";
import XLSX from "xlsx";
import { authenticateJWT } from "../middleware/jwtAuth.js";
import { requireLeadsAccess } from "../middleware/roleAuth.js";
import { logActivity } from "../middleware/activityLogger.js";

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
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
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
    
    // Get all leads matching the filter (no pagination for export)
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('propertyInterest', 'title location')
      .select('-__v')
      .sort({ createdAt: -1 });
    
    // Prepare data for Excel - include all fields as they are stored
    const excelData = leads.map(lead => ({
      'Name': lead.name || '',
      'Email': lead.email || '',
      'Phone': lead.phone || '',
      'City': lead.city || '',
      'Property Interested': lead.propertyName || '',
      'Property ID': lead.propertyId || '',
      'Property URL': lead.propertyUrl || '',
      'Form Type': lead.formType ? lead.formType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '',
      'Status': lead.status ? lead.status.replace(/\b\w/g, l => l.toUpperCase()) : '',
      'Priority': lead.priority ? lead.priority.replace(/\b\w/g, l => l.toUpperCase()) : '',
      'Source': lead.source ? lead.source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '',
      'Message': lead.message || '',
      'Assigned To': lead.assignedTo ? (lead.assignedTo.name || lead.assignedTo.email) : '',
      'Tags': lead.tags && lead.tags.length > 0 ? lead.tags.join(', ') : '',
      'Follow Up Date': lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : '',
      'IP Address': lead.metadata?.ipAddress || '',
      'User Agent': lead.metadata?.userAgent || '',
      'Is Active': lead.isActive ? 'Yes' : 'No',
      'Created At': lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '',
      'Updated At': lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : ''
    }));
    
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
    console.error('Error exporting leads:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to export leads',
      details: error.message
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
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
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
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('propertyInterest', 'title location')
      .select('-__v')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log('Found leads:', leads.length);
    
    // Get total count for pagination
    const total = await Lead.countDocuments(filter);
    console.log('Total count:', total);
    
    res.json({
      success: true,
      data: leads,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads',
      details: error.message
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
    console.error('Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead statistics',
      details: error.message
    });
  }
});

// GET /api/leads/:id - Get single lead
router.get("/:id", logActivity, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('propertyInterest', 'title location')
      .select('-__v');
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead',
      details: error.message
    });
  }
});

// POST /api/leads - Create new lead
router.post("/", logActivity, async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    
    res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create lead',
      details: error.message
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
        .populate('assignedTo', 'name email')
        .populate('propertyInterest', 'title location')
        .select('-__v');
      
      res.json({
        success: true,
        data: updatedLead
      });
    } else {
      // Regular update without notes
      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('assignedTo', 'name email')
       .populate('propertyInterest', 'title location')
       .select('-__v');
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }
      
      res.json({
        success: true,
        data: lead
      });
    }
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update lead',
      details: error.message
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
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead',
      details: error.message
    });
  }
});

export default router;
