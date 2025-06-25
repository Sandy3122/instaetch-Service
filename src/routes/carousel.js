/**
 * @fileoverview Defines the routes for carousel-specific API endpoints.
 */

const express = require('express');
const CarouselController = require('../controllers/carouselController');
const { scrapingRateLimiter } = require('../middleware/security');

const router = express.Router();
const controller = new CarouselController();

/**
 * @route   POST /api/carousel/convert
 * @desc    Scrapes all media from an Instagram carousel post
 * @access  Public
 */
router.post(
  '/convert',
  scrapingRateLimiter, // Apply a strict rate limit for scraping
  CarouselController.validate(),
  CarouselController.handleValidationErrors,
  controller.convertCarousel.bind(controller)
);

module.exports = router;