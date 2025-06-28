/**
 * @fileoverview Instagram scraper utility using Playwright.
 * This file contains the InstagramScraper class which is responsible for
 * launching a browser, navigating to Instagram URLs, and extracting media.
 * This version programmatically clicks through carousels to load all slides.
 */

const { chromium } = require("playwright");
const config = require("../config/config");

class InstagramScraper {
  constructor() {
    this.browser = null;
    this.userAgent = config.instagram.userAgent;
  }

  async launchBrowser() {
    if (!this.browser) {
      console.log("Launching new browser instance...");
      this.browser = await chromium.launch({
        headless: true, // Set to false to visually debug the process
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  extractShortcode(url) {
    const match = url.match(/(\/p\/|\/reel\/|\/reels\/)([a-zA-Z0-9_-]+)/);
    return match ? match[2] : null;
  }

  async handleCookieDialog(page) {
    try {
      console.log("Checking for cookie consent dialog...");
      const allowButtonSelector = 'button:has-text("Allow all cookies")';
      const allowButton = page.locator(allowButtonSelector).first();
      await allowButton.waitFor({ state: "visible", timeout: 3000 });
      console.log('Found "Allow all cookies" button. Clicking it.');
      await allowButton.click();
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log("No cookie dialog found or it timed out, proceeding...");
    }
  }


  async handleLoginPopup(page) {
    try {
      const dialogSelector = 'div[role="dialog"]';
      await page.waitForSelector(dialogSelector, { state: "visible", timeout: 3000 });
      console.log("✅ Found login popup. Attempting to close...");
      try {
        const closeButtonSelector = 'div[role="dialog"] button[aria-label="Close"]';
        const closeButton = page.locator(closeButtonSelector);
        await closeButton.click({ timeout: 1500 });
        console.log("Popup closed successfully by clicking the 'Close' button.");
      } catch (error) {
        console.log("Could not find a 'Close' button. Using fallback: clicking outside popup.");
        await page.locator('body').click({ position: { x: 10, y: 10 } });
        console.log("Popup closed successfully by clicking outside.");
      }
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log("No login popup was found, proceeding...");
    }
  }

  /**
   * Clicks through the entire carousel, extracting media URLs one by one
   * to combat DOM virtualization where previous slides are removed from the HTML.
   * @param {import('playwright').Page} page The Playwright page object.
   * @returns {Promise<Array<{type: string, url: string}>>} A list of unique media items.
   */
  async clickAndScrapeCarousel(page) {
    const nextButtonSelector = 'button[aria-label="Next"]';
    const listSelector = "ul._acay";
    const collectedMedia = new Map();

    while (true) {
      try {
        // Scrape the currently visible slides *before* clicking next.
        const currentMediaOnPage = await page.evaluate((selector) => {
          const results = [];
          const list = document.querySelector(selector);
          if (!list) return results;

          const listItems = list.querySelectorAll("li._acaz");
          listItems.forEach((item) => {
            const video = item.querySelector("video");
            if (video && video.src) {
              results.push({ type: "video", url: video.src });
            }
            const img = item.querySelector("img.x5yr21d");
            if (img && img.src) {
              results.push({ type: "image", url: img.src });
            }
          });
          return results;
        }, listSelector);

        // Add any newly found media to our collection
        currentMediaOnPage.forEach((media) => {
          if (media.url && !collectedMedia.has(media.url)) {
            console.log(
              `[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`
            );
            collectedMedia.set(media.url, media);
          }
        });

        // Now, attempt to click the "Next" button.
        const nextButton = page.locator(nextButtonSelector);
        await nextButton.waitFor({ state: "visible", timeout: 2000 });
        await nextButton.click();
        // A brief pause for the next slide to load and animations to finish.
        await page.waitForTimeout(500);
      } catch (error) {
        // This error is expected when the "Next" button is no longer visible (i.e., we are on the last slide)
        console.log(
          "✅ Reached the end of the carousel. Finalizing collection."
        );
        // One final scrape to catch the very last slide
        const lastMediaOnPage = await page.evaluate((selector) => {
          const results = [];
          const list = document.querySelector(selector);
          if (!list) return results;
          const listItems = list.querySelectorAll("li._acaz");
          listItems.forEach((item) => {
            const video = item.querySelector("video");
            if (video && video.src)
              results.push({ type: "video", url: video.src });
            const img = item.querySelector("img.x5yr21d");
            if (img && img.src) results.push({ type: "image", url: img.src });
          });
          return results;
        }, listSelector);

        lastMediaOnPage.forEach((media) => {
          if (media.url && !collectedMedia.has(media.url)) {
            console.log(
              `[+] Found final media: ${media.type} at ${
                collectedMedia.size + 1
              }`
            );
            collectedMedia.set(media.url, media);
          }
        });

        break; // Exit the loop
      }
    }

    console.log(`Total unique media items found: ${collectedMedia.size}.`);
    return Array.from(collectedMedia.values());
  }

  /**
   * Scrapes a single media item (image or video) from the page.
   * @param {import('playwright').Page} page The Playwright page object.
   * @returns {Promise<Array<{type: string, url: string}>>} A list containing the single media item.
   */
  
  async scrapeSingleMedia(page) {
    const media = await page.evaluate(() => {
      // Priority 1: Find a video element
      const video = document.querySelector("video.x1lliihq");
      if (video && video.src) {
        return [{ type: "video", url: video.src }];
      }

      // Priority 2: Find the main image in its specific container
      const imageContainer = document.querySelector("div._aagv");
      if (imageContainer) {
        const img = imageContainer.querySelector("img.x5yr21d");
        if (img && img.src) {
          return [{ type: "image", url: img.src }];
        }
      }

      // Priority 3: Fallback to any image that looks like main content
      const mainImage = document.querySelector("main img.x5yr21d");
      if (mainImage && mainImage.src) {
        return [{ type: "image", url: mainImage.src }];
      }

      return []; // Return empty array if nothing is found
    });

    if (media.length > 0) {
      console.log(`[+] Found single media: ${media[0].type}`);
    } else {
      console.log(
        "[-] Could not find a single media item with the specified selectors."
      );
    }

    return media;
  }


  async getMediaInfo(url) {
    await this.launchBrowser();
    const context = await this.browser.newContext({
      userAgent: this.userAgent,
    });
    const page = await context.newPage();

    try {
      console.log(`Navigating to ${url}...`);
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: config.instagram.timeout,
      });

      await this.handleCookieDialog(page);
      await this.handleLoginPopup(page);
      await page.waitForSelector("main article", { timeout: 10000 });

      const nextButtonSelector = 'button[aria-label="Next"]';
      const isCarousel = (await page.locator(nextButtonSelector).count()) > 0;

      let extractedItems = [];

      if (isCarousel) {
        console.log("Carousel post detected. Starting carousel scraping...");
        extractedItems = await this.clickAndScrapeCarousel(page);
      } else {
        console.log("Single media post detected. Scraping single item...");
        extractedItems = await this.scrapeSingleMedia(page);
      }

      if (extractedItems.length === 0) {
        throw new Error("Scraping failed to find any media items.");
      }

      const responseData = {
        items: extractedItems,
        is_carousel: extractedItems.length > 1,
        // Metadata is harder to get from this method, but can be added if needed
        username: "unknown",
        caption: "",
      };

      return { success: true, data: responseData };
    } catch (error) {
      console.error("Error in getMediaInfo with Playwright:", error);
      const screenshotPath = `error_screenshot_${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot for debugging saved to ${screenshotPath}`);
      return {
        success: false,
        error: `Failed to scrape media: ${error.message}`,
      };
    } finally {
      await context.close();
    }
  }
}

module.exports = InstagramScraper;