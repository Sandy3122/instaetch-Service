const express = require('express');
const InstagramController = require('../controllers/instagramController');
const {
  apiRateLimiter,
  scrapingRateLimiter,
  validateRequest,
} = require('../middleware/security');
const config = require('../config/config');

const router = express.Router();
const controller = new InstagramController();

// Apply general middleware
router.use(validateRequest);

// Health check endpoint
router.get('/health', controller.healthCheck.bind(controller));

// Cache management endpoints
router.get('/cache/stats', controller.getCacheStats.bind(controller));
router.delete('/cache/clear', controller.clearCache.bind(controller));

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    title: 'InstaFetch API Documentation',
    version: '1.0.0',
    description: 'Secure Instagram scraping API following fastdl.app patterns',
    endpoints: [
      {
        path: '/api/cf',
        method: 'POST',
        description: 'Generate Cloudflare token (fastdl.app compatible)',
        body: {
          cfToken: 'string (required)',
        },
        example: {
          cfToken: '0.ZHIt0iLO3FIJTSkyvML8iOSkjbbR3O8arrdwmHg7du7fhm3UM7tKIcUycgrvhi2PC5-w_FVfXMmR15mxGBc8_i6H6cWUi6f6WA9JrfseOqUBOoAn-s4dbm2EkG2KBwnd1EXsHQOU-scJDGCJllkNXp-Zm2_9n4Q8NvbAq2Gqn2MkusqeBqkV8OdEcMtDFFa7hLFfSoWXiNh6AH85MiJvZ8XSpR6b1cEpNE0ZmzBDg3O5CQSkcP2AQLic7Er0gD70v3FeXr2fQxjwXBga-JPfblCEgCj5xyuSeQGKpOMrKVLkUnoW3N-0l_TAD94-irr2EefyCVNs9ZPJQJa8xybeKC7f19h70NBlHWfEhSN11Dg4pEMGGFIZXofz4RYNDZs2EoUyY-DQXUJSLysdkdufKr1cxIHj_IEtHADRxjPnNsJC5NXTriLhWgbbdG3h6o0zMagbMZHjmjAP_1s3IkEhc_DrjMS5dJIWN7aiQT0OV7LxuJSiK0qxIs240nTjxZQag1Ngb35UTG_Yc7_tilOGnJfMXCFhO8wOCwADihKaCy8HPzyaCElhF6goQaDcp_nLry5Y2abgB2mht4_bpzsBbusdwQ-STzBjoSg9CTXu4FzAPRO-3F7D65eQs64m-Ocnvr6phxVdoonk1X51SMk35nhDwp9IwzCrstzCPq80MFvrJm-cAyJG-6nsyrBNmD-T_rmoC-eDKJ5p7E4tTGv2qTqZRXcD2UcB6QCeEDfeuNw6-HZanZzNteYecn_BFXpkuyIuq2r5stgVp5dPslPGYuOIFHAmxxq4oV9Ltc33XS28TUPLBHKpTLbuQaDNH-JUflZYr3-qUP_5awcTCPY2RKUFSab2AjAOmhhVDMqCeN10pW7gLhil82CUHj21Im8pI4XeoCGrHA71x9YQ1tMLt2RSGDPgrz476KbWz4E2OeCjUrrRvDqbXmM0e2vHBvuXh3GEftmSAHEwpJBWDVxRxA.IaClkqMIIG5JuSGGF_awYQ.c464a69b8bd1e3a996d21a8271841fd6573a0f2d1410be64071d88a6adaa366a',
        },
      },
      {
        path: '/api/msec',
        method: 'GET',
        description: 'Get millisecond timestamp (fastdl.app compatible)',
        example: {
          response: {
            msec: 1750579024.431,
          },
        },
      },
      {
        path: '/api/v1/instagram/userInfo',
        method: 'POST',
        description: 'Get Instagram user information',
        body: {
          username: 'string (required)',
        },
        example: {
          username: 'instagram',
        },
      },
      {
        path: '/api/v1/instagram/postsV2',
        method: 'POST',
        description: 'Get Instagram user posts',
        body: {
          username: 'string (required)',
          maxId: 'string (optional)',
        },
        example: {
          username: 'instagram',
          maxId: '',
        },
      },
      {
        path: '/api/convert',
        method: 'POST',
        description: 'Convert Instagram media (posts, reels, videos)',
        body: {
          url: 'string (required)',
          ts: 'number (optional)',
        },
        example: {
          url: 'https://www.instagram.com/p/ABC123/',
          ts: Date.now(),
        },
      },
      {
        path: '/api/v1/instagram/stories',
        method: 'POST',
        description: 'Get Instagram stories',
        body: {
          username: 'string (required)',
        },
        example: {
          username: 'instagram',
        },
      },
      {
        path: '/api/v1/instagram/highlights',
        method: 'POST',
        description: 'Get Instagram highlights',
        body: {
          username: 'string (required)',
        },
        example: {
          username: 'instagram',
        },
      },
      {
        path: '/api/health',
        method: 'GET',
        description: 'Health check endpoint',
      },
      {
        path: '/api/cache/stats',
        method: 'GET',
        description: 'Get cache statistics',
      },
      {
        path: '/api/cache/clear',
        method: 'DELETE',
        description: 'Clear all cache',
      },
    ],
    rateLimits: {
      api: `${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000} seconds`,
      scraping: '10 requests per minute',
    },
    security: {
      cors: 'Configured for allowed origins',
      rateLimiting: 'Enabled',
      validation: 'Input validation enabled',
      caching: 'Enabled with TTL',
    },
  });
});

// Fastdl.app compatible endpoints

// Cloudflare token endpoint (similar to fastdl.app/api/cf)
router.post('/cf',
  apiRateLimiter,
  controller.getCloudflareToken.bind(controller)
);

// Millisecond timestamp endpoint (similar to fastdl.app/msec)
router.get('/msec', controller.getMillisecondTimestamp.bind(controller));

// Instagram scraping endpoints (following fastdl.app patterns)

// Get user info (similar to fastdl.app/api/v1/instagram/userInfo)
router.post('/v1/instagram/userInfo',
  apiRateLimiter,
  InstagramController.validateUsername(),
  InstagramController.handleValidationErrors,
  controller.getUserInfo.bind(controller)
);

// Get user posts (similar to fastdl.app/api/v1/instagram/postsV2)
router.post('/v1/instagram/postsV2',
  apiRateLimiter,
  InstagramController.validateUsername(),
  InstagramController.handleValidationErrors,
  controller.getUserPosts.bind(controller)
);

// Convert media (similar to fastdl.app/api/convert)
// router.post('/convert',
//   scrapingRateLimiter,
//   InstagramController.validateConvertRequest(),
//   InstagramController.handleValidationErrors,
//   controller.convertMedia.bind(controller)
// );

// Get stories
router.post('/v1/instagram/stories',
  scrapingRateLimiter,
  InstagramController.validateUsername(),
  InstagramController.handleValidationErrors,
  controller.getStories.bind(controller)
);

// Get highlights
router.post('/v1/instagram/highlights',
  scrapingRateLimiter,
  InstagramController.validateUsername(),
  InstagramController.handleValidationErrors,
  controller.getHighlights.bind(controller)
);

// New, efficient download endpoint
router.get('/download',
  controller.downloadMedia.bind(controller)
);

// Alternative endpoints for different use cases

// Get user info by username (GET method)
router.get('/user/:username',
  apiRateLimiter,
  (req, res) => {
    req.body = { username: req.params.username };
    controller.getUserInfo(req, res);
  }
);

// Get user posts by username (GET method)
router.get('/user/:username/posts',
  apiRateLimiter,
  (req, res) => {
    req.body = { 
      username: req.params.username,
      maxId: req.query.maxId || ''
    };
    controller.getUserPosts(req, res);
  }
);

// Convert media by URL (GET method)
router.get('/convert',
  scrapingRateLimiter,
  (req, res) => {
    req.body = { 
      url: req.query.url,
      ts: req.query.ts
    };
    controller.convertMedia(req, res);
  }
);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  
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
  
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

module.exports = router; 