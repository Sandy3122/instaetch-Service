const InstagramScraper = require('../utils/instagramUtils');
const cacheManager = require('../utils/cache');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const axios = require('axios');

class InstagramController {
  constructor() {
    this.scraper = new InstagramScraper();
  }
  
  // Validation rules
  static validateUsername() {
    return [
      body('username')
        .trim()
        .isLength({ min: 1, max: 30 })
        .matches(/^[a-zA-Z0-9._]+$/)
        .withMessage('Username must be 1-30 characters and contain only letters, numbers, dots, and underscores'),
    ];
  }
  
  static validateUrl() {
    return [
      body('url')
        .trim()
        .isURL()
        .matches(/instagram\.com/)
        .withMessage('URL must be a valid Instagram URL'),
    ];
  }
  
  static validateConvertRequest() {
    return [
      body('url')
        .trim()
        .isURL()
        .matches(/instagram\.com/)
        .withMessage('URL must be a valid Instagram URL'),
      body('ts')
        .optional()
        .isNumeric()
        .withMessage('Timestamp must be a number'),
    ];
  }
  
  // Handle validation errors
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }
    next();
  }
  
  // Cloudflare token endpoint (similar to fastdl.app/api/cf)
  async getCloudflareToken(req, res) {
    try {
      const { cfToken } = req.body;
      
      if (!cfToken) {
        return res.status(400).json({
          error: 'cfToken is required',
        });
      }

      // Generate a mock Cloudflare token (in production, you'd validate the actual token)
      const token = crypto.randomBytes(32).toString('hex');
      const timestamp = Date.now();
      const result = `${token}.${timestamp}`;

      res.json({
        result: result,
      });
    } catch (error) {
      console.error('Error in getCloudflareToken:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  }

  // Millisecond timestamp endpoint (similar to fastdl.app/msec)
  async getMillisecondTimestamp(req, res) {
    try {
      const timestamp = Date.now() + Math.random();
      
      res.json({
        msec: timestamp,
      });
    } catch (error) {
      console.error('Error in getMillisecondTimestamp:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  }
  
  // Get user info endpoint (similar to fastdl.app/api/v1/instagram/userInfo)
  async getUserInfo(req, res) {
    try {
      const { username } = req.body;
      
      // Check cache first
      const cachedData = cacheManager.getCachedUserInfo(username);
      if (cachedData) {
        return res.json({
          result: [{
            user: cachedData,
            status: 'ok',
          }],
        });
      }
      
      // Scrape user info
      const result = await this.scraper.getUserInfo(username);
      
      if (!result.success) {
        return res.status(404).json({
          error: 'User not found or profile is private',
          details: result.error,
        });
      }
      
      // Cache the result
      cacheManager.cacheUserInfo(username, result.data);
      
      // Format response like fastdl.app
      res.json({
        result: [{
          user: result.data,
          status: 'ok',
        }],
      });
    } catch (error) {
      console.error('Error in getUserInfo:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  }
  
  // Get user posts endpoint (similar to fastdl.app/api/v1/instagram/postsV2)
  async getUserPosts(req, res) {
    try {
      const { username, maxId = '' } = req.body;
      
      // Check cache first
      const cachedData = cacheManager.getCachedPosts(username);
      if (cachedData && !maxId) {
        return res.json({
          result: cachedData,
        });
      }
      
      // Scrape user posts
      const result = await this.scraper.getUserPosts(username, maxId);
      
      if (!result.success) {
        return res.status(404).json({
          error: 'Failed to fetch posts',
          details: result.error,
        });
      }
      
      // Cache the result (only for first page)
      if (!maxId) {
        cacheManager.cachePosts(username, result.data);
      }
      
      // Format response like fastdl.app
      res.json({
        result: result.data,
      });
    } catch (error) {
      console.error('Error in getUserPosts:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  }
  
  // Convert media endpoint (similar to fastdl.app/api/convert)
  async convertMedia(req, res) {
    try {
      const { url, ts } = req.body;
      
      // Extract shortcode for caching
      const shortcode = this.scraper.extractShortcode(url);
      
      // Check cache first
      if (shortcode) {
        const cachedData = cacheManager.getCachedMediaInfo(shortcode);
        if (cachedData) {
          // Format cached response to match FastDL format (array of objects)
          if (cachedData.carousel_media && cachedData.carousel_media.length > 0) {
            // Return array of objects, each with one carousel item
            const responses = cachedData.carousel_media.map(item => ({
              url: [{
                url: item.video_url || item.display_url,
                name: item.is_video ? 'MP4' : 'JPEG',
                type: item.is_video ? 'mp4' : 'jpeg',
                ext: item.is_video ? 'mp4' : 'jpg',
              }],
              meta: {
                title: cachedData.caption,
                source: url,
                shortcode: shortcode,
                comments: [],
                comment_count: cachedData.comments_count,
                like_count: cachedData.likes_count,
                taken_at: cachedData.taken_at_timestamp,
                username: cachedData.owner?.username,
              },
              thumb: item.display_url,
              sd: null,
              hosting: 'instagram.com',
              hd: null,
              timestamp: Math.floor(Date.now() / 1000),
            }));
            return res.json(responses);
          } else {
            // Single media item
            const response = [{
              url: [{
                url: cachedData.video_url || cachedData.display_url,
                name: cachedData.is_video ? 'MP4' : 'JPEG',
                type: cachedData.is_video ? 'mp4' : 'jpeg',
                ext: cachedData.is_video ? 'mp4' : 'jpg',
              }],
              meta: {
                title: cachedData.caption,
                source: url,
                shortcode: shortcode,
                comments: [],
                comment_count: cachedData.comments_count,
                like_count: cachedData.likes_count,
                taken_at: cachedData.taken_at_timestamp,
                username: cachedData.owner?.username,
              },
              thumb: cachedData.display_url,
              sd: null,
              hosting: 'instagram.com',
              hd: null,
              timestamp: Math.floor(Date.now() / 1000),
            }];
            return res.json(response);
          }
        }
      }
      
      // Scrape media info
      const result = await this.scraper.getMediaInfo(url);
      
      if (!result.success) {
        return res.status(404).json({
          error: 'Media not found or is private',
          details: result.error,
        });
      }
      
      const mediaData = result.data;
      
      // Cache the result
      if (shortcode) {
        cacheManager.cacheMediaInfo(shortcode, mediaData);
      }
      
      // Format response to match FastDL format (array of objects)
      if (mediaData.carousel_media && mediaData.carousel_media.length > 0) {
        // Return array of objects, each with one carousel item - FastDL format
        const responses = mediaData.carousel_media.map(item => ({
          url: [{
            url: item.video_url || item.display_url,
            name: item.is_video ? 'MP4' : 'JPEG',
            type: item.is_video ? 'mp4' : 'jpeg',
            ext: item.is_video ? 'mp4' : 'jpg',
          }],
          meta: {
            title: mediaData.caption,
            source: url,
            shortcode: shortcode,
            comments: [], // Comments would need separate scraping
            comment_count: mediaData.comments_count,
            like_count: mediaData.likes_count,
            taken_at: mediaData.taken_at_timestamp,
            username: mediaData.owner?.username,
          },
          thumb: item.display_url,
          sd: null,
          hosting: 'instagram.com',
          hd: null,
          timestamp: Math.floor(Date.now() / 1000),
        }));
        
        console.log(`🎠 Returning ${responses.length} carousel items`);
        res.json(responses);
      } else {
        // Single media item - still return as array for consistency
        const isVideo = mediaData.is_video || (mediaData.video_versions && mediaData.video_versions.length > 0);
        const response = [{
          url: [{
            url: mediaData.video_url || mediaData.display_url,
            name: isVideo ? 'MP4' : 'JPEG',
            type: isVideo ? 'mp4' : 'jpeg',
            ext: isVideo ? 'mp4' : 'jpg',
          }],
          meta: {
            title: mediaData.caption,
            source: url,
            shortcode: shortcode,
            comments: [],
            comment_count: mediaData.comments_count,
            like_count: mediaData.likes_count,
            taken_at: mediaData.taken_at_timestamp,
            username: mediaData.owner?.username,
          },
          thumb: mediaData.display_url,
          sd: null,
          hosting: 'instagram.com',
          hd: null,
          timestamp: Math.floor(Date.now() / 1000),
        }];
        
        console.log('📷 Returning single media item');
        res.json(response);
      }
    } catch (error) {
      console.error('Error in convertMedia:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  }
  
  // Get stories endpoint
  async getStories(req, res) {
    try {
      const { username } = req.body;
      
      // Check cache first
      const cachedData = cacheManager.getCachedStories(username);
      if (cachedData) {
        return res.json({
          result: cachedData,
        });
      }
      
      // Scrape stories
      const result = await this.scraper.getStories(username);
      
      if (!result.success) {
        return res.status(404).json({
          error: 'Failed to fetch stories',
          details: result.error,
        });
      }
      
      // Cache the result
      cacheManager.cacheStories(username, result.data);
      
      res.json({
        result: result.data,
      });
    } catch (error) {
      console.error('Error in getStories:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  }
  
  // Get highlights endpoint
  async getHighlights(req, res) {
    try {
      const { username } = req.body;
      
      // Check cache first
      const cachedData = cacheManager.getCachedHighlights(username);
      if (cachedData) {
        return res.json({
          result: cachedData,
        });
      }
      
      // Scrape highlights
      const result = await this.scraper.getHighlights(username);
      
      if (!result.success) {
        return res.status(404).json({
          error: 'Failed to fetch highlights',
          details: result.error,
        });
      }
      
      // Cache the result
      cacheManager.cacheHighlights(username, result.data);
      
      res.json({
        result: result.data,
      });
    } catch (error) {
      console.error('Error in getHighlights:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  }
  
  // Health check endpoint
  async healthCheck(req, res) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  }
  
  // Get cache stats endpoint
  async getCacheStats(req, res) {
    const stats = cacheManager.getStats();
    res.json({
      cache: stats,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Clear cache endpoint
  async clearCache(req, res) {
    cacheManager.flush();
    res.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Cleanup method
  async cleanup() {
    if (this.scraper) {
      await this.scraper.closeBrowser();
    }
  }

  // Efficient server-side download method
  async downloadMedia(req, res) {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const isCdnUrl = url.includes('cdninstagram.com') || url.includes('fbcdn.net');

      let mediaUrl;
      let cookieHeader = '';
      let userAgent = this.scraper.userAgent; // Fallback to default user agent

      if (isCdnUrl) {
        mediaUrl = url;
      } else {
        const result = await this.scraper.getMediaInfo(url);
        if (!result.success) {
          return res.status(404).json({ error: 'Failed to retrieve media information.', details: result.error });
        }

        const { data: mediaData, cookies, userAgent: pageUserAgent } = result;
        mediaUrl = mediaData.video_url || mediaData.display_url;
        cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        userAgent = pageUserAgent || userAgent; // Use page's user agent if available
      }
      
      if (!mediaUrl) {
        return res.status(404).json({ error: 'Could not find a downloadable media URL.' });
      }

      // Make a hyper-realistic download request
      const downloadResponse = await axios({
        method: 'get',
        url: mediaUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': userAgent,
          'Referer': 'https://www.instagram.com/',
          'Cookie': cookieHeader,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Host': new URL(mediaUrl).hostname, // Crucial for CDNs
        },
      });

      // Stream the response to the client
      const contentType = downloadResponse.headers['content-type'] || (mediaUrl.includes('.mp4') ? 'video/mp4' : 'image/jpeg');
      const filename = `instafetch-media-${Date.now()}.${contentType.split('/')[1] || 'mp4'}`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      
      if (downloadResponse.headers['content-length']) {
        res.setHeader('Content-Length', downloadResponse.headers['content-length']);
      }
      
      downloadResponse.data.pipe(res);

    } catch (error) {
      console.error('Error in downloadMedia:', error.message);
      return res.status(500).json({
        error: 'Failed to process download request.',
        details: error.message,
      });
    }
  }
}

module.exports = InstagramController;