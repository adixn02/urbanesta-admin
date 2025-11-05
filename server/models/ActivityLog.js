import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Allow null for unauthorized access attempts
      default: null
    },
    userPhone: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true,
      enum: ['admin', 'subadmin', 'user', 'unknown'] // Add 'unknown' for unauthorized attempts
    },
    action: {
      type: String,
      required: true,
      enum: [
        'login', 'logout', 'create_user', 'update_user', 'delete_user',
        'create_city', 'update_city', 'delete_city',
        'create_builder', 'update_builder', 'delete_builder',
        'create_property', 'update_property', 'delete_property',
        'create_category', 'update_category', 'delete_category',
        'create_lead', 'update_lead', 'delete_lead',
        'export_data', 'view_logs', 'access_settings', 'view_data',
        'unauthorized_access', 'failed_login', 'suspicious_activity',
        'otp_sent', 'otp_verification_failed', 'otp_verification_success'
      ]
    },
    resource: {
      type: String,
      required: true
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    details: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      default: ''
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'blocked'],
      default: 'success'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ ipAddress: 1, createdAt: -1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function(activityData) {
  try {
    const log = new this(activityData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

// Static method to get activity summary
activityLogSchema.statics.getActivitySummary = async function(filters = {}) {
  try {
    const pipeline = [
      { $match: filters },
      {
        $group: {
          _id: {
            action: '$action',
            status: '$status'
          },
          count: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $sort: { lastActivity: -1 }
      }
    ];

    return await this.aggregate(pipeline);
  } catch (error) {
    console.error('Error getting activity summary:', error);
    throw error;
  }
};

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
