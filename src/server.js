// Latest Issue: 404 Error on Carousel Route
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config/config');
const {
  cors,
  helmet,
  securityHeaders,
} = require('./middleware/security');

// Import the SessionManager instance
const sessionManager = require('./utils/sessionManager'); 

// Import the Controller classes
const InstagramController = require('./controllers/instagramController');
const CarouselController = require('./controllers/carouselController');

// Import the route modules
const instagramRoutes = require('./routes/instagram');
const carouselRoutes = require('./routes/carousel');

const logger = require('./utils/logger');

class Server {
  constructor() {
    this.app = express();
    this.port = config.server.port;
    this.setupMiddleware();
    // Routes and error handling will be set up after sessionManager is initialized
    // this.setupRoutes(); 
    // this.setupErrorHandling(); // <--- Moved this call to the start() method
  }
  
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet);
    this.app.use(cors);
    this.app.use(securityHeaders);
    
    // Compression middleware
    this.app.use(compression());
    
    // Logging middleware - skip proxy-media requests to reduce log noise
    this.app.use(morgan('combined', { 
      stream: logger.stream,
      skip: (req, res) => req.path === '/api/proxy-media'
    }));
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging - replace console.log with logger
    // this.app.use((req, res, next) => {
    //   logger.http(`${req.method} ${req.originalUrl}`);
    //   next();
    // });

    // Blocked paths middleware for security
    this.app.use((req, res, next) => {
      const blockedPaths = [
        /\.env$/,
        /\.git/,
        /phpinfo/i,
        /config\.json/i,
        /\/remote/i,
        /\/login/i,
        /\/owa/i,
        /\/dns-query/i,
        /\/resolve/i,
        /\/query/i,
        /\/sitemap\.xml$/,
        /\/robots\.txt$/,
      ];
    
      const isBlocked = blockedPaths.some((pattern) => pattern.test(req.path));
    
      if (isBlocked) {
        logger.warn(`🚫 Blocked suspicious request: ${req.method} ${req.originalUrl}`);
        return res.status(403).json({
          error: 'Access Denied',
          message: 'This path is not available.',
        });
      }
    
      next();
    });
    

    // Request timeout middleware (5 minutes)
    this.app.use((req, res, next) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          logger.warn(`Request timeout for ${req.method} ${req.originalUrl}`);
          res.status(408).json({
            error: 'Request timeout',
            details: 'The request took too long to process'
          });
        }
      }, 300000); // 5 minutes

      res.on('finish', () => {
        clearTimeout(timeout);
      });

      next();
    });
  }
  
  // New method to set up routes after sessionManager is ready
  setupRoutes(instagramControllerInstance, carouselControllerInstance) {
    // Pass the instantiated controllers to the route modules
    // This assumes your route modules accept a controller instance or use closures.
    // Given your current route structure, we'll modify the route files to accept the controller.
    
    // --- TEMPORARY DEBUG ROUTE IN SERVER.JS ---
    // This route is added directly to the main Express app to test if routing works at all.
    // Try accessing this via GET http://localhost:3000/api/carousel/direct-test
    this.app.get('/api/carousel/direct-test', (req, res) => {
      console.log('Direct test route hit in server.js!');
      res.send('Direct test from server.js works!');
    });
    // --- END TEMPORARY DEBUG ROUTE ---

    // CORRECTED ORDER: Register the most specific routes first.
    this.app.use('/api/carousel', carouselRoutes(carouselControllerInstance));
    this.app.use('/api', instagramRoutes(instagramControllerInstance));
    
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        sessions: sessionManager ? sessionManager.contexts.length : 0
      });
    });
  }
  
  setupErrorHandling() {
    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error('Global error handler:', err);
      
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
      logger.warn(`404 - Endpoint not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }
  
  async start() {
    try {
        // Initialize the session manager and log in all accounts BEFORE starting the server
        await sessionManager.initialize();

        // Instantiate controllers AFTER sessionManager is initialized
        const instagramControllerInstance = new InstagramController(sessionManager);
        const carouselControllerInstance = new CarouselController(sessionManager);

        // Now set up routes, passing the initialized controller instances
        this.setupRoutes(instagramControllerInstance, carouselControllerInstance);

        // IMPORTANT: Register error handling AFTER all routes have been set up
        this.setupErrorHandling();

        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, '0.0.0.0', () => {
                logger.info(`IGSavr API server running on port ${this.port}`);
                logger.info(`Environment: ${config.server.nodeEnv}`);
                logger.info(`Health Check: http://localhost:${this.port}/api/health`);
                logger.info(`Carousel endpoint: http://localhost:${this.port}/api/carousel/convert`);
                resolve();
            });

            this.server.on('error', (error) => {
                logger.error('Server startup error:', error);
                reject(error);
            });

            // Graceful shutdown
            process.on('SIGTERM', () => {
                logger.info('SIGTERM received, shutting down gracefully');
                this.shutdown();
            });

            process.on('SIGINT', () => {
                logger.info('SIGINT received, shutting down gracefully');
                this.shutdown();
            });
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        // Ensure browser is closed if session init fails
        await sessionManager.close(); 
        throw error;
    }
  }
  
  async shutdown() {
    logger.info('Shutting down server...');
    
    // Close the browser managed by the session manager
    await sessionManager.close();

    if (this.server) {
      this.server.close((err) => {
        if(err){
            logger.error("Error during server shutdown", err);
            process.exit(1);
        }
        logger.info('Server closed successfully');
        process.exit(0);
      });
    }
  }
}

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Don't exit the process, just log the error
    // This prevents the server from crashing due to unhandled errors
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
    // This prevents the server from crashing due to unhandled promise rejections
});

// Use an async IIFE (Immediately Invoked Function Expression) to handle the async start
(async () => {
    if (require.main === module) {
        try {
            const server = new Server();
            await server.start();
        } catch (error) {
            logger.error('Unhandled error during server startup:', error);
            process.exit(1);
        }
    }
})();

module.exports = Server;
