import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import logger from '../utils/logger.js';
import { generateToken } from '../middleware/jwtAuth.js';
import Admin from '../models/Admin.js';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Health check for auth service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '2Factor SMS OTP Authentication Service is running',
    service: '2Factor.in SMS OTP',
    timestamp: new Date().toISOString()
  });
});

// Legacy Firebase endpoints - redirect to 2Factor
router.post('/sessionLogin', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Firebase authentication has been deprecated',
    message: 'Please use /api/2factor/send-otp and /api/2factor/verify-otp for SMS OTP authentication',
    newEndpoints: {
      sendOtp: '/api/2factor/send-otp',
      verifyOtp: '/api/2factor/verify-otp'
    }
  });
});

router.post('/sessionLogout', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Firebase authentication has been deprecated',
    message: 'Please use /api/user/logout for JWT-based logout',
    newEndpoint: '/api/user/logout'
  });
});

router.get('/me', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Firebase authentication has been deprecated',
    message: 'Please use /api/user/profile for user information',
    newEndpoint: '/api/user/profile'
  });
});

// POST /api/auth/refresh - Refresh JWT access token using refresh token
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or Authorization header
    let refreshToken = null;
    
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      refreshToken = authHeader.split(' ')[1];
    }
    
    // If no token in header, check cookies
    if (!refreshToken) {
      const cookies = cookie.parse(req.headers.cookie || '');
      refreshToken = cookies.urbanesta_refresh_token || cookies.refresh_token;
    }
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    // Verify refresh token
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    let decoded;
    
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Refresh token expired. Please log in again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }
      throw error;
    }
    
    // Verify token type
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }
    
    // Find user in database
    const user = await Admin.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateToken(user);
    
    // Set secure HTTP-only cookie for new access token
    const isAdmin = user.role === 'admin' || user.isAdmin;
    const tokenMaxAge = isAdmin 
      ? 4 * 60 * 60 * 1000  // 4 hours for admins
      : 30 * 60 * 1000;     // 30 minutes for regular users
    
    const cookieOptions = {
      maxAge: tokenMaxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && req.secure,
      sameSite: 'lax',
      path: '/'
    };
    
    res.cookie('urbanesta_token', newAccessToken, cookieOptions);
    
    logger.info(`Token refreshed for user: ${user.name} (${user.phoneNumber})`);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newAccessToken,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin
      }
    });
    
  } catch (error) {
    logger.error('Error refreshing token:', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

export default router;