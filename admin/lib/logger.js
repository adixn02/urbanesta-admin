/**
 * Client-side logger utility
 * Provides consistent logging interface for frontend
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  info: (message, meta = {}) => {
    if (isDevelopment) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
    }
  },

  warn: (message, meta = {}) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
    }
  },

  error: (message, meta = {}) => {
    // Always log errors, even in production (but don't expose sensitive data)
    const errorData = isDevelopment ? meta : { message: meta.message || meta.error?.message };
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, errorData);
    
    // In production, you might want to send errors to an error tracking service
    // Example: Sentry.captureException(new Error(message), { extra: errorData });
  },

  debug: (message, meta = {}) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
    }
  }
};

export default logger;

