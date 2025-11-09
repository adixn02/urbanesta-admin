/**
 * Middleware to add timeout to database queries
 * Prevents queries from hanging indefinitely
 */

import logger from '../utils/logger.js';

/**
 * Add maxTimeMS to Mongoose queries to prevent hanging
 * This should be applied to all database queries
 */
export function withQueryTimeout(query, timeoutMs = 5000) {
  if (query && typeof query.maxTimeMS === 'function') {
    return query.maxTimeMS(timeoutMs);
  }
  return query;
}

/**
 * Helper to set timeout on find operations
 */
export function findWithTimeout(model, filter = {}, timeoutMs = 5000) {
  return model.find(filter).maxTimeMS(timeoutMs);
}

/**
 * Helper to set timeout on findOne operations
 */
export function findOneWithTimeout(model, filter = {}, timeoutMs = 5000) {
  return model.findOne(filter).maxTimeMS(timeoutMs);
}

/**
 * Helper to set timeout on aggregate operations
 */
export function aggregateWithTimeout(model, pipeline = [], timeoutMs = 5000) {
  return model.aggregate(pipeline).maxTimeMS(timeoutMs);
}

/**
 * Helper to set timeout on count operations
 */
export function countWithTimeout(model, filter = {}, timeoutMs = 5000) {
  return model.countDocuments(filter).maxTimeMS(timeoutMs);
}

export default {
  withQueryTimeout,
  findWithTimeout,
  findOneWithTimeout,
  aggregateWithTimeout,
  countWithTimeout
};

