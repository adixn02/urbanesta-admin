// Shared IP blocking store
// This module manages IP-based blocking for security

export const ipAttempts = new Map();

// IP blocking configuration
export const MAX_ATTEMPTS_PER_IP = 10;
export const IP_BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Helper function to get client IP from request
export const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         'unknown';
};

// Helper function to check if IP is blocked
export const isIPBlocked = (ip) => {
  const ipData = ipAttempts.get(ip);
  if (ipData && ipData.blockedUntil && new Date(ipData.blockedUntil) > new Date()) {
    return {
      blocked: true,
      blockedUntil: ipData.blockedUntil,
      remainingMinutes: Math.ceil((new Date(ipData.blockedUntil) - new Date()) / (1000 * 60))
    };
  }
  return { blocked: false };
};

// Helper function to increment IP attempt
export const incrementIPAttempt = (ip, reason = null) => {
  const ipData = ipAttempts.get(ip);
  
  if (!ipData) {
    ipAttempts.set(ip, {
      attempts: 1,
      firstAttempt: new Date(),
      lastAttempt: new Date(),
      blockedUntil: null,
      blockedAt: null,
      reason: reason
    });
  } else {
    ipData.attempts += 1;
    ipData.lastAttempt = new Date();
    if (reason) {
      ipData.reason = reason;
    }
    ipAttempts.set(ip, ipData);
  }
  
  // Check if IP should be blocked
  const updatedData = ipAttempts.get(ip);
  if (updatedData.attempts >= MAX_ATTEMPTS_PER_IP) {
    updatedData.blockedUntil = new Date(Date.now() + IP_BLOCK_DURATION);
    updatedData.blockedAt = new Date();
    updatedData.reason = updatedData.reason || 'Too many failed login attempts';
    ipAttempts.set(ip, updatedData);
    return { blocked: true, ipData: updatedData };
  }
  
  return { blocked: false, ipData: updatedData };
};

// Helper function to release (unblock) an IP
export const releaseIP = (ip) => {
  const ipData = ipAttempts.get(ip);
  if (ipData) {
    ipData.blockedUntil = null;
    ipData.blockedAt = null;
    ipData.reason = null;
    ipAttempts.set(ip, ipData);
    return true;
  }
  return false;
};

// Helper function to get all blocked IPs
export const getBlockedIPs = () => {
  const now = new Date();
  const blockedIPs = [];
  
  for (const [ip, data] of ipAttempts.entries()) {
    if (data.blockedUntil && new Date(data.blockedUntil) > now) {
      const remainingTime = Math.ceil((new Date(data.blockedUntil) - now) / (1000 * 60));
      blockedIPs.push({
        ip: ip,
        attempts: data.attempts || 0,
        firstAttempt: data.firstAttempt || data.blockedAt,
        lastAttempt: data.lastAttempt || data.blockedAt,
        blockedAt: data.blockedAt,
        blockedUntil: data.blockedUntil,
        reason: data.reason || 'Too many failed login attempts',
        remainingMinutes: remainingTime,
        remainingHours: Math.ceil(remainingTime / 60)
      });
    }
  }
  
  // Sort by blockedAt (most recent first)
  blockedIPs.sort((a, b) => new Date(b.blockedAt) - new Date(a.blockedAt));
  
  return blockedIPs;
};

