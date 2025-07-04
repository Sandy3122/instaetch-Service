const NodeCache = require('node-cache');
const config = require('../config/config');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cache.ttl,
      checkperiod: config.cache.checkPeriod,
      useClones: false,
    });
    
    // Handle cache errors
    this.cache.on('error', (err) => {
      logger.error('Cache error:', err);
    });
    
    // Handle cache expiration
    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache key expired: ${key}`);
    });
  }
  
  // Generate cache key
  generateKey(prefix, identifier) {
    return `${prefix}:${identifier}`;
  }
  
  // Set cache value
  set(key, value, ttl = config.cache.ttl) {
    try {
      return this.cache.set(key, value, ttl);
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }
  
  // Get cache value
  get(key) {
    try {
      return this.cache.get(key);
    } catch (error) {
      logger.error('Cache get error:', error);
      return undefined;
    }
  }
  
  // Check if key exists
  has(key) {
    return this.cache.has(key);
  }
  
  // Delete cache key
  del(key) {
    try {
      return this.cache.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }
  
  // Clear all cache
  flush() {
    try {
      return this.cache.flushAll();
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }
  
  // Get cache stats
  getStats() {
    return this.cache.getStats();
  }
  
  // Cache middleware for Express
  cacheMiddleware(prefix, ttl = config.cache.ttl) {
    return (req, res, next) => {
      const key = this.generateKey(prefix, req.originalUrl);
      
      const cachedResponse = this.get(key);
      if (cachedResponse) {
        return res.json(cachedResponse);
      }
      
      // Store original send method
      const originalSend = res.json;
      
      // Override send method to cache response
      res.json = function(data) {
        this.set(key, data, ttl);
        originalSend.call(this, data);
      }.bind(this);
      
      next();
    };
  }
  
  // Cache user info
  cacheUserInfo(username, userData) {
    const key = this.generateKey('user', username);
    return this.set(key, userData, 86400); // 1 day
  }
  
  // Get cached user info
  getCachedUserInfo(username) {
    const key = this.generateKey('user', username);
    return this.get(key);
  }
  
  // Cache posts
  cachePosts(username, postsData) {
    const key = this.generateKey('posts', username);
    return this.set(key, postsData, 86400); // 1 day
  }
  
  // Get cached posts
  getCachedPosts(username) {
    const key = this.generateKey('posts', username);
    return this.get(key);
  }
  
  // Cache media info
  cacheMediaInfo(shortcode, mediaData) {
    const key = this.generateKey('media', shortcode);
    return this.set(key, mediaData, 86400); // 1 day
  }
  
  // Get cached media info
  getCachedMediaInfo(shortcode) {
    const key = this.generateKey('media', shortcode);
    return this.get(key);
  }
  
  // Cache stories
  cacheStories(username, storiesData) {
    const key = this.generateKey('stories', username);
    return this.set(key, storiesData, 14400); // 4 hours
  }
  
  // Get cached stories
  getCachedStories(username) {
    const key = this.generateKey('stories', username);
    return this.get(key);
  }
  
  // Cache highlights
  cacheHighlights(username, highlightsData) {
    const key = this.generateKey('highlights', username);
    return this.set(key, highlightsData, 18000); // 5 hours
  }
  
  // Get cached highlights
  getCachedHighlights(username) {
    const key = this.generateKey('highlights', username);
    return this.get(key);
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager; 