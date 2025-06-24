const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.cors.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message = 'Too many requests from this IP') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// API rate limiter
const apiRateLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.maxRequests,
  'API rate limit exceeded'
);

// Strict rate limiter for scraping endpoints
const scrapingRateLimiter = createRateLimiter(
  60000, // 1 minute
  10, // 10 requests per minute
  'Scraping rate limit exceeded'
);

// Helmet configuration
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Basic request validation
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }
  
  // Check for required headers
  if (!req.headers['user-agent']) {
    return res.status(400).json({ error: 'User-Agent header is required' });
  }
  
  next();
};

// API key validation middleware (optional)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }
  
  // In production, you would validate against a database
  // For now, we'll use a simple check
  if (apiKey !== config.security.apiKeySecret) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

module.exports = {
  cors: cors(corsOptions),
  helmet: helmet(helmetConfig),
  apiRateLimiter,
  scrapingRateLimiter,
  securityHeaders,
  validateRequest,
  validateApiKey,
}; 