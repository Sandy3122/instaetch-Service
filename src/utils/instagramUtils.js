// Partially working with carousel video issue
const { chromium } = require("playwright");
const config = require("../config/config"); // Assuming config file exists
const proxyManager = require("./proxyManager");
const sessionManager = require("./sessionManager");

class InstagramScraper {
  constructor(externalSessionManager = null) {
    this.browser = null;
    this.context = null;
    this.userAgent = config.instagram.userAgent;
    this.requestCount = 0; // 🔁 Count requests
    this.maxRequestsBeforeRotation = 15; // Rotate after 15
    this.useSessionManager = true; // Flag to control session management usage
    this.sessionInitialized = false; // Track if sessions have been initialized
    
    // Use external session manager if provided, otherwise use the imported one
    this.sessionManager = externalSessionManager || sessionManager;
  }

  /**
   * Initializes the SessionManager if not already done.
   * This should be called before the first scraping operation.
   */
  async initializeSessions() {
    if (this.sessionInitialized || !this.useSessionManager) {
      return;
    }

    try {
      console.log("🚀 Initializing SessionManager for Instagram scraping...");
      await this.sessionManager.initialize();
      this.sessionInitialized = true;
      console.log("✅ SessionManager initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize SessionManager:", error.message);
      this.useSessionManager = false;
    }
  }

  /**
   * Launches a new browser instance and creates a new context if they don't already exist.
   * Now prioritizes using SessionManager for authenticated sessions.
   */

  async launchOrReuseBrowser(maxRetries = 3) {
    // First, try to use SessionManager for authenticated sessions
    if (this.useSessionManager && this.sessionManager.contexts && this.sessionManager.contexts.length > 0) {
      try {
        console.log("🔐 Using authenticated session from SessionManager...");
        const authenticatedContext = this.sessionManager.getRandomContext();
        this.requestCount++;
        return authenticatedContext;
      } catch (error) {
        console.warn("⚠️ SessionManager not available, falling back to proxy-based browser:", error.message);
        this.useSessionManager = false;
      }
    }

    // If no sessions available, try to refresh them
    if (this.useSessionManager) {
      console.log("🔄 No authenticated sessions available, attempting to refresh...");
      const refreshed = await this.refreshSessions();
      if (refreshed) {
        try {
          console.log("🔐 Using refreshed authenticated session from SessionManager...");
          const authenticatedContext = this.sessionManager.getRandomContext();
          this.requestCount++;
          return authenticatedContext;
        } catch (error) {
          console.warn("⚠️ Failed to use refreshed session, falling back to proxy-based browser:", error.message);
          this.useSessionManager = false;
        }
      } else {
        console.warn("⚠️ Failed to refresh sessions, falling back to proxy-based browser");
        this.useSessionManager = false;
      }
    }

    // Fallback to proxy-based browser if no authenticated sessions available
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const proxy = proxyManager.getNextProxy();
      try {
        console.log(`🚀 Launching browser [Attempt ${attempt}] with proxy ${proxy.host}:${proxy.port}`);
        this.browser = await chromium.launch({
          headless: true,
          proxy: {
            server: `http://${proxy.host}:${proxy.port}`,
            username: proxy.username,
            password: proxy.password,
          },
          args: ["--no-sandbox"],
        });
        this.requestCount = 0;
        break;
      } catch (err) {
        console.warn(`❌ Proxy failed at launch (Attempt ${attempt}): ${err.message}`);
      }
    }

    this.requestCount++;

    return await this.browser.newContext({
      userAgent: this.userAgent,
      viewport: { width: 1280, height: 800 },
    });
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
      console.error("Failed to close browser context:", error.message);
    }

    try {
      if (this.browser) {
        console.log("Closing browser instance...");
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error("Failed to close browser instance:", error.message);
    }
  }

  /**
   * Closes all sessions and browser instances.
   * This should be called when shutting down the scraper.
   */
  async closeAll() {
    await this.closeBrowser();
    
    if (this.useSessionManager && this.sessionManager) {
      try {
        await this.sessionManager.close();
        console.log("✅ All sessions closed successfully");
      } catch (error) {
        console.error("❌ Error closing sessions:", error.message);
      }
    }
  }
  /**
   * Checks if we have valid authenticated sessions available.
   * @returns {boolean} True if authenticated sessions are available, false otherwise.
   */
  hasAuthenticatedSessions() {
    return this.useSessionManager && 
           this.sessionManager.contexts && 
           this.sessionManager.contexts.length > 0;
  }

  /**
   * Attempts to refresh sessions if they're not available.
   * @returns {Promise<boolean>} True if sessions were successfully refreshed, false otherwise.
   */
  async refreshSessions() {
    if (!this.useSessionManager) {
      return false;
    }

    try {
      console.log("🔄 Attempting to refresh sessions...");
      await this.sessionManager.initialize();
      return this.hasAuthenticatedSessions();
    } catch (error) {
      console.error("❌ Failed to refresh sessions:", error.message);
      return false;
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
      const allowButton = page.getByRole("button", {
        name: /Allow all cookies/i,
      }); // Use a shorter timeout as this is a common, quickly appearing element
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
      const dialogSelector = 'div[role="dialog"]'; // Wait for the dialog to appear
      await page.waitForSelector(dialogSelector, {
        state: "visible",
        timeout: 3000,
      });
      console.log("Found login popup. Attempting to close..."); // Try to find a close button within the dialog using multiple possible locators
      const closeButton = page.locator(
        'div[role="dialog"] button[aria-label="Close"]'
      );
      const notNowButton = page.locator('div[role="dialog"] >> text="Not Now"'); // Corrected selector
      if (await closeButton.isVisible()) {
        console.log("Found specific close button. Clicking it.");
        await closeButton.click({ timeout: 1500 });
      } else if (await notNowButton.isVisible()) {
        console.log("Found 'Not Now' button. Clicking it.");
        await notNowButton.click({ timeout: 1500 });
      } else {
        console.log(
          "No specific close button or 'Not Now' found, trying Escape key."
        );
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(500); // Small pause after closing
      console.log("Popup closed successfully.");
    } catch (error) {
      console.log(
        "No login popup was found or it failed to close, proceeding..."
      );
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
      const continueOnWebLink = page.getByRole("link", {
        name: /Continue on web/i,
      }); // Wait a bit to see if the link becomes visible
      await continueOnWebLink.waitFor({ state: "visible", timeout: 3000 });
      console.log("Found 'Continue on web' link. Clicking it.");
      await continueOnWebLink.click();
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }); // Wait for navigation
      console.log("'Continue on web' clicked successfully.");
      return true;
    } catch (error) {
      console.log(
        "No 'Continue on web' prompt found or it timed out, proceeding..."
      );
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
    const listSelector = "ul._acay";
    const collectedMedia = new Map();
    const intercepted = new Set();
  
    // Intercept all .mp4 files globally
    await page.route("**/*.mp4", async (route) => {
      const url = route.request().url();
      if (!intercepted.has(url)) {
        console.log(`[🎥 Intercepted .mp4] ${url}`);
        intercepted.add(url);
      }
      await route.continue();
    });
  
    let currentSlide = 1;
  
    while (true) {
      console.log(`🔄 Scraping slide ${currentSlide}...`);
  
      // Try to click play on any visible video
      const playButton = page.locator('div[role="button"][aria-label*="Play"]');
      if (await playButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log(`▶️ Found video on slide ${currentSlide}. Clicking play...`);
        await playButton.click().catch(() => {});
        await page.waitForTimeout(3000); // Let the video load and be intercepted
      }
  
      // Extract visible media
      const mediaItems = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll("ul._acay li._acaz");
  
        items.forEach((item) => {
          const img = item.querySelector("img.x5yr21d");
          if (img && img.src) {
            results.push({ type: "image", url: img.src });
          }
  
          const vid = item.querySelector("video");
          if (vid && vid.src && !vid.src.startsWith("blob:")) {
            results.push({ type: "video", url: vid.src });
          }
        });
  
        return results;
      });
  
      // Add intercepted .mp4s if not already captured
      intercepted.forEach((url) => {
        if (!collectedMedia.has(url)) {
          collectedMedia.set(url, { type: "video", url });
        }
      });
  
      // Add evaluated media (excluding blob videos)
      mediaItems.forEach((media) => {
        if (media.url && !collectedMedia.has(media.url)) {
          collectedMedia.set(media.url, media);
        }
      });
  
      // Try going to next slide
      const nextBtn = page.locator(nextButtonSelector);
      try {
        await nextBtn.waitFor({ state: "visible", timeout: 1500 });
        await nextBtn.click();
        await page.waitForTimeout(1500);
        currentSlide += 1;
      } catch (err) {
        console.log("End of carousel reached.");
        break;
      }
    }
  
    console.log(`Total media found: ${collectedMedia.size}`);
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
        const results = []; // Priority 1: Get video if available (not blob)

        const video = document.querySelector("video");
        if (video && video.src && !video.src.startsWith("blob:")) {
          results.push({ type: "video", url: video.src });
        } // Priority 2: Clean images (non-thumbnail)

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
    if (media.length && media[0].type === "video") return media; // Priority 3: Try clicking play if present

    const playButton = page.locator('div[role="button"][aria-label*="Play"]');
    if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await playButton.click().catch(() => {});
      await page.waitForTimeout(2000);
      media = await tryGetMedia();
      if (media.length && media[0].type === "video") return media;
    } // Priority 4: Scroll to trigger lazy-load

    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(2000);
    media = await tryGetMedia();
    if (media.length && media[0].type === "video") return media; // Priority 5: Directly target known image containers

    const fallbackImage = await page.evaluate(() => {
      const results = []; // div._aagv > img.x5yr21d (used in many single image posts)

      const container = document.querySelector("div._aagv");
      if (container) {
        const img = container.querySelector("img.x5yr21d");
        if (img && img.src) {
          results.push({ type: "image", url: img.src });
          return results;
        }
      } // Fallback: any main-area image with correct class

      const mainImg = document.querySelector("main img.x5yr21d");
      if (mainImg && mainImg.src) {
        results.push({ type: "image", url: mainImg.src });
      }

      return results;
    });

    if (fallbackImage.length) return fallbackImage; // Priority 6: Use intercepted .mp4

    if (interceptedVideoUrls.length > 0) {
      const unique = [...new Set(interceptedVideoUrls)];
      const bestVideo = unique.pop();
      return [{ type: "video", url: bestVideo }];
    } // Priority 7: Fallback to OG meta

    const ogFallback = await page.evaluate(() => {
      const result = [];
      const ogVideo = document.querySelector(
        'meta[property="og:video"]'
      )?.content;
      const ogImage = document.querySelector(
        'meta[property="og:image"]'
      )?.content;
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
  let page;
  let interceptedVideoUrls = [];

  try {
    // Initialize sessions before attempting to scrape
    await this.initializeSessions();
    
    // Add a small delay between requests to avoid rate limiting
    if (this.requestCount > 1) {
      const delay = Math.random() * (3000 - 1000) + 1000; // 1-3 seconds
      console.log(`⏳ Adding delay of ${Math.round(delay)}ms between requests...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const context = await this.launchOrReuseBrowser(); // Reuse sticky session browser
    this.context = context;
    page = await context.newPage();

    // Intercept .mp4 URLs
    await page.route("**/*.mp4", async (route) => {
      const reqUrl = route.request().url();
      if (
        reqUrl.endsWith(".mp4") &&
        !reqUrl.includes("bytestart") &&
        !reqUrl.includes("profile_pic")
      ) {
        interceptedVideoUrls.push(reqUrl);
        console.log(`[🎯 Intercepted Video] ${reqUrl}`);
      }
      await route.continue();
    });

    // Optional: Log public IP for debugging
    try {
      const ip = await page.evaluate(() =>
        fetch("https://api.ipify.org").then((res) => res.text())
      );
      console.log(`🌐 Proxy IP used: ${ip}`);
    } catch {
      console.warn("⚠️ Could not fetch IP from proxy.");
    }

    // Try navigation with retry logic
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, {
        waitUntil: "load",
        timeout: config.instagram.timeout,
      });
    } catch (e) {
      console.warn("⚠️ First navigation attempt failed. Retrying in 2s...");
      await page.waitForTimeout(2000);
      await page.goto(url, {
        waitUntil: "load",
        timeout: config.instagram.timeout,
      });
    }

    // Handle prompts based on session status
    const handledWebPrompt = await this.handleContinueOnWebPrompt(page);
    if (handledWebPrompt) {
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
    
    // Only handle login popups and cookie dialogs if we're not using authenticated sessions
    if (!this.hasAuthenticatedSessions()) {
      console.log("🔓 No authenticated sessions available, handling login popups and cookie dialogs...");
      await this.handleLoginPopup(page);
      await this.handleCookieDialog(page);
    } else {
      console.log("🔐 Using authenticated session, skipping login popup and cookie dialog handling...");
    }

    const successLocator = page.locator('main[role="main"]');
    const failureLocator = page.getByText(/Sorry, this page isn't available/i);

    console.log("Waiting for content or failure indicators...");
    await Promise.race([
      successLocator.waitFor({ state: "visible", timeout: 15000 }),
      failureLocator.waitFor({ state: "visible", timeout: 15000 }),
    ]);

    if (await failureLocator.isVisible()) {
      throw new Error(
        "The requested content is not available. It may have been deleted or the account is private."
      );
    }

    if (!(await successLocator.isVisible())) {
      throw new Error("Could not determine page content after 15 seconds.");
    }

    console.log("Page content loaded successfully.");

    const nextButtonSelector = 'button[aria-label="Next"]';
    const isCarousel = (await page.locator(nextButtonSelector).count()) > 0;

    let extractedItems = [];
    if (isCarousel) {
      console.log("📸 Carousel detected. Scraping...");
      extractedItems = await this.clickAndScrapeCarousel(page);
    } else {
      console.log("🖼️ Single post detected. Scraping...");
      extractedItems = await this.scrapeSingleMedia(page, interceptedVideoUrls);
    }

    if (extractedItems.length === 0) {
      throw new Error("Scraping failed. No media items could be found on the page.");
    }

    // Extract metadata
    const metadata = await page.evaluate(() => {
      const usernameLink = document.querySelector('header a[href*="/"]');
      const username = usernameLink ? usernameLink.textContent : "unknown";
      const captionDiv = document.querySelector("h1");
      const caption = captionDiv ? captionDiv.textContent : "";
      return { username, caption };
    });

    return {
      success: true,
      data: {
        items: extractedItems,
        is_carousel: extractedItems.length > 1,
        username: metadata.username,
        caption: metadata.caption,
      },
    };
  } catch (error) {
    console.error(`❌ Error in getMediaInfo: ${error.message}`);

    // Screenshot capture
    try {
      if (page && !page.isClosed()) {
        const screenshotPath = `error_screenshot_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`🖼️ Screenshot saved: ${screenshotPath}`);
      }
    } catch (ssErr) {
      console.warn("Failed to capture screenshot:", ssErr.message);
    }

    return {
      success: false,
      error: `Failed to scrape media: ${error.message}`,
    };
  } finally {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (closeError) {
      console.error("Failed to close page:", closeError.message);
    }
  }
}

}

module.exports = InstagramScraper;