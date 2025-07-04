// Single image issue fixed but with video and profile pic issue
const { chromium } = require("playwright");
const config = require("../config/config"); // Assuming config file exists

class InstagramScraper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.userAgent = config.instagram.userAgent;
    this.maxRetries = 3; // Maximum number of retries for operations
    this.retryDelay = 2000; // Delay between retries in milliseconds
    // this.interceptedVideoUrls will be managed per scrape operation, not global to instance
    // No longer a class property, it will be a local variable for each getMediaInfo call
  }

  /**
   * Launches a new browser instance and creates a new context if they don't already exist.
   */
    async launchBrowser() {
    if (!this.browser) {
      try {
        console.log("Launching new browser instance...");
        this.browser = await chromium.launch({
          headless: true, // Set to false for debugging to see the browser UI
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        // Create a persistent context
        this.context = await this.browser.newContext({
          userAgent: this.userAgent,
          viewport: { width: 1280, height: 800 },
        });
      } catch (error) {
        console.error('Failed to launch browser:', error.message);
        // Clean up any partial initialization
        if (this.browser) {
          try {
            await this.browser.close();
          } catch (closeError) {
            console.error('Failed to close browser after launch error:', closeError.message);
          }
          this.browser = null;
        }
        throw error;
      }
    }
    return this.browser;
  }

  /**
   * Closes the browser context and the browser instance if they exist.
   */
    async closeBrowser() {
    try {
      if (this.context) {
        console.log("Closing browser context...");
        await this.context.close();
        this.context = null;
      }
    } catch (error) {
      console.error('Failed to close browser context:', error.message);
    }
    
    try {
      if (this.browser) {
        console.log("Closing browser instance...");
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Failed to close browser instance:', error.message);
    }
  }

  /**
   * Extracts the shortcode from an Instagram URL.
   * @param {string} url - The Instagram URL.
   * @returns {string|null} The shortcode if found, otherwise null.
   */
  extractShortcode(url) {
    const match = url.match(/(\/p\/|\/reel\/|\/reels\/)([a-zA-Z0-9_-]+)/);
    return match ? match[2] : null;
  }

  /**
   * Handles the Instagram cookie consent dialog if it appears.
   * @param {Page} page - The Playwright Page object.
   */
  async handleCookieDialog(page) {
    try {
      console.log("Checking for cookie consent dialog...");
      const allowButton = page.getByRole('button', { name: /Allow all cookies/i });
      // Use a shorter timeout as this is a common, quickly appearing element
      await allowButton.waitFor({ state: "visible", timeout: 2000 });
      console.log('Found "Allow all cookies" button. Clicking it.');
      await allowButton.click();
      await page.waitForTimeout(1000); // Small pause after clicking
    } catch (error) {
      console.log("No cookie dialog found or it timed out, proceeding...");
    }
  }

  /**
   * Handles the Instagram login popup if it appears after navigation.
   * @param {Page} page - The Playwright Page object.
   */
  async handleLoginPopup(page) {
    try {
      const dialogSelector = 'div[role="dialog"]';
      // Wait for the dialog to appear
      await page.waitForSelector(dialogSelector, { state: "visible", timeout: 3000 });
      console.log("✅ Found login popup. Attempting to close...");
      
      // Try to find a close button within the dialog using multiple possible locators
      const closeButton = page.locator('div[role="dialog"] button[aria-label="Close"]');
      const notNowButton = page.locator('div[role="dialog"] >> text="Not Now"'); // Corrected selector
      
      if (await closeButton.isVisible()) {
        console.log("Found specific close button. Clicking it.");
        await closeButton.click({ timeout: 1500 });
      } else if (await notNowButton.isVisible()) {
        console.log("Found 'Not Now' button. Clicking it.");
        await notNowButton.click({ timeout: 1500 });
      } else {
        console.log("No specific close button or 'Not Now' found, trying Escape key.");
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500); // Small pause after closing
      console.log("Popup closed successfully.");
    } catch (error) {
      console.log("No login popup was found or it failed to close, proceeding...");
    }
  }

  /**
   * Handles the "Watch this reel in the app" prompt by clicking "Continue on web".
   * @param {Page} page - The Playwright Page object.
   * @returns {boolean} True if the link was found and clicked, false otherwise.
   */
  async handleContinueOnWebPrompt(page) {
    try {
      console.log("Checking for 'Continue on web' prompt...");
      const continueOnWebLink = page.getByRole('link', { name: /Continue on web/i });
      
      // Wait a bit to see if the link becomes visible
      await continueOnWebLink.waitFor({ state: "visible", timeout: 3000 });
      
      console.log("Found 'Continue on web' link. Clicking it.");
      await continueOnWebLink.click();
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }); // Wait for navigation
      console.log("'Continue on web' clicked successfully.");
      return true;
    } catch (error) {
      console.log("No 'Continue on web' prompt found or it timed out, proceeding...");
      return false;
    }
  }

  /**
   * Scrapes media from a carousel post by clicking through each item.
   * This method will now prioritize intercepted .mp4 URLs for videos.
   * @param {Page} page - The Playwright Page object.
   * @returns {Array<object>} An array of collected media items (image/video URLs).
   */
  async clickAndScrapeCarousel(page) {
    const nextButtonSelector = 'button[aria-label="Next"]';
    const listSelector = "ul._acay"; // Selector for the carousel list
    const collectedMedia = new Map(); // Using a Map to store unique media URLs

    let slideInterceptedVideoUrls = []; // Temporary storage for videos intercepted *per slide*

    // Set up request interception specifically for this carousel scrape
    // We listen for .mp4 requests that happen during the carousel navigation
    await page.route("**/*.mp4", async (route) => {
      const reqUrl = route.request().url();
      // Filter for .mp4 URLs that are likely actual video content, not byte-range requests or profile pics
      if (reqUrl.endsWith(".mp4") && !reqUrl.includes("bytestart") && !reqUrl.includes("profile_pic")) {
        slideInterceptedVideoUrls.push(reqUrl);
        console.log(`[Intercepted for slide] ${reqUrl}`);
      }
      await route.continue();
    });

    try {
      while (true) {
        // Clear slide-specific intercepted videos for the *new* slide before proceeding
        slideInterceptedVideoUrls = [];
        await page.waitForTimeout(1000); // Give a moment for network requests on new slide

        // Evaluate the page to find current visible media (images/videos)
        const currentMediaOnPage = await page.evaluate((selector) => {
          const results = [];
          const list = document.querySelector(selector);
          if (!list) return results;

          const listItems = list.querySelectorAll("li._acaz"); // Selector for individual carousel items
          listItems.forEach((item) => {
            const video = item.querySelector("video");
            // Only add video if it's not a blob URL. We will prioritize intercepted later.
            if (video && video.src && !video.src.startsWith("blob:")) {
              results.push({ type: "video", url: video.src });
            }
            const img = item.querySelector("img.x5yr21d"); // Selector for images in carousel
            if (img && img.src) {
              results.push({ type: "image", url: img.src });
            }
          });
          return results;
        }, listSelector);

        // Prioritize the *most recently intercepted* video for the current slide
        if (slideInterceptedVideoUrls.length > 0) {
          const uniqueIntercepted = [...new Set(slideInterceptedVideoUrls)];
          // Sort by length to prefer longer (likely higher quality) URLs or simply the last one
          // which is often the most relevant for the current slide.
          const bestInterceptedVideo = uniqueIntercepted.sort((a, b) => b.length - a.length)[0];

          if (bestInterceptedVideo) {
            const existingVideoIndex = currentMediaOnPage.findIndex(item => item.type === 'video');
            if (existingVideoIndex !== -1) {
              // Replace existing DOM video (possibly blob or lower quality) with intercepted .mp4
              currentMediaOnPage[existingVideoIndex] = { type: "video", url: bestInterceptedVideo };
              console.log("Replaced DOM video with intercepted MP4 for current slide.");
            } else {
              // Add as a new item if no video was found via DOM
              currentMediaOnPage.push({ type: "video", url: bestInterceptedVideo });
              console.log("Added intercepted MP4 as new media for current slide.");
            }
          }
        }

        currentMediaOnPage.forEach((media) => {
          if (media.url && !collectedMedia.has(media.url)) {
            console.log(`[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`);
            collectedMedia.set(media.url, media);
          }
        });

        // Try to click the next button to advance the carousel
        const nextButton = page.locator(nextButtonSelector);
        await nextButton.waitFor({ state: "visible", timeout: 2000 });
        await nextButton.click();
        await page.waitForTimeout(500); // Small pause after clicking next
      }
    } catch (error) {
      console.log("Reached the end of the carousel or timed out. Finalizing collection.");
      // Collect any remaining media on the last visible slide
      const lastMediaOnPage = await page.evaluate((selector) => {
        const results = [];
        const list = document.querySelector(selector);
        if (!list) return results;
        const listItems = list.querySelectorAll("li._acaz");
        listItems.forEach((item) => {
          const video = item.querySelector("video");
          if (video && video.src && !video.src.startsWith("blob:")) results.push({ type: "video", url: video.src });
          const img = item.querySelector("img.x5yr21d");
          if (img && img.src) results.push({ type: "image", url: img.src });
        });
        return results;
      }, listSelector);

      // Apply the same interception logic for the last slide
      if (slideInterceptedVideoUrls.length > 0) {
        const uniqueIntercepted = [...new Set(slideInterceptedVideoUrls)];
        const bestInterceptedVideo = uniqueIntercepted.sort((a, b) => b.length - a.length)[0];
        if (bestInterceptedVideo) {
          const existingVideoIndex = lastMediaOnPage.findIndex(item => item.type === 'video');
          if (existingVideoIndex !== -1) {
            lastMediaOnPage[existingVideoIndex] = { type: "video", url: bestInterceptedVideo };
          } else {
            lastMediaOnPage.push({ type: "video", url: bestInterceptedVideo });
          }
        }
      }

      lastMediaOnPage.forEach((media) => {
        if (media.url && !collectedMedia.has(media.url)) {
          console.log(`[+] Found final media: ${media.type} at ${collectedMedia.size + 1}`);
          collectedMedia.set(media.url, media);
        }
      });
    } finally {
      // Important: Unroute the network interception once carousel scraping is done
      await page.unroute("**/*.mp4");
    }

    console.log(`Total unique media items found: ${collectedMedia.size}.`);
    return Array.from(collectedMedia.values());
  }

  /**
   * Scrapes media from a single image/video post, prioritizing video.
   * @param {Page} page - The Playwright Page object.
   * @param {Array<string>} interceptedVideoUrls - List of video URLs intercepted for this page.
   * @returns {Array<object>} An array containing the single media item.
   */
  async scrapeSingleMedia(page, interceptedVideoUrls) {
    const tryGetMedia = async () => {
      return await page.evaluate(() => {
        const results = [];

        // Priority 1: Get video if available (not blob)
        const video = document.querySelector("video");
        if (video && video.src && !video.src.startsWith("blob:")) {
          results.push({ type: "video", url: video.src });
        }

        // Priority 2: Clean images (non-thumbnail)
        const images = Array.from(document.querySelectorAll("img"))
          .map((img) => img.src)
          .filter(
            (src) =>
              src &&
              !src.includes("profile_pic") &&
              !src.includes("/s150x150") &&
              !src.includes("/s320x320") &&
              !src.includes("/s240x240") &&
              !src.includes("/vp/") &&
              !src.includes("stp=")
          );

        if (images.length) {
          results.push({ type: "image", url: images[0] });
        }

        return results;
      });
    };

    let media = await tryGetMedia();
    if (media.length && media[0].type === "video") return media;

    // Priority 3: Try clicking play if present
    const playButton = page.locator('div[role="button"][aria-label*="Play"]');
    if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await playButton.click().catch(() => {});
      await page.waitForTimeout(2000);
      media = await tryGetMedia();
      if (media.length && media[0].type === "video") return media;
    }

    // Priority 4: Scroll to trigger lazy-load
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(2000);
    media = await tryGetMedia();
    if (media.length && media[0].type === "video") return media;

    // Priority 5: Directly target known image containers
    const fallbackImage = await page.evaluate(() => {
      const results = [];

      // div._aagv > img.x5yr21d (used in many single image posts)
      const container = document.querySelector("div._aagv");
      if (container) {
        const img = container.querySelector("img.x5yr21d");
        if (img && img.src) {
          results.push({ type: "image", url: img.src });
          return results;
        }
      }

      // Fallback: any main-area image with correct class
      const mainImg = document.querySelector("main img.x5yr21d");
      if (mainImg && mainImg.src) {
        results.push({ type: "image", url: mainImg.src });
      }

      return results;
    });

    if (fallbackImage.length) return fallbackImage;

    // Priority 6: Use intercepted .mp4
    if (interceptedVideoUrls.length > 0) {
      const unique = [...new Set(interceptedVideoUrls)];
      const bestVideo = unique.pop();
      return [{ type: "video", url: bestVideo }];
    }

    // Priority 7: Fallback to OG meta
    const ogFallback = await page.evaluate(() => {
      const result = [];
      const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
      const ogImage = document.querySelector('meta[property="og:image"]')?.content;
      if (ogVideo) result.push({ type: "video", url: ogVideo });
      else if (
        ogImage &&
        !ogImage.includes("profile_pic") &&
        !ogImage.includes("/s150x150") &&
        !ogImage.includes("stp=")
      )
        result.push({ type: "image", url: ogImage });
      return result;
    });

    return ogFallback.length ? ogFallback : [];
  }

  /**
   * Fetches media information (images/videos, and metadata) from a given Instagram post URL.
   * This method now manages its own browser context for each scrape operation to ensure isolation.
   * @param {string} url - The URL of the Instagram post.
   * @returns {object} An object containing success status and scraped data or error information.
   */
  async getMediaInfo(url) {
    let page; // Declare page outside try-catch for finally block access
    let interceptedVideoUrls = []; // Local variable for this specific scrape operation

    try {
      // Ensure browser and context are initialized
      await this.launchBrowser();

      page = await this.context.newPage(); // Create a new page for the scrape

      // Set up request interception for .mp4 files that occur during the initial page load
      // This is crucial for single videos (reels) where the .mp4 URL might be loaded immediately.
      await page.route("**/*.mp4", async (route) => {
        const reqUrl = route.request().url();
        if (reqUrl.endsWith(".mp4") && !reqUrl.includes("bytestart") && !reqUrl.includes("profile_pic")) {
          interceptedVideoUrls.push(reqUrl);
          console.log(`[Global Intercept] ${reqUrl}`);
        }
        await route.continue();
      });

      console.log(`Navigating to ${url}...`);
      await page.goto(url, {
        waitUntil: "domcontentloaded", // Wait for the DOM to be loaded
        timeout: config.instagram.timeout, // Use timeout from config
      });

      // *** NEW: Handle "Continue on web" prompt first ***
      const handledWebPrompt = await this.handleContinueOnWebPrompt(page);
      if (handledWebPrompt) {
        // If the "Continue on web" link was clicked,
        // we need to wait for the page to settle before handling other popups.
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        console.log("Resuming after 'Continue on web' navigation.");
      }
      // *** END NEW ***

      await this.handleLoginPopup(page); // Handle login popup (if it appears)
      await this.handleCookieDialog(page); // Handle cookie consent (if it appears)

      // Locators for success (main content) or failure (page not found)
      const successLocator = page.locator('main[role="main"]');
      const failureLocator = page.getByText(/Sorry, this page isn't available/i);

      console.log("Waiting for page content or error message...");
      // Wait for either the main content to appear or the failure message
      await Promise.race([
        successLocator.waitFor({ state: 'visible', timeout: 15000 }),
        failureLocator.waitFor({ state: 'visible', timeout: 15000 }),
      ]);

      // Check if the failure message is visible
      if (await failureLocator.isVisible()) {
        throw new Error("The requested content is not available. It may have been deleted or the account is private.");
      }

      // If success locator is not visible after waiting, throw an error
      if (!await successLocator.isVisible()) {
        throw new Error("Could not determine page content after 15 seconds.");
      }

      console.log("Page content loaded successfully.");

      // Determine if it's a carousel post
      const nextButtonSelector = 'button[aria-label="Next"]';
      let isCarousel = (await page.locator(nextButtonSelector).count()) > 0;
      let extractedItems = [];

      if (isCarousel) {
        console.log("Carousel post detected. Starting scraping...");
        // For carousels, `clickAndScrapeCarousel` will manage its own interceptions
        extractedItems = await this.clickAndScrapeCarousel(page);
      } else {
        console.log("Single media post detected. Scraping...");
        // Pass the `interceptedVideoUrls` collected during initial page load
        extractedItems = await this.scrapeSingleMedia(page, interceptedVideoUrls);
      }

      // If no media items were found, throw an error
      if (extractedItems.length === 0) {
        throw new Error("Scraping failed. No media items could be found on the page.");
      }

      // Extract post metadata (username and caption)
      const metadata = await page.evaluate(() => {
        const usernameLink = document.querySelector('header a[href*="/"]');
        const username = usernameLink ? usernameLink.textContent : 'unknown';
        // Instagram's caption is often in an h1 tag, but this can vary.
        // A more robust approach might involve looking for specific data-testid attributes.
        const captionDiv = document.querySelector('h1');
        const caption = captionDiv ? captionDiv.textContent : '';
        return { username, caption };
      });

      const responseData = {
        items: extractedItems,
        is_carousel: extractedItems.length > 1, // Determine if it was a carousel based on items count
        username: metadata.username,
        caption: metadata.caption,
      };

      console.log("Scraping successful. Data:", responseData);
      return { success: true, data: responseData };
        } catch (error) {
      console.error(`Error in getMediaInfo with Playwright: ${error.message}`);
      
      // Take a screenshot on error for debugging (but don't let it crash the server)
      try {
        const screenshotPath = `error_screenshot_${Date.now()}.png`;
        if (page && !page.isClosed()) {
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`Screenshot for debugging saved to ${screenshotPath}`);
        } else {
            console.log(`Could not take screenshot: Page was already closed or not initialized.`);
        }
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError.message);
      }
      
      return {
        success: false,
        error: `Failed to scrape media: ${error.message}`,
      };
    } finally {
      // Ensure the page is closed (but don't let it crash the server)
      try {
        if (page && !page.isClosed()) {
            await page.close();
        }
      } catch (closeError) {
        console.error('Failed to close page:', closeError.message);
      }
    }
  }
}

module.exports = InstagramScraper;