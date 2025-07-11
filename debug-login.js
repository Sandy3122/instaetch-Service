#!/usr/bin/env node

/**
 * Debug script for Instagram login issues
 * Run with: node debug-login.js [username]
 */

const { chromium } = require('playwright');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');

async function debugLogin(username = null) {
    console.log('🔍 Instagram Login Debug Tool');
    console.log('=============================\n');

    const browser = await chromium.launch({
        headless: false, // Set to true for production
        slowMo: 1000
    });

    try {
        // Use specific username or first one from config
        const targetUsername = username || config.instagram.loginDetails[0].username;
        const credentials = config.instagram.loginDetails.find(acc => acc.username === targetUsername);
        
        if (!credentials) {
            console.error(`❌ Username "${targetUsername}" not found in config`);
            return;
        }

        console.log(`🔐 Testing login for: ${credentials.username}`);
        console.log(`⏱️  Timeout setting: ${config.instagram.timeout}ms`);
        console.log(`🌐 User Agent: ${config.instagram.userAgent}\n`);

        const context = await browser.newContext({
            userAgent: config.instagram.userAgent,
            viewport: { width: 1280, height: 800 }
        });

        const page = await context.newPage();

        // Enable detailed logging
        page.on('console', msg => console.log(`📱 Browser: ${msg.text()}`));
        page.on('pageerror', error => console.error(`❌ Page Error: ${error.message}`));
        page.on('requestfailed', request => console.error(`🚫 Failed Request: ${request.url()}`));

        console.log('📍 Navigating to Instagram login page...');
        await page.goto('https://www.instagram.com/accounts/login/', {
            waitUntil: 'domcontentloaded',
            timeout: config.instagram.timeout
        });

        console.log(`📍 Current URL: ${page.url()}`);

        // Check for challenge page
        if (page.url().includes('/challenge/')) {
            console.error('❌ Redirected to challenge page!');
            console.log('📸 Taking screenshot...');
            await page.screenshot({ path: `debug_challenge_${Date.now()}.png`, fullPage: true });
            return;
        }

        // Wait for login form
        console.log('🔍 Looking for login form...');
        const usernameInput = page.locator('input[name="username"]');
        await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
        console.log('✅ Login form found');

        // Enter credentials
        console.log('⌨️  Entering credentials...');
        await usernameInput.type(credentials.username, { delay: 100 });
        await page.type('input[name="password"]', credentials.password, { delay: 100 });

        // Click login
        console.log('🖱️  Clicking login button...');
        const loginButton = page.getByRole('button', { name: 'Log in', exact: true });
        await loginButton.click();

        // Wait and check results
        console.log('⏳ Waiting for login result...');
        await page.waitForTimeout(5000);

        console.log(`📍 Post-login URL: ${page.url()}`);

        // Check for various outcomes
        const checks = [
            { name: 'Error message', locator: page.locator('p[data-testid="login-error-message"]') },
            { name: 'Challenge page', locator: page.getByText(/challenge/i) },
            { name: 'Security check', locator: page.getByText(/security check/i) },
            { name: 'Profile link', locator: page.getByRole('link', { name: 'Profile' }) },
            { name: 'Home feed', locator: page.locator('main[role="main"]') },
            { name: 'Save info button', locator: page.getByRole('button', { name: /save info/i }) }
        ];

        for (const check of checks) {
            try {
                const isVisible = await check.locator.isVisible({ timeout: 3000 });
                console.log(`${isVisible ? '✅' : '❌'} ${check.name}: ${isVisible ? 'Found' : 'Not found'}`);
            } catch (e) {
                console.log(`❓ ${check.name}: Timeout checking`);
            }
        }

        // Take screenshot
        console.log('📸 Taking final screenshot...');
        await page.screenshot({ path: `debug_login_${credentials.username}_${Date.now()}.png`, fullPage: true });

        console.log('\n🎯 Debug complete! Check the screenshots for visual confirmation.');

    } catch (error) {
        console.error('💥 Debug failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await browser.close();
    }
}

// Run debug if called directly
if (require.main === module) {
    const username = process.argv[2];
    debugLogin(username).catch(console.error);
}

module.exports = { debugLogin }; 