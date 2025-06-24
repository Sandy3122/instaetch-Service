const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config/config');
const {
  cors,
  helmet,
  securityHeaders,
} = require('./middleware/security');
const instagramRoutes = require('./routes/instagram');

class Server {
  constructor() {
    this.app = express();
    this.port = config.server.port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }
  
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet);
    this.app.use(cors);
    this.app.use(securityHeaders);
    
    // Compression middleware
    this.app.use(compression());
    
    // Logging middleware
    if (config.server.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
      next();
    });
  }
  
  setupRoutes() {
    // API routes
    this.app.use('/api', instagramRoutes);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'InstaFetch API',
        version: '1.0.0',
        description: 'Secure Instagram Scraper MVP Backend',
        endpoints: {
          health: '/api/health',
          cf: '/api/cf',
          msec: '/api/msec',
          userInfo: '/api/v1/instagram/userInfo',
          posts: '/api/v1/instagram/postsV2',
          convert: '/api/convert',
          stories: '/api/v1/instagram/stories',
          highlights: '/api/v1/instagram/highlights',
          cache: {
            stats: '/api/cache/stats',
            clear: '/api/cache/clear',
          },
        },
        documentation: 'API follows fastdl.app patterns for Instagram scraping',
      });
    });
  }
  
  setupErrorHandling() {
    // Global error handler
    this.app.use((err, req, res, next) => {
      console.error('Global error handler:', err);
      
      // Handle specific error types
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: err.message,
        });
      }
      
      if (err.name === 'RateLimitError') {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: err.retryAfter,
        });
      }
      
      if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          details: 'Instagram service is not responding',
        });
      }
      
      // Default error response
      res.status(500).json({
        error: 'Internal server error',
        details: config.server.nodeEnv === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
      });
    });
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
          '/api/v1/instagram/userInfo',
          '/api/v1/instagram/postsV2',
          '/api/convert',
          '/api/v1/instagram/stories',
          '/api/v1/instagram/highlights',
          '/api/health',
          '/api/docs',
        ],
      });
    });
  }
  
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`🚀 InstaFetch API server running on port ${this.port}`);
          console.log(`📊 Environment: ${config.server.nodeEnv}`);
          console.log(`🔒 Security: CORS, Rate Limiting, Validation enabled`);
          console.log(`💾 Cache: TTL ${config.cache.ttl}s, Check period ${config.cache.checkPeriod}s`);
          console.log(`📚 API Documentation: http://localhost:${this.port}/api/docs`);
          console.log(`🏥 Health Check: http://localhost:${this.port}/api/health`);
          
          resolve();
        });
        
        this.server.on('error', (error) => {
          console.error('Server error:', error);
          reject(error);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
          console.log('SIGTERM received, shutting down gracefully');
          this.shutdown();
        });
        
        process.on('SIGINT', () => {
          console.log('SIGINT received, shutting down gracefully');
          this.shutdown();
        });
        
      } catch (error) {
        console.error('Failed to start server:', error);
        reject(error);
      }
    });
  }
  
  async shutdown() {
    console.log('Shutting down server...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = Server; 