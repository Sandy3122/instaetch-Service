const axios = require('axios');
const puppeteer = require('puppeteer');
const config = require('../config/config');

class InstagramScraper {
  constructor() {
    this.userAgent = config.instagram.userAgent;
    this.timeout = config.instagram.timeout;
    this.baseUrl = config.instagram.baseUrl;
    this.apiUrl = config.instagram.apiUrl;
    this.sessionId = config.instagram.sessionId;
    this.csrfToken = config.instagram.csrfToken;

    // Initialize browser instance
    this.browser = null;
    this.initBrowser();
  }

  async initBrowser() {
    try {
      // Close existing browser if it exists
      await this.closeBrowser();

      // Configure browser options
      const browserOptions = {
        headless: 'new',
        protocolTimeout: 180000, // 180 seconds
        timeout: 180000, // 180 seconds
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=' + this.userAgent,
          '--disable-notifications',
          '--window-size=1920,1080',
          '--ignore-certificate-errors',
          '--enable-features=NetworkService',
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      };

      // Launch browser with retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;

      while (retryCount < maxRetries) {
        try {
          this.browser = await puppeteer.launch(browserOptions);
          
          // Test browser by opening a page and setting up authentication
          const testPage = await this.browser.newPage();
          await this.setupPageAuth(testPage);
          await testPage.close();
          
          console.log('Browser initialized successfully');
          return;
        } catch (error) {
          lastError = error;
          retryCount++;
          console.error(`Browser initialization attempt ${retryCount}/${maxRetries} failed:`, error.message);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          
          // Try to close browser if it exists
          await this.closeBrowser();
        }
      }

      throw new Error(`Failed to initialize browser after ${maxRetries} attempts. Last error: ${lastError.message}`);
    } catch (error) {
      console.error('Fatal error in browser initialization:', error);
      this.browser = null;
      throw error;
    }
  }

  // Setup page authentication
  async setupPageAuth(page) {
    if (!this.sessionId) {
      console.log('No session ID provided, skipping authentication');
      return;
    }

    // Set cookies for authentication
    await page.setCookie({
      name: 'sessionid',
      value: this.sessionId,
      domain: '.instagram.com',
      path: '/',
      expires: Date.now() + (1000 * 60 * 60 * 24 * 365), // 1 year
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    });

    if (this.csrfToken) {
      await page.setCookie({
        name: 'csrftoken',
        value: this.csrfToken,
        domain: '.instagram.com',
        path: '/',
        expires: Date.now() + (1000 * 60 * 60 * 24 * 365), // 1 year
        secure: true,
        sameSite: 'Lax'
      });
    }

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': this.userAgent,
      'X-Instagram-AJAX': '1',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': this.csrfToken || '',
    });
  }

  // Create axios instance with Instagram headers and auth
  createAxiosInstance() {
    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'X-Instagram-AJAX': '1',
      'X-Requested-With': 'XMLHttpRequest',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    if (this.csrfToken) {
      headers['X-CSRFToken'] = this.csrfToken;
    }

    const instance = axios.create({
      timeout: this.timeout,
      headers,
    });

    // Add session cookie if available
    if (this.sessionId) {
      instance.defaults.headers.Cookie = `sessionid=${this.sessionId}; csrftoken=${this.csrfToken || ''}`;
    }

    return instance;
  }

  // Extract shortcode from Instagram URL
  extractShortcode(url) {
    // Enhanced regex to handle various Instagram URL formats and extract the shortcode
    const patterns = [
      // Standard formats: /p/, /reel/, /tv/, /reels/
      /(?:(?:http|https:)?\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|instagr\.com)\/(?:p|reel|tv|reels)\/([a-zA-Z0-9_-]{11})/,
      // Stories format
      /(?:(?:http|https:)?\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|instagr\.com)\/stories\/[^\/]+\/([a-zA-Z0-9_-]{11})/,
      // Legacy format without /p/
      /(?:(?:http|https:)?\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|instagr\.com)\/([a-zA-Z0-9_-]{11})(?:\/|\?|$)/,
      // URL with query parameters
      /(?:(?:http|https:)?\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|instagr\.com)\/(?:p|reel|tv|reels)\/([a-zA-Z0-9_-]{11})(?:\/|\?|$)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  // Extract username from Instagram URL
  extractUsername(url) {
    const regex = /instagram\.com\/([^\/\?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Get user info using Puppeteer
  async getUserInfo(username) {
    let page = null;
    try {
      // Ensure browser is available
      if (!this.browser) {
        await this.initBrowser();
      }

      // Try to create a new page, with retry logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          page = await this.browser.newPage();
          break;
        } catch (error) {
          retryCount++;
          console.log(`Failed to create page, attempt ${retryCount}/${maxRetries}:`, error.message);

          if (retryCount >= maxRetries) {
            throw new Error(`Failed to create browser page after ${maxRetries} attempts: ${error.message}`);
          }

          // Reinitialize browser and try again
          await this.initBrowser();
          if (!this.browser) {
            throw new Error('Failed to reinitialize browser');
          }
        }
      }

      await page.setUserAgent(this.userAgent);

      const userPageUrl = `${this.baseUrl}/${username}/`;
      await page.goto(userPageUrl, { waitUntil: 'networkidle2', timeout: this.timeout });

      // Try to extract JSON data from window._sharedData or window.__additionalDataLoaded
      const userData = await page.evaluate(() => {
        // Try window._sharedData (legacy, but sometimes present)
        if (window._sharedData && window._sharedData.entry_data && window._sharedData.entry_data.ProfilePage) {
          return window._sharedData.entry_data.ProfilePage[0].graphql.user;
        }
        // Try window.__additionalDataLoaded (newer, sometimes present)
        if (window.__additionalDataLoaded) {
          // This is a function, but we can't call it directly. Try to find data in the DOM.
          const scripts = Array.from(document.scripts);
          for (const script of scripts) {
            if (script.textContent.includes('window.__additionalDataLoaded')) {
              const match = script.textContent.match(/window\\.__additionalDataLoaded\\('extra',(.*)\\);/);
              if (match && match[1]) {
                try {
                  const data = JSON.parse(match[1]);
                  return data.graphql.user;
                } catch (e) { }
              }
            }
          }
        }
        // Try to scrape from meta tags as fallback
        const username = document.querySelector('meta[property="og:title"]')?.content?.split('(@')[1]?.split(')')[0];
        const profilePic = document.querySelector('meta[property="og:image"]')?.content;
        return username ? { username, profile_pic_url: profilePic } : null;
      });

      if (!userData || !userData.username) {
        throw new Error('Could not extract user data from Instagram page');
      }

      // Map to your expected return structure
      return {
        success: true,
        data: {
          id: userData.id,
          username: userData.username,
          full_name: userData.full_name,
          biography: userData.biography,
          profile_pic_url: userData.profile_pic_url,
          profile_pic_url_hd: userData.profile_pic_url_hd,
          is_private: userData.is_private,
          is_verified: userData.is_verified,
          is_business_account: userData.is_business_account,
          business_category_name: userData.business_category_name,
          category_name: userData.category_name,
          external_url: userData.external_url,
          followers_count: userData.edge_followed_by?.count,
          following_count: userData.edge_follow?.count,
          media_count: userData.edge_owner_to_timeline_media?.count,
          has_channel: userData.has_channel,
          highlight_reel_count: userData.highlight_reel_count,
        },
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      // Always close the page
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.log('Error closing page:', e.message);
        }
      }
    }
  }

  // Get user posts using Instagram API
  async getUserPosts(username, maxId = '') {
    try {
      const axiosInstance = this.createAxiosInstance();

      // Get user posts using GraphQL API
      const variables = {
        id: await this.getUserId(username),
        first: 12,
        after: maxId,
      };

      const queryHash = '003056d32c2554def87228bc3fd9668a'; // This is a known query hash for user posts

      const response = await axiosInstance.get(`${this.apiUrl}/graphql/query/`, {
        params: {
          query_hash: queryHash,
          variables: JSON.stringify(variables),
        },
      });

      const data = response.data.data.user.edge_owner_to_timeline_media;

      return {
        success: true,
        data: {
          posts: data.edges.map(edge => this.formatPostData(edge.node)),
          page_info: data.page_info,
          count: data.count,
        },
      };
    } catch (error) {
      console.error('Error getting user posts:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get media info (post/reel/video) using Puppeteer
  async getMediaInfo(url) {
    let page = null;
    try {
      const shortcode = this.extractShortcode(url);
      if (!shortcode) {
        throw new Error('Invalid Instagram URL - could not extract shortcode');
      }

      // Ensure browser is available
      if (!this.browser) {
        await this.initBrowser();
      }

      // Create a new page, with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          page = await this.browser.newPage();
          break;
        } catch (error) {
          retryCount++;
          console.log(`Failed to create page, attempt ${retryCount}/${maxRetries}:`, error.message);
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to create browser page after ${maxRetries} attempts: ${error.message}`);
          }
          await this.initBrowser();
        }
      }

      // Set up request interception to capture video URLs
      await page.setRequestInterception(true);
      let videoUrls = new Set();
      
      page.on('request', request => {
        const url = request.url();
        if (url.includes('.mp4') || url.includes('/video/') || url.includes('blob:')) {
          videoUrls.add(url);
        }
        request.continue();
      });

      await page.setUserAgent(this.userAgent);

      // Determine path (post / reel / tv) - handle various URL formats
      let mediaPath = 'p'; // default
      if (url.includes('/reel/') || url.includes('/reels/')) {
        mediaPath = 'reel';
      } else if (url.includes('/tv/')) {
        mediaPath = 'tv';
      }
      
      const mediaUrl = `${this.baseUrl}/${mediaPath}/${shortcode}/`;
      console.log(`Navigating to: ${mediaUrl}`);

      // Get cookies for authentication
      const cookies = await page.cookies();
      
      // Navigate with extended timeout and wait for content
      await page.goto(mediaUrl, { 
        waitUntil: ['networkidle2', 'domcontentloaded'],
        timeout: this.timeout 
      });

      // Wait for dynamic content and handle lazy loading
      await page.waitForTimeout(3000);

      // Enhanced media extraction
      const mediaData = await page.evaluate(async () => {
        // Helper function to get the best quality image URL
        const getBestImageUrl = (imgElement) => {
          // Try to get srcset for highest quality
          const srcset = imgElement.getAttribute('srcset');
          if (srcset) {
            const sources = srcset.split(',').map(src => {
              const [url, width] = src.trim().split(' ');
              return {
                url,
                width: parseInt(width?.replace('w', '') || '0')
              };
            });
            // Get the URL with the highest width
            const bestSource = sources.reduce((best, current) => 
              current.width > best.width ? current : best
            );
            if (bestSource.url) return bestSource.url;
          }
          
          // Fallback to src
          return imgElement.src;
        };

        // Method 1: Try to find the main post image first
        const mainImageSelectors = [
          'article img[style*="object-fit"]', // Main post image
          'article div[role="button"] img:not([alt*="profile"])', // Post image in button
          'article img:not([alt*="profile"])[src*="/p/"]', // Post image with /p/ in URL
          'div[role="presentation"] img:not([alt*="profile"])', // Presentation image
          'img[sizes]', // Images with sizes attribute (usually main content)
        ];

        for (const selector of mainImageSelectors) {
          const imgElement = document.querySelector(selector);
          if (imgElement && !imgElement.alt?.toLowerCase().includes('profile picture')) {
            const imageUrl = getBestImageUrl(imgElement);
            if (imageUrl && !imageUrl.includes('profile_pic')) {
              console.log('📸 Found main post image');
              return {
                __typename: 'GraphImage',
                id: window.location.pathname.split('/')[2] || '',
                shortcode: window.location.pathname.split('/')[2] || '',
                display_url: imageUrl,
                is_video: false,
                edge_media_to_caption: {
                  edges: [{
                    node: {
                      text: document.querySelector('meta[property="og:description"]')?.content || 
                            document.querySelector('h1')?.textContent || ''
                    }
                  }]
                }
              };
            }
          }
        }

        // Method 2: Check for video content
        const extractVideoUrl = () => {
          const videoSelectors = [
            'video source[src]',
            'video[src]',
            'meta[property="og:video"]',
            'meta[property="og:video:secure_url"]'
          ];
          
          for (const selector of videoSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const url = element.getAttribute('src') || element.getAttribute('content');
              if (url && !url.includes('profile_pic')) return url;
            }
          }
          return null;
        };

        const videoUrl = extractVideoUrl();
        if (videoUrl) {
          console.log('📹 Found video content');
          // Find the video thumbnail
          const thumbnail = document.querySelector('meta[property="og:image"]')?.content ||
                          document.querySelector('video')?.poster ||
                          Array.from(document.querySelectorAll('img'))
                            .find(img => !img.alt?.toLowerCase().includes('profile'))?.src;
          
          return {
            __typename: 'GraphVideo',
            id: window.location.pathname.split('/')[2] || '',
            shortcode: window.location.pathname.split('/')[2] || '',
            video_url: videoUrl,
            display_url: thumbnail,
            is_video: true,
            video_duration: 0,
            edge_media_to_caption: {
              edges: [{
                node: {
                  text: document.querySelector('meta[property="og:description"]')?.content || 
                        document.querySelector('h1')?.textContent || ''
                }
              }]
            }
          };
        }

        // Method 3: Check for carousel content
        const carouselImages = Array.from(document.querySelectorAll('div[role="button"] img'))
          .filter(img => !img.alt?.toLowerCase().includes('profile'))
          .map(img => ({
            node: {
              __typename: 'GraphImage',
              id: img.src,
              display_url: getBestImageUrl(img),
              is_video: false,
              accessibility_caption: img.alt || ''
            }
          }));

        if (carouselImages.length > 1) {
          console.log(`🎠 Found carousel with ${carouselImages.length} items`);
          return {
            __typename: 'GraphSidecar',
            id: window.location.pathname.split('/')[2] || '',
            shortcode: window.location.pathname.split('/')[2] || '',
            display_url: carouselImages[0].node.display_url,
            edge_sidecar_to_children: {
              edges: carouselImages
            },
            edge_media_to_caption: {
              edges: [{
                node: {
                  text: document.querySelector('meta[property="og:description"]')?.content || 
                        document.querySelector('h1')?.textContent || ''
                }
              }]
            }
          };
        }

        // Method 4: Try standard GraphQL extraction
        const scripts = Array.from(document.querySelectorAll('script'));
        
        for (const script of scripts) {
          const text = script.textContent || '';
          if (text.includes('shortcode_media')) {
            try {
              // Look for GraphSidecar first
              const sidecarPattern = /"__typename":"GraphSidecar"[^{]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
              const sidecarMatches = text.match(sidecarPattern);
              
              if (sidecarMatches) {
                for (const match of sidecarMatches) {
                  try {
                    const parsed = JSON.parse(match);
                    if (parsed.__typename === 'GraphSidecar' && parsed.edge_sidecar_to_children?.edges) {
                      console.log(`🎠 Found real carousel with ${parsed.edge_sidecar_to_children.edges.length} items`);
                      return parsed;
                    }
                  } catch (e) { /* continue */ }
                }
              }
              
              // Look for shortcode_media
              const patterns = [
                /"shortcode_media":\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,
                /"shortcode_media":\s*(\{(?:[^{}]|{[^{}]*})*\})/g
              ];
              
              for (const pattern of patterns) {
                const matches = text.match(pattern);
                if (matches) {
                  for (const match of matches) {
                    try {
                      const jsonStr = match.split(':')[1].trim();
                      let braceCount = 0;
                      let endPos = 0;
                      
                      for (let i = 0; i < jsonStr.length; i++) {
                        if (jsonStr[i] === '{') braceCount++;
                        if (jsonStr[i] === '}') braceCount--;
                        if (braceCount === 0 && i > 0) {
                          endPos = i + 1;
                          break;
                        }
                      }
                      
                      if (endPos > 0) {
                        const parsed = JSON.parse(jsonStr.substring(0, endPos));
                        if (parsed.__typename === 'GraphSidecar' || parsed.__typename === 'GraphImage' || parsed.__typename === 'GraphVideo') {
                          console.log(`📊 Found media: ${parsed.__typename}`);
                          return parsed;
                        }
                      }
                    } catch (e) { /* continue */ }
                  }
                }
              }
            } catch (e) { /* continue */ }
          }
        }
        
        // Method 5: JSON scripts
        const jsonScripts = Array.from(document.querySelectorAll('script[type="application/json"]'));
        for (const script of jsonScripts) {
          try {
            const j = JSON.parse(script.textContent);
            const gql = j.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
            if (gql) {
              console.log('✅ Found in JSON script:', gql.__typename);
              return gql;
            }
          } catch (e) { /* continue */ }
        }
        
        // Method 6: Window._sharedData
        try {
          if (window._sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media) {
            const sd = window._sharedData.entry_data.PostPage[0].graphql.shortcode_media;
            console.log('✅ Found in _sharedData:', sd.__typename);
            return sd;
          }
        } catch (e) { /* continue */ }
        
        // Method 7: Fallback to meta tags
        const ogImage = document.querySelector('meta[property="og:image"]')?.content;
        if (ogImage && !ogImage.includes('profile_pic')) {
          return {
            __typename: 'GraphImage',
            id: window.location.pathname.split('/')[2] || '',
            shortcode: window.location.pathname.split('/')[2] || '',
            display_url: ogImage,
            is_video: false,
            edge_media_to_caption: {
              edges: [{
                node: {
                  text: document.querySelector('meta[property="og:description"]')?.content || 
                        document.querySelector('h1')?.textContent || ''
                }
              }]
            }
          };
        }
        
        return null;
      });

      if (!mediaData) {
        throw new Error('Could not extract media data from Instagram page');
      }

      // Add captured video URLs to the response
      if (mediaData.__typename === 'GraphVideo' && !mediaData.video_url && videoUrls.size > 0) {
        mediaData.video_url = Array.from(videoUrls)[0];
      }

      // Add cookies and user agent to the response
      return {
        success: true,
        data: mediaData,
        cookies: cookies,
        userAgent: this.userAgent
      };

    } catch (error) {
      console.error('Error getting media info:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.error('Error closing page:', e);
        }
      }
    }
  }

  // Get stories using browser automation
  async getStories(username) {
    let page = null;
    try {
      // Ensure browser is available
      if (!this.browser) {
        await this.initBrowser();
      }

      // Try to create a new page, with retry logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          page = await this.browser.newPage();
          await this.setupPageAuth(page);
          break;
        } catch (error) {
          retryCount++;
          console.log(`Failed to create page, attempt ${retryCount}/${maxRetries}:`, error.message);

          if (retryCount >= maxRetries) {
            throw new Error(`Failed to create browser page after ${maxRetries} attempts: ${error.message}`);
          }

          // Reinitialize browser and try again
          await this.initBrowser();
          if (!this.browser) {
            throw new Error('Failed to reinitialize browser');
          }
        }
      }

      // Enable request interception
      await page.setRequestInterception(true);
      let storyData = null;

      // Intercept network requests
      page.on('request', request => {
        const url = request.url();
        // Block unnecessary resources
        if (request.resourceType() === 'image' || 
            request.resourceType() === 'stylesheet' || 
            request.resourceType() === 'font') {
          request.abort();
        } else {
          if (url.includes('/api/v1/feed/user') || 
              url.includes('/api/v1/feed/reels_media') ||
              url.includes('/api/v1/stories/')) {
            console.log('📡 Intercepted story API request:', url);
          }
          request.continue();
        }
      });

      // Capture response data
      page.on('response', async response => {
        const url = response.url();
        if (url.includes('/api/v1/feed/user') || 
            url.includes('/api/v1/feed/reels_media') ||
            url.includes('/api/v1/stories/')) {
          try {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
              console.log('📱 Found story data in response');
              storyData = data.items;
            }
          } catch (e) {
            console.error('Failed to parse story response:', e);
          }
        }
      });

      // Navigate directly to stories URL
      const storiesUrl = `${this.baseUrl}/stories/${username}/`;
      console.log('🌐 Navigating to:', storiesUrl);
      
      const response = await page.goto(storiesUrl, {
        waitUntil: 'networkidle2',
        timeout: this.timeout,
      });

      // Check if we got redirected to login
      if (response.url().includes('/accounts/login')) {
        console.log('⚠️ Redirected to login page - Session might be invalid');
        return {
          success: false,
          error: 'Login required to view stories. Please provide valid Instagram session credentials.',
        };
      }

      // Wait for content to load
      await page.waitForTimeout(5000);

      // If we didn't get story data from API, try DOM scraping
      if (!storyData) {
        console.log('🔍 Attempting DOM-based story extraction');
        storyData = await page.evaluate(() => {
          const stories = [];
          
          // Enhanced media element detection
          const mediaElements = Array.from(document.querySelectorAll([
            'img[decoding="sync"]',
            'video source',
            'video',
            'img[sizes]',
            'img[srcset]',
            // Add more specific selectors for story content
            'div[role="button"] img',
            'div[role="presentation"] img',
            'div[role="dialog"] img'
          ].join(', ')));
          
          mediaElements.forEach(media => {
            // Skip profile pictures and icons
            if (media.alt?.toLowerCase().includes('profile picture') || 
                media.src?.includes('profile_pic') ||
                media.src?.includes('favicon') ||
                !media.src) {
              return;
            }

            const isVideo = media.tagName.toLowerCase() === 'video' || 
                          media.tagName.toLowerCase() === 'source' ||
                          media.closest('video');
            
            // Get the best quality URL
            let bestUrl = media.src;
            if (media.srcset) {
              const sources = media.srcset.split(',')
                .map(src => {
                  const [url, width] = src.trim().split(' ');
                  return {
                    url,
                    width: parseInt(width?.replace('w', '') || '0')
                  };
                })
                .filter(src => src.width > 0);

              if (sources.length > 0) {
                const bestSource = sources.reduce((best, current) => 
                  current.width > best.width ? current : best
                );
                bestUrl = bestSource.url;
              }
            }

            // For videos, try to get the video source
            if (isVideo) {
              const videoElement = media.tagName.toLowerCase() === 'video' ? 
                media : media.closest('video');
              if (videoElement) {
                const source = videoElement.querySelector('source');
                if (source?.src) {
                  bestUrl = source.src;
                }
              }
            }

            stories.push({
              pk: Date.now().toString() + stories.length,
              taken_at: Math.floor(Date.now() / 1000),
              type: isVideo ? 'video' : 'photo',
              image_versions2: {
                candidates: [{
                  height: media.naturalHeight || 1920,
                  width: media.naturalWidth || 1080,
                  url: bestUrl
                }]
              },
              video_versions: isVideo ? [{
                height: media.videoHeight || 1920,
                width: media.videoWidth || 1080,
                url: bestUrl,
                type: 101
              }] : [],
              has_audio: isVideo,
              original_height: media.naturalHeight || 1920,
              original_width: media.naturalWidth || 1080
            });
          });

          return stories;
        });
      }

      // If we still don't have story data, check if we're on a login page
      if (!storyData || storyData.length === 0) {
        const isLoginPage = await page.evaluate(() => {
          return document.body.textContent.includes('Login') || 
                 document.body.textContent.includes('Log in') ||
                 window.location.href.includes('/accounts/login');
        });

        if (isLoginPage) {
          console.log('⚠️ Redirected to login page');
          return {
            success: false,
            error: 'Login required to view stories',
          };
        }

        // Check if we can find any story content
        const hasStoryContent = await page.evaluate(() => {
          return document.querySelector('div[role="dialog"]') !== null ||
                 document.querySelector('div[role="presentation"]') !== null;
        });

        if (!hasStoryContent) {
          console.log('⚠️ No story content found');
          return {
            success: false,
            error: 'No stories found for this user',
          };
        }
      }

      // Format and return the story data
      const formattedStories = (storyData || []).filter(story => {
        return story.image_versions2?.candidates?.length > 0 || 
               story.video_versions?.length > 0;
      });

      if (formattedStories.length === 0) {
        console.log('⚠️ No valid story media found');
        return {
          success: false,
          error: 'No valid story media found',
        };
      }

      console.log(`✅ Successfully found ${formattedStories.length} stories`);
      return {
        success: true,
        data: formattedStories
      };

    } catch (error) {
      console.error('Error getting stories:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.log('Error closing page:', e.message);
        }
      }
    }
  }

  // Get highlights using browser automation
  async getHighlights(username) {
    let page = null;
    try {
      // Ensure browser is available
      if (!this.browser) {
        await this.initBrowser();
      }

      // Try to create a new page, with retry logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          page = await this.browser.newPage();
          break;
        } catch (error) {
          retryCount++;
          console.log(`Failed to create page, attempt ${retryCount}/${maxRetries}:`, error.message);

          if (retryCount >= maxRetries) {
            throw new Error(`Failed to create browser page after ${maxRetries} attempts: ${error.message}`);
          }

          // Reinitialize browser and try again
          await this.initBrowser();
          if (!this.browser) {
            throw new Error('Failed to reinitialize browser');
          }
        }
      }

      await page.setUserAgent(this.userAgent);

      // Navigate to user's profile
      await page.goto(`${this.baseUrl}/${username}/`, {
        waitUntil: 'networkidle2',
        timeout: this.timeout,
      });

      // Extract highlights data
      const highlightsData = await page.evaluate(() => {
        const highlights = [];
        const highlightItems = document.querySelectorAll('a[href*="/stories/highlights/"]');

        highlightItems.forEach(item => {
          const img = item.querySelector('img');
          const title = item.getAttribute('title') || item.getAttribute('aria-label');

          if (img) {
            highlights.push({
              title: title,
              cover_url: img.src,
              url: item.href,
            });
          }
        });

        return highlights;
      });

      return {
        success: true,
        data: highlightsData,
      };
    } catch (error) {
      console.error('Error getting highlights:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      // Always close the page
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.log('Error closing page:', e.message);
        }
      }
    }
  }

  // Helper method to get user ID
  async getUserId(username) {
    const userInfo = await this.getUserInfo(username);
    return userInfo.success ? userInfo.data.id : null;
  }

  // Format post data
  formatPostData(post) {
    return {
      id: post.id,
      shortcode: post.shortcode,
      caption: post.edge_media_to_caption?.edges[0]?.node?.text || '',
      media_type: post.__typename,
      is_video: post.is_video,
      display_url: post.display_url,
      video_url: post.video_url,
      thumbnail_src: post.thumbnail_src,
      taken_at_timestamp: post.taken_at_timestamp,
      likes_count: post.edge_media_preview_like?.count || 0,
      comments_count: post.edge_media_to_comment?.count || 0,
      owner: {
        id: post.owner?.id || 'unknown',
        username: post.owner?.username || 'unknown',
      },
      dimensions: post.dimensions,
      display_resources: post.display_resources,
      video_view_count: post.video_view_count,
      accessibility_caption: post.accessibility_caption,
    };
  }

  // Format media data with proper error handling
  formatMediaData(media) {
    const formatSingleItem = (item) => {
      const isVideo = item.is_video || (item.video_versions && item.video_versions.length > 0);

      let bestImageUrl = item.display_url;
      if (item.display_resources && item.display_resources.length > 0) {
        bestImageUrl = item.display_resources.reduce((best, current) => {
          return current.config_width > best.config_width ? current : best;
        }, item.display_resources[0]).src;
      }

      // Remove cropping parameters from the URL to get the original image
      if (bestImageUrl) {
        try {
          const url = new URL(bestImageUrl);
          // The 'stp' parameter controls smart cropping and resizing. Removing it gives the original.
          url.searchParams.delete('stp');
          bestImageUrl = url.toString();
        } catch (e) {
          // If URL parsing fails, proceed with the original URL.
          console.error("Failed to parse image URL:", e);
        }
      }

      let bestVideoUrl = item.video_url;
      if (!bestVideoUrl && item.video_versions && item.video_versions.length > 0) {
        bestVideoUrl = item.video_versions.reduce((best, current) => {
          return (current.width > best.width) ? current : best;
        }, item.video_versions[0]).url;
      }

      return {
        id: item.id,
        is_video: isVideo,
        display_url: bestImageUrl,
        video_url: bestVideoUrl,
        media_type: item.__typename,
      };
    };

    const mainItem = formatSingleItem(media);
    let carouselMedia = null;

    if (media.__typename === 'GraphSidecar' && media.edge_sidecar_to_children?.edges) {
      carouselMedia = media.edge_sidecar_to_children.edges.map(edge => formatSingleItem(edge.node));
    }

    let caption = media.edge_media_to_caption?.edges[0]?.node?.text || media.caption || '';
    let likes = media.edge_media_preview_like?.count || media.like_count || 0;
    let comments = media.edge_media_to_comment?.count || media.comment_count || 0;
    let username = media.owner?.username || 'unknown';

    // Fallback parsing from caption for likes, comments, and username
    if (likes === 0) {
      const likesMatch = caption.match(/([\d,]+)\s+likes/);
      if (likesMatch && likesMatch[1]) {
        likes = parseInt(likesMatch[1].replace(/,/g, ''), 10);
      }
    }
    if (comments === 0) {
      const commentsMatch = caption.match(/([\d,]+)\s+comments/);
      if (commentsMatch && commentsMatch[1]) {
        comments = parseInt(commentsMatch[1].replace(/,/g, ''), 10);
      }
    }
    if (username === 'unknown') {
      const userMatch = caption.match(/comments\s+-\s+([a-zA-Z0-9._]+)\s+on/);
      if (userMatch && userMatch[1]) {
        username = userMatch[1];
      }
    }

    // Clean up caption by removing the stats part
    const statsMatch = caption.match(/(\d{1,3}(?:,\d{3})*|\d+)\s+likes,\s+(\d{1,3}(?:,\d{3})*|\d+)\s+comments\s+-\s+.*?on\s+.*?:/);
    if (statsMatch) {
      caption = caption.replace(statsMatch[0], '').trim();
    }

    return {
      id: media.id || Date.now().toString(),
      shortcode: media.shortcode || '',
      caption: caption,
      media_type: media.__typename || (mainItem.is_video ? 'GraphVideo' : 'GraphImage'),
      is_video: mainItem.is_video,
      display_url: mainItem.display_url,
      video_url: mainItem.video_url,
      carousel_media: carouselMedia,
      thumbnail_src: media.thumbnail_src,
      taken_at_timestamp: media.taken_at_timestamp || Date.now(),
      likes_count: likes,
      comments_count: comments,
      owner: {
        id: media.owner?.id || 'unknown',
        username: username,
      },
      dimensions: media.dimensions || { width: 1080, height: 1080 },
      display_resources: media.display_resources || [],
      video_view_count: media.video_view_count || 0,
      accessibility_caption: media.accessibility_caption || '',
      video_duration: media.video_duration || 0,
      is_paid_partnership: media.is_paid_partnership || false,
      product_type: media.product_type || '',
      location: media.location || null,
    };
  }

  // Close browser
  async closeBrowser() {
    if (this.browser) {
      try {
        const pages = await this.browser.pages();
        await Promise.all(pages.map(page => page.close()));
        await this.browser.close();
      } catch (error) {
        console.error('Error while closing browser:', error);
      } finally {
        this.browser = null;
      }
    }
  }
}

module.exports = InstagramScraper; 