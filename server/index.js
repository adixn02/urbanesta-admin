// backend/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";

// Load environment variables - prefer .env if exists, otherwise use env.development/env.production
import { existsSync } from 'node:fs';
const hasEnvFile = existsSync('./.env');
const envFile = hasEnvFile 
  ? './.env' 
  : (process.env.NODE_ENV === 'production' ? './env.production' : './env.development');
dotenv.config({ path: envFile });

import builderRoutes from "./routes/builderRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import propertyRoutes from "./routes/urpropertyRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import twoFactorAuthRoutes from "./routes/twoFactorAuthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import propertyViewRoutes from "./routes/propertyViewRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";
import homeVideoRoutes from "./routes/homeVideoRoutes.js";
import videoLogRoutes from "./routes/videoLogRoutes.js";
import forgotPasswordRoutes from "./routes/forgotPasswordRoutes.js";
import { securityConfig, validateRequest, validateRequestSize } from "./middleware/security.js";
import logger from "./utils/logger.js";
import { validateRequiredEnv } from "./config/validateEnv.js";
import { sanitizeObject } from "./utils/sanitize.js";

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate environment variables at startup
try {
  validateRequiredEnv();
} catch (error) {
  logger.error("Environment validation failed:", { error: error.message });
  process.exit(1);
}

const MONGODB_URL = process.env.MONGODB_URL;

// Security Middleware - Apply Helmet first
app.use(securityConfig.helmet);

// Trust proxy for accurate IP addresses (important for nginx reverse proxy)
// Set to 1 to trust only the first proxy (nginx) - this prevents trust proxy bypass attacks
app.set('trust proxy', 1);

// CORS Configuration - Use environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : (NODE_ENV === 'production' 
      ? [] // No default origins in production - must be explicitly set
      : ['http://localhost:3000', 'http://localhost:3001']);

// Warn if no CORS origins configured in production
if (NODE_ENV === 'production' && allowedOrigins.length === 0) {
  logger.warn('No CORS origins configured in production. Set ALLOWED_ORIGINS environment variable.');
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin
    const isAllowed = allowedOrigins.some(allowed => {
      // Exact match
      if (origin === allowed) return true;
      
      // Support wildcard subdomain matching (e.g., *.example.com)
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2); // Remove '*.' prefix
        return origin.endsWith('.' + domain) || origin === domain;
      }
      
      // For development, allow localhost with any port
      if (NODE_ENV === 'development' && allowed.includes('localhost')) {
        const allowedHost = allowed.split(':')[0]; // Extract hostname
        const originHost = origin.split(':')[0];
        if (allowedHost === originHost) return true;
      }
      
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Log CORS violation but don't block in development
      if (NODE_ENV === 'development') {
        logger.warn('CORS blocked origin:', { origin, allowedOrigins });
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
}));

// Request timeout middleware - prevent hanging requests
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    logger.warn('Request timeout:', { path: req.path, method: req.method });
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request timeout. Please try again.'
      });
    }
  });
  next();
});

// Compression middleware for response compression
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9, 6 is a good balance)
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Request body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request validation middleware
app.use(validateRequest);

// Request size validation middleware (additional check)
app.use(validateRequestSize('10mb'));

// Input sanitization middleware (apply globally for all routes)
app.use((req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  // Note: req.query is read-only in Express, so we don't sanitize it globally
  // Query parameters should be sanitized individually in routes where they're used
  // (e.g., using escapeRegex for search queries)
  next();
});

// General rate limiting
app.use(securityConfig.rateLimits.general);

// Cache-control headers for sensitive endpoints - prevent caching of sensitive data
app.use((req, res, next) => {
  // Sensitive endpoints that should never be cached
  const sensitivePaths = ['/api/admin', '/api/leads', '/api/users'];
  const isSensitivePath = sensitivePaths.some(path => req.path.startsWith(path));
  
  if (isSensitivePath) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
  next();
});

// Serve uploaded files from local storage
app.use('/uploads', express.static('uploads'));

// Routes
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
app.use("/api/forgot-password", forgotPasswordRoutes); // Public - must be BEFORE /api/admin
app.use("/api/2factor", twoFactorAuthRoutes); // Public - for login OTP
app.use("/api/auth", authRoutes); // Public - for authentication

// PROTECTED ROUTES (AUTHENTICATION REQUIRED)
// Apply admin panel rate limiting (higher limits for authenticated users)
app.use("/api/admin", securityConfig.rateLimits.adminPanel, adminRoutes); // Protected - has authenticateJWT middleware
app.use("/api/leads", securityConfig.rateLimits.adminPanel, leadRoutes); // Admin panel rate limit for leads
app.use("/api/users", securityConfig.rateLimits.adminPanel, userRoutes); // Admin panel rate limit for user data

app.use("/api/builders", builderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin/logs", activityLogRoutes); // Protected
app.use("/api/analytics", analyticsRoutes);
app.use("/api/property-views", propertyViewRoutes);
app.use("/api/home-video", homeVideoRoutes);
app.use("/api/video-logs", videoLogRoutes);

// Health check endpoint (for monitoring and load balancers)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Urbanesta Admin API",
    version: "1.0.0",
    status: "running",
    environment: NODE_ENV
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Global error handler:", {
    error: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  // Don't expose error details in production
  const errorMessage = NODE_ENV === 'production' 
    ? "Internal server error" 
    : err.message;
  
  res.status(err.status || 500).json({ 
    success: false,
    error: errorMessage,
    type: "SERVER_ERROR",
    ...(NODE_ENV === 'development' && { details: err.message, stack: err.stack })
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found", 
    path: req.originalUrl,
    type: "NOT_FOUND"
  });
});

// MongoDB connection with improved configuration
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // Increased from 10s to 30s for better reliability
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000, // Increased from 10s to 30s
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  // Note: maxTimeMS is set on individual queries, not at connection level
};

let server;

// ✅ Connect to MongoDB and Start Server
mongoose
  .connect(MONGODB_URL, mongooseOptions)
  .then(() => {
    logger.info("MongoDB connected successfully");
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", { error: err.message, code: err.code });
    if (err.code === 'ESERVFAIL') {
      logger.error("DNS resolution error - check MongoDB connection string and network settings");
    }
    process.exit(1);
  });

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Mongoose v8+ close() returns a Promise, no callback
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing MongoDB connection:', { error: err.message });
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  gracefulShutdown('unhandledRejection');
});
