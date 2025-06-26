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
const carouselRoutes = require('./routes/carousel');
const proxyRoutes = require('./routes/proxy');

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
    // CORRECTED ORDER: Register the most specific routes first.
    // The /api/carousel route is now registered before the general /api route.
    this.app.use('/api/carousel', carouselRoutes);
    this.app.use('/api', instagramRoutes);
    this.app.use('/api', proxyRoutes);
    
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
          carousel: '/api/carousel/convert',
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
    
    // 404 handler for any unhandled routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }
  
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`InstaFetch API server running on port ${this.port}`);
          console.log(`Environment: ${config.server.nodeEnv}`);
          console.log(`Health Check: http://localhost:${this.port}/api/health`);
          console.log(`Carousel endpoint: http://localhost:${this.port}/api/carousel/convert`);
          resolve();
        });
        
        this.server.on('error', (error) => {
          console.error('Server startup error:', error);
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
      this.server.close((err) => {
        if(err){
            console.error("Error during server shutdown", err);
            process.exit(1);
        }
        console.log('Server closed.');
        process.exit(0);
      });
      
      // Force close after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000).unref();
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    console.error('Unhandled error during server startup:', error);
    process.exit(1);
  });
}

module.exports = Server;
