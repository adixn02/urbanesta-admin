import express from 'express';
import Admin from '../models/Admin.js';
import logger from '../utils/logger.js';

const router = express.Router();

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map();

// Helper function to check rate limit (3 attempts per hour per phone number)
function checkRateLimit(phoneNumber) {
  const now = Date.now();
  const key = `forgot_${phoneNumber}`;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      attempts: 0,
      firstAttempt: now,
      blockedUntil: null
    });
  }
  
  const data = rateLimitStore.get(key);
  
  // Reset if more than 1 hour has passed
  if (now - data.firstAttempt > 60 * 60 * 1000) {
    data.attempts = 0;
    data.firstAttempt = now;
    data.blockedUntil = null;
  }
  
  // Check if blocked
  if (data.blockedUntil && now < data.blockedUntil) {
    return {
      allowed: false,
      attemptsLeft: 0,
      blockedUntil: data.blockedUntil
    };
  }
  
  // Check if exceeded limit
  if (data.attempts >= 3) {
    data.blockedUntil = data.firstAttempt + (60 * 60 * 1000); // Block for 1 hour from first attempt
    return {
      allowed: false,
      attemptsLeft: 0,
      blockedUntil: data.blockedUntil
    };
  }
  
  return {
    allowed: true,
    attemptsLeft: 3 - data.attempts,
    blockedUntil: null
  };
}

// Helper function to increment attempt
function incrementAttempt(phoneNumber) {
  const key = `forgot_${phoneNumber}`;
  const data = rateLimitStore.get(key);
  if (data) {
    data.attempts += 1;
  }
}

// Step 1: Send OTP for password reset
router.post('/send-otp', async (req, res) => {
  try {
    let { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a phone number'
      });
    }
    
    // Normalize phone number (remove all non-digits)
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    let normalizedPhone;
    
    if (cleanedPhone.length === 10) {
      // 10 digits: assume Indian number without country code
      normalizedPhone = cleanedPhone;
    } else if (cleanedPhone.length === 12 && cleanedPhone.startsWith('91')) {
      // 12 digits starting with 91: remove country code
      normalizedPhone = cleanedPhone.substring(2);
    } else if (cleanedPhone.length >= 10) {
      // Take last 10 digits
      normalizedPhone = cleanedPhone.slice(-10);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid 10-digit phone number'
      });
    }
    
    // Check rate limit (using normalized phone)
    const rateLimit = checkRateLimit(normalizedPhone);
    if (!rateLimit.allowed) {
      const minutesLeft = Math.ceil((rateLimit.blockedUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many password reset attempts. Please try again in ${minutesLeft} minutes.`,
        blockedUntil: rateLimit.blockedUntil,
        attemptsLeft: 0
      });
    }
    
    // Check if user exists (search in multiple formats for compatibility)
    const phoneFormats = [
      normalizedPhone, // 9034779597
      `91${normalizedPhone}`, // 919034779597
      `+91${normalizedPhone}`, // +919034779597
    ];
    
    const user = await Admin.findOne({ 
      phoneNumber: { $in: phoneFormats } 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this phone number. Please check and try again.'
      });
    }
    
    // Increment attempt counter (using normalized phone)
    incrementAttempt(normalizedPhone);
    
    // Format phone for 2Factor API (add +91 prefix if not present)
    let formattedPhone = normalizedPhone;
    if (!formattedPhone.startsWith('+')) {
      if (!formattedPhone.startsWith('91')) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        formattedPhone = `+${formattedPhone}`;
      }
    }
    
    // Send OTP via 2Factor API (they generate and send the OTP)
    let otpResult;
    try {
      // Import twoFactorService
      const twoFactorService = (await import('../services/twoFactorService.js')).default;
      otpResult = await twoFactorService.sendOTP(formattedPhone);
      
      if (!otpResult.success) {
        logger.error('Failed to send OTP for password reset:', otpResult.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to send OTP. Please try again.'
        });
      }
    } catch (error) {
      logger.error('Failed to send OTP for password reset:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP. Please try again.'
      });
    }
    
    // Use 2Factor's sessionId (this is tied to their OTP)
    const sessionId = otpResult.sessionId;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store session data (NO OTP stored - we'll verify with 2Factor API)
    global.otpStore = global.otpStore || new Map();
    global.otpStore.set(sessionId, {
      phoneNumber: normalizedPhone, // Store normalized phone
      expiresAt,
      verified: false,
      userId: user._id,
      userRole: user.role, // Store role for logging
      userName: user.name,
      twoFactorSessionId: sessionId // Store 2Factor's session ID
    });
    
    // Auto-delete after expiry
    setTimeout(() => {
      global.otpStore.delete(sessionId);
    }, 10 * 60 * 1000);
    
    logger.info(`Password reset OTP sent to ${user.role} (${user.name})`, {
      userId: user._id,
      phoneNumber: normalizedPhone,
      role: user.role,
      sessionId
    });
    
    res.json({
      success: true,
      sessionId,
      expiresAt,
      attemptsLeft: rateLimit.attemptsLeft - 1, // -1 because we just incremented
      message: `OTP sent to ${user.role} ${user.name} (${normalizedPhone})`
    });
    
  } catch (error) {
    logger.error('Error in forgot password send OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
});

// Step 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { sessionId, otp } = req.body;
    
    if (!sessionId || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and OTP are required'
      });
    }
    
    // Get session data
    global.otpStore = global.otpStore || new Map();
    const session = global.otpStore.get(sessionId);
    
    if (!session) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SESSION',
        error: 'Invalid or expired session'
      });
    }
    
    // Check expiry
    if (new Date() > new Date(session.expiresAt)) {
      global.otpStore.delete(sessionId);
      return res.status(400).json({
        success: false,
        code: 'OTP_EXPIRED',
        error: 'OTP has expired. Please request a new one.'
      });
    }
    
    // Verify OTP with 2Factor API
    try {
      const twoFactorService = (await import('../services/twoFactorService.js')).default;
      const verifyResult = await twoFactorService.verifyOTP(session.twoFactorSessionId, otp);
      
      if (!verifyResult.success) {
        // Check rate limit
        const rateLimit = checkRateLimit(session.phoneNumber);
        if (!rateLimit.allowed) {
          return res.status(429).json({
            success: false,
            code: 'RATE_LIMIT_EXCEEDED',
            error: 'Too many failed attempts. Please try again later.',
            blockedUntil: rateLimit.blockedUntil,
            attemptsLeft: 0
          });
        }
        
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP',
          attemptsLeft: rateLimit.attemptsLeft
        });
      }
    } catch (error) {
      logger.error('Error verifying OTP with 2Factor:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify OTP. Please try again.'
      });
    }
    
    // Mark as verified
    session.verified = true;
    
    logger.info(`OTP verified for password reset`, {
      userId: session.userId,
      phoneNumber: session.phoneNumber
    });
    
    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
    
  } catch (error) {
    logger.error('Error in forgot password verify OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP'
    });
  }
});

// Step 3: Reset Password
router.post('/reset', async (req, res) => {
  try {
    const { sessionId, otp, newPassword } = req.body;
    
    if (!sessionId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Session ID, OTP, and new password are required'
      });
    }
    
    // Validate password strength (same as admin creation)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
      });
    }
    
    // Get session data
    global.otpStore = global.otpStore || new Map();
    const session = global.otpStore.get(sessionId);
    
    if (!session) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SESSION',
        error: 'Invalid or expired session'
      });
    }
    
    // Check if OTP was verified
    if (!session.verified) {
      return res.status(400).json({
        success: false,
        error: 'OTP not verified. Please verify OTP first.'
      });
    }
    
    // Double-check OTP with 2Factor API for security
    try {
      const twoFactorService = (await import('../services/twoFactorService.js')).default;
      const verifyResult = await twoFactorService.verifyOTP(session.twoFactorSessionId, otp);
      
      if (!verifyResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP'
        });
      }
    } catch (error) {
      logger.error('Error verifying OTP during password reset:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify OTP. Please try again.'
      });
    }
    
    // Find user (need to select password field explicitly as it's excluded by default)
    const user = await Admin.findById(session.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update password (Admin model pre-save hook will hash it automatically)
    user.password = newPassword;
    await user.save();
    
    // Clear session
    global.otpStore.delete(sessionId);
    
    logger.info(`Password reset successfully for ${user.role} (${user.name})`, {
      userId: user._id,
      phoneNumber: session.phoneNumber,
      role: user.role,
      userName: user.name
    });
    
    res.json({
      success: true,
      message: `Password reset successfully. You can now login with your new password.`
    });
    
  } catch (error) {
    logger.error('Error in forgot password reset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

export default router;

