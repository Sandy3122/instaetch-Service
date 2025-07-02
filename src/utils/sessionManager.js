// const { chromium } = require("playwright");
// const fs = require('fs');
// const path = require('path');
// // Assuming config file exists at ../config/config
// // const config = require('../config/config'); 

// // Mock config for standalone execution if needed
// const config = {
//     instagram: {
//         loginDetails: [
//             { username: "Hotchips_4321", password: "Magnum@123" }
//     ],
//     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
//   }
// };


// class SessionManager {
//   constructor() {
//     this.contexts = [];
//     // Make sure to populate loginDetails in your config file
//     this.loginDetails = config.instagram.loginDetails; 
//     this.browser = null;
//   }

//   async initialize() {
//     if (!this.loginDetails || this.loginDetails.length === 0) {
//       console.warn('No Instagram login details found in config. Please add credentials to your config file. Skipping login.');
//       return;
//     }

//     console.log('Initializing browser for session management...');
//     this.browser = await chromium.launch({
//       headless: true, // Change to false for debugging
//       slowMo: 150       // Drastically reduced slowMo for efficiency while still appearing human-like
//     });

//     console.log(`Attempting to log in with ${this.loginDetails.length} account(s)...`);
//     for (const [index, credentials] of this.loginDetails.entries()) {
//       try {
//         await this.login(credentials, index);
//       } catch (error) {
//         console.error(`Could not complete login for account: ${credentials.username}. See details above.`);
//       }
//     }

//     if (this.contexts.length === 0) {
//       throw new Error('Fatal: Could not establish any Instagram sessions. Scraping will fail.');
//     }

//     console.log(`Successfully logged in with ${this.contexts.length} account(s). Ready for scraping.`);
//   }

//   async login(credentials, index) {
//     const { username, password } = credentials;
//     const sessionDir = path.join(__dirname, '..', 'sessions');
//     const stateFilePath = path.join(sessionDir, `state_${username}.json`);

//     if (!fs.existsSync(sessionDir)) {
//       fs.mkdirSync(sessionDir, { recursive: true });
//     }

//     const contextOptions = { userAgent: config.instagram.userAgent };
//     if (fs.existsSync(stateFilePath)) {
//       console.log(`[${username}] Found existing session file. Loading state.`);
//       contextOptions.storageState = stateFilePath;
//     } else {
//       console.log(`[${username}] No session file found. A new one will be created.`);
//     }

//     const context = await this.browser.newContext(contextOptions);
//     const page = await context.newPage();

//     try {
//         // --- Session Verification ---
//         if (contextOptions.storageState) {
//             console.log(`[${username}] Verifying existing session...`);
//             // Changed from 'networkidle' to 'domcontentloaded' to avoid timeouts on the busy home feed
//             await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

//             // A more robust check for a logged-in state. Looks for the "Profile" link in the nav bar.
//             if (await page.getByRole('link', { name: 'Profile' }).first().isVisible({ timeout: 10000 })) {
//                 console.log(`[${username}] Session is valid. Ready.`);
//                 this.contexts.push(context);
//                 await page.close();
//                 return;
//             }
//             console.warn(`[${username}] Session expired or invalid. Proceeding with re-login.`);
//         }

//         // --- New Login Flow ---
//         console.log(`[${username}] Navigating to Instagram for login...`);
//         await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });

//         console.log(`[${username}] Entering credentials...`);
//         await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 15000 });
//         await page.fill('input[name="username"]', username);
//         await page.fill('input[name="password"]', password);

//         const loginButton = page.getByRole('button', { name: 'Log in', exact: true });
//         await loginButton.waitFor({ state: 'visible', timeout: 10000 });
        
//         console.log(`[${username}] Clicking login button...`);
//         await loginButton.click();

//         // --- Wait for Login Result ---
//         console.log(`[${username}] Waiting for login result...`);
//         const errorLocator = page.locator('p[data-testid="login-error-message"]');
//         const challengeLocator = page.getByText(/enter the code we sent/i);
//         const saveInfoButton = page.getByRole('button', { name: /save info/i });

//         // Wait for any of the potential outcomes after clicking login
//         await Promise.race([
//             errorLocator.waitFor({ state: 'visible', timeout: 30000 }),
//             challengeLocator.waitFor({ state: 'visible', timeout: 30000 }),
//             saveInfoButton.waitFor({ state: 'visible', timeout: 30000 }),
//             // Also wait for the profile link as a success indicator
//             page.getByRole('link', { name: 'Profile' }).first().waitFor({ state: 'visible', timeout: 30000 })
//         ]);

//         // Now, check which outcome occurred and handle it.
//         if (await errorLocator.isVisible()) {
//             const errorMessage = await errorLocator.textContent();
//             throw new Error(`Login failed with message: "${errorMessage}"`);
//         }

//         if (await challengeLocator.isVisible()) {
//             throw new Error('Account is facing a 2FA/security challenge. Please log in manually in a browser to resolve it.');
//         }

//         // If we reach here, it means login was successful.
//         console.log(`[${username}] Login successful. Handling post-login dialogs...`);

//         // --- Handle Post-Login Popups ---
//         // Handle "Save Info" if it appears
//         if (await saveInfoButton.isVisible()) {
//             try {
//                 await saveInfoButton.click({ timeout: 5000 });
//                 console.log(`[${username}] Clicked "Save Info" button.`);
//             } catch (e) {
//                 console.warn(`[${username}] Tried to click "Save Info" but failed: ${e.message}`);
//             }
//         }
        
//         // Handle "Turn on Notifications" which often appears after "Save Info"
//         const notNowButton = page.getByRole('button', { name: /not now/i });
//         try {
//             await notNowButton.waitFor({ state: 'visible', timeout: 8000 });
//             await notNowButton.click();
//             console.log(`[${username}] Clicked "Not Now" for notifications.`);
//         } catch (e) {
//             console.warn(`[${username}] "Not Now" prompt for notifications not found or skipped.`);
//         }

//         // As you correctly pointed out, at this stage, we are logged in.
//         // No further verification is needed. We can now save the session.
//         console.log(`[${username}] Login complete. Saving session state...`);

//         await context.storageState({ path: stateFilePath });
//         console.log(`[${username}] Session state saved to ${stateFilePath}`);
//         this.contexts.push(context);

//     } catch (error) {
//         console.error(`[${username}] An error occurred during the login process: ${error.message}`);
//         const screenshotPath = `error_login_${username}_${Date.now()}.png`;
//         await page.screenshot({ path: screenshotPath, fullPage: true });
//         console.log(`[${username}] Screenshot for debugging saved to ${screenshotPath}`);
//         await context.close();
//         throw error; // Re-throw the error to be caught by the initialize loop
//     } finally {
//         if (!page.isClosed()) {
//             await page.close();
//         }
//     }
//   }

//   getRandomContext() {
//     if (this.contexts.length === 0) {
//       throw new Error("No available Instagram sessions. Login might have failed for all accounts.");
//     }
//     const randomIndex = Math.floor(Math.random() * this.contexts.length);
//     const selectedUsername = this.loginDetails[randomIndex].username;
//     console.log(`Using session for user: ${selectedUsername} (index: ${randomIndex})`);
//     return this.contexts[randomIndex];
//   }

//   async close() {
//     if (this.browser) {
//       console.log('Closing browser and all sessions...');
//       await this.browser.close();
//       this.browser = null;
//     }
//   }
// }

// module.exports = new SessionManager();














// Login and Session Management
// // session manager with retry logic if it says automated behavior warning
// const { chromium } = require("playwright");
// const fs = require('fs');
// const path = require('path');
// // Assuming config file exists at ../config/config
// // const config = require('../config/config'); 

// // Mock config for standalone execution if needed
// const config = {
//     instagram: {
//         loginDetails: [
//             { username: "Hotchips_4321", password: "Magnum@123"},
//             { username: "famous_kitchen_123", password: "Magnum@123"}
//     ],
//     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
//   }
// };

// // Define maximum login retries after dismissing automated behavior warning
// const MAX_LOGIN_RETRIES = 2; 

// class SessionManager {
//   constructor() {
//     this.contexts = [];
//     // Make sure to populate loginDetails in your config file
//     this.loginDetails = config.instagram.loginDetails; 
//     this.browser = null;
//   }

//   async initialize() {
//     if (!this.loginDetails || this.loginDetails.length === 0) {
//       console.warn('No Instagram login details found in config. Please add credentials to your config file. Skipping login.');
//       return;
//     }

//     console.log('Initializing browser for session management...');
//     this.browser = await chromium.launch({
//       headless: true, // Change to false for debugging
//       // Removed slowMo here to use custom random delays for better human-like behavior
//     });

//     console.log(`Attempting to log in with ${this.loginDetails.length} account(s)...`);
//     for (const [index, credentials] of this.loginDetails.entries()) {
//       try {
//         // Start login process with retry count 0
//         await this.login(credentials, index, 0); 
//       } catch (error) {
//         console.error(`Could not complete login for account: ${credentials.username}. See details above.`);
//       }
//     }

//     if (this.contexts.length === 0) {
//       throw new Error('Fatal: Could not establish any Instagram sessions. Scraping will fail.');
//     }

//     console.log(`Successfully logged in with ${this.contexts.length} account(s). Ready for scraping.`);
//   }

//   /**
//    * Attempts to log in to Instagram for a given set of credentials.
//    * Includes logic for session verification, new login flow, and handling
//    * various post-login dialogs and errors, including automated behavior warnings.
//    * @param {object} credentials - Object containing username and password.
//    * @param {number} index - Index of the current login attempt (for logging).
//    * @param {number} retryCount - Current retry count for automated behavior warning.
//    */
//   async login(credentials, index, retryCount = 0) {
//     const { username, password } = credentials;
//     const sessionDir = path.join(__dirname, '..', 'sessions');
//     const stateFilePath = path.join(sessionDir, `state_${username}.json`);

//     if (!fs.existsSync(sessionDir)) {
//       fs.mkdirSync(sessionDir, { recursive: true });
//     }

//     const contextOptions = { userAgent: config.instagram.userAgent };
//     if (fs.existsSync(stateFilePath)) {
//       console.log(`[${username}] Found existing session file. Loading state.`);
//       contextOptions.storageState = stateFilePath;
//     } else {
//       console.log(`[${username}] No session file found. A new one will be created.`);
//     }

//     const context = await this.browser.newContext(contextOptions);
//     const page = await context.newPage();

//     try {
//         // --- Session Verification ---
//         if (contextOptions.storageState) {
//             console.log(`[${username}] Verifying existing session...`);
//             // Changed from 'networkidle' to 'domcontentloaded' to avoid timeouts on the busy home feed
//             await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

//             // A more robust check for a logged-in state. Looks for the "Profile" link in the nav bar.
//             if (await page.getByRole('link', { name: 'Profile' }).first().isVisible({ timeout: 10000 })) {
//                 console.log(`[${username}] Session is valid. Ready.`);
//                 this.contexts.push(context);
//                 await page.close();
//                 return; // Session is valid, no need to proceed with login
//             }
//             console.warn(`[${username}] Session expired or invalid. Proceeding with re-login.`);
//         }

//         // --- New Login Flow ---
//         console.log(`[${username}] Navigating to Instagram for login...`);
//         await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });

//         console.log(`[${username}] Entering credentials...`);
//         await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 15000 });
        
//         // --- Add random delay before typing username ---
//         await page.waitForTimeout(Math.random() * (2000 - 500) + 500); // Between 0.5 and 2 seconds
//         await page.type('input[name="username"]', username, { delay: Math.random() * (100 - 50) + 50 }); // Simulate typing speed
        
//         // --- Add random delay before typing password ---
//         await page.waitForTimeout(Math.random() * (2000 - 500) + 500); // Between 0.5 and 2 seconds
//         await page.type('input[name="password"]', password, { delay: Math.random() * (100 - 50) + 50 }); // Simulate typing speed

//         const loginButton = page.getByRole('button', { name: 'Log in', exact: true });
//         await loginButton.waitFor({ state: 'visible', timeout: 10000 });
        
//         console.log(`[${username}] Clicking login button...`);
//         // --- Add random delay before clicking login button ---
//         await page.waitForTimeout(Math.random() * (3000 - 1000) + 1000); // Between 1 and 3 seconds
//         await loginButton.click();

//         // --- Wait for Login Result ---
//         console.log(`[${username}] Waiting for login result...`);
//         const errorLocator = page.locator('p[data-testid="login-error-message"]');
//         const challengeLocator = page.getByText(/enter the code we sent/i);
//         const saveInfoButton = page.getByRole('button', { name: /save info/i });
//         const automatedBehaviorWarning = page.getByText('We suspect automated behavior on your account'); // Locator for the new error
//         const dismissButton = page.getByRole('button', { name: 'Dismiss' }); // Locator for the Dismiss button


//         // Wait for any of the potential outcomes after clicking login
//         await Promise.race([
//             errorLocator.waitFor({ state: 'visible', timeout: 30000 }),
//             challengeLocator.waitFor({ state: 'visible', timeout: 30000 }),
//             saveInfoButton.waitFor({ state: 'visible', timeout: 30000 }),
//             automatedBehaviorWarning.waitFor({ state: 'visible', timeout: 30000 }), // Add the automated behavior warning
//             dismissButton.waitFor({ state: 'visible', timeout: 30000 }), // Add the dismiss button
//             // Also wait for the profile link as a success indicator
//             page.getByRole('link', { name: 'Profile' }).first().waitFor({ state: 'visible', timeout: 30000 })
//         ]);

//         // Now, check which outcome occurred and handle it.
//         if (await errorLocator.isVisible()) {
//             const errorMessage = await errorLocator.textContent();
//             throw new Error(`Login failed with message: "${errorMessage}"`);
//         }
        
//         // --- Handle automated behavior warning and click Dismiss ---
//         if (await automatedBehaviorWarning.isVisible() && await dismissButton.isVisible()) {
//             console.log(`[${username}] Automated behavior warning detected. Clicking Dismiss.`);
//             await dismissButton.click();
//             await page.waitForTimeout(Math.random() * (3000 - 1000) + 1000); // Wait after clicking dismiss

//             if (retryCount < MAX_LOGIN_RETRIES) {
//                 console.warn(`[${username}] Dismissed automated behavior warning. Retrying login (Attempt ${retryCount + 1}/${MAX_LOGIN_RETRIES}).`);
//                 await page.close(); // Close current page before retrying
//                 // Recursively call login to re-attempt the process
//                 return await this.login(credentials, index, retryCount + 1); 
//             } else {
//                 throw new Error(`[${username}] Automated behavior warning dismissed, but login failed after ${MAX_LOGIN_RETRIES} retries. Manual intervention required.`);
//             }
//         }

//         if (await challengeLocator.isVisible()) {
//             throw new Error('Account is facing a 2FA/security challenge. Please log in manually in a browser to resolve it.');
//         }

//         // If we reach here, it means login was successful.
//         console.log(`[${username}] Login successful. Handling post-login dialogs...`);

//         // --- Handle Post-Login Popups ---
//         // Handle "Save Info" if it appears
//         if (await saveInfoButton.isVisible()) {
//             try {
//                 await saveInfoButton.click({ timeout: 5000 });
//                 console.log(`[${username}] Clicked "Save Info" button.`);
//             } catch (e) {
//                 console.warn(`[${username}] Tried to click "Save Info" but failed: ${e.message}`);
//             }
//         }
        
//         // Handle "Turn on Notifications" which often appears after "Save Info"
//         const notNowButton = page.getByRole('button', { name: /not now/i });
//         try {
//             await notNowButton.waitFor({ state: 'visible', timeout: 8000 });
//             await notNowButton.click();
//             console.log(`[${username}] Clicked "Not Now" for notifications.`);
//         } catch (e) {
//             console.warn(`[${username}] "Not Now" prompt for notifications not found or skipped.`);
//         }

//         // As you correctly pointed out, at this stage, we are logged in.
//         // No further verification is needed. We can now save the session.
//         console.log(`[${username}] Login complete. Saving session state...`);

//         await context.storageState({ path: stateFilePath });
//         console.log(`[${username}] Session state saved to ${stateFilePath}`);
//         this.contexts.push(context);

//     } catch (error) {
//         console.error(`[${username}] An error occurred during the login process: ${error.message}`);
//         const screenshotPath = `error_login_${username}_${Date.now()}.png`;
//         await page.screenshot({ path: screenshotPath, fullPage: true });
//         console.log(`[${username}] Screenshot for debugging saved to ${screenshotPath}`);
//         await context.close();
//         throw error; // Re-throw the error to be caught by the initialize loop
//     } finally {
//         if (!page.isClosed()) {
//             await page.close();
//         }
//     }
//   }

//   getRandomContext() {
//     if (this.contexts.length === 0) {
//       throw new Error("No available Instagram sessions. Login might have failed for all accounts.");
//     }
//     const randomIndex = Math.floor(Math.random() * this.contexts.length);
//     const selectedUsername = this.loginDetails[randomIndex].username;
//     console.log(`Using session for user: ${selectedUsername} (index: ${randomIndex})`);
//     return this.contexts[randomIndex];
//   }

//   async close() {
//     if (this.browser) {
//       console.log('Closing browser and all sessions...');
//       await this.browser.close();
//       this.browser = null;
//     }
//   }
// }

// module.exports = new SessionManager();











// Login and Session Management With Recaptcha Issue
const { chromium } = require("playwright");
const fs = require('fs');
const path = require('path');
// Assuming config file exists at ../config/config
// const config = require('../config/config'); 

// Mock config for standalone execution if needed
const config = {
    instagram: {
        loginDetails: [
            { username: "Hotchips_4321", password: "Magnum@123" },
            { username: "famous_kitchen_123", password: "Magnum@123" } // Added for testing multiple accounts
    ],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  }
};

// Define maximum login retries after dismissing automated behavior warning
const MAX_LOGIN_RETRIES = 2; 

class SessionManager {
  constructor() {
    this.contexts = [];
    // Make sure to populate loginDetails in your config file
    this.loginDetails = config.instagram.loginDetails; 
    this.browser = null;
  }

  async initialize() {
    if (!this.loginDetails || this.loginDetails.length === 0) {
      console.warn('No Instagram login details found in config. Please add credentials to your config file. Skipping login.');
      return;
    }

    console.log('Initializing browser for session management...');
    this.browser = await chromium.launch({
      headless: true, // Change to false for debugging
      // Removed slowMo here to use custom random delays for better human-like behavior
    });

    console.log(`Attempting to log in with ${this.loginDetails.length} account(s)...`);
    for (const [index, credentials] of this.loginDetails.entries()) {
      try {
        // Start login process with retry count 0
        await this.login(credentials, index, 0); 
      } catch (error) {
        console.error(`Could not complete login for account: ${credentials.username}. See details above.`);
      }
    }

    if (this.contexts.length === 0) {
      throw new Error('Fatal: Could not establish any Instagram sessions. Scraping will fail.');
    }

    console.log(`Successfully logged in with ${this.contexts.length} account(s). Ready for scraping.`);
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
      console.log(`[${username}] Found existing session file. Loading state.`);
      contextOptions.storageState = stateFilePath;
    } else {
      console.log(`[${username}] No session file found. A new one will be created.`);
    }

    const context = await this.browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
        // --- Session Verification ---
        if (contextOptions.storageState) {
            console.log(`[${username}] Verifying existing session...`);
            // Changed from 'networkidle' to 'domcontentloaded' to avoid timeouts on the busy home feed
            await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

            // A more robust check for a logged-in state. Looks for the "Profile" link in the nav bar.
            if (await page.getByRole('link', { name: 'Profile' }).first().isVisible({ timeout: 10000 })) {
                console.log(`[${username}] Session is valid. Ready.`);
                this.contexts.push(context);
                await page.close();
                return; // Session is valid, no need to proceed with login
            }
            console.warn(`[${username}] Session expired or invalid. Proceeding with re-login.`);
        }

        // --- New Login Flow ---
        console.log(`[${username}] Navigating to Instagram for login...`);
        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });

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

        console.log(`[${username}] Entering credentials...`);
        // --- Add random delay before typing username ---
        await page.waitForTimeout(Math.random() * (2000 - 500) + 500); // Between 0.5 and 2 seconds
        await usernameInput.type(username, { delay: Math.random() * (100 - 50) + 50 }); // Simulate typing speed
        
        // --- Add random delay before typing password ---
        await page.waitForTimeout(Math.random() * (2000 - 500) + 500); // Between 0.5 and 2 seconds
        await page.type('input[name="password"]', password, { delay: Math.random() * (100 - 50) + 50 }); // Simulate typing speed

        const loginButton = page.getByRole('button', { name: 'Log in', exact: true });
        await loginButton.waitFor({ state: 'visible', timeout: 10000 });
        
        console.log(`[${username}] Clicking login button...`);
        // --- Add random delay before clicking login button ---
        await page.waitForTimeout(Math.random() * (3000 - 1000) + 1000); // Between 1 and 3 seconds
        await loginButton.click();

        // --- Wait for Login Result ---
        console.log(`[${username}] Waiting for login result...`);
        const errorLocator = page.locator('p[data-testid="login-error-message"]');
        const challengeLocator = page.getByText(/enter the code we sent/i);
        const saveInfoButton = page.getByRole('button', { name: /save info/i });
        const automatedBehaviorWarning = page.getByText('We suspect automated behavior on your account'); // Locator for the new error
        const dismissButton = page.getByRole('button', { name: 'Dismiss' }); // Locator for the Dismiss button


        // Wait for any of the potential outcomes after clicking login
        await Promise.race([
            errorLocator.waitFor({ state: 'visible', timeout: 30000 }),
            challengeLocator.waitFor({ state: 'visible', timeout: 30000 }),
            saveInfoButton.waitFor({ state: 'visible', timeout: 30000 }),
            automatedBehaviorWarning.waitFor({ state: 'visible', timeout: 30000 }), // Add the automated behavior warning
            dismissButton.waitFor({ state: 'visible', timeout: 30000 }), // Add the dismiss button
            // Also wait for the profile link as a success indicator
            page.getByRole('link', { name: 'Profile' }).first().waitFor({ state: 'visible', timeout: 30000 })
        ]);

        // Now, check which outcome occurred and handle it.
        if (await errorLocator.isVisible()) {
            const errorMessage = await errorLocator.textContent();
            throw new Error(`Login failed with message: "${errorMessage}"`);
        }
        
        // --- Handle automated behavior warning and click Dismiss ---
        if (await automatedBehaviorWarning.isVisible() && await dismissButton.isVisible()) {
            console.log(`[${username}] Automated behavior warning detected. Clicking Dismiss.`);
            await dismissButton.click();
            await page.waitForTimeout(Math.random() * (3000 - 1000) + 1000); // Wait after clicking dismiss

            if (retryCount < MAX_LOGIN_RETRIES) {
                console.warn(`[${username}] Dismissed automated behavior warning. Retrying login (Attempt ${retryCount + 1}/${MAX_LOGIN_RETRIES}).`);
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
        console.log(`[${username}] Login successful. Handling post-login dialogs...`);

        // --- Handle Post-Login Popups ---
        // Handle "Save Info" if it appears
        if (await saveInfoButton.isVisible()) {
            try {
                await saveInfoButton.click({ timeout: 5000 });
                console.log(`[${username}] Clicked "Save Info" button.`);
            } catch (e) {
                console.warn(`[${username}] Tried to click "Save Info" but failed: ${e.message}`);
            }
        }
        
        // Handle "Turn on Notifications" which often appears after "Save Info"
        const notNowButton = page.getByRole('button', { name: /not now/i });
        try {
            await notNowButton.waitFor({ state: 'visible', timeout: 8000 });
            await notNowButton.click();
            console.log(`[${username}] Clicked "Not Now" for notifications.`);
        } catch (e) {
            console.warn(`[${username}] "Not Now" prompt for notifications not found or skipped.`);
        }

        // As you correctly pointed out, at this stage, we are logged in.
        // No further verification is needed. We can now save the session.
        console.log(`[${username}] Login complete. Saving session state...`);

        await context.storageState({ path: stateFilePath });
        console.log(`[${username}] Session state saved to ${stateFilePath}`);
        this.contexts.push(context);

    } catch (error) {
        console.error(`[${username}] An error occurred during the login process: ${error.message}`);
        const screenshotPath = `error_login_${username}_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[${username}] Screenshot for debugging saved to ${screenshotPath}`);
        await context.close();
        throw error; // Re-throw the error to be caught by the initialize loop
    } finally {
        if (!page.isClosed()) {
            await page.close();
        }
    }
  }

  getRandomContext() {
    if (this.contexts.length === 0) {
      throw new Error("No available Instagram sessions. Login might have failed for all accounts.");
    }
    const randomIndex = Math.floor(Math.random() * this.contexts.length);
    const selectedUsername = this.loginDetails[randomIndex].username;
    console.log(`Using session for user: ${selectedUsername} (index: ${randomIndex})`);
    return this.contexts[randomIndex];
  }

  async close() {
    if (this.browser) {
      console.log('Closing browser and all sessions...');
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new SessionManager();