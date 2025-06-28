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
   */
  constructor() {
    this.scraper = new InstagramScraper();
  }

  /**
   * Validation rules for the carousel conversion request.
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
   * Handles validation errors.
   * @param {import('express').Request} req The request object.
   * @param {import('express').Response} res The response object.
   * @param {import('express').NextFunction} next The next middleware function.
   */
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

  /**
   * Handles the conversion of an Instagram carousel URL into a structured format
   * containing direct media URLs for all items in the post.
   * @param {import('express').Request} req The request object.
   * @param {import('express').Response} res The response object.
   */
  async convertCarousel(req, res) {
    try {
      const { url } = req.body;
      const shortcode = this.scraper.extractShortcode(url);

      // Check cache first
      if (shortcode) {
        const cachedData = cacheManager.getCachedMediaInfo(shortcode);
        if (cachedData) {
          console.log(`Cache hit for carousel: ${shortcode}`);
          return this.formatMediaResponse(cachedData, url, shortcode, res);
        }
      }
      console.log(`Cache miss for carousel: ${shortcode}. Scraping...`);

      const result = await this.scraper.getMediaInfo(url);

      if (!result.success) {
        return res.status(404).json({
          error: 'Carousel media not found or scraping failed',
          details: result.error,
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
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
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
        comment_count: mediaData.comment_count,
        like_count: mediaData.like_count,
        taken_at: mediaData.taken_at_timestamp,
        username: mediaData.username,
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
              thumb: item.thumbnail,
              hosting: 'instagram.com',
            });
          }
        });
      }

      if (responses.length === 0) {
        return res.status(404).json({
          error: 'No media URLs found',
        });
      }
      
      console.log(`Successfully formatted ${responses.length} carousel item(s)`);
      res.json(responses);
    } catch (error) {
      console.error('Error formatting carousel response:', error);
      res.status(500).json({
        error: 'Error formatting response',
        details: error.message,
      });
    }
  }
}

module.exports = CarouselController;