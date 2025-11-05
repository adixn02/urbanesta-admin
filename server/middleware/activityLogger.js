import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';

// Middleware to log activities
export const logActivity = async (req, res, next) => {
  try {
    // Store original res.json to intercept responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log activity after response is sent
      setImmediate(async () => {
        try {
          if (req.activityData && req.user) {
            // Use JWT user data directly instead of querying database
            await ActivityLog.logActivity({
              userId: req.user.id,
              userPhone: req.user.phoneNumber,
              userName: req.user.name,
              userRole: req.user.role,
              action: req.activityData.action,
              resource: req.activityData.resource,
              resourceId: req.activityData.resourceId,
              details: req.activityData.details,
              ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
              severity: req.activityData.severity || 'low',
              status: data.success ? 'success' : 'failed',
              metadata: req.activityData.metadata || {}
            });
          }
        } catch (error) {
          console.error('Error logging activity:', error);
        }
      });
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Activity logger middleware error:', error);
    next();
  }
};

// Helper function to log specific activities
export const logUserActivity = async (userId, action, resource, details, req) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    await ActivityLog.logActivity({
      userId: user._id,
      userPhone: user.phoneNumber,
      userName: user.name,
      userRole: user.role,
      action,
      resource,
      details,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      severity: 'medium',
      status: 'success',
      metadata: {}
    });
  } catch (error) {
    console.error('Error logging user activity:', error);
  }
};

// Helper function to log security events
export const logSecurityEvent = async (userId, action, details, severity = 'high', req) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    await ActivityLog.logActivity({
      userId: user._id,
      userPhone: user.phoneNumber,
      userName: user.name,
      userRole: user.role,
      action,
      resource: 'Security',
      details,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      severity,
      status: 'failed',
      metadata: {}
    });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

// Helper function to log unauthorized access attempts
export const logUnauthorizedAccess = async (phoneNumber, action, details, req) => {
  try {
    await ActivityLog.logActivity({
      userId: null,
      userPhone: phoneNumber,
      userName: 'Unknown',
      userRole: 'unknown',
      action: 'unauthorized_access',
      resource: 'Security',
      details: `Unauthorized access attempt: ${action} - ${details}`,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      severity: 'critical',
      status: 'blocked',
      metadata: { attemptedAction: action }
    });
  } catch (error) {
    console.error('Error logging unauthorized access:', error);
  }
};
