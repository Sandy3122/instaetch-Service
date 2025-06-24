require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
    apiKeySecret: process.env.API_KEY_SECRET || 'fallback-api-secret',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  
  instagram: {
    userAgent: process.env.INSTAGRAM_USER_AGENT || 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    timeout: parseInt(process.env.INSTAGRAM_TIMEOUT) || 30000,
    baseUrl: 'https://www.instagram.com',
    apiUrl: 'https://i.instagram.com/api/v1',
  },
  
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600, // 10 minutes
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
      'http://localhost:3000', 
      'http://localhost:5173', 
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080'
    ],
  },
  
  scraperApi: {
    key: process.env.SCRAPER_API_KEY,
    url: process.env.SCRAPER_API_URL || 'https://api.scraperapi.com',
  },
};

module.exports = config; 