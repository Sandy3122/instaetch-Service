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

  // async scrapeSingleMedia(page) {
  //   const tryGetMedia = async () => {
  //     return await page.evaluate(() => {
  //       const results = [];
  
  //       // Priority 1: Get video if available (not blob)
  //       const video = document.querySelector("video");
  //       if (video && video.src && !video.src.startsWith("blob:")) {
  //         results.push({ type: "video", url: video.src });
  //       }
  
  //       // Priority 2: Clean images (non-thumbnail)
  //       const images = Array.from(document.querySelectorAll("img"))
  //         .map((img) => img.src)
  //         .filter(
  //           (src) =>
  //             src &&
  //             !src.includes("profile_pic") &&
  //             !src.includes("/s150x150") &&
  //             !src.includes("/s320x320") &&
  //             !src.includes("/s240x240") &&
  //             !src.includes("/vp/") &&
  //             !src.includes("stp=")
  //         );
  
  //       if (images.length) {
  //         results.push({ type: "image", url: images[0] });
  //       }
  
  //       return results;
  //     });
  //   };
  
  //   let media = await tryGetMedia();
  //   if (media.length && media[0].type === "video") return media;
  
  //   // Priority 3: Try clicking play if present
  //   const playButton = page.locator('div[role="button"][aria-label*="Play"]');
  //   if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
  //     await playButton.click().catch(() => {});
  //     await page.waitForTimeout(2000);
  //     media = await tryGetMedia();
  //     if (media.length && media[0].type === "video") return media;
  //   }
  
  //   // Priority 4: Scroll to trigger lazy-load
  //   await page.mouse.wheel(0, 200);
  //   await page.waitForTimeout(2000);
  //   media = await tryGetMedia();
  //   if (media.length && media[0].type === "video") return media;
  
  //   // Priority 5: Directly target known image containers
  //   const fallbackImage = await page.evaluate(() => {
  //     const results = [];
  
  //     // div._aagv > img.x5yr21d (used in many single image posts)
  //     const container = document.querySelector("div._aagv");
  //     if (container) {
  //       const img = container.querySelector("img.x5yr21d");
  //       if (img && img.src) {
  //         results.push({ type: "image", url: img.src });
  //         return results;
  //       }
  //     }
  
  //     // Fallback: any main-area image with correct class
  //     const mainImg = document.querySelector("main img.x5yr21d");
  //     if (mainImg && mainImg.src) {
  //       results.push({ type: "image", url: mainImg.src });
  //     }
  
  //     return results;
  //   });
  
  //   if (fallbackImage.length) return fallbackImage;
  
  //   // Priority 6: Use intercepted .mp4
  //   if (this.interceptedVideoUrls.length > 0) {
  //     const unique = [...new Set(this.interceptedVideoUrls)];
  //     const bestVideo = unique.pop();
  //     return [{ type: "video", url: bestVideo }];
  //   }
  
  //   // Priority 7: Fallback to OG meta
  //   const ogFallback = await page.evaluate(() => {
  //     const result = [];
  //     const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
  //     const ogImage = document.querySelector('meta[property="og:image"]')?.content;
  //     if (ogVideo) result.push({ type: "video", url: ogVideo });
  //     else if (
  //       ogImage &&
  //       !ogImage.includes("profile_pic") &&
  //       !ogImage.includes("/s150x150") &&
  //       !ogImage.includes("stp=")
  //     )
  //       result.push({ type: "image", url: ogImage });
  //     return result;
  //   });
  
  //   return ogFallback.length ? ogFallback : [];
  // }
  

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




// // // instagramUtils.js
// const { chromium } = require("playwright");
// const config = require("../config/config");

// class InstagramScraper {
//   constructor() {
//     this.browser = null;
//     this.context = null;
//     this.userAgent = config.instagram.userAgent;
//     this.maxRetries = 3; // Maximum number of retries for operations
//     this.retryDelay = 2000; // Delay between retries in milliseconds
//     this.interceptedVideoUrls = [];
//   }

//   async launchBrowser() {
//     if (!this.browser) {
//       console.log("Launching new browser instance...");
//       this.browser = await chromium.launch({
//         headless: true,
//         args: ["--no-sandbox", "--disable-setuid-sandbox"],
//       });
      
//       // Create a persistent context
//       this.context = await this.browser.newContext({
//         userAgent: this.userAgent,
//         viewport: { width: 1280, height: 800 },
//       });
//     }
//     return this.browser;
//   }

//   async closeBrowser() {
//     if (this.context) {
//       await this.context.close();
//       this.context = null;
//     }
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
//       const allowButton = page.getByRole('button', { name: /Allow all cookies/i });
//       await allowButton.waitFor({ state: "visible", timeout: 3000 });
//       console.log('Found "Allow all cookies" button. Clicking it.');
//       await allowButton.click();
//       await page.waitForTimeout(1000);
//     } catch (error) {
//       console.log("No cookie dialog found or it timed out, proceeding...");
//     }
//   }

//   async handleLoginPopup(page) {
//     try {
//       const dialogSelector = 'div[role="dialog"]';
//       await page.waitForSelector(dialogSelector, { state: "visible", timeout: 3000 });
//       console.log("✅ Found login popup. Attempting to close...");
//       const closeButton = page.locator('div[role="dialog"] button[aria-label="Close"]');
//       await closeButton.click({ timeout: 1500 });
//       console.log("Popup closed successfully by clicking the 'Close' button.");
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
//             console.log(`[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`);
//             collectedMedia.set(media.url, media);
//           }
//         });

//         const nextButton = page.locator(nextButtonSelector);
//         await nextButton.waitFor({ state: "visible", timeout: 2000 });
//         await nextButton.click();
//         await page.waitForTimeout(500);
//       } catch (error) {
//         console.log("✅ Reached the end of the carousel or timed out. Finalizing collection.");
//         const lastMediaOnPage = await page.evaluate((selector) => {
//           const results = [];
//           const list = document.querySelector(selector);
//           if (!list) return results;
//           const listItems = list.querySelectorAll("li._acaz");
//           listItems.forEach((item) => {
//             const video = item.querySelector("video");
//             if (video && video.src) results.push({ type: "video", url: video.src });
//             const img = item.querySelector("img.x5yr21d");
//             if (img && img.src) results.push({ type: "image", url: img.src });
//           });
//           return results;
//         }, listSelector);

//         lastMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             console.log(`[+] Found final media: ${media.type} at ${collectedMedia.size + 1}`);
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
//         const video = document.querySelector("video");
//         if (video && video.src && !video.src.startsWith("blob:")) {
//           results.push({ type: "video", url: video.src });
//         }
//         const images = Array.from(document.querySelectorAll("img.x5yr21d"))
//           .map((img) => img.src)
//           .filter(src => src && !src.includes("profile_pic"));

//         if (images.length) {
//           results.push({ type: "image", url: images[0] });
//         }
//         return results;
//       });
//     };

//     let media = await tryGetMedia();
//     if (media.length) return media;

//     if (this.interceptedVideoUrls.length > 0) {
//       const unique = [...new Set(this.interceptedVideoUrls)];
//       const bestVideo = unique.pop();
//       return [{ type: "video", url: bestVideo }];
//     }

//     const ogFallback = await page.evaluate(() => {
//       const result = [];
//       const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
//       const ogImage = document.querySelector('meta[property="og:image"]')?.content;
//       if (ogVideo) result.push({ type: "video", url: ogVideo });
//       else if (ogImage && !ogImage.includes("profile_pic"))
//         result.push({ type: "image", url: ogImage });
//       return result;
//     });

//     return ogFallback.length ? ogFallback : [];
//   }

//   async getMediaInfo(url) {
//     try {
//       // Ensure browser and context are initialized
//       await this.launchBrowser();
      
//       const page = await this.context.newPage();
//       this.interceptedVideoUrls = [];

//       try {
//         await page.route("**/*", async (route) => {
//           const reqUrl = route.request().url();
//           if (reqUrl.endsWith(".mp4") && !reqUrl.includes("bytestart")) {
//             this.interceptedVideoUrls.push(reqUrl);
//           }
//           await route.continue();
//         });

//         console.log(`Navigating to ${url}...`);
//         await page.goto(url, {
//           waitUntil: "domcontentloaded",
//           timeout: config.instagram.timeout,
//         });

//         await this.handleCookieDialog(page);
//         await this.handleLoginPopup(page);

//         const successLocator = page.locator('main[role="main"]');
//         const failureLocator = page.getByText(/Sorry, this page isn't available/i);

//         console.log("Waiting for page content or error message...");
//         await Promise.race([
//           successLocator.waitFor({ state: 'visible', timeout: 15000 }),
//           failureLocator.waitFor({ state: 'visible', timeout: 15000 }),
//         ]);

//         if (await failureLocator.isVisible()) {
//           throw new Error("The requested content is not available. It may have been deleted or the account is private.");
//         }

//         if (!await successLocator.isVisible()) {
//           throw new Error("Could not determine page content after 15 seconds.");
//         }
        
//         console.log("Page content loaded successfully.");
        
//         const nextButtonSelector = 'button[aria-label="Next"]';
//         let isCarousel = (await page.locator(nextButtonSelector).count()) > 0;
//         let extractedItems = [];

//         if (isCarousel) {
//           console.log("Carousel post detected. Starting scraping...");
//           extractedItems = await this.clickAndScrapeCarousel(page);
//         } else {
//           console.log("Single media post detected. Scraping...");
//           extractedItems = await this.scrapeSingleMedia(page);
//         }

//         if (extractedItems.length === 0) {
//           throw new Error("Scraping failed. No media items could be found on the page.");
//         }
        
//         const metadata = await page.evaluate(() => {
//           const usernameLink = document.querySelector('header a[href*="/"]');
//           const username = usernameLink ? usernameLink.textContent : 'unknown';
//           const captionDiv = document.querySelector('h1');
//           const caption = captionDiv ? captionDiv.textContent : '';
//           return { username, caption };
//         });

//         const responseData = {
//           items: extractedItems,
//           is_carousel: extractedItems.length > 1,
//           username: metadata.username,
//           caption: metadata.caption,
//         };

//         console.log("Scraping successful. Data:", responseData);
//         return { success: true, data: responseData };
//       } finally {
//         await page.close();
//       }
//     } catch (error) {
//       console.error(`Error in getMediaInfo with Playwright: ${error.message}`);
//       const screenshotPath = `error_screenshot_${Date.now()}.png`;
//       await page.screenshot({ path: screenshotPath, fullPage: true });
//       console.log(`Screenshot for debugging saved to ${screenshotPath}`);
//       return {
//         success: false,
//         error: `Failed to scrape media: ${error.message}`,
//       };
//     }
//   }
// }

// module.exports = InstagramScraper;










// // Login and Session Management
// // Scraper with Session Manager
// const { chromium } = require("playwright");
// const config = require("../config/config"); // Assuming config file exists

// class InstagramScraper {
//   /**
//    * Constructor for the InstagramScraper.
//    * @param {SessionManager} [sessionManager] - An optional instance of the SessionManager class,
//    * responsible for handling authenticated sessions. If not provided, or if it cannot provide
//    * an authenticated session, scraping will proceed unauthenticated.
//    */
//   constructor(sessionManager) {
//     // SessionManager is now optional. If not provided, the scraper will manage its own browser/context.
//     this.sessionManager = sessionManager || null; 
//     // If sessionManager is not provided, this.browser and this.context will be managed internally by getMediaInfo
//     this.userAgent = config.instagram.userAgent;
//     this.maxRetries = 3; // Maximum number of retries for operations
//     this.retryDelay = 2000; // Delay between retries in milliseconds
//     this.interceptedVideoUrls = [];
//   }

//   // Removed launchBro wser and closeBrowser as session management is now handled by SessionManager

//   /**
//    * Extracts the shortcode from an Instagram URL.
//    * @param {string} url - The Instagram URL.
//    * @returns {string|null} The shortcode if found, otherwise null.
//    */
//   extractShortcode(url) {
//     const match = url.match(/(\/p\/|\/reel\/|\/reels\/)([a-zA-Z0-9_-]+)/);
//     return match ? match[2] : null;
//   }

//   /**
//    * Handles the Instagram cookie consent dialog if it appears.
//    * @param {Page} page - The Playwright Page object.
//    */
//   async handleCookieDialog(page) {
//     try {
//       console.log("Checking for cookie consent dialog...");
//       const allowButton = page.getByRole('button', { name: /Allow all cookies/i });
//       await allowButton.waitFor({ state: "visible", timeout: 3000 });
//       console.log('Found "Allow all cookies" button. Clicking it.');
//       await allowButton.click();
//       await page.waitForTimeout(1000); // Small pause after clicking
//     } catch (error) {
//       console.log("No cookie dialog found or it timed out, proceeding...");
//     }
//   }

//   /**
//    * Handles the Instagram login popup if it appears after navigation.
//    * @param {Page} page - The Playwright Page object.
//    */
//   async handleLoginPopup(page) {
//     try {
//       const dialogSelector = 'div[role="dialog"]';
//       await page.waitForSelector(dialogSelector, { state: "visible", timeout: 3000 });
//       console.log("Found login popup. Attempting to close...");
//       const closeButton = page.locator('div[role="dialog"] button[aria-label="Close"]');
//       await closeButton.click({ timeout: 1500 });
//       console.log("Popup closed successfully by clicking the 'Close' button.");
//     } catch (error) {
//       console.log("No login popup was found, proceeding...");
//     }
//   }

//   /**
//    * Scrapes media from a carousel post by clicking through each item.
//    * @param {Page} page - The Playwright Page object.
//    * @returns {Array<object>} An array of collected media items (image/video URLs).
//    */
//   async clickAndScrapeCarousel(page) {
//     const nextButtonSelector = 'button[aria-label="Next"]';
//     const listSelector = "ul._acay"; // Selector for the carousel list
//     const collectedMedia = new Map(); // Using a Map to store unique media URLs

//     while (true) {
//       try {
//         // Evaluate the page to find current visible media (images/videos)
//         const currentMediaOnPage = await page.evaluate((selector) => {
//           const results = [];
//           const list = document.querySelector(selector);
//           if (!list) return results;

//           const listItems = list.querySelectorAll("li._acaz"); // Selector for individual carousel items
//           listItems.forEach((item) => {
//             const video = item.querySelector("video");
//             if (video && video.src) {
//               results.push({ type: "video", url: video.src });
//             }
//             const img = item.querySelector("img.x5yr21d"); // Selector for images in carousel
//             if (img && img.src) {
//               results.push({ type: "image", url: img.src });
//             }
//           });
//           return results;
//         }, listSelector);

//         // Add newly found media to the collection
//         currentMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             console.log(`[+] Found new media: ${media.type} at ${collectedMedia.size + 1}`);
//             collectedMedia.set(media.url, media);
//           }
//         });

//         // Try to click the next button to advance the carousel
//         const nextButton = page.locator(nextButtonSelector);
//         await nextButton.waitFor({ state: "visible", timeout: 2000 });
//         await nextButton.click();
//         await page.waitForTimeout(500); // Small pause after clicking next
//       } catch (error) {
//         // If next button is not found or times out, assume end of carousel
//         console.log("✅ Reached the end of the carousel or timed out. Finalizing collection.");
//         // Collect any remaining media on the last visible slide
//         const lastMediaOnPage = await page.evaluate((selector) => {
//           const results = [];
//           const list = document.querySelector(selector);
//           if (!list) return results;
//           const listItems = list.querySelectorAll("li._acaz");
//           listItems.forEach((item) => {
//             const video = item.querySelector("video");
//             if (video && video.src) results.push({ type: "video", url: video.src });
//             const img = item.querySelector("img.x5yr21d");
//             if (img && img.src) results.push({ type: "image", url: img.src });
//           });
//           return results;
//         }, listSelector);

//         lastMediaOnPage.forEach((media) => {
//           if (media.url && !collectedMedia.has(media.url)) {
//             console.log(`[+] Found final media: ${media.type} at ${collectedMedia.size + 1}`);
//             collectedMedia.set(media.url, media);
//           }
//         });

//         break; // Exit the loop
//       }
//     }

//     console.log(`Total unique media items found: ${collectedMedia.size}.`);
//     return Array.from(collectedMedia.values());
//   }

//   /**
//    * Scrapes media from a single image/video post.
//    * @param {Page} page - The Playwright Page object.
//    * @returns {Array<object>} An array containing the single media item.
//    */
//   async scrapeSingleMedia(page) {
//     const tryGetMedia = async () => {
//       return await page.evaluate(() => {
//         const results = [];
//         // Look for video element
//         const video = document.querySelector("video");
//         // Ensure video src is not a blob URL (which are temporary and not downloadable)
//         if (video && video.src && !video.src.startsWith("blob:")) {
//           results.push({ type: "video", url: video.src });
//         }
//         // Look for image elements, filtering out profile pictures
//         const images = Array.from(document.querySelectorAll("img.x5yr21d"))
//           .map((img) => img.src)
//           .filter(src => src && !src.includes("profile_pic"));

//         if (images.length) {
//           // Assuming the first image is the main one for a single post
//           results.push({ type: "image", url: images[0] });
//         }
//         return results;
//       });
//     };

//     let media = await tryGetMedia();
//     if (media.length) return media;

//     // Fallback to intercepted video URLs if direct DOM scraping fails (common for videos)
//     if (this.interceptedVideoUrls.length > 0) {
//       const unique = [...new Set(this.interceptedVideoUrls)]; // Get unique URLs
//       const bestVideo = unique.pop(); // Take the last one, often the highest quality
//       return [{ type: "video", url: bestVideo }];
//     }

//     // Fallback to Open Graph (OG) meta tags
//     const ogFallback = await page.evaluate(() => {
//       const result = [];
//       const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
//       const ogImage = document.querySelector('meta[property="og:image"]')?.content;
//       if (ogVideo) result.push({ type: "video", url: ogVideo });
//       else if (ogImage && !ogImage.includes("profile_pic"))
//         result.push({ type: "image", url: ogImage });
//       return result;
//     });

//     return ogFallback.length ? ogFallback : [];
//   }

//   /**
//    * Fetches media information (images/videos, and metadata) from a given Instagram post URL.
//    * This method now uses a pre-authenticated context from SessionManager if available,
//    * otherwise it launches its own unauthenticated browser context.
//    * @param {string} url - The URL of the Instagram post.
//    * @returns {object} An object containing success status and scraped data or error information.
//    */
//   async getMediaInfo(url) {
//     let page; // Declare page outside try-catch for finally block access
//     let contextToUse; // This will hold the Playwright context
//     let browserToClose = null; // Only set if a new browser is launched locally (unauthenticated flow)

//     try {
//       // Attempt to get an authenticated context from the SessionManager
//       if (this.sessionManager) {
//         try {
//           contextToUse = this.sessionManager.getRandomContext();
//           console.log("[Scraper] Using authenticated session from SessionManager.");
//         } catch (sessionError) {
//           console.warn(`[Scraper] Could not get authenticated session: ${sessionError.message}. Proceeding unauthenticated.`);
//           // Fallback to unauthenticated browser/context if SessionManager fails
//           browserToClose = await chromium.launch({
//             headless: true,
//             args: ["--no-sandbox", "--disable-setuid-sandbox"],
//           });
//           contextToUse = await browserToClose.newContext({
//             userAgent: this.userAgent,
//             viewport: { width: 1280, height: 800 },
//           });
//         }
//       } else {
//         console.warn("[Scraper] SessionManager not provided. Proceeding unauthenticated.");
//         // Launch a new browser and context if no SessionManager is given
//         browserToClose = await chromium.launch({
//           headless: true,
//           args: ["--no-sandbox", "--disable-setuid-sandbox"],
//         });
//         contextToUse = await browserToClose.newContext({
//           userAgent: this.userAgent,
//           viewport: { width: 1280, height: 800 },
//         });
//       }

//       page = await contextToUse.newPage(); // Create a new page within the determined context
//       this.interceptedVideoUrls = []; // Reset intercepted video URLs for each new scrape

//       try {
//         // Set up request interception to capture video URLs
//         await page.route("**/*", async (route) => {
//           const reqUrl = route.request().url();
//           if (reqUrl.endsWith(".mp4") && !reqUrl.includes("bytestart")) {
//             this.interceptedVideoUrls.push(reqUrl);
//           }
//           await route.continue();
//         });

//         console.log(`Navigating to ${url}...`);
//         await page.goto(url, {
//           waitUntil: "domcontentloaded",
//           timeout: config.instagram.timeout, // Use timeout from config
//         });

//         // Handle common Instagram pop-ups (cookie consent, login popup)
//         await this.handleCookieDialog(page);
//         await this.handleLoginPopup(page);

//         // Locators for success (main content) or failure (page not found)
//         const successLocator = page.locator('main[role="main"]');
//         const failureLocator = page.getByText(/Sorry, this page isn't available/i);

//         console.log("Waiting for page content or error message...");
//         // Wait for either the main content to appear or the failure message
//         await Promise.race([
//           successLocator.waitFor({ state: 'visible', timeout: 15000 }),
//           failureLocator.waitFor({ state: 'visible', timeout: 15000 }),
//         ]);

//         // Check if the failure message is visible
//         if (await failureLocator.isVisible()) {
//           throw new Error("The requested content is not available. It may have been deleted or the account is private.");
//         }

//         // If success locator is not visible after waiting, throw an error
//         if (!await successLocator.isVisible()) {
//           throw new Error("Could not determine page content after 15 seconds.");
//         }
        
//         console.log("Page content loaded successfully.");
        
//         // Determine if it's a carousel post
//         const nextButtonSelector = 'button[aria-label="Next"]';
//         let isCarousel = (await page.locator(nextButtonSelector).count()) > 0;
//         let extractedItems = [];

//         if (isCarousel) {
//           console.log("Carousel post detected. Starting scraping...");
//           extractedItems = await this.clickAndScrapeCarousel(page);
//         } else {
//           console.log("Single media post detected. Scraping...");
//           extractedItems = await this.scrapeSingleMedia(page);
//         }

//         // If no media items were found, throw an error
//         if (extractedItems.length === 0) {
//           throw new Error("Scraping failed. No media items could be found on the page.");
//         }
        
//         // Extract post metadata (username and caption)
//         const metadata = await page.evaluate(() => {
//           const usernameLink = document.querySelector('header a[href*="/"]');
//           const username = usernameLink ? usernameLink.textContent : 'unknown';
//           // Instagram's caption is often in an h1 tag, but this can vary.
//           // A more robust approach might involve looking for specific data-testid attributes.
//           const captionDiv = document.querySelector('h1'); 
//           const caption = captionDiv ? captionDiv.textContent : '';
//           return { username, caption };
//         });

//         const responseData = {
//           items: extractedItems,
//           is_carousel: extractedItems.length > 1, // Determine if it was a carousel based on items count
//           username: metadata.username,
//           caption: metadata.caption,
//         };

//         console.log("Scraping successful. Data:", responseData);
//         return { success: true, data: responseData };
//       } finally {
//         // Ensure the page is closed after each scraping operation
//         if (page && !page.isClosed()) {
//             await page.close();
//         }
//       }
//     } catch (error) {
//       console.error(`Error in getMediaInfo with Playwright: ${error.message}`);
//       const screenshotPath = `error_screenshot_${Date.now()}.png`;
//       // Take a screenshot on error for debugging
//       if (page && !page.isClosed()) {
//           await page.screenshot({ path: screenshotPath, fullPage: true });
//           console.log(`Screenshot for debugging saved to ${screenshotPath}`);
//       } else {
//           console.log(`Could not take screenshot: Page was already closed or not initialized.`);
//       }
//       return {
//         success: false,
//         error: `Failed to scrape media: ${error.message}`,
//       };
//     } finally {
//         // Ensure the page is closed
//         if (page && !page.isClosed()) {
//             await page.close();
//         }
//         // Close the browser if it was launched locally (i.e., unauthenticated flow)
//         if (browserToClose) {
//             await browserToClose.close();
//         }
//     }
//   }
// }

// module.exports = InstagramScraper; 













// Reels Scraper
// Login and Session Management. Issue solved for profile pic single post video. But carousel post video is not working.
const { chromium } = require("playwright");
const config = require("../config/config"); // Assuming config file exists

class InstagramScraper {
  /**
   * Constructor for the InstagramScraper.
   * @param {SessionManager} [sessionManager] - An optional instance of the SessionManager class,
   * responsible for handling authenticated sessions. If not provided, or if it cannot provide
   * an authenticated session, scraping will proceed unauthenticated.
   */
  constructor(sessionManager) {
    // SessionManager is now optional. If not provided, the scraper will manage its own browser/context.
    this.sessionManager = sessionManager || null; 
    // If sessionManager is not provided, this.browser and this.context will be managed internally by getMediaInfo
    this.userAgent = config.instagram.userAgent;
    this.maxRetries = 3; // Maximum number of retries for operations
    this.retryDelay = 2000; // Delay between retries in milliseconds
    this.interceptedVideoUrls = [];
  }

  // Removed launchBrowser and closeBrowser as session management is now handled by SessionManager

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
      await allowButton.waitFor({ state: "visible", timeout: 3000 });
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
      await page.waitForSelector(dialogSelector, { state: "visible", timeout: 3000 });
      console.log("✅ Found login popup. Attempting to close...");
      const closeButton = page.locator('div[role="dialog"] button[aria-label="Close"]');
      await closeButton.click({ timeout: 1500 });
      console.log("Popup closed successfully by clicking the 'Close' button.");
    } catch (error) {
      console.log("No login popup was found, proceeding...");
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

    while (true) {
      try {
        // Clear intercepted videos for the current slide before evaluating
        // Important: Only clear temporary intercepted videos for the *current* slide.
        // The main interception logic in getMediaInfo should handle populating this array.
        // We might need a more sophisticated way to associate intercepted URLs with slides
        // if clearing them here is too aggressive. For now, let's keep the existing interception for the whole page.

        await page.waitForTimeout(500); // Give a moment for network requests on new slide

        // Evaluate the page to find current visible media (images/videos)
        const currentMediaOnPage = await page.evaluate((selector) => {
          const results = [];
          const list = document.querySelector(selector);
          if (!list) return results;

          const listItems = list.querySelectorAll("li._acaz"); // Selector for individual carousel items
          listItems.forEach((item) => {
            const video = item.querySelector("video");
            // Only add video if it's not a blob URL
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

        // --- NEW/MODIFIED LOGIC FOR CAROUSEL VIDEOS ---
        // Prioritize intercepted video URLs for the current slide if available
        // This assumes the `this.interceptedVideoUrls` array is accumulating all .mp4s
        // throughout the page navigation. We need to pick the most relevant one for the current slide.
        // A more robust solution might involve observing network requests *per slide transition*.
        // For now, let's just ensure if *any* relevant .mp4 was intercepted, we prefer it.
        if (this.interceptedVideoUrls.length > 0) {
            const uniqueIntercepted = [...new Set(this.interceptedVideoUrls)];
            // Sort by length to prefer longer (likely higher quality) URLs or simply the last one
            // which might be the most recent for the current slide.
            const bestInterceptedVideo = uniqueIntercepted.sort((a, b) => b.length - a.length)[0];
            if (bestInterceptedVideo) {
                // Check if we already found a video via DOM for the current slide
                const existingVideoIndex = currentMediaOnPage.findIndex(item => item.type === 'video');
                if (existingVideoIndex !== -1) {
                    // Replace existing DOM video (possibly blob) with intercepted .mp4
                    currentMediaOnPage[existingVideoIndex] = { type: "video", url: bestInterceptedVideo };
                } else {
                    // Add as a new item if no video was found via DOM
                    currentMediaOnPage.push({ type: "video", url: bestInterceptedVideo });
                }
                // Clear the intercepted list for the *next* slide to avoid picking up old videos
                this.interceptedVideoUrls = []; 
            }
        }
        // --- END NEW/MODIFIED LOGIC ---
        
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
      } catch (error) {
        // If next button is not found or times out, assume end of carousel
        console.log("Reached the end of the carousel or timed out. Finalizing collection.");
        // Collect any remaining media on the last visible slide
        // Re-evaluate one last time to catch anything that loaded very late
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
        if (this.interceptedVideoUrls.length > 0) {
            const uniqueIntercepted = [...new Set(this.interceptedVideoUrls)];
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

        break; // Exit the loop
      }
    }

    console.log(`Total unique media items found: ${collectedMedia.size}.`);
    return Array.from(collectedMedia.values());
  }

  /**
   * Scrapes media from a single image/video post, prioritizing video.
   * @param {Page} page - The Playwright Page object.
   * @returns {Array<object>} An array containing the single media item.
   */
  async scrapeSingleMedia(page) {
    const tryGetVideo = async () => {
      return await page.evaluate(() => {
        const video = document.querySelector("video");
        if (video && video.src && !video.src.startsWith("blob:")) {
          return { type: "video", url: video.src };
        }
        return null;
      });
    };

    const tryGetImage = async () => {
      return await page.evaluate(() => {
        // Look for main image elements, filtering out profile pictures and small thumbnails
        const images = Array.from(document.querySelectorAll("img.x5yr21d"))
          .map((img) => img.src)
          .filter(src => src && !src.includes("profile_pic") && !src.includes("/s150x150") && !src.includes("/s320x320"));
        
        if (images.length) {
          // Return the first found image that is likely the main content
          return { type: "image", url: images[0] };
        }
        return null;
      });
    };

    let mediaItem = null;

    // 1. Fallback to intercepted video URLs (most reliable for reels) - MOVED UP IN PRIORITY
    if (this.interceptedVideoUrls.length > 0) {
      console.log("Checking intercepted video URLs (high priority for single media)...");
      const unique = [...new Set(this.interceptedVideoUrls)];
      // Prioritize larger/more complete video URLs if multiple are intercepted
      const bestVideo = unique.sort((a, b) => b.length - a.length)[0]; 
      if (bestVideo) {
        console.log("Found video from intercepted URLs.");
        return [{ type: "video", url: bestVideo }];
      }
    }

    // 2. Attempt to get video directly from DOM (might be blob initially)
    console.log("Attempting to get video directly from DOM...");
    mediaItem = await tryGetVideo();
    if (mediaItem) {
      console.log("Found video directly.");
      return [mediaItem];
    }

    // 3. Try clicking play button if present (for lazy-loaded videos)
    console.log("No direct video. Checking for play button...");
    const playButton = page.locator('div[role="button"][aria-label*="Play"]');
    if (await playButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Found play button. Clicking it and waiting for video...");
      await playButton.click().catch(() => {}); // Click and ignore errors if it disappears
      await page.waitForTimeout(2000); // Give time for video to load
      mediaItem = await tryGetVideo();
      if (mediaItem) {
        console.log("Found video after clicking play button.");
        return [mediaItem];
      }
    }
    
    // 4. Fallback to Open Graph (OG) meta tags - prioritize video over image
    console.log("Checking Open Graph meta tags...");
    const ogFallback = await page.evaluate(() => {
      const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
      const ogImage = document.querySelector('meta[property="og:image"]')?.content;
      
      if (ogVideo && !ogVideo.includes("profile_pic")) { // Ensure it's not a profile pic
        return { type: "video", url: ogVideo };
      }
      if (ogImage && !ogImage.includes("profile_pic")) {
        return { type: "image", url: ogImage };
      }
      return null;
    });

    if (ogFallback) {
      console.log(`Found media from OG tags: ${ogFallback.type}.`);
      return [ogFallback];
    }

    // 5. Final fallback: try to get any main image if no video was found
    console.log("No video or OG tags. Attempting to get main image...");
    mediaItem = await tryGetImage();
    if (mediaItem) {
      console.log("Found image as final fallback.");
      return [mediaItem];
    }

    // If nothing found
    console.log("No media found after all attempts.");
    return [];
  }

  /**
   * Fetches media information (images/videos, and metadata) from a given Instagram post URL.
   * This method now uses a pre-authenticated context from SessionManager if available,
   * otherwise it launches its own unauthenticated browser context.
   * @param {string} url - The URL of the Instagram post.
   * @returns {object} An object containing success status and scraped data or error information.
   */
  async getMediaInfo(url) {
    let page; // Declare page outside try-catch for finally block access
    let contextToUse; // This will hold the Playwright context
    let browserToClose = null; // Only set if a new browser is launched locally (unauthenticated flow)
    let isUnauthenticatedFlow = false; // Flag to track if we are in unauthenticated flow

    try {
      // Attempt to get an authenticated context from the SessionManager
      if (this.sessionManager) {
        try {
          contextToUse = this.sessionManager.getRandomContext();
          console.log("[Scraper] Using authenticated session from SessionManager.");
        } catch (sessionError) {
          console.warn(`[Scraper] Could not get authenticated session: ${sessionError.message}. Proceeding unauthenticated.`);
          isUnauthenticatedFlow = true; // Set flag for unauthenticated flow
          // Fallback to unauthenticated browser/context if SessionManager fails
          browserToClose = await chromium.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });
          contextToUse = await browserToClose.newContext({
            userAgent: this.userAgent,
            viewport: { width: 1280, height: 800 },
          });
        }
      } else {
        console.warn("[Scraper] SessionManager not provided. Proceeding unauthenticated.");
        isUnauthenticatedFlow = true; // Set flag for unauthenticated flow
        // Launch a new browser and context if no SessionManager is given
        browserToClose = await chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        contextToUse = await browserToClose.newContext({
          userAgent: this.userAgent,
          viewport: { width: 1280, height: 800 },
        });
      }

      page = await contextToUse.newPage(); // Create a new page within the determined context
      this.interceptedVideoUrls = []; // Reset intercepted video URLs for each new scrape

      try {
        // Set up request interception to capture video URLs
        await page.route("**/*", async (route) => {
          const reqUrl = route.request().url();
          // Filter for .mp4 URLs that are likely actual video content, not byte-range requests or profile pics
          if (reqUrl.endsWith(".mp4") && !reqUrl.includes("bytestart") && !reqUrl.includes("profile_pic")) {
            this.interceptedVideoUrls.push(reqUrl);
          }
          await route.continue();
        });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: config.instagram.timeout, // Use timeout from config
        });
        
        await this.handleLoginPopup(page);
        await this.handleCookieDialog(page);
        // Only handle cookie consent and login popups if we are in an unauthenticated flow
        // if (isUnauthenticatedFlow) {
        // }

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
          extractedItems = await this.clickAndScrapeCarousel(page);
        } else {
          console.log("Single media post detected. Scraping...");
          extractedItems = await this.scrapeSingleMedia(page);
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
      } finally {
        // Ensure the page is closed after each scraping operation
        if (page && !page.isClosed()) {
            await page.close();
        }
      }
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
        
        // Close the browser if it was launched locally (i.e., unauthenticated flow)
        try {
          if (browserToClose) {
              await browserToClose.close();
          }
        } catch (browserCloseError) {
          console.error('Failed to close browser:', browserCloseError.message);
        }
    }
  }
}

module.exports = InstagramScraper;