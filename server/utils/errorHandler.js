/**
 * Production-ready error handling utilities
 */

import ActivityLog from '../models/ActivityLog.js';
import logger from './logger.js';

/**
 * Log failed operation to activity log
 * @param {Object} params - Parameters for logging
 * @param {Object} req - Express request object
 * @param {string} action - Action that failed
 * @param {string} resource - Resource type
 * @param {string} error - Error message
 * @param {Object} metadata - Additional metadata
 */
export async function logFailedOperation(req, action, resource, error, metadata = {}) {
  try {
    if (req.user) {
      await ActivityLog.logActivity({
        userId: req.user.id,
        userPhone: req.user.phoneNumber,
        userName: req.user.name,
        userRole: req.user.role,
        action,
        resource,
        resourceId: metadata.resourceId || null,
        details: `Failed ${action}: ${error}`,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        severity: 'medium',
        status: 'failed',
        metadata
      });
    }
  } catch (logError) {
    // Silently fail logging to prevent breaking the main flow
    logger.error('Failed to log failed operation:', logError);
  }
}

/**
 * Get user-friendly error message for production
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default message if error shouldn't be exposed
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(error, defaultMessage = 'An error occurred. Please try again.') {
  if (process.env.NODE_ENV === 'production') {
    // In production, return generic messages
    if (error.name === 'ValidationError') {
      return 'Validation failed. Please check your input.';
    }
    if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
      return 'Database error. Please try again later.';
    }
    if (error.code === 11000) {
      return 'This record already exists.';
    }
    return defaultMessage;
  }
  
  // In development, return detailed error
  return error.message || defaultMessage;
}

/**
 * Handle route errors with logging and proper response
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} action - Action that failed
 * @param {string} resource - Resource type
 * @param {number} statusCode - HTTP status code (default: 500)
 */
export async function handleRouteError(error, req, res, action, resource, statusCode = 500) {
  // Log the error
  logger.error(`${action} error for ${resource}:`, {
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
    path: req.path
  });
  
  // Log to activity log
  await logFailedOperation(req, action, resource, error.message, {
    error: error.message,
    errorType: error.name,
    resourceId: req.params?.id || null
  });
  
  // Send user-friendly error response
  const message = getErrorMessage(error, `Failed to ${action} ${resource}. Please try again.`);
  res.status(statusCode).json({
    success: false,
    error: message
  });
}

