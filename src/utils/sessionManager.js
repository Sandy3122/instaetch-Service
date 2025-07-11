// Login and Session Management With Recaptcha Issue
const { chromium } = require("playwright");
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
// Assuming config file exists at ../config/config
// const config = require('../config/config'); 

// Mock config for standalone execution if needed
const config = {
    instagram: {
        loginDetails: [
          { username: "Creative_6543", password: "Magnum@123" },
          { username: "Hotchips_4321", password: "Magnum@123" },
          { username: "famous_kitchen_123", password: "Magnum@123" },
          { username: "Rockstarr_12345", password: "Magnum@123" }, // Added for testing multiple accounts
    ],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  }
};

// Define maximum login retries after dismissing automated behavior warning
const MAX_LOGIN_RETRIES = 2; 

class SessionManager {
  constructor() {
    this.contexts = [];
    this.contextUsernames = []; // Track which username corresponds to which context
    // Make sure to populate loginDetails in your config file
    this.loginDetails = config.instagram.loginDetails; 
    this.browser = null;
    this.lastSessionCheck = 0; // Track when we last verified sessions
    this.sessionCheckInterval = 1800000; // Check sessions every 30 minutes instead of 5 minutes
  }

  async initialize() {
    if (!this.loginDetails || this.loginDetails.length === 0) {
      logger.warn('No Instagram login details found in config. Please add credentials to your config file. Skipping login.');
      return;
    }

    logger.session('Initializing browser for session management...');
    this.browser = await chromium.launch({
      headless: true, // Change to false for debugging
      // Removed slowMo here to use custom random delays for better human-like behavior
    });

    logger.session(`Attempting to log in with ${this.loginDetails.length} account(s)...`);
    for (const [index, credentials] of this.loginDetails.entries()) {
      try {
        // Start login process with retry count 0
        await this.login(credentials, index, 0); 
      } catch (error) {
        logger.error(`Could not complete login for account: ${credentials.username}. See details above.`);
        
        // Try one more time with a delay for temporary issues
        if (error.message.includes('timeout') || error.message.includes('challenge')) {
          logger.warn(`Retrying login for ${credentials.username} after 30 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
          try {
            await this.login(credentials, index, 0);
            logger.session(`Retry successful for ${credentials.username}`);
          } catch (retryError) {
            logger.error(`Retry failed for ${credentials.username}: ${retryError.message}`);
          }
        }
      }
    }

    if (this.contexts.length === 0) {
      throw new Error('Fatal: Could not establish any Instagram sessions. Scraping will fail.');
    }

    logger.session(`Successfully logged in with ${this.contexts.length} account(s). Ready for scraping.`);
  }

  /**
   * Attempts to log in to Instagram for a given set of credentials.
   * Includes logic for session verification, new login flow, and handling
   * various post-login dialogs and errors, including automated behavior warnings.
   * @param {object} credentials - Object containing username and password.
   * @param {number} index - Index of the current login attempt (for logging).
   * @param {number} retryCount - Current retry count for automated behavior warning.
   */
  async login(credentials, index, retryCount = 0) {
    const { username, password } = credentials;
    const sessionDir = path.join(__dirname, '..', 'sessions');
    const stateFilePath = path.join(sessionDir, `state_${username}.json`);

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const contextOptions = { userAgent: config.instagram.userAgent };
    if (fs.existsSync(stateFilePath)) {
      logger.session(`[${username}] Found existing session file. Loading state.`);
      contextOptions.storageState = stateFilePath;
    } else {
      logger.session(`[${username}] No session file found. A new one will be created.`);
    }

    const context = await this.browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
        // --- Session Verification (only if we haven't checked recently) ---
        if (contextOptions.storageState && (Date.now() - this.lastSessionCheck) > this.sessionCheckInterval) {
            logger.session(`[${username}] Verifying existing session...`);
            try {
                // Changed from 'networkidle' to 'domcontentloaded' to avoid timeouts on the busy home feed
                await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

                // A more robust check for a logged-in state. Looks for the "Profile" link in the nav bar.
                if (await page.getByRole('link', { name: 'Profile' }).first().isVisible({ timeout: 10000 })) {
                    logger.session(`[${username}] Session is valid. Ready.`);
                    this.contexts.push(context);
                    this.contextUsernames.push(username); // Track the username
                    this.lastSessionCheck = Date.now(); // Update last check time
                    await page.close();
                    return; // Session is valid, no need to proceed with login
                }
                logger.warn(`[${username}] Session expired or invalid. Proceeding with re-login.`);
            } catch (verificationError) {
                logger.warn(`[${username}] Session verification failed, but proceeding with existing session: ${verificationError.message}`);
                // Even if verification fails, try to use the existing session
                this.contexts.push(context);
                this.contextUsernames.push(username);
                this.lastSessionCheck = Date.now();
                await page.close();
                return;
            }
        } else if (contextOptions.storageState) {
            // Skip verification if we checked recently, assume session is still valid
            logger.session(`[${username}] Skipping session verification (checked recently).`);
            this.contexts.push(context);
            this.contextUsernames.push(username); // Track the username
            await page.close();
            return;
        }

        // --- New Login Flow ---
        logger.session(`[${username}] Navigating to Instagram for login...`);
        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Check if we were redirected to a challenge page
        const currentUrl = page.url();
        if (currentUrl.includes('/challenge/')) {
            logger.error(`[${username}] Redirected to challenge page: ${currentUrl}`);
            throw new Error('Account is facing a security challenge. Please log in manually in a browser to resolve it.');
        }

        // Add a locator for the reCAPTCHA challenge page
        const recaptchaChallenge = page.getByText('Help us confirm it\'s you');
        const usernameInput = page.locator('input[name="username"]');

        // Wait for either the username input or the reCAPTCHA challenge to appear
        await Promise.race([
            usernameInput.waitFor({ state: 'visible', timeout: 15000 }),
            recaptchaChallenge.waitFor({ state: 'visible', timeout: 15000 })
        ]);

        if (await recaptchaChallenge.isVisible()) {
            throw new Error('Instagram presented a reCAPTCHA challenge. Manual intervention required to log in.');
        }

        logger.session(`[${username}] Entering credentials...`);
        // --- Add random delay before typing username ---
        await page.waitForTimeout(Math.random() * (2000 - 500) + 500); // Between 0.5 and 2 seconds
        await usernameInput.type(username, { delay: Math.random() * (100 - 50) + 50 }); // Simulate typing speed
        
        // --- Add random delay before typing password ---
        await page.waitForTimeout(Math.random() * (2000 - 500) + 500); // Between 0.5 and 2 seconds
        await page.type('input[name="password"]', password, { delay: Math.random() * (100 - 50) + 50 }); // Simulate typing speed

        const loginButton = page.getByRole('button', { name: 'Log in', exact: true });
        await loginButton.waitFor({ state: 'visible', timeout: 10000 });
        
        logger.session(`[${username}] Clicking login button...`);
        // --- Add random delay before clicking login button ---
        await page.waitForTimeout(Math.random() * (3000 - 1000) + 1000); // Between 1 and 3 seconds
        await loginButton.click();

        // Check if we were redirected to a challenge page after login attempt
        await page.waitForTimeout(2000); // Wait a bit for potential redirect
        const postLoginUrl = page.url();
        if (postLoginUrl.includes('/challenge/')) {
            logger.error(`[${username}] Redirected to challenge page after login: ${postLoginUrl}`);
            throw new Error('Account is facing a security challenge after login attempt. Please log in manually in a browser to resolve it.');
        }

        // --- Wait for Login Result ---
        logger.session(`[${username}] Waiting for login result...`);
        const errorLocator = page.locator('p[data-testid="login-error-message"]');
        const challengeLocator = page.getByText(/enter the code we sent/i);
        const saveInfoButton = page.getByRole('button', { name: /save info/i });
        const automatedBehaviorWarning = page.getByText('We suspect automated behavior on your account'); // Locator for the new error
        const dismissButton = page.getByRole('button', { name: 'Dismiss' }); // Locator for the Dismiss button
        
        // Add more comprehensive challenge detection
        const challengePageLocator = page.getByText(/challenge/i);
        const securityCheckLocator = page.getByText(/security check/i);
        const suspiciousActivityLocator = page.getByText(/suspicious activity/i);
        const verifyAccountLocator = page.getByText(/verify your account/i);
        
        // Add success indicators
        const profileLinkLocator = page.getByRole('link', { name: 'Profile' }).first();
        const homeFeedLocator = page.locator('main[role="main"]');
        const searchBoxLocator = page.getByRole('textbox', { name: /search/i });

        // Wait for any of the potential outcomes after clicking login with shorter timeout
        try {
            await Promise.race([
                errorLocator.waitFor({ state: 'visible', timeout: 15000 }),
                challengeLocator.waitFor({ state: 'visible', timeout: 15000 }),
                saveInfoButton.waitFor({ state: 'visible', timeout: 15000 }),
                automatedBehaviorWarning.waitFor({ state: 'visible', timeout: 15000 }),
                dismissButton.waitFor({ state: 'visible', timeout: 15000 }),
                challengePageLocator.waitFor({ state: 'visible', timeout: 15000 }),
                securityCheckLocator.waitFor({ state: 'visible', timeout: 15000 }),
                suspiciousActivityLocator.waitFor({ state: 'visible', timeout: 15000 }),
                verifyAccountLocator.waitFor({ state: 'visible', timeout: 15000 }),
                // Success indicators
                profileLinkLocator.waitFor({ state: 'visible', timeout: 15000 }),
                homeFeedLocator.waitFor({ state: 'visible', timeout: 15000 }),
                searchBoxLocator.waitFor({ state: 'visible', timeout: 15000 })
            ]);
        } catch (timeoutError) {
            // If timeout occurs, check if we're actually logged in by looking for success indicators
            logger.warn(`[${username}] Login result timeout. Checking for success indicators...`);
            
            // Check for success indicators with a shorter timeout
            const successIndicators = [
                profileLinkLocator.isVisible({ timeout: 5000 }),
                homeFeedLocator.isVisible({ timeout: 5000 }),
                searchBoxLocator.isVisible({ timeout: 5000 })
            ];
            
            const successResults = await Promise.allSettled(successIndicators);
            const anySuccess = successResults.some(result => result.status === 'fulfilled' && result.value);
            
            if (anySuccess) {
                logger.session(`[${username}] Login appears successful despite timeout. Proceeding...`);
            } else {
                // Check for challenge pages that might not have been caught
                const challengeIndicators = [
                    challengePageLocator.isVisible({ timeout: 3000 }),
                    securityCheckLocator.isVisible({ timeout: 3000 }),
                    suspiciousActivityLocator.isVisible({ timeout: 3000 }),
                    verifyAccountLocator.isVisible({ timeout: 3000 })
                ];
                
                const challengeResults = await Promise.allSettled(challengeIndicators);
                const anyChallenge = challengeResults.some(result => result.status === 'fulfilled' && result.value);
                
                if (anyChallenge) {
                    throw new Error('Account is facing a security challenge. Please log in manually in a browser to resolve it.');
                } else {
                    throw new Error('Login failed: Timeout waiting for login result and no success indicators found.');
                }
            }
        }

        // Now, check which outcome occurred and handle it.
        if (await errorLocator.isVisible()) {
            const errorMessage = await errorLocator.textContent();
            throw new Error(`Login failed with message: "${errorMessage}"`);
        }
        
        // --- Handle automated behavior warning and click Dismiss ---
        if (await automatedBehaviorWarning.isVisible() && await dismissButton.isVisible()) {
            logger.session(`[${username}] Automated behavior warning detected. Clicking Dismiss.`);
            await dismissButton.click();
            await page.waitForTimeout(Math.random() * (3000 - 1000) + 1000); // Wait after clicking dismiss

            if (retryCount < MAX_LOGIN_RETRIES) {
                logger.warn(`[${username}] Dismissed automated behavior warning. Retrying login (Attempt ${retryCount + 1}/${MAX_LOGIN_RETRIES}).`);
                await page.close(); // Close current page before retrying
                // Recursively call login to re-attempt the process
                return await this.login(credentials, index, retryCount + 1); 
            } else {
                throw new Error(`[${username}] Automated behavior warning dismissed, but login failed after ${MAX_LOGIN_RETRIES} retries. Manual intervention required.`);
            }
        }

        if (await challengeLocator.isVisible()) {
            throw new Error('Account is facing a 2FA/security challenge. Please log in manually in a browser to resolve it.');
        }

        // If we reach here, it means login was successful.
        logger.session(`[${username}] Login successful. Handling post-login dialogs...`);

        // --- Handle Post-Login Popups ---
        // Handle "Save Info" if it appears
        if (await saveInfoButton.isVisible()) {
            try {
                await saveInfoButton.click({ timeout: 5000 });
                logger.session(`[${username}] Clicked "Save Info" button.`);
            } catch (e) {
                logger.warn(`[${username}] Tried to click "Save Info" but failed: ${e.message}`);
            }
        }
        
        // Handle "Turn on Notifications" which often appears after "Save Info"
        const notNowButton = page.getByRole('button', { name: /not now/i });
        try {
            await notNowButton.waitFor({ state: 'visible', timeout: 8000 });
            await notNowButton.click();
            logger.session(`[${username}] Clicked "Not Now" for notifications.`);
        } catch (e) {
            logger.warn(`[${username}] "Not Now" prompt for notifications not found or skipped.`);
        }

        // As you correctly pointed out, at this stage, we are logged in.
        // No further verification is needed. We can now save the session.
        logger.session(`[${username}] Login complete. Saving session state...`);

        await context.storageState({ path: stateFilePath });
        logger.session(`[${username}] Session state saved to ${stateFilePath}`);
        this.contexts.push(context);
        this.contextUsernames.push(username); // Track the username
        this.lastSessionCheck = Date.now(); // Update last check time

    } catch (error) {
        logger.error(`[${username}] An error occurred during the login process: ${error.message}`);
        
        // Log additional debugging information
        try {
            const currentUrl = page.url();
            logger.debug(`[${username}] Current page URL: ${currentUrl}`);
            
            // Check if we're on a challenge page
            if (currentUrl.includes('/challenge/')) {
                logger.error(`[${username}] Login failed due to Instagram challenge page. Manual intervention required.`);
            }
            
            // Check page title for additional context
            const pageTitle = await page.title();
            logger.debug(`[${username}] Page title: ${pageTitle}`);
            
        } catch (debugError) {
            logger.warn(`[${username}] Could not gather debug information: ${debugError.message}`);
        }
        
        // Take screenshot for debugging (but don't let it crash the server)
        try {
          const screenshotPath = `error_login_${username}_${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          logger.debug(`[${username}] Screenshot for debugging saved to ${screenshotPath}`);
        } catch (screenshotError) {
          logger.error(`[${username}] Failed to take error screenshot:`, screenshotError.message);
        }
        
        // Close context (but don't let it crash the server)
        try {
          await context.close();
        } catch (closeError) {
          logger.error(`[${username}] Failed to close context:`, closeError.message);
        }
        
        throw error; // Re-throw the error to be caught by the initialize loop
    } finally {
        try {
          if (!page.isClosed()) {
              await page.close();
          }
        } catch (closeError) {
          logger.error(`[${username}] Failed to close page:`, closeError.message);
        }
    }
  }

  getRandomContext() {
    if (this.contexts.length === 0) {
      throw new Error("No available Instagram sessions. Login might have failed for all accounts.");
    }
    const randomIndex = Math.floor(Math.random() * this.contexts.length);
    const selectedUsername = this.contextUsernames[randomIndex]; // Use tracked username
    logger.session(`Using session for user: ${selectedUsername} (index: ${randomIndex})`);
    return this.contexts[randomIndex];
  }

  async close() {
    if (this.browser) {
      logger.session('Closing browser and all sessions...');
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new SessionManager();