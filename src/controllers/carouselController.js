// /**
//  * @fileoverview Controller for handling Instagram carousel scraping requests.
//  * This controller uses the Playwright-based InstagramScraper to fetch
//  * all media items from a carousel post.
//  */

// const InstagramScraper = require('../utils/instagramUtils');
// const cacheManager = require('../utils/cache');
// const { body, validationResult } = require('express-validator');

// class CarouselController {
//   /**
//    * Initializes the controller and the scraper.
//    */
//   constructor() {
//     this.scraper = new InstagramScraper();
//   }

//   /**
//    * Validation rules for the carousel conversion request.
//    */
//   static validate() {
//     return [
//       body('url')
//         .trim()
//         .isURL()
//         .withMessage('A valid URL is required.')
//         .matches(/instagram\.com\/(p|reel|reels)\//)
//         .withMessage('URL must be a valid Instagram post URL.'),
//     ];
//   }

//   /**
//    * Handles validation errors.
//    * @param {import('express').Request} req The request object.
//    * @param {import('express').Response} res The response object.
//    * @param {import('express').NextFunction} next The next middleware function.
//    */
//   static handleValidationErrors(req, res, next) {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         error: 'Invalid request',
//         details: errors.array().map(err => err.msg),
//       });
//     }
//     next();
//   }

//   /**
//    * Handles the conversion of an Instagram carousel URL into a structured format
//    * containing direct media URLs for all items in the post.
//    * @param {import('express').Request} req The request object.
//    * @param {import('express').Response} res The response object.
//    */
//   async convertCarousel(req, res) {
//     // Set a timeout for the entire request
//     const REQUEST_TIMEOUT = 150000;
//     const timeoutPromise = new Promise((_, reject) => {
//       setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
//     });

//     try {
//       const { url } = req.body;
      
//       // Ensure scraper is initialized
//       if (!this.scraper) {
//         this.scraper = new InstagramScraper();
//       }

//       const shortcode = this.scraper.extractShortcode(url);

//       if (!shortcode) {
//         return res.status(400).json({
//           error: 'Invalid Instagram URL format',
//         });
//       }

//       // Check cache first
//       const cachedData = cacheManager.getCachedMediaInfo(shortcode);
//       if (cachedData) {
//         console.log(`Cache hit for carousel: ${shortcode}`);
//         return this.formatMediaResponse(cachedData, url, shortcode, res);
//       }

//       console.log(`Cache miss for carousel: ${shortcode}. Fetching content...`);

//       // Race between the scraping operation and timeout
//       const result = await Promise.race([
//         this.scraper.getMediaInfo(url),
//         timeoutPromise
//       ]);

//       // Check if request was aborted/cancelled
//       if (req.aborted) {
//         console.log('Request was aborted by the client');
//         return res.status(499).json({
//           error: 'Client closed request',
//           details: 'The request was cancelled by the client'
//         });
//       }

//       if (!result.success) {
//         return res.status(404).json({
//           error: 'Content not available',
//           details: result.error || 'The requested media content could not be retrieved.',
//         });
//       }

//       const mediaData = result.data;

//       // Cache the result
//       if (shortcode) {
//         cacheManager.cacheMediaInfo(shortcode, mediaData);
//       }

//       return this.formatMediaResponse(mediaData, url, shortcode, res);
//     } catch (error) {
//       console.error('Error in convertCarousel:', error);
      
//       // Handle specific error types
//       if (error.message.includes('timeout')) {
//         return res.status(504).json({
//           error: 'Request timeout',
//           details: 'The request took too long to process. Please try again.',
//         });
//       }

//       if (error.message.includes('navigation')) {
//         return res.status(504).json({
//           error: 'Navigation failed',
//           details: 'Failed to load the Instagram page. Please try again.',
//         });
//       }

//       res.status(500).json({
//         error: 'Service temporarily unavailable',
//         details: 'Please try again in a few moments.',
//       });
//     }
//   }

//   /**
//    * Formats the scraped media data into a consistent API response.
//    * @param {object} mediaData The data scraped from the Instagram post.
//    * @param {string} sourceUrl The original URL of the post.
//    * @param {string} shortcode The shortcode of the post.
//    * @param {import('express').Response} res The response object.
//    */
//   formatMediaResponse(mediaData, sourceUrl, shortcode, res) {
//     try {
//       const responses = [];
//       const caption = mediaData.caption || '';
//       const meta = {
//         title: caption,
//         source: sourceUrl,
//         shortcode: shortcode,
//         comment_count: mediaData.comment_count,
//         like_count: mediaData.like_count,
//         taken_at: mediaData.taken_at_timestamp,
//         username: mediaData.username || 'unknown',
//       };

//       if (mediaData.items && mediaData.items.length > 0) {
//         mediaData.items.forEach((item, index) => {
//           const isVideo = item.type === 'video';
//           if (item.url) {
//             responses.push({
//               url: [{
//                 url: item.url,
//                 name: isVideo ? 'MP4' : 'JPEG',
//                 type: isVideo ? 'mp4' : 'jpeg',
//                 ext: isVideo ? 'mp4' : 'jpg',
//               }],
//               meta: {
//                 ...meta,
//                 title: mediaData.is_carousel ? `${caption} (Slide ${index + 1}/${mediaData.items.length})` : caption,
//               },
//               thumb: item.thumbnail || item.url,
//               hosting: 'instagram.com',
//             });
//           }
//         });
//       }

//       if (responses.length === 0) {
//         return res.status(404).json({
//           error: 'No media content found',
//           details: 'The post does not contain any accessible media.',
//         });
//       }
      
//       console.log(`Successfully processed ${responses.length} media item(s)`);
//       res.json(responses);
//     } catch (error) {
//       console.error('Error formatting media response:', error);
//       res.status(500).json({
//         error: 'Service temporarily unavailable',
//         details: 'Please try again in a few moments.',
//       });
//     }
//   }
// }

// module.exports = CarouselController;





// Login and Session Management
/**
 * @fileoverview Controller for handling Instagram carousel scraping requests.
 * This controller uses the Playwright-based InstagramScraper to fetch
 * all media items from a carousel post.
 */

const InstagramScraper = require('../utils/instagramUtils');
const cacheManager = require('../utils/cache');
const { body, validationResult } = require('express-validator');

class CarouselController {
  /**
   * Initializes the controller and the scraper.
   * @param {SessionManager} sessionManager - The instance of SessionManager.
   */
  constructor(sessionManager) {
    // Pass the sessionManager instance to the InstagramScraper
    this.scraper = new InstagramScraper(sessionManager);
  }

  /**
   * Validation rules for the carousel conversion request. (Static method, no change needed)
   */
  static validate() {
    return [
      body('url')
        .trim()
        .isURL()
        .withMessage('A valid URL is required.')
        .matches(/instagram\.com\/(p|reel|reels)\//)
        .withMessage('URL must be a valid Instagram post URL.'),
    ];
  }

  /**
   * Handles validation errors. (Static method, no change needed)
   * @param {import('express').Request} req The request object.
   * @param {import('express').Response} res The response object.
   * @param {import('express').NextFunction} next The next middleware function.
   */
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid request',
        details: errors.array().map(err => err.msg),
      });
    }
    next();
  }

  /**
   * Handles the conversion of an Instagram carousel URL into a structured format
   * containing direct media URLs for all items in the post.
   * @param {import('express').Request} req The request object.
   * @param {import('express').Response} res The response object.
   */
  async convertCarousel(req, res) {
    // Set a timeout for the entire request
    const REQUEST_TIMEOUT = 150000;
    
    try {
      const { url } = req.body;
      
      // The scraper should already be initialized via the constructor
      // if (!this.scraper) {
      //   this.scraper = new InstagramScraper(); // This line is no longer needed
      // }

      const shortcode = this.scraper.extractShortcode(url);

      if (!shortcode) {
        return res.status(400).json({
          error: 'Invalid Instagram URL format',
        });
      }

      // Check cache first
      const cachedData = cacheManager.getCachedMediaInfo(shortcode);
      if (cachedData) {
        console.log(`Cache hit for carousel: ${shortcode}`);
        return this.formatMediaResponse(cachedData, url, shortcode, res);
      }

      console.log(`Cache miss for carousel: ${shortcode}. Fetching content...`);

      // Create a timeout promise that doesn't crash the server
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
      });

      // Race between the scraping operation and timeout
      const result = await Promise.race([
        this.scraper.getMediaInfo(url),
        timeoutPromise
      ]);

      // Check if request was aborted/cancelled
      if (req.aborted) {
        console.log('Request was aborted by the client');
        return res.status(499).json({
          error: 'Client closed request',
          details: 'The request was cancelled by the client'
        });
      }

      if (!result.success) {
        return res.status(404).json({
          error: 'Content not available',
          details: result.error || 'The requested media content could not be retrieved.',
        });
      }

      const mediaData = result.data;

      // Cache the result
      if (shortcode) {
        cacheManager.cacheMediaInfo(shortcode, mediaData);
      }

      return this.formatMediaResponse(mediaData, url, shortcode, res);
    } catch (error) {
      console.error('Error in convertCarousel:', error);
      
      // Handle specific error types
      if (error.message.includes('timeout')) {
        return res.status(504).json({
          error: 'Request timeout',
          details: 'The request took too long to process. Please try again.',
        });
      }

      if (error.message.includes('navigation')) {
        return res.status(504).json({
          error: 'Navigation failed',
          details: 'Failed to load the Instagram page. Please try again.',
        });
      }

      // Ensure we always send a response and don't let the error crash the server
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Service temporarily unavailable',
          details: 'Please try again in a few moments.',
        });
      }
    }
  }

  /**
   * Formats the scraped media data into a consistent API response.
   * @param {object} mediaData The data scraped from the Instagram post.
   * @param {string} sourceUrl The original URL of the post.
   * @param {string} shortcode The shortcode of the post.
   * @param {import('express').Response} res The response object.
   */
  formatMediaResponse(mediaData, sourceUrl, shortcode, res) {
    try {
      const responses = [];
      const caption = mediaData.caption || '';
      const meta = {
        title: caption,
        source: sourceUrl,
        shortcode: shortcode,
        comment_count: mediaData.comment_count, // These might be undefined if not scraped
        like_count: mediaData.like_count,     // These might be undefined if not scraped
        taken_at: mediaData.taken_at_timestamp, // These might be undefined if not scraped
        username: mediaData.username || 'unknown',
      };

      if (mediaData.items && mediaData.items.length > 0) {
        mediaData.items.forEach((item, index) => {
          const isVideo = item.type === 'video';
          if (item.url) {
            responses.push({
              url: [{
                url: item.url,
                name: isVideo ? 'MP4' : 'JPEG',
                type: isVideo ? 'mp4' : 'jpeg',
                ext: isVideo ? 'mp4' : 'jpg',
              }],
              meta: {
                ...meta,
                title: mediaData.is_carousel ? `${caption} (Slide ${index + 1}/${mediaData.items.length})` : caption,
              },
              thumb: item.url, // Use item.url as thumbnail for simplicity
              hosting: 'instagram.com',
            });
          }
        });
      }

      if (responses.length === 0) {
        return res.status(404).json({
          error: 'No media content found',
          details: 'The post does not contain any accessible media.',
        });
      }
      
      console.log(`Successfully processed ${responses.length} media item(s)`);
      res.json(responses);
    } catch (error) {
      console.error('Error formatting media response:', error);
      res.status(500).json({
        error: 'Service temporarily unavailable',
        details: 'Please try again in a few moments.',
      });
    }
  }
}

module.exports = CarouselController;