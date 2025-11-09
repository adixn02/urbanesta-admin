import express from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import twoFactorService from '../services/twoFactorService.js';
import { generateToken, generateRefreshToken } from '../middleware/jwtAuth.js';
import authenticateJWT from '../middleware/jwtAuth.js';
import Admin from '../models/Admin.js';
import cookie from 'cookie';
import { logActivity } from '../middleware/activityLogger.js';
import ActivityLog from '../models/ActivityLog.js';

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

// Store OTP sessions in memory (in production, use Redis or database)
const otpSessions = new Map();

// Store IP-based login attempts for blocking
const ipAttempts = new Map();

// Allowed phone numbers for admin access
const ALLOWED_PHONES = [
  '8198982098', // Main admin
  '+918198982098'
];

// OTP expiration time (120 seconds)
const OTP_EXPIRY_TIME = 120 * 1000; // 2 minutes in milliseconds

// IP blocking configuration
const MAX_ATTEMPTS_PER_IP = 10;
const IP_BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Send OTP endpoint
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }

    // Check IP blocking
    const ipData = ipAttempts.get(clientIP);
    if (ipData && ipData.blockedUntil && new Date() < ipData.blockedUntil) {
      const remainingTime = Math.ceil((ipData.blockedUntil - new Date()) / (1000 * 60)); // minutes
      return res.status(429).json({
        success: false,
        error: `IP blocked due to too many attempts. Try again in ${remainingTime} minutes.`,
        blockedUntil: ipData.blockedUntil
      });
    }

    // Check if IP has exceeded max attempts
    if (ipData && ipData.attempts >= MAX_ATTEMPTS_PER_IP) {
      ipData.blockedUntil = new Date(Date.now() + IP_BLOCK_DURATION);
      ipAttempts.set(clientIP, ipData);
      return res.status(429).json({
        success: false,
        error: `Too many attempts from this IP. Blocked for 24 hours.`,
        blockedUntil: ipData.blockedUntil
      });
    }

    // Enhanced phone number validation
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required and must be at least 10 digits' 
      });
    }
    
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number format. Please enter a valid Indian mobile number (10 digits starting with 6-9)' 
      });
    }
    
    // Additional validation for Indian numbers
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 13) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number must be between 10-13 digits' 
      });
    }

    // Check if user exists in admin database
    const dbFormattedPhone = twoFactorService.formatPhoneNumber(phoneNumber);
    const existingUser = await Admin.findOne({ phoneNumber: dbFormattedPhone });
    
    if (!existingUser) {
      // Increment IP attempt counter for unauthorized access
      if (!ipData) {
        ipAttempts.set(clientIP, { attempts: 1, firstAttempt: new Date() });
      } else {
        ipData.attempts += 1;
        ipAttempts.set(clientIP, ipData);
      }
      
      logger.warn(`Unauthorized OTP request from unknown phone: ${phoneNumber} (IP: ${clientIP})`);
      
      // Log unauthorized access attempt
      try {
        await ActivityLog.logActivity({
          userId: null,
          userPhone: phoneNumber,
          userName: 'Unknown',
          userRole: 'unknown',
          action: 'unauthorized_access',
          resource: 'Authentication',
          resourceId: null,
          details: `Unauthorized OTP request from unknown phone: ${phoneNumber}`,
          ipAddress: clientIP,
          userAgent: req.get('User-Agent') || 'unknown',
          severity: 'high',
          status: 'blocked',
          metadata: { phoneNumber, attemptType: 'otp_request', ipAttempts: ipData?.attempts || 1 }
        });
      } catch (logError) {
        logger.error('Failed to log unauthorized access attempt:', logError);
      }
      
      return res.status(403).json({
        success: false,
        error: 'Access denied. Your phone number is not registered in our system. Do not try to access otherwise we will block you.',
        code: 'UNAUTHORIZED_PHONE'
      });
    }

    // Check if user is active
    if (!existingUser.isActive) {
      logger.warn(`Inactive user OTP request: ${phoneNumber} (IP: ${clientIP})`);
      
      // Log inactive user attempt
      try {
        await ActivityLog.logActivity({
          userId: existingUser._id,
          userPhone: existingUser.phoneNumber,
          userName: existingUser.name || 'Unknown',
          userRole: existingUser.role || 'unknown',
          action: 'unauthorized_access',
          resource: 'Authentication',
          resourceId: existingUser._id,
          details: `Inactive user attempted OTP request: ${phoneNumber}`,
          ipAddress: clientIP,
          userAgent: req.get('User-Agent') || 'unknown',
          severity: 'medium',
          status: 'blocked',
          metadata: { phoneNumber, reason: 'account_deactivated' }
        });
      } catch (logError) {
        logger.error('Failed to log inactive user attempt:', logError);
      }
      
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Send OTP using 2Factor service
    const result = await twoFactorService.sendOTP(phoneNumber);

    if (result.success) {
      // Store session info with database-formatted phone number
      const sessionId = result.sessionId;
      const dbFormattedPhone = result.dbFormattedPhone || twoFactorService.formatPhoneNumber(phoneNumber);
      
      otpSessions.set(sessionId, {
        phoneNumber: dbFormattedPhone,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + OTP_EXPIRY_TIME), // OTP expires in 120 seconds
        attempts: 0,
        verified: false,
        otpType: result.type || 'sms', // Store the type of OTP sent
        isFallback: result.fallback || false // Track if this was a fallback
      });

      // Clean up old sessions (older than 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      for (const [id, session] of otpSessions.entries()) {
        if (session.createdAt < tenMinutesAgo) {
          otpSessions.delete(id);
        }
      }

      logger.info(`OTP sent successfully to ${dbFormattedPhone} (Type: ${result.type})`);

      // Log successful OTP send
      try {
        await ActivityLog.logActivity({
          userId: existingUser._id,
          userPhone: existingUser.phoneNumber,
          userName: existingUser.name || 'Unknown',
          userRole: existingUser.role || 'user',
          action: 'otp_sent',
          resource: 'Authentication',
          resourceId: existingUser._id,
          details: `OTP sent to ${dbFormattedPhone} (Type: ${result.type}${result.fallback ? ', Fallback' : ''})`,
          ipAddress: clientIP,
          userAgent: req.get('User-Agent') || 'unknown',
          severity: 'medium',
          status: 'success',
          metadata: { otpType: result.type, sessionId, isFallback: result.fallback || false }
        });
      } catch (logError) {
        logger.error('Failed to log OTP send:', logError);
      }

      res.json({ 
        success: true, 
        message: result.message || 'OTP sent successfully',
        sessionId: sessionId, // Send sessionId to frontend for verification
        otpType: result.type || 'sms', // Inform frontend about OTP type
        isFallback: result.fallback || false, // Inform if this was a fallback
        expiresIn: OTP_EXPIRY_TIME / 1000, // OTP expires in seconds
        expiresAt: new Date(Date.now() + OTP_EXPIRY_TIME).toISOString() // Exact expiration time
      });
    } else {
      logger.error('Failed to send OTP:', result.error);
      
      // Log failed OTP send attempt
      try {
        await ActivityLog.logActivity({
          userId: existingUser._id,
          userPhone: existingUser.phoneNumber,
          userName: existingUser.name || 'Unknown',
          userRole: existingUser.role || 'user',
          action: 'otp_verification_failed',
          resource: 'Authentication',
          resourceId: existingUser._id,
          details: `Failed to send OTP to ${dbFormattedPhone}: ${result.error || 'Unknown error'}`,
          ipAddress: clientIP,
          userAgent: req.get('User-Agent') || 'unknown',
          severity: 'high',
          status: 'failed',
          metadata: { phoneNumber: dbFormattedPhone, error: result.error }
        });
      } catch (logError) {
        logger.error('Failed to log OTP send failure:', logError);
      }
      
      res.status(500).json({ 
        success: false, 
        error: result.error || 'Failed to send OTP' 
      });
    }

  } catch (error) {
    logger.error('Send OTP error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
      logger.warn('OTP verification failed: Missing sessionId or OTP', { 
        hasSessionId: !!sessionId, 
        hasOtp: !!otp 
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Session ID and OTP are required' 
      });
    }

    // Enhanced OTP validation
    const otpRegex = /^\d{4,8}$/;
    if (!otpRegex.test(otp)) {
      logger.warn('OTP verification failed: Invalid OTP format', { 
        otpLength: otp?.length,
        sessionId 
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP format. OTP must be 4-8 digits' 
      });
    }

    // Check if session exists
    const session = otpSessions.get(sessionId);
    if (!session) {
      logger.warn('OTP verification failed: Invalid or expired session', { 
        sessionId,
        availableSessions: otpSessions.size 
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired session' 
      });
    }

    // Check if OTP has expired (120 seconds)
    if (session.expiresAt && new Date() > session.expiresAt) {
      logger.warn('OTP verification failed: OTP expired', { 
        sessionId,
        expiresAt: session.expiresAt,
        now: new Date()
      });
      otpSessions.delete(sessionId);
      return res.status(400).json({ 
        success: false, 
        error: 'OTP expired. Please request a new OTP.',
        code: 'OTP_EXPIRED'
      });
    }

    // Check attempt limit (max 3 attempts)
    if (session.attempts >= 3) {
      logger.warn('OTP verification failed: Too many attempts', { 
        sessionId,
        attempts: session.attempts 
      });
      otpSessions.delete(sessionId);
      return res.status(400).json({ 
        success: false, 
        error: 'Too many attempts. Please request a new OTP.' 
      });
    }

    // Increment attempts
    session.attempts++;

    // Verify OTP using 2Factor service
    logger.info(`Verifying OTP for session: ${sessionId}, phone: ${session.phoneNumber}, attempt: ${session.attempts}`);
    const result = await twoFactorService.verifyOTP(sessionId, otp);

    if (result.success) {
      // Mark session as verified
      session.verified = true;
      
      try {
        // Check database connection before proceeding
        if (mongoose.connection.readyState !== 1) {
          logger.error('Database not connected during OTP verification');
          return res.status(503).json({ 
            success: false, 
            error: 'Database temporarily unavailable. Please try again later.' 
          });
        }

        // Validate phone number format before database operations
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(session.phoneNumber)) {
          logger.error(`Invalid phone number format for database: ${session.phoneNumber}`);
          return res.status(500).json({ 
            success: false, 
            error: 'Invalid phone number format. Please try again.' 
          });
        }

        // Find existing admin user in database - only allow existing admin users
        logger.info(`Looking for admin user with phone: ${session.phoneNumber}`);
        
        // Try multiple phone number formats to find the user
        let user = await Admin.findOne({ phoneNumber: session.phoneNumber });
        
        // If not found, try without + prefix
        if (!user && session.phoneNumber.startsWith('+')) {
          const phoneWithoutPlus = session.phoneNumber.substring(1);
          logger.info(`Trying phone number without + prefix: ${phoneWithoutPlus}`);
          user = await Admin.findOne({ phoneNumber: phoneWithoutPlus });
        }
        
        // If still not found, try with different formats
        if (!user) {
          const phoneDigits = session.phoneNumber.replace(/\D/g, '');
          // Try with +91 prefix
          if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
            const phoneWithPlus = `+${phoneDigits}`;
            logger.info(`Trying phone number with +91 prefix: ${phoneWithPlus}`);
            user = await Admin.findOne({ phoneNumber: phoneWithPlus });
          }
          // Try with just 10 digits (last 10 digits)
          if (!user && phoneDigits.length >= 10) {
            const last10Digits = phoneDigits.slice(-10);
            const phoneWithCountryCode = `+91${last10Digits}`;
            logger.info(`Trying phone number with last 10 digits: ${phoneWithCountryCode}`);
            user = await Admin.findOne({ phoneNumber: phoneWithCountryCode });
          }
        }
        
        logger.info(`Admin user found: ${user ? 'Yes' : 'No'}`, { 
          searchedPhone: session.phoneNumber,
          userId: user?._id,
          userName: user?.name 
        });
        
        if (!user) {
          // User not found in database - unauthorized access
          logger.error(`Unauthorized login attempt from unknown phone: ${session.phoneNumber}`, {
            sessionId,
            phoneNumber: session.phoneNumber,
            totalAdmins: await Admin.countDocuments()
          });
          otpSessions.delete(sessionId);
          return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized access. Your phone number is not registered in our system. Please contact administrator or run the seedadmin script to create admin users.',
            code: 'UNAUTHORIZED_USER'
          });
        }

        // Check if user is active
        if (!user.isActive) {
          logger.warn(`Inactive user login attempt: ${session.phoneNumber}`);
          otpSessions.delete(sessionId);
          return res.status(401).json({ 
            success: false, 
            error: 'Your account has been deactivated. Please contact administrator.',
            code: 'ACCOUNT_DEACTIVATED'
          });
        }

        // Update last login and activity for existing user
        logger.info(`Updating last login for existing user: ${session.phoneNumber}`);
        user.lastLogin = new Date();
        user.lastActivity = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        
        try {
        await user.save();
        logger.info(`User login updated successfully: ${session.phoneNumber}`);
        } catch (saveError) {
          logger.error('Error saving user login data:', {
            error: saveError.message,
            userId: user._id,
            phoneNumber: user.phoneNumber,
            errorType: saveError.name,
            validationErrors: saveError.errors
          });
        
          // If it's a validation error, return 400
          if (saveError.name === 'ValidationError') {
            const validationErrors = Object.values(saveError.errors).map(err => err.message).join(', ');
            return res.status(400).json({ 
              success: false, 
              error: `Validation failed: ${validationErrors}` 
            });
          }
          
          // For other errors, log but continue (don't block login)
          logger.warn('Continuing login despite save error');
        }
        
        // Also log successful OTP verification separately
        try {
          await ActivityLog.logActivity({
            userId: user._id,
            userPhone: user.phoneNumber,
            userName: user.name || 'Unknown',
            userRole: user.role || 'user',
            action: 'otp_verification_success',
            resource: 'Authentication',
            resourceId: user._id,
            details: `OTP verified successfully (Type: ${session.otpType || 'SMS'})`,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            severity: 'low',
            status: 'success',
            metadata: { sessionId, otpType: session.otpType || 'sms', attempts: session.attempts }
          });
        } catch (logError) {
          logger.error('Failed to log OTP verification success:', logError);
        }
        
        // Generate JWT tokens
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);
        
        // Extended session for admin users (4 hours) vs regular users (30 minutes)
        const isAdmin = user.role === 'admin' || user.isAdmin;
        const tokenMaxAge = isAdmin 
          ? 4 * 60 * 60 * 1000  // 4 hours for admins
          : 30 * 60 * 1000;     // 30 minutes for regular users
        
        // Set secure HTTP-only cookies
        const cookieOptions = {
          maxAge: tokenMaxAge,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production' && req.secure,
          sameSite: 'lax',
          path: '/'
        };
        
        const refreshCookieOptions = {
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production' && req.secure,
          sameSite: 'lax',
          path: '/'
        };

        res.cookie('urbanesta_token', accessToken, cookieOptions);
        res.cookie('urbanesta_refresh_token', refreshToken, refreshCookieOptions);

        logger.info(`OTP verified successfully for ${session.phoneNumber}`);

        // Log successful login activity
        try {
          await ActivityLog.logActivity({
            userId: user._id,
            userPhone: user.phoneNumber,
            userName: user.name || 'Unknown',
            userRole: user.role || 'user',
            action: 'login',
            resource: 'Authentication',
            resourceId: user._id,
            details: `User logged in successfully via ${session.otpType || 'SMS'} OTP`,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            severity: 'low',
            status: 'success',
            metadata: { sessionId, otpType: session.otpType || 'sms', attempts: session.attempts }
          });
        } catch (logError) {
          logger.error('Failed to log login activity:', logError);
          // Don't fail the login if logging fails
        }

        res.json({ 
          success: true, 
          message: 'OTP verified successfully. User logged in.',
          token: accessToken, // Include the JWT token in the response
          user: {
            id: user._id,
            phoneNumber: user.phoneNumber,
            name: user.name,
            city: user.city,
            email: user.email,
            role: user.role,
            isAdmin: user.isAdmin,
            joinDate: user.joinDate
          }
        });
        
      } catch (dbError) {
        logger.error('Database error during OTP verification:', {
          error: dbError.message,
          stack: dbError.stack,
          phoneNumber: session?.phoneNumber,
          errorType: dbError.name,
          errorCode: dbError.code,
          mongooseState: mongoose.connection.readyState
        });
        
        // Handle specific database errors
        if (dbError.name === 'ValidationError') {
          const validationErrors = Object.values(dbError.errors).map(err => err.message).join(', ');
          logger.error(`User validation failed: ${validationErrors}`);
          return res.status(400).json({ 
            success: false, 
            error: `Validation failed: ${validationErrors}`,
            code: 'VALIDATION_ERROR'
          });
        }
        
        if (dbError.code === 11000) {
          logger.error(`Duplicate phone number: ${session?.phoneNumber}`);
          return res.status(409).json({ 
            success: false, 
            error: 'Phone number already exists. Please try logging in instead.',
            code: 'DUPLICATE_PHONE'
          });
        }
        
        if (dbError.name === 'MongoNetworkError' || dbError.name === 'MongoTimeoutError') {
          logger.error('Database connection error:', dbError.message);
          return res.status(503).json({ 
            success: false, 
            error: 'Database temporarily unavailable. Please try again later.',
            code: 'DATABASE_UNAVAILABLE'
          });
        }
        
        // Check if database is disconnected
        if (mongoose.connection.readyState !== 1) {
          logger.error('Database disconnected during OTP verification');
          return res.status(503).json({ 
            success: false, 
            error: 'Database connection lost. Please try again later.',
            code: 'DATABASE_DISCONNECTED'
          });
        }
        
        res.status(500).json({ 
          success: false, 
          error: `Database error: ${dbError.message}`,
          code: 'DATABASE_ERROR'
        });
      }
    } else {
      logger.error('OTP verification failed:', result.error);
      
      // Log failed OTP verification
      try {
        const session = otpSessions.get(sessionId);
        if (session) {
          const user = await Admin.findOne({ phoneNumber: session.phoneNumber });
          if (user) {
            await ActivityLog.logActivity({
              userId: user._id,
              userPhone: user.phoneNumber,
              userName: user.name || 'Unknown',
              userRole: user.role || 'user',
              action: 'otp_verification_failed',
              resource: 'Authentication',
              resourceId: user._id,
              details: `OTP verification failed: ${result.error || 'Invalid OTP'}`,
              ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
              severity: 'high',
              status: 'failed',
              metadata: { sessionId, otpLength: otp?.length, error: result.error }
            });
          }
        }
      } catch (logError) {
        logger.error('Failed to log OTP verification failure:', logError);
      }
      
      res.status(400).json({ 
        success: false, 
        error: result.error || 'Invalid OTP' 
      });
    }

  } catch (error) {
    logger.error('Verify OTP error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Verify session middleware for 2Factor
export const verify2FactorSession = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.urbanesta_2factor_session;
    
    if (!sessionToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'No session found' 
      });
    }

    // Decode session token
    const decoded = Buffer.from(sessionToken, 'base64').toString('ascii');
    const [sessionId, timestamp] = decoded.split(':');
    
    // Check if session exists and is verified
    const session = otpSessions.get(sessionId);
    if (!session || !session.verified) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired session' 
      });
    }

    // Check if session is not too old (24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (new Date(parseInt(timestamp)) < twentyFourHoursAgo) {
      otpSessions.delete(sessionId);
      return res.status(401).json({ 
        success: false, 
        error: 'Session expired' 
      });
    }

    req.user = {
      phoneNumber: session.phoneNumber,
      sessionId: sessionId
    };
    
    next();

  } catch (error) {
    logger.error('2Factor session verification error', { error: error.message });
    res.status(401).json({ 
      success: false, 
      error: 'Invalid session' 
    });
  }
};

// Get current user info (2Factor)
router.get('/me', verify2FactorSession, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        phoneNumber: req.user.phoneNumber,
        sessionId: req.user.sessionId
      }
    });
  } catch (error) {
    logger.error('Get user info error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user info' 
    });
  }
});

// Logout endpoint (2Factor) - requires authentication to log activity
router.post('/logout', authenticateJWT, logActivity, async (req, res) => {
  try {
    // Clear 2Factor session if exists
    const sessionToken = req.cookies.urbanesta_2factor_session;
    
    if (sessionToken) {
      // Decode and remove session
      const decoded = Buffer.from(sessionToken, 'base64').toString('ascii');
      const [sessionId] = decoded.split(':');
      otpSessions.delete(sessionId);
    }

    // Set activity data for logging before clearing cookies
    req.activityData = {
      action: 'logout',
      resource: 'Authentication',
      resourceId: req.user.id,
      details: `User logged out successfully`,
      severity: 'low'
    };

    // Clear authentication cookies
    res.clearCookie('urbanesta_2factor_session', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.clearCookie('urbanesta_token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.clearCookie('urbanesta_refresh_token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    logger.info(`User logged out: ${req.user.phoneNumber}`);
    res.json({ success: true, message: 'Logged out successfully' });

  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

// Get 2Factor account balance (admin endpoint)
router.get('/balance', async (req, res) => {
  try {
    const result = await twoFactorService.getBalance();
    
    if (result.success) {
      res.json({
        success: true,
        balance: result.balance
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get balance error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get balance' 
    });
  }
});

export default router;
