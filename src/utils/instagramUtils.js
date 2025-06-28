// /**
//  * @fileoverview Instagram scraper utility using Playwright.
//  * This file contains the InstagramScraper class which is responsible for
//  * launching a browser, navigating to Instagram URLs, and extracting media.
//  * This version programmatically clicks through carousels to load all slides.
//  */

// const { chromium } = require("playwright");
// const config = require("../config/config");

// class InstagramScraper {
//   constructor() {
//     this.browser = null;
//     this.userAgent = config.instagram.userAgent;
//     this.maxRetries = 3; // Maximum number of retries for operations
//     this.retryDelay = 2000; // Delay between retries in milliseconds
//   }

//   async launchBrowser() {
//     if (!this.browser) {
//       console.log("Launching new browser instance...");
//       this.browser = await chromium.launch({
//         headless: true,
//         args: ["--no-sandbox", "--disable-setuid-sandbox"],
//       });
//     }
//     return this.browser;
//   }

//   async closeBrowser() {
//     if (this.browser) {
//       await this.browser.close();
//       this.browser = null;
//     }
//   }

//   extractShortcode(url) {
//     const match = url.match(/(\/p\/|\/reel\/|\/reels\/)([a-zA-Z0-9_-]+)/);
//     return match ? match[2] : null;
//   }

//   async handleCookieDialog(page) {
//     try {
//       console.log("Checking for cookie consent dialog...");
//       const allowButtonSelector = 'button:has-text("Allow all cookies")';
//       const allowButton = page.locator(allowButtonSelector).first();

//       // More forgiving timeout for cookie dialog
//       await allowButton.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});

//       if (await allowButton.isVisible().catch(() => false)) {
//         console.log('Found "Allow all cookies" button. Clicking it.');
//         await allowButton.click().catch(() => {});
//         await page.waitForTimeout(1000);
//       }
//     } catch (error) {
//       // Silently continue if cookie dialog handling fails
//       console.log("No cookie dialog found, proceeding...");
//     }
//   }

//   async handleLoginPopup(page) {
//     try {
//       const dialogSelector = 'div[role="dialog"]';
//       const isVisible = await page.isVisible(dialogSelector).catch(() => false);

//       if (isVisible) {
//         console.log("✅ Found login popup. Attempting to close...");
//         try {
//           const closeButtonSelector = 'div[role="dialog"] button[aria-label="Close"]';
//           const closeButton = page.locator(closeButtonSelector);

//           if (await closeButton.isVisible().catch(() => false)) {
//             await closeButton.click().catch(() => {});
//             console.log("Popup closed successfully by clicking the 'Close' button.");
//           } else {
//             console.log("Using fallback: clicking outside popup.");
//             await page.locator('body').click({ position: { x: 10, y: 10 } }).catch(() => {});
//           }
//         } catch (error) {
//           // Silently handle popup closing errors
//           console.log("Continuing despite popup handling issues...");
//         }
//       }
//     } catch (error) {
//       // Silently continue if popup handling fails
//       console.log("No login popup was found, proceeding...");
//     }
//   }

//   /**
//    * Clicks through the entire carousel, extracting media URLs one by one
//    * to combat DOM virtualization where previous slides are removed from the HTML.
//    * @param {import('playwright').Page} page The Playwright page object.
//    * @returns {Promise<Array<{type: string, url: string}>>} A list of unique media items.
//    */
//   async clickAndScrapeCarousel(page) {
//     const nextButtonSelector = 'button[aria-label="Next"]';
//     const listSelector = "ul._acay";
//     const collectedMedia = new Map();
//     let retryCount = 0;

//     while (retryCount < this.maxRetries) {
//       try {
//         // Scrape the currently visible slides *before* clicking next.
//         const currentMediaOnPage = await page.evaluate((selector) => {
//           const results = [];
//           const list = document.querySelector(selector);
//           if (!list) return results;

//           const listItems = list.querySelectorAll("li._acaz");
//           listItems.forEach((item) => {
//             const video = item.querySelector("video");
//             if (video && video.src) {
//               results.push({ type: "video", url: video.src });
//             }
//             const img = item.querySelector("img.x5yr21d");
//             if (img && img.src) {
//               results.push({ type: "image", url: img.src });
//             }
//           });
//           return results;
//         }, listSelector);

//         // Add any newly found media to our collection
//         currentMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             console.log(
//               `[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`
//             );
//             collectedMedia.set(media.url, media);
//           }
//         });

//         // Try to click the "Next" button with a more forgiving approach
//         const nextButton = page.locator(nextButtonSelector);
//         const isNextVisible = await nextButton.isVisible().catch(() => false);

//         if (!isNextVisible) {
//           // If next button is not visible, we've likely reached the end
//           break;
//         }

//         await nextButton.click().catch(() => {
//           throw new Error("Failed to click next button");
//         });

//         // Brief pause for the next slide to load
//         await page.waitForTimeout(800);
//         retryCount = 0; // Reset retry count on successful iteration
//       } catch (error) {
//         retryCount++;
//         if (retryCount >= this.maxRetries) {
//           console.log("Reached maximum retries, finalizing collection.");
//           break;
//         }
//         // Wait before retrying
//         await page.waitForTimeout(this.retryDelay);
//       }
//     }

//     console.log(`Total unique media items found: ${collectedMedia.size}`);
//     return Array.from(collectedMedia.values());
//   }

//   /**
//    * Scrapes a single media item (image or video) from the page.
//    * @param {import('playwright').Page} page The Playwright page object.
//    * @returns {Promise<Array<{type: string, url: string}>>} A list containing the single media item.
//    */
//   async scrapeSingleMedia(page) {
//     let retryCount = 0;

//     while (retryCount < this.maxRetries) {
//       try {
//         const media = await page.evaluate(() => {
//           // Priority 1: Find a video element
//           const video = document.querySelector("video.x1lliihq");
//           if (video && video.src) {
//             return [{ type: "video", url: video.src }];
//           }

//           // Priority 2: Find the main image in its specific container
//           const imageContainer = document.querySelector("div._aagv");
//           if (imageContainer) {
//             const img = imageContainer.querySelector("img.x5yr21d");
//             if (img && img.src) {
//               return [{ type: "image", url: img.src }];
//             }
//           }

//           // Priority 3: Fallback to any image that looks like main content
//           const mainImage = document.querySelector("main img.x5yr21d");
//           if (mainImage && mainImage.src) {
//             return [{ type: "image", url: mainImage.src }];
//           }

//           return []; // Return empty array if nothing is found
//         });

//         if (media.length > 0) {
//           console.log(`[+] Found single media: ${media[0].type}`);
//           return media;
//         }

//         // If no media found, retry after a delay
//         retryCount++;
//         if (retryCount < this.maxRetries) {
//           await page.waitForTimeout(this.retryDelay);
//           continue;
//         }
//       } catch (error) {
//         retryCount++;
//         if (retryCount < this.maxRetries) {
//           await page.waitForTimeout(this.retryDelay);
//           continue;
//         }
//       }
//     }

//     return []; // Return empty array if all retries failed
//   }

//   async getMediaInfo(url) {
//     await this.launchBrowser();
//     const context = await this.browser.newContext({
//       userAgent: this.userAgent,
//       viewport: { width: 1280, height: 720 },
//       deviceScaleFactor: 1,
//     });

//     let page = null;
//     try {
//       console.log(`Navigating to ${url}...`);
//       page = await context.newPage();

//       // Set longer timeouts for navigation
//       page.setDefaultTimeout(30000);
//       page.setDefaultNavigationTimeout(30000);

//       // Enable request interception before navigation
//       await page.route('**/*', async route => {
//         const request = route.request();
//         const url = request.url();

//         // Block unnecessary resources to speed up loading
//         if (request.resourceType() in ['image', 'stylesheet', 'font']) {
//           if (url.includes('profile_pic') || url.includes('avatar')) {
//             await route.abort();
//             return;
//           }
//         }

//         // Look for video content
//         if (url.includes('.mp4') ||
//             url.includes('/video/') ||
//             url.includes('video_url') ||
//             request.resourceType() === 'media') {
//           console.log('Found potential video URL:', url);
//         }

//         await route.continue();
//       });

//       // Navigate with retries
//       let retryCount = 0;
//       while (retryCount < this.maxRetries) {
//         try {
//           await page.goto(url, {
//             waitUntil: 'networkidle',
//             timeout: 30000
//           });
//           break;
//         } catch (error) {
//           retryCount++;
//           if (retryCount >= this.maxRetries) {
//             throw new Error('Failed to load page after multiple attempts');
//           }
//           console.log(`Retrying navigation (attempt ${retryCount + 1})...`);
//           await page.waitForTimeout(this.retryDelay);
//         }
//       }

//       // Wait for content to be visible
//       await page.waitForLoadState('domcontentloaded');
//       await this.handleCookieDialog(page);
//       await this.handleLoginPopup(page);

//       // Wait for the main content
//       await Promise.race([
//         page.waitForSelector('main article', { timeout: 10000 }),
//         page.waitForSelector('div[role="dialog"]', { timeout: 10000 })
//       ]).catch(() => console.log('Timeout waiting for content selectors'));

//       // Additional wait for dynamic content
//       await page.waitForTimeout(2000);

//       // Check if it's a carousel
//       const nextButtonSelector = 'button[aria-label="Next"]';
//       const isCarousel = (await page.locator(nextButtonSelector).count()) > 0;

//       let extractedItems = [];
//       console.log(isCarousel ? "Carousel post detected..." : "Single media post detected...");

//       if (isCarousel) {
//         extractedItems = await this.clickAndScrapeCarousel(page);
//       } else {
//         extractedItems = await this.scrapeSingleMedia(page);
//       }

//       if (!extractedItems || extractedItems.length === 0) {
//         console.log("No media items found, retrying with additional selectors...");
//         // Try alternative selectors as fallback
//         const fallbackItems = await page.evaluate(() => {
//           const items = [];
//           // Check meta tags
//           const videoUrl = document.querySelector('meta[property="og:video"]')?.content;
//           const imageUrl = document.querySelector('meta[property="og:image"]')?.content;

//           if (videoUrl) {
//             items.push({ type: 'video', url: videoUrl });
//           } else if (imageUrl) {
//             items.push({ type: 'image', url: imageUrl });
//           }
//           return items;
//         });

//         if (fallbackItems.length > 0) {
//           extractedItems = fallbackItems;
//         }
//       }

//       if (!extractedItems || extractedItems.length === 0) {
//         throw new Error('No media content found');
//       }

//       // Take a screenshot in development for debugging
//       if (process.env.NODE_ENV === 'development') {
//         await page.screenshot({ path: `debug_${Date.now()}.png`, fullPage: true });
//       }

//       const responseData = {
//         items: extractedItems,
//         is_carousel: extractedItems.length > 1,
//         username: await page.evaluate(() => {
//           return document.querySelector('a.x1i10hfl')?.innerText || 'unknown';
//         }),
//         caption: await page.evaluate(() => {
//           return document.querySelector('h1._aacl')?.innerText || '';
//         })
//       };

//       return { success: true, data: responseData };
//     } catch (error) {
//       console.error('Error in getMediaInfo:', error.message);
//       // Take error screenshot in development
//       if (process.env.NODE_ENV === 'development' && page) {
//         const screenshotPath = `error_${Date.now()}.png`;
//         await page.screenshot({ path: screenshotPath, fullPage: true });
//         console.log(`Error screenshot saved to ${screenshotPath}`);
//       }
//       return {
//         success: false,
//         error: 'Failed to retrieve media content',
//         details: process.env.NODE_ENV === 'development' ? error.message : undefined
//       };
//     } finally {
//       if (page) {
//         await page.close().catch(() => {});
//       }
//       await context.close().catch(() => {});
//     }
//   }
// }

// module.exports = InstagramScraper;



// // With Minimal Fixes
// const { chromium } = require("playwright");
// const config = require("../config/config");

// class InstagramScraper {
//   constructor() {
//     this.browser = null;
//     this.userAgent = config.instagram.userAgent;
//     this.maxRetries = 3;
//     this.retryDelay = 2000;
//     this.interceptedVideoUrls = []; // ✅ Initialize here
//   }

//   async launchBrowser() {
//     if (!this.browser) {
//       console.log("Launching new browser instance...");
//       this.browser = await chromium.launch({
//         headless: true,
//         args: ["--no-sandbox", "--disable-setuid-sandbox"],
//       });
//     }
//     return this.browser;
//   }

//   async closeBrowser() {
//     if (this.browser) {
//       await this.browser.close();
//       this.browser = null;
//     }
//   }

//   extractShortcode(url) {
//     const match = url.match(/(\/p\/|\/reel\/|\/reels\/)([a-zA-Z0-9_-]+)/);
//     return match ? match[2] : null;
//   }

//   async handleCookieDialog(page) {
//     try {
//       const allowButton = page.locator('button:has-text("Allow all cookies")').first();
//       await allowButton.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
//       if (await allowButton.isVisible().catch(() => false)) {
//         await allowButton.click().catch(() => {});
//         await page.waitForTimeout(1000);
//       }
//     } catch (_) {}
//   }

//   async handleLoginPopup(page) {
//     try {
//       const isVisible = await page.isVisible('div[role="dialog"]').catch(() => false);
//       if (isVisible) {
//         const closeButton = page.locator('div[role="dialog"] button[aria-label="Close"]');
//         if (await closeButton.isVisible().catch(() => false)) {
//           await closeButton.click().catch(() => {});
//         } else {
//           await page.locator('body').click({ position: { x: 10, y: 10 } }).catch(() => {});
//         }
//       }
//     } catch (_) {}
//   }

//   async clickAndScrapeCarousel(page) {
//     const nextButtonSelector = 'button[aria-label="Next"]';
//     const listSelector = "ul._acay";
//     const collectedMedia = new Map();
//     let retryCount = 0;

//     while (retryCount < this.maxRetries) {
//       try {
//         const currentMediaOnPage = await page.evaluate((selector) => {
//           const results = [];
//           const list = document.querySelector(selector);
//           if (!list) return results;

//           list.querySelectorAll("li._acaz").forEach((item) => {
//             const video = item.querySelector("video");
//             if (video && video.src) results.push({ type: "video", url: video.src });
//             const img = item.querySelector("img.x5yr21d");
//             if (img && img.src) results.push({ type: "image", url: img.src });
//           });
//           return results;
//         }, listSelector);

//         currentMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             collectedMedia.set(media.url, media);
//           }
//         });

//         const nextButton = page.locator(nextButtonSelector);
//         if (!(await nextButton.isVisible().catch(() => false))) break;

//         await nextButton.click().catch(() => {
//           throw new Error("Failed to click next button");
//         });
//         await page.waitForTimeout(800);
//         retryCount = 0;
//       } catch (_) {
//         retryCount++;
//         if (retryCount >= this.maxRetries) break;
//         await page.waitForTimeout(this.retryDelay);
//       }
//     }

//     return Array.from(collectedMedia.values());
//   }

//   async scrapeSingleMedia(page) {
//     // ✅ Use intercepted full .mp4 first
//     if (this.interceptedVideoUrls.length > 0) {
//       const lastUrl = this.interceptedVideoUrls[this.interceptedVideoUrls.length - 1];
//       console.log(`[+] Using intercepted full MP4 URL: ${lastUrl}`);
//       return [{ type: 'video', url: lastUrl }];
//     }

//     let retryCount = 0;

//     while (retryCount < this.maxRetries) {
//       try {
//         // ✅ Try clicking play (trigger video load)
//         await page.click('div[role="button"][aria-label*="Play"]').catch(() => {});
//         await page.waitForTimeout(1000);

//         // ✅ Retry checking after triggering playback
//         const media = await page.evaluate(() => {
//           const video = document.querySelector("video.x1lliihq, video");
//           if (video && video.src && !video.src.startsWith("blob:")) {
//             return [{ type: "video", url: video.src }];
//           }

//           const image = document.querySelector("div._aagv img.x5yr21d") ||
//                         document.querySelector("main img.x5yr21d");

//           if (image && image.src) return [{ type: "image", url: image.src }];
//           return [];
//         });

//         if (media.length > 0) {
//           console.log(`[+] Found single media: ${media[0].type}`);
//           return media;
//         }

//         retryCount++;
//         await page.waitForTimeout(this.retryDelay);
//       } catch (_) {
//         retryCount++;
//         await page.waitForTimeout(this.retryDelay);
//       }
//     }

//     return [];
//   }

//   async getMediaInfo(url) {
//     await this.launchBrowser();
//     this.interceptedVideoUrls = []; // ✅ Clear array for this session

//     const context = await this.browser.newContext({
//       userAgent: this.userAgent,
//       viewport: { width: 1280, height: 720 },
//       deviceScaleFactor: 1,
//     });

//     let page = null;
//     try {
//       console.log(`Navigating to ${url}...`);
//       page = await context.newPage();

//       await page.route("**/*", async (route) => {
//         const reqUrl = route.request().url();
//         if (
//           reqUrl.includes(".mp4") &&
//           !reqUrl.includes("profile_pic") &&
//           !reqUrl.includes("avatar") &&
//           !reqUrl.includes("bytestart") &&
//           !reqUrl.includes("byteend")
//         ) {
//           this.interceptedVideoUrls.push(reqUrl);
//           console.log("Found potential video URL:", reqUrl);
//         }
//         await route.continue();
//       });

//       let retryCount = 0;
//       while (retryCount < this.maxRetries) {
//         try {
//           await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
//           break;
//         } catch {
//           retryCount++;
//           if (retryCount >= this.maxRetries) throw new Error("Failed to load page");
//           await page.waitForTimeout(this.retryDelay);
//         }
//       }

//       await page.waitForLoadState("domcontentloaded");
//       await this.handleCookieDialog(page);
//       await this.handleLoginPopup(page);
//       await Promise.race([
//         page.waitForSelector("main article", { timeout: 10000 }),
//         page.waitForSelector('div[role="dialog"]', { timeout: 10000 }),
//       ]).catch(() => {});
//       await page.waitForTimeout(2000);

//       const isCarousel = (await page.locator('button[aria-label="Next"]').count()) > 0;
//       let extractedItems = [];

//       if (isCarousel) {
//         console.log("Carousel post detected...");
//         extractedItems = await this.clickAndScrapeCarousel(page);
//       } else {
//         console.log("Single media post detected...");
//         extractedItems = await this.scrapeSingleMedia(page);
//       }

//       if (!extractedItems.length) {
//         const fallbackItems = await page.evaluate(() => {
//           const items = [];
//           const videoUrl = document.querySelector('meta[property="og:video"]')?.content;
//           const imageUrl = document.querySelector('meta[property="og:image"]')?.content;
//           if (videoUrl) items.push({ type: "video", url: videoUrl });
//           else if (imageUrl) items.push({ type: "image", url: imageUrl });
//           return items;
//         });
//         extractedItems = fallbackItems;
//       }

//       if (!extractedItems.length) {
//         throw new Error("No media content found");
//       }

//       const responseData = {
//         items: extractedItems,
//         is_carousel: extractedItems.length > 1,
//         username: await page.evaluate(() => {
//           return document.querySelector('a.x1i10hfl')?.innerText || 'unknown';
//         }),
//         caption: await page.evaluate(() => {
//           return document.querySelector('h1._aacl')?.innerText || '';
//         }),
//       };

//       return { success: true, data: responseData };
//     } catch (error) {
//       console.error("Error in getMediaInfo:", error.message);
//       return {
//         success: false,
//         error: "Failed to retrieve media content",
//         details: process.env.NODE_ENV === "development" ? error.message : undefined,
//       };
//     } finally {
//       if (page) await page.close().catch(() => {});
//       await context.close().catch(() => {});
//     }
//   }
// }

// module.exports = InstagramScraper;





// optimized code with old one
const { chromium } = require("playwright");
const config = require("../config/config");

class InstagramScraper {
  constructor() {
    this.browser = null;
    this.userAgent = config.instagram.userAgent;
    this.interceptedVideoUrls = []; // NEW: for .mp4 reel fallback
  }

  async launchBrowser() {
    if (!this.browser) {
      console.log("Launching new browser instance...");
      this.browser = await chromium.launch({
        headless: true,
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
      await page.waitForSelector(dialogSelector, {
        state: "visible",
        timeout: 3000,
      });
      console.log("✅ Found login popup. Attempting to close...");
      try {
        const closeButtonSelector =
          'div[role="dialog"] button[aria-label="Close"]';
        const closeButton = page.locator(closeButtonSelector);
        await closeButton.click({ timeout: 1500 });
        console.log(
          "Popup closed successfully by clicking the 'Close' button."
        );
      } catch (error) {
        console.log(
          "Could not find a 'Close' button. Using fallback: clicking outside popup."
        );
        await page.locator("body").click({ position: { x: 10, y: 10 } });
        console.log("Popup closed successfully by clicking outside.");
      }
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log("No login popup was found, proceeding...");
    }
  }

  async clickAndScrapeCarousel(page) {
    const nextButtonSelector = 'button[aria-label="Next"]';
    const listSelector = "ul._acay";
    const collectedMedia = new Map();

    while (true) {
      try {
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

        currentMediaOnPage.forEach((media) => {
          if (media.url && !collectedMedia.has(media.url)) {
            console.log(
              `[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`
            );
            collectedMedia.set(media.url, media);
          }
        });

        const nextButton = page.locator(nextButtonSelector);
        await nextButton.waitFor({ state: "visible", timeout: 2000 });
        await nextButton.click();
        await page.waitForTimeout(500);
      } catch (error) {
        console.log(
          "✅ Reached the end of the carousel. Finalizing collection."
        );
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

        break;
      }
    }

    console.log(`Total unique media items found: ${collectedMedia.size}.`);
    return Array.from(collectedMedia.values());
  }

  async scrapeSingleMedia(page) {
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
    if (this.interceptedVideoUrls.length > 0) {
      const unique = [...new Set(this.interceptedVideoUrls)];
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
  

  async getMediaInfo(url) {
    await this.launchBrowser();
    const context = await this.browser.newContext({
      userAgent: this.userAgent,
    });
    const page = await context.newPage();
    this.interceptedVideoUrls = []; // Clear previous

    try {
      // NEW: Intercept network requests to catch .mp4 videos
      await page.route("**/*", async (route) => {
        const reqUrl = route.request().url();
        if (
          reqUrl.includes(".mp4") &&
          !reqUrl.includes("bytestart") &&
          !reqUrl.includes("byteend") &&
          !reqUrl.includes("profile_pic")
        ) {
          console.log("[+] Intercepted .mp4 URL:", reqUrl);
          this.interceptedVideoUrls.push(reqUrl);
        }
        await route.continue();
      });

      console.log(`Navigating to ${url}...`);
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: config.instagram.timeout,
      });

      // Check for app gatekeeper overlay (like "Watch the full reel on Instagram")
      const forceAppOverlay = await page.evaluate(() => {
        return Boolean(
          document
            .querySelector("h2")
            ?.innerText?.toLowerCase()
            .includes("watch") &&
            document
              .querySelector("button")
              ?.innerText?.toLowerCase()
              .includes("open instagram")
        );
      });

      if (forceAppOverlay) {
        console.log(
          "❌ Instagram is showing app-only reel screen. Attempting fallback..."
        );

        const ogVideo = await page.evaluate(() => {
          return (
            document.querySelector('meta[property="og:video"]')?.content || null
          );
        });

        if (ogVideo) {
          return {
            success: true,
            data: {
              items: [{ type: "video", url: ogVideo }],
              is_carousel: false,
              username: "unknown",
              caption: "",
            },
          };
        }

        const fallback = this.interceptedVideoUrls.length
          ? [...new Set(this.interceptedVideoUrls)].pop()
          : null;

        if (fallback) {
          return {
            success: true,
            data: {
              items: [{ type: "video", url: fallback }],
              is_carousel: false,
              username: "unknown",
              caption: "",
            },
          };
        }

        return {
          success: false,
          error:
            "Instagram is forcing app-only playback for this reel. Media not accessible.",
        };
      }

      await this.handleCookieDialog(page);
      await this.handleLoginPopup(page);
      await page.waitForSelector("main article", { timeout: 40000 });

      const nextButtonSelector = 'button[aria-label="Next"]';
      let isCarousel = (await page.locator(nextButtonSelector).count()) > 0;

      // ⛔ Override if .mp4 was intercepted before carousel scraping starts
      // if (this.interceptedVideoUrls.length > 0 && !url.includes("/p/")) {
      //   console.log("Reel detected. Forcing video extraction...");
      //   isCarousel = false;
      // }

      const isReel = url.includes("/reel/");
      const mp4Intercepted = this.interceptedVideoUrls.length > 0;

      if (isReel && mp4Intercepted) {
        console.log("Reel post with intercepted .mp4. Returning only video...");
        const bestVideo = [...new Set(this.interceptedVideoUrls)].pop();
        return {
          success: true,
          data: {
            items: [{ type: "video", url: bestVideo }],
            is_carousel: false,
            username: "unknown",
            caption: "",
          },
        };
      }

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
        username: "unknown",
        caption: "",
      };

      console.log("responseData", responseData);
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
