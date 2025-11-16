/**
 * Production-ready API caching utility
 * Prevents unnecessary API calls and improves performance
 */

class APICache {
  constructor() {
    this.cache = new Map();
    this.pending = new Map(); // Track pending requests
    this.maxAge = 5 * 60 * 1000; // 5 minutes default
    this.maxSize = 100; // Max cache entries
  }

  /**
   * Generate cache key from URL and options
   */
  generateKey(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Get cached data if valid
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache data
   */
  set(key, data, maxAge = this.maxAge) {
    // Implement LRU - remove oldest if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      maxAge
    });
  }

  /**
   * Delete specific cache entry
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Clear cache by pattern (e.g., clear all /api/properties/* entries)
   */
  clearPattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Fetch with caching and deduplication
   * Uses a callback function to perform the actual fetch (for auth handling)
   */
  async fetch(url, fetchFunction, cacheOptions = {}) {
    const {
      cache = true,
      maxAge = this.maxAge,
      forceRefresh = false
    } = cacheOptions;

    const key = `${url}`;

    // Return cached data if available and not forcing refresh
    if (cache && !forceRefresh) {
      const cachedData = this.get(key);
      if (cachedData !== null) {
        console.log(`📦 Cache HIT: ${url}`);
        return cachedData;
      }
    }

    // Check if request is already pending (request deduplication)
    if (this.pending.has(key)) {
      console.log(`⏳ Deduplicating request: ${url}`);
      return this.pending.get(key);
    }

    // Create new request using provided fetch function
    const fetchPromise = (async () => {
      try {
        console.log(`🌐 Cache MISS: ${url}`);
        const data = await fetchFunction();

        // Cache successful responses
        if (cache) {
          this.set(key, data, maxAge);
        }

        return data;
      } catch (error) {
        console.error(`❌ Fetch error: ${url}`, error);
        throw error;
      } finally {
        // Remove from pending
        this.pending.delete(key);
      }
    })();

    // Store pending promise
    this.pending.set(key, fetchPromise);

    return fetchPromise;
  }

  /**
   * Invalidate cache for mutations (POST, PUT, DELETE)
   */
  invalidate(pattern) {
    console.log(`🗑️  Invalidating cache: ${pattern}`);
    this.clearPattern(pattern);
  }
}

// Create singleton instance
const apiCache = new APICache();

// Export singleton and class
export default apiCache;
export { APICache };

// Helper function for easy use (deprecated - use apiFetch instead)
export function cachedFetch(url, fetchFunction, cacheOptions = {}) {
  return apiCache.fetch(url, fetchFunction, cacheOptions);
}

// Helper to invalidate cache after mutations
export function invalidateCache(pattern) {
  apiCache.invalidate(pattern);
}

