// // // optimized code with old one
// const { chromium } = require("playwright");
// const config = require("../config/config");

// class InstagramScraper { 
//   constructor() {
//     this.browser = null;
//     this.userAgent = config.instagram.userAgent;
//     this.interceptedVideoUrls = []; // NEW: for .mp4 reel fallback
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
//       await allowButton.waitFor({ state: "visible", timeout: 3000 });
//       console.log('Found "Allow all cookies" button. Clicking it.');
//       await allowButton.click();
//       await page.waitForTimeout(2000);
//     } catch (error) {
//       console.log("No cookie dialog found or it timed out, proceeding...");
//     }
//   }

//   async handleLoginPopup(page) {
//     try {
//       const dialogSelector = 'div[role="dialog"]';
//       await page.waitForSelector(dialogSelector, {
//         state: "visible",
//         timeout: 3000,
//       });
//       console.log("✅ Found login popup. Attempting to close...");
//       try {
//         const closeButtonSelector =
//           'div[role="dialog"] button[aria-label="Close"]';
//         const closeButton = page.locator(closeButtonSelector);
//         await closeButton.click({ timeout: 1500 });
//         console.log(
//           "Popup closed successfully by clicking the 'Close' button."
//         );
//       } catch (error) {
//         console.log(
//           "Could not find a 'Close' button. Using fallback: clicking outside popup."
//         );
//         await page.locator("body").click({ position: { x: 10, y: 10 } });
//         console.log("Popup closed successfully by clicking outside.");
//       }
//       await page.waitForTimeout(1000);
//     } catch (error) {
//       console.log("No login popup was found, proceeding...");
//     }
//   }

//   async clickAndScrapeCarousel(page) {
//     const nextButtonSelector = 'button[aria-label="Next"]';
//     const listSelector = "ul._acay";
//     const collectedMedia = new Map();

//     while (true) {
//       try {
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

//         currentMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             console.log(
//               `[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`
//             );
//             collectedMedia.set(media.url, media);
//           }
//         });

//         const nextButton = page.locator(nextButtonSelector);
//         await nextButton.waitFor({ state: "visible", timeout: 2000 });
//         await nextButton.click();
//         await page.waitForTimeout(500);
//       } catch (error) {
//         console.log(
//           "✅ Reached the end of the carousel. Finalizing collection."
//         );
//         const lastMediaOnPage = await page.evaluate((selector) => {
//           const results = [];
//           const list = document.querySelector(selector);
//           if (!list) return results;
//           const listItems = list.querySelectorAll("li._acaz");
//           listItems.forEach((item) => {
//             const video = item.querySelector("video");
//             if (video && video.src)
//               results.push({ type: "video", url: video.src });
//             const img = item.querySelector("img.x5yr21d");
//             if (img && img.src) results.push({ type: "image", url: img.src });
//           });
//           return results;
//         }, listSelector);

//         lastMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             console.log(
//               `[+] Found final media: ${media.type} at ${
//                 collectedMedia.size + 1
//               }`
//             );
//             collectedMedia.set(media.url, media);
//           }
//         });

//         break;
//       }
//     }

//     console.log(`Total unique media items found: ${collectedMedia.size}.`);
//     return Array.from(collectedMedia.values());
//   }

//   async scrapeSingleMedia(page) {
//     const tryGetMedia = async () => {
//       return await page.evaluate(() => {
//         const results = [];
  
//         // Priority 1: Get video if available (not blob)
//         const video = document.querySelector("video");
//         if (video && video.src && !video.src.startsWith("blob:")) {
//           results.push({ type: "video", url: video.src });
//         }
  
//         // Priority 2: Clean images (non-thumbnail)
//         const images = Array.from(document.querySelectorAll("img"))
//           .map((img) => img.src)
//           .filter(
//             (src) =>
//               src &&
//               !src.includes("profile_pic") &&
//               !src.includes("/s150x150") &&
//               !src.includes("/s320x320") &&
//               !src.includes("/s240x240") &&
//               !src.includes("/vp/") &&
//               !src.includes("stp=")
//           );
  
//         if (images.length) {
//           results.push({ type: "image", url: images[0] });
//         }
  
//         return results;
//       });
//     };
  
//     let media = await tryGetMedia();
//     if (media.length && media[0].type === "video") return media;
  
//     // Priority 3: Try clicking play if present
//     const playButton = page.locator('div[role="button"][aria-label*="Play"]');
//     if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
//       await playButton.click().catch(() => {});
//       await page.waitForTimeout(2000);
//       media = await tryGetMedia();
//       if (media.length && media[0].type === "video") return media;
//     }
  
//     // Priority 4: Scroll to trigger lazy-load
//     await page.mouse.wheel(0, 200);
//     await page.waitForTimeout(2000);
//     media = await tryGetMedia();
//     if (media.length && media[0].type === "video") return media;
  
//     // Priority 5: Directly target known image containers
//     const fallbackImage = await page.evaluate(() => {
//       const results = [];
  
//       // div._aagv > img.x5yr21d (used in many single image posts)
//       const container = document.querySelector("div._aagv");
//       if (container) {
//         const img = container.querySelector("img.x5yr21d");
//         if (img && img.src) {
//           results.push({ type: "image", url: img.src });
//           return results;
//         }
//       }
  
//       // Fallback: any main-area image with correct class
//       const mainImg = document.querySelector("main img.x5yr21d");
//       if (mainImg && mainImg.src) {
//         results.push({ type: "image", url: mainImg.src });
//       }
  
//       return results;
//     });
  
//     if (fallbackImage.length) return fallbackImage;
  
//     // Priority 6: Use intercepted .mp4
//     if (this.interceptedVideoUrls.length > 0) {
//       const unique = [...new Set(this.interceptedVideoUrls)];
//       const bestVideo = unique.pop();
//       return [{ type: "video", url: bestVideo }];
//     }
  
//     // Priority 7: Fallback to OG meta
//     const ogFallback = await page.evaluate(() => {
//       const result = [];
//       const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
//       const ogImage = document.querySelector('meta[property="og:image"]')?.content;
//       if (ogVideo) result.push({ type: "video", url: ogVideo });
//       else if (
//         ogImage &&
//         !ogImage.includes("profile_pic") &&
//         !ogImage.includes("/s150x150") &&
//         !ogImage.includes("stp=")
//       )
//         result.push({ type: "image", url: ogImage });
//       return result;
//     });
  
//     return ogFallback.length ? ogFallback : [];
//   }
  

//   async getMediaInfo(url) {
//     await this.launchBrowser();
//     const context = await this.browser.newContext({
//       userAgent: this.userAgent,
//     });
//     const page = await context.newPage();
//     this.interceptedVideoUrls = []; // Clear previous

//     try {
//       // NEW: Intercept network requests to catch .mp4 videos
//       await page.route("**/*", async (route) => {
//         const reqUrl = route.request().url();
//         if (
//           reqUrl.includes(".mp4") &&
//           !reqUrl.includes("bytestart") &&
//           !reqUrl.includes("byteend") &&
//           !reqUrl.includes("profile_pic")
//         ) {
//           console.log("[+] Intercepted .mp4 URL:", reqUrl);
//           this.interceptedVideoUrls.push(reqUrl);
//         }
//         await route.continue();
//       });

//       console.log(`Navigating to ${url}...`);
//       await page.goto(url, {
//         waitUntil: "domcontentloaded",
//         timeout: config.instagram.timeout,
//       });

//       // Check for app gatekeeper overlay (like "Watch the full reel on Instagram")
//       const forceAppOverlay = await page.evaluate(() => {
//         return Boolean(
//           document
//             .querySelector("h2")
//             ?.innerText?.toLowerCase()
//             .includes("watch") &&
//             document
//               .querySelector("button")
//               ?.innerText?.toLowerCase()
//               .includes("open instagram")
//         );
//       });

//       if (forceAppOverlay) {
//         console.log(
//           "❌ Instagram is showing app-only reel screen. Attempting fallback..."
//         );

//         const ogVideo = await page.evaluate(() => {
//           return (
//             document.querySelector('meta[property="og:video"]')?.content || null
//           );
//         });

//         if (ogVideo) {
//           return {
//             success: true,
//             data: {
//               items: [{ type: "video", url: ogVideo }],
//               is_carousel: false,
//               username: "unknown",
//               caption: "",
//             },
//           };
//         }

//         const fallback = this.interceptedVideoUrls.length
//           ? [...new Set(this.interceptedVideoUrls)].pop()
//           : null;

//         if (fallback) {
//           return {
//             success: true,
//             data: {
//               items: [{ type: "video", url: fallback }],
//               is_carousel: false,
//               username: "unknown",
//               caption: "",
//             },
//           };
//         }

//         return {
//           success: false,
//           error:
//             "Instagram is forcing app-only playback for this reel. Media not accessible.",
//         };
//       }

//       await this.handleCookieDialog(page);
//       await this.handleLoginPopup(page);
//       // await page.waitForSelector("main article", { timeout: 40000 });

//       if (!this.interceptedVideoUrls.length) {
//         await page.waitForSelector("main article", { timeout: 40000 });
//       } else {
//         console.log("Skipping 'main article' wait — .mp4 intercepted already.");
//       } 

//       const nextButtonSelector = 'button[aria-label="Next"]';
//       let isCarousel = (await page.locator(nextButtonSelector).count()) > 0;

//       // ⛔ Override if .mp4 was intercepted before carousel scraping starts
//       if (this.interceptedVideoUrls.length > 0 && !url.includes("/p/")) {
//         console.log("Reel detected. Forcing video extraction...");
//         isCarousel = false;
//       }

//       const isReel = url.includes("/reel/");
//       const mp4Intercepted = this.interceptedVideoUrls.length > 0;

//       if (isReel && mp4Intercepted) {
//         console.log("Reel post with intercepted .mp4. Returning only video...");
//         const bestVideo = [...new Set(this.interceptedVideoUrls)].pop();
//         return {
//           success: true,
//           data: {
//             items: [{ type: "video", url: bestVideo }],
//             is_carousel: false,
//             username: "unknown",
//             caption: "",
//           },
//         };
//       }

//       let extractedItems = [];

//       if (isCarousel) {
//         console.log("Carousel post detected. Starting carousel scraping...");
//         extractedItems = await this.clickAndScrapeCarousel(page);
//       } else {
//         console.log("Single media post detected. Scraping single item...");
//         extractedItems = await this.scrapeSingleMedia(page);
//       }

//       if (extractedItems.length === 0) {
//         throw new Error("Scraping failed to find any media items.");
//       }

//       const responseData = {
//         items: extractedItems,
//         is_carousel: extractedItems.length > 1,
//         username: "unknown",
//         caption: "",
//       };

//       console.log("responseData", responseData);
//       return { success: true, data: responseData };
//     } catch (error) {
//       console.error("Error in getMediaInfo with Playwright:", error);
//       const screenshotPath = `error_screenshot_${Date.now()}.png`;
//       await page.screenshot({ path: screenshotPath, fullPage: true });
//       console.log(`Screenshot for debugging saved to ${screenshotPath}`);
//       return {
//         success: false,
//         error: `Failed to scrape media: ${error.message}`,
//       };
//     } finally {
//       await context.close();
//     }
//   }
// }

// module.exports = InstagramScraper;







// // Optimized code with continue with web
// // instagramUtils.js
// const { chromium } = require("playwright");
// const config = require("../config/config");

// class InstagramScraper {
//   constructor() {
//     this.browser = null;
//     this.userAgent = config.instagram.userAgent;
//     this.interceptedVideoUrls = []; // NEW: for .mp4 reel fallback
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
//       await allowButton.waitFor({ state: "visible", timeout: 3000 });
//       console.log('Found "Allow all cookies" button. Clicking it.');
//       await allowButton.click();
//       await page.waitForTimeout(2000);
//     } catch (error) {
//       console.log("No cookie dialog found or it timed out, proceeding...");
//     }
//   }

//   async handleLoginPopup(page) {
//     try {
//       const dialogSelector = 'div[role="dialog"]';
//       await page.waitForSelector(dialogSelector, {
//         state: "visible",
//         timeout: 3000,
//       });
//       console.log("✅ Found login popup. Attempting to close...");
//       try {
//         const closeButtonSelector =
//           'div[role="dialog"] button[aria-label="Close"]';
//         const closeButton = page.locator(closeButtonSelector);
//         await closeButton.click({ timeout: 1500 });
//         console.log(
//           "Popup closed successfully by clicking the 'Close' button."
//         );
//       } catch (error) {
//         console.log(
//           "Could not find a 'Close' button. Using fallback: clicking outside popup."
//         );
//         await page.locator("body").click({ position: { x: 10, y: 10 } });
//         console.log("Popup closed successfully by clicking outside.");
//       }
//       await page.waitForTimeout(1000);
//     } catch (error) {
//       console.log("No login popup was found, proceeding...");
//     }
//   }

//   async clickAndScrapeCarousel(page) {
//     const nextButtonSelector = 'button[aria-label="Next"]';
//     const listSelector = "ul._acay";
//     const collectedMedia = new Map();

//     while (true) {
//       try {
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

//         currentMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             console.log(
//               `[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`
//             );
//             collectedMedia.set(media.url, media);
//           }
//         });

//         const nextButton = page.locator(nextButtonSelector);
//         await nextButton.waitFor({ state: "visible", timeout: 2000 });
//         await nextButton.click();
//         await page.waitForTimeout(500);
//       } catch (error) {
//         console.log(
//           "✅ Reached the end of the carousel. Finalizing collection."
//         );
//         const lastMediaOnPage = await page.evaluate((selector) => {
//           const results = [];
//           const list = document.querySelector(selector);
//           if (!list) return results;
//           const listItems = list.querySelectorAll("li._acaz");
//           listItems.forEach((item) => {
//             const video = item.querySelector("video");
//             if (video && video.src)
//               results.push({ type: "video", url: video.src });
//             const img = item.querySelector("img.x5yr21d");
//             if (img && img.src) results.push({ type: "image", url: img.src });
//           });
//           return results;
//         }, listSelector);

//         lastMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             console.log(
//               `[+] Found final media: ${media.type} at ${
//                 collectedMedia.size + 1
//               }`
//             );
//             collectedMedia.set(media.url, media);
//           }
//         });

//         break;
//       }
//     }

//     console.log(`Total unique media items found: ${collectedMedia.size}.`);
//     return Array.from(collectedMedia.values());
//   }

//   async scrapeSingleMedia(page) {
//     const tryGetMedia = async () => {
//       return await page.evaluate(() => {
//         const results = [];

//         // Priority 1: Get video if available (not blob)
//         const video = document.querySelector("video");
//         if (video && video.src && !video.src.startsWith("blob:")) {
//           results.push({ type: "video", url: video.src });
//         }

//         // Priority 2: Clean images (non-thumbnail)
//         const images = Array.from(document.querySelectorAll("img"))
//           .map((img) => img.src)
//           .filter(
//             (src) =>
//               src &&
//               !src.includes("profile_pic") &&
//               !src.includes("/s150x150") &&
//               !src.includes("/s320x320") &&
//               !src.includes("/s240x240") &&
//               !src.includes("/vp/") &&
//               !src.includes("stp=")
//           );

//         if (images.length) {
//           results.push({ type: "image", url: images[0] });
//         }

//         return results;
//       });
//     };

//     let media = await tryGetMedia();
//     if (media.length && media[0].type === "video") return media;

//     // Priority 3: Try clicking play if present
//     const playButton = page.locator('div[role="button"][aria-label*="Play"]');
//     if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
//       await playButton.click().catch(() => {});
//       await page.waitForTimeout(2000);
//       media = await tryGetMedia();
//       if (media.length && media[0].type === "video") return media;
//     }

//     // Priority 4: Scroll to trigger lazy-load
//     await page.mouse.wheel(0, 200);
//     await page.waitForTimeout(2000);
//     media = await tryGetMedia();
//     if (media.length && media[0].type === "video") return media;

//     // Priority 5: Directly target known image containers
//     const fallbackImage = await page.evaluate(() => {
//       const results = [];

//       // div._aagv > img.x5yr21d (used in many single image posts)
//       const container = document.querySelector("div._aagv");
//       if (container) {
//         const img = container.querySelector("img.x5yr21d");
//         if (img && img.src) {
//           results.push({ type: "image", url: img.src });
//           return results;
//         }
//       }

//       // Fallback: any main-area image with correct class
//       const mainImg = document.querySelector("main img.x5yr21d");
//       if (mainImg && mainImg.src) {
//         results.push({ type: "image", url: mainImg.src });
//       }

//       return results;
//     });

//     if (fallbackImage.length) return fallbackImage;

//     // Priority 6: Use intercepted .mp4
//     if (this.interceptedVideoUrls.length > 0) {
//       const unique = [...new Set(this.interceptedVideoUrls)];
//       const bestVideo = unique.pop();
//       return [{ type: "video", url: bestVideo }];
//     }

//     // Priority 7: Fallback to OG meta
//     const ogFallback = await page.evaluate(() => {
//       const result = [];
//       const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
//       const ogImage = document.querySelector('meta[property="og:image"]')?.content;
//       if (ogVideo) result.push({ type: "video", url: ogVideo });
//       else if (
//         ogImage &&
//         !ogImage.includes("profile_pic") &&
//         !ogImage.includes("/s150x150") &&
//         !ogImage.includes("stp=")
//       )
//         result.push({ type: "image", url: ogImage });
//       return result;
//     });

//     return ogFallback.length ? ogFallback : [];
//   }

//   async getMediaInfo(url) {
//     await this.launchBrowser();
//     const context = await this.browser.newContext({
//       userAgent: this.userAgent,
//     });
//     const page = await context.newPage();
//     this.interceptedVideoUrls = []; // Clear previous

//     try {
//       // NEW: Intercept network requests to catch .mp4 videos
//       await page.route("**/*", async (route) => {
//         const reqUrl = route.request().url();
//         if (
//           reqUrl.includes(".mp4") &&
//           !reqUrl.includes("bytestart") &&
//           !reqUrl.includes("byteend") &&
//           !reqUrl.includes("profile_pic")
//         ) {
//           console.log("[+] Intercepted .mp4 URL:", reqUrl);
//           this.interceptedVideoUrls.push(reqUrl);
//         }
//         await route.continue();
//       });

//       console.log(`Navigating to ${url}...`);
//       await page.goto(url, {
//         waitUntil: "domcontentloaded",
//         timeout: config.instagram.timeout,
//       });

//       // MODIFIED: Check for and handle the "Watch in app" overlay
//       const forceAppOverlay = await page.evaluate(() => {
//         const h2 = document.querySelector("h2");
//         return Boolean(
//           h2 && h2.textContent.toLowerCase().includes("watch this reel in the app")
//         );
//       });

//       if (forceAppOverlay) {
//         console.log(
//           "❌ Instagram is showing app-only reel screen. Clicking 'Continue on web'..."
//         );
//         try {
//           // Use Playwright's recommended text selector to find and click the link
//           await page.getByText("Continue on web").click({ timeout: 5000 });
//           console.log("✅ Clicked 'Continue on web'. Waiting for page to load content...");
//           // After clicking, we expect the main content to load.
//           // The script later waits for "main article", so let's wait for it here to confirm success.
//           await page.waitForSelector("main article", { timeout: 10000 });
//           console.log("✅ Content loaded after clicking 'Continue on web'.");
//         } catch (error) {
//           console.error(
//             "Could not click 'Continue on web', or content did not load. Attempting fallback...",
//             error
//           );

//           // Fallback logic from the original code
//           const ogVideo = await page.evaluate(() => {
//             return (
//               document.querySelector('meta[property="og:video"]')?.content || null
//             );
//           });

//           if (ogVideo) {
//             return {
//               success: true,
//               data: {
//                 items: [{ type: "video", url: ogVideo }],
//                 is_carousel: false,
//                 username: "unknown",
//                 caption: "",
//               },
//             };
//           }

//           const fallback = this.interceptedVideoUrls.length
//             ? [...new Set(this.interceptedVideoUrls)].pop()
//             : null;

//           if (fallback) {
//             return {
//               success: true,
//               data: {
//                 items: [{ type: "video", url: fallback }],
//                 is_carousel: false,
//                 username: "unknown",
//                 caption: "",
//               },
//             };
//           }

//           return {
//             success: false,
//             error:
//               "Instagram is forcing app-only playback for this reel, and the web fallback failed.",
//           };
//         }
//       }

//       await this.handleCookieDialog(page);
//       await this.handleLoginPopup(page);

//       if (!this.interceptedVideoUrls.length) {
//         await page.waitForSelector("main article", { timeout: 40000 });
//       } else {
//         console.log("Skipping 'main article' wait — .mp4 intercepted already.");
//       }

//       const nextButtonSelector = 'button[aria-label="Next"]';
//       let isCarousel = (await page.locator(nextButtonSelector).count()) > 0;

//       // ⛔ Override if .mp4 was intercepted before carousel scraping starts
//       if (this.interceptedVideoUrls.length > 0 && !url.includes("/p/")) {
//         console.log("Reel detected. Forcing video extraction...");
//         isCarousel = false;
//       }

//       const isReel = url.includes("/reel/");
//       const mp4Intercepted = this.interceptedVideoUrls.length > 0;

//       if (isReel && mp4Intercepted) {
//         console.log("Reel post with intercepted .mp4. Returning only video...");
//         const bestVideo = [...new Set(this.interceptedVideoUrls)].pop();
//         return {
//           success: true,
//           data: {
//             items: [{ type: "video", url: bestVideo }],
//             is_carousel: false,
//             username: "unknown",
//             caption: "",
//           },
//         };
//       }

//       let extractedItems = [];

//       if (isCarousel) {
//         console.log("Carousel post detected. Starting carousel scraping...");
//         extractedItems = await this.clickAndScrapeCarousel(page);
//       } else {
//         console.log("Single media post detected. Scraping single item...");
//         extractedItems = await this.scrapeSingleMedia(page);
//       }

//       if (extractedItems.length === 0) {
//         throw new Error("Scraping failed to find any media items.");
//       }

//       const responseData = {
//         items: extractedItems,
//         is_carousel: extractedItems.length > 1,
//         username: "unknown",
//         caption: "",
//       };

//       console.log("responseData", responseData);
//       return { success: true, data: responseData };
//     } catch (error) {
//       console.error("Error in getMediaInfo with Playwright:", error);
//       const screenshotPath = `error_screenshot_${Date.now()}.png`;
//       await page.screenshot({ path: screenshotPath, fullPage: true });
//       console.log(`Screenshot for debugging saved to ${screenshotPath}`);
//       return {
//         success: false,
//         error: `Failed to scrape media: ${error.message}`,
//       };
//     } finally {
//       await context.close();
//     }
//   }
// }

// module.exports = InstagramScraper;




// // instagramUtils.js
const { chromium } = require("playwright");
const config = require("../config/config");

class InstagramScraper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.userAgent = config.instagram.userAgent;
    this.maxRetries = 3; // Maximum number of retries for operations
    this.retryDelay = 2000; // Delay between retries in milliseconds
    this.interceptedVideoUrls = [];
  }

  async launchBrowser() {
    if (!this.browser) {
      console.log("Launching new browser instance...");
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      
      // Create a persistent context
      this.context = await this.browser.newContext({
        userAgent: this.userAgent,
        viewport: { width: 1280, height: 800 },
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
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
      const allowButton = page.getByRole('button', { name: /Allow all cookies/i });
      await allowButton.waitFor({ state: "visible", timeout: 3000 });
      console.log('Found "Allow all cookies" button. Clicking it.');
      await allowButton.click();
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log("No cookie dialog found or it timed out, proceeding...");
    }
  }

  async handleLoginPopup(page) {
    try {
      const dialogSelector = 'div[role="dialog"]';
      await page.waitForSelector(dialogSelector, { state: "visible", timeout: 3000 });
      console.log("✅ Found login popup. Attempting to close...");
      const closeButton = page.locator('div[role="dialog"] button[aria-label="Close"]');
      await closeButton.click({ timeout: 1500 });
      console.log("Popup closed successfully by clicking the 'Close' button.");
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
            console.log(`[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`);
            collectedMedia.set(media.url, media);
          }
        });

        const nextButton = page.locator(nextButtonSelector);
        await nextButton.waitFor({ state: "visible", timeout: 2000 });
        await nextButton.click();
        await page.waitForTimeout(500);
      } catch (error) {
        console.log("✅ Reached the end of the carousel or timed out. Finalizing collection.");
        const lastMediaOnPage = await page.evaluate((selector) => {
          const results = [];
          const list = document.querySelector(selector);
          if (!list) return results;
          const listItems = list.querySelectorAll("li._acaz");
          listItems.forEach((item) => {
            const video = item.querySelector("video");
            if (video && video.src) results.push({ type: "video", url: video.src });
            const img = item.querySelector("img.x5yr21d");
            if (img && img.src) results.push({ type: "image", url: img.src });
          });
          return results;
        }, listSelector);

        lastMediaOnPage.forEach((media) => {
          if (media.url && !collectedMedia.has(media.url)) {
            console.log(`[+] Found final media: ${media.type} at ${collectedMedia.size + 1}`);
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
        const video = document.querySelector("video");
        if (video && video.src && !video.src.startsWith("blob:")) {
          results.push({ type: "video", url: video.src });
        }
        const images = Array.from(document.querySelectorAll("img.x5yr21d"))
          .map((img) => img.src)
          .filter(src => src && !src.includes("profile_pic"));

        if (images.length) {
          results.push({ type: "image", url: images[0] });
        }
        return results;
      });
    };

    let media = await tryGetMedia();
    if (media.length) return media;

    if (this.interceptedVideoUrls.length > 0) {
      const unique = [...new Set(this.interceptedVideoUrls)];
      const bestVideo = unique.pop();
      return [{ type: "video", url: bestVideo }];
    }

    const ogFallback = await page.evaluate(() => {
      const result = [];
      const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
      const ogImage = document.querySelector('meta[property="og:image"]')?.content;
      if (ogVideo) result.push({ type: "video", url: ogVideo });
      else if (ogImage && !ogImage.includes("profile_pic"))
        result.push({ type: "image", url: ogImage });
      return result;
    });

    return ogFallback.length ? ogFallback : [];
  }

  async getMediaInfo(url) {
    try {
      // Ensure browser and context are initialized
      await this.launchBrowser();
      
      const page = await this.context.newPage();
      this.interceptedVideoUrls = [];

      try {
        await page.route("**/*", async (route) => {
          const reqUrl = route.request().url();
          if (reqUrl.endsWith(".mp4") && !reqUrl.includes("bytestart")) {
            this.interceptedVideoUrls.push(reqUrl);
          }
          await route.continue();
        });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: config.instagram.timeout,
        });

        await this.handleCookieDialog(page);
        await this.handleLoginPopup(page);

        const successLocator = page.locator('main[role="main"]');
        const failureLocator = page.getByText(/Sorry, this page isn't available/i);

        console.log("Waiting for page content or error message...");
        await Promise.race([
          successLocator.waitFor({ state: 'visible', timeout: 15000 }),
          failureLocator.waitFor({ state: 'visible', timeout: 15000 }),
        ]);

        if (await failureLocator.isVisible()) {
          throw new Error("The requested content is not available. It may have been deleted or the account is private.");
        }

        if (!await successLocator.isVisible()) {
          throw new Error("Could not determine page content after 15 seconds.");
        }
        
        console.log("Page content loaded successfully.");
        
        const nextButtonSelector = 'button[aria-label="Next"]';
        let isCarousel = (await page.locator(nextButtonSelector).count()) > 0;
        let extractedItems = [];

        if (isCarousel) {
          console.log("Carousel post detected. Starting scraping...");
          extractedItems = await this.clickAndScrapeCarousel(page);
        } else {
          console.log("Single media post detected. Scraping...");
          extractedItems = await this.scrapeSingleMedia(page);
        }

        if (extractedItems.length === 0) {
          throw new Error("Scraping failed. No media items could be found on the page.");
        }
        
        const metadata = await page.evaluate(() => {
          const usernameLink = document.querySelector('header a[href*="/"]');
          const username = usernameLink ? usernameLink.textContent : 'unknown';
          const captionDiv = document.querySelector('h1');
          const caption = captionDiv ? captionDiv.textContent : '';
          return { username, caption };
        });

        const responseData = {
          items: extractedItems,
          is_carousel: extractedItems.length > 1,
          username: metadata.username,
          caption: metadata.caption,
        };

        console.log("Scraping successful. Data:", responseData);
        return { success: true, data: responseData };
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error(`Error in getMediaInfo with Playwright: ${error.message}`);
      const screenshotPath = `error_screenshot_${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot for debugging saved to ${screenshotPath}`);
      return {
        success: false,
        error: `Failed to scrape media: ${error.message}`,
      };
    }
  }
}

module.exports = InstagramScraper;