/**
 * Input sanitization utilities for production security
 */

/**
 * Sanitize string input - remove HTML tags and dangerous characters
 * @param {string} input - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize object recursively
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate and sanitize phone number
 * @param {string} phone - Phone number to validate
 * @returns {string|null} - Sanitized phone or null if invalid
 */
export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Validate Indian phone number format
  const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
  const digitsOnly = cleaned.replace(/\D/g, '');
  
  if (digitsOnly.length >= 10 && digitsOnly.length <= 13) {
    if (phoneRegex.test(cleaned)) {
      return cleaned;
    }
  }
  
  return null;
}

/**
 * Sanitize email address
 * @param {string} email - Email to sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = sanitizeString(email).toLowerCase();
  
  if (emailRegex.test(sanitized)) {
    return sanitized;
  }
  
  return null;
}

/**
 * Sanitize URL
 * @param {string} url - URL to sanitize
 * @returns {string|null} - Sanitized URL or null if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  try {
    const sanitized = sanitizeString(url);
    const urlObj = new URL(sanitized);
    
    // Only allow http and https protocols
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return sanitized;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Sanitize numeric input
 * @param {any} value - Value to sanitize
 * @returns {number|null} - Number or null if invalid
 */
export function sanitizeNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  
  return num;
}

/**
 * Sanitize MongoDB ObjectId
 * @param {any} id - ID to sanitize
 * @returns {string|null} - Valid ObjectId string or null
 */
export function sanitizeObjectId(id) {
  if (!id) {
    return null;
  }
  
  const idString = String(id);
  
  // MongoDB ObjectId is 24 hex characters
  if (/^[0-9a-fA-F]{24}$/.test(idString)) {
    return idString;
  }
  
  return null;
}

/**
 * Escape special regex characters to prevent ReDoS and injection attacks
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for use in RegExp
 */
export function escapeRegex(str) {
  if (typeof str !== 'string') {
    return str;
  }
  // Escape all special regex characters
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

