import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import csurf from '@dr.pogodin/csurf';
import logger from '../utils/logger.js';

// Security middleware configuration
export const securityConfig = {
  // Helmet configuration for security headers
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Next.js requires 'unsafe-inline' for styles (or use nonces in future)
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        // Next.js requires 'unsafe-inline' and 'unsafe-eval' for scripts (or use nonces in future)
        // Note: Consider implementing nonces for better security in future
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  // Rate limiting configurations - Using environment variables
  rateLimits: {
    // General API rate limiting
    general: rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000 for admin panel usage
      message: {
        error: "Too many requests from this IP, please try again later.",
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks and export endpoints (they're already protected by auth)
        return req.path === '/healthz' || req.path.includes('/export');
      }
      // Note: trust proxy is set on Express app, not here
    }),

    // Strict rate limiting for sensitive endpoints (increased for admin panel usage)
    strict: rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_STRICT_MAX) || 300, // Increased from 20 to 300 for admin panel
      message: {
        error: "Rate limit exceeded for this endpoint. Please try again later.",
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for export endpoints (they're already protected by auth and are long-running)
        return req.path.includes('/export');
      }
      // Note: trust proxy is set on Express app, not here
    }),

    // Upload rate limiting
    upload: rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 5,
      message: {
        error: "Upload rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false
      // Note: trust proxy is set on Express app, not here
    }),

    // Auth rate limiting
    auth: rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10,
      message: {
        error: "Too many authentication attempts. Please try again later.",
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false
      // Note: trust proxy is set on Express app, not here
    }),

    // Admin panel rate limiting (higher limits for authenticated admin users)
    adminPanel: rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX) || 500, // Higher limit for admin panel usage
      message: {
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for export endpoints and health checks
        return req.path === '/healthz' || req.path.includes('/export');
      }
    })
  }
};

// Request validation middleware
export const validateRequest = (req, res, next) => {
  // Skip body validation for authenticated requests (they're already trusted)
  // Only validate URL and User-Agent for all requests
  const isAuthenticated = req.user || req.headers.authorization;
  
  // Check for suspicious patterns in URL and User-Agent (always check these)
  const urlPatterns = [
    /\.\./,  // Directory traversal in URL
    /<script/i,  // XSS attempts in URL
    /javascript:/i,  // JavaScript injection in URL
  ];

  // More specific patterns for body (only if not authenticated)
  const bodyPatterns = [
    /<script[^>]*>.*?<\/script>/gi,  // Complete script tags
    /javascript:\s*[^"'\s]/i,  // JavaScript: protocol with code
    /on\w+\s*=\s*["'][^"']*["']/i,  // Event handlers with values (onclick="...")
    /union\s+select/i,  // SQL injection
  ];

  const userAgent = req.get('User-Agent') || '';
  const url = req.originalUrl || '';

  // Always check URL and User-Agent
  for (const pattern of urlPatterns) {
    if (pattern.test(userAgent) || pattern.test(url)) {
      logger.warn('Suspicious request detected in URL/User-Agent:', {
        url,
        userAgent,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Suspicious request detected',
        message: 'Request blocked for security reasons'
      });
    }
  }

  // Only check body for unauthenticated requests
  if (!isAuthenticated && req.body) {
    try {
      const bodyString = JSON.stringify(req.body);
      for (const pattern of bodyPatterns) {
        if (pattern.test(bodyString)) {
          logger.warn('Suspicious request detected in body:', {
            url,
            ip: req.ip,
            pattern: pattern.toString()
          });
          return res.status(400).json({
            error: 'Suspicious request detected',
            message: 'Request blocked for security reasons'
          });
        }
      }
    } catch (error) {
      // If body can't be stringified, skip body validation
      // This can happen with binary data or circular references
    }
  }

  next();
};

// API key validation middleware
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    return next(); // Skip if no API key is configured
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }

  next();
};

// Request size validation
export const validateRequestSize = (maxSize = '50mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSizeBytes = parseInt(maxSize.replace('mb', '')) * 1024 * 1024;

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size exceeds ${maxSize} limit`
      });
    }

    next();
  };
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // Skip if no IPs configured
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied from this IP address'
      });
    }

    next();
  };
};

// CSRF Protection middleware
export const csrfProtection = csurf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Input validation middleware using express-validator
export const validateInput = (validations) => {
  return async (req, res, next) => {
    // Run validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    next();
  };
};

// Common validation rules
export const validationRules = {
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  password: body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  phone: body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  name: body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  city: body('city').trim().isLength({ min: 2, max: 50 }).withMessage('Valid city is required'),
  title: body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),
  description: body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
  price: body('price').isNumeric().isFloat({ min: 0 }).withMessage('Valid price is required'),
  minPrice: body('minPrice').isNumeric().isFloat({ min: 0 }).withMessage('Valid minimum price is required'),
  maxPrice: body('maxPrice').isNumeric().isFloat({ min: 0 }).withMessage('Valid maximum price is required')
};

export default {
  securityConfig,
  validateRequest,
  validateApiKey,
  validateRequestSize,
  ipWhitelist,
  csrfProtection,
  validateInput,
  validationRules
};
