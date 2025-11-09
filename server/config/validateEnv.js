/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 */

import logger from '../utils/logger.js';

const requiredEnvVars = {
  // Core configuration
  MONGODB_URL: 'MongoDB connection string',
  PORT: 'Server port (optional, defaults to 3002)',
  
  // Security
  JWT_SECRET: 'JWT secret key for token signing',
  
  // AWS Configuration (optional if using local storage)
  // AWS_ACCESS_KEY_ID: 'AWS Access Key ID',
  // AWS_SECRET_ACCESS_KEY: 'AWS Secret Access Key',
  // AWS_REGION: 'AWS Region',
  // AWS_S3_BUCKET: 'S3 Bucket Name',
  
  // CloudFront (optional)
  // CLOUDFRONT_DOMAIN: 'CloudFront domain URL',
  
  // Two Factor Auth (optional)
  // TWO_FACTOR_API_KEY: '2Factor API Key',
};

const recommendedEnvVars = {
  NODE_ENV: 'Environment mode (development/production)',
  ALLOWED_ORIGINS: 'CORS allowed origins (comma-separated)',
  JWT_REFRESH_SECRET: 'JWT refresh token secret',
  SESSION_SECRET: 'Session secret key',
};

/**
 * Validate required environment variables
 * @throws {Error} If required variables are missing
 */
export function validateRequiredEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const [varName, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[varName]) {
      // PORT is optional, skip it
      if (varName === 'PORT') continue;
      missing.push({ varName, description });
    }
  }

  // Check recommended variables
  for (const [varName, description] of Object.entries(recommendedEnvVars)) {
    if (!process.env[varName]) {
      warnings.push({ varName, description });
    }
  }

  // Validate JWT_SECRET length if present
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push({
      varName: 'JWT_SECRET',
      description: 'JWT_SECRET should be at least 32 characters long for security'
    });
  }

  // Validate NODE_ENV
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    warnings.push({
      varName: 'NODE_ENV',
      description: 'NODE_ENV should be one of: development, production, test'
    });
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment variable warnings:', {
      warnings: warnings.map(w => `${w.varName}: ${w.description}`)
    });
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missing.map(m => `  - ${m.varName}: ${m.description}`).join('\n')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  logger.info('Environment variables validated successfully');
}

/**
 * Get environment variable with validation
 * @param {string} varName - Variable name
 * @param {string} defaultValue - Default value if not set
 * @param {boolean} required - Whether variable is required
 * @returns {string} Environment variable value
 */
export function getEnv(varName, defaultValue = null, required = false) {
  const value = process.env[varName] || defaultValue;
  
  if (required && !value) {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
  
  return value;
}

export default {
  validateRequiredEnv,
  getEnv
};

