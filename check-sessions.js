#!/usr/bin/env node

/**
 * Session Checker - Check validity of existing Instagram session files
 * Run with: node check-sessions.js
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const config = require('./src/config/config');

async function checkSessions() {
    console.log('🔍 Instagram Session Checker');
    console.log('============================\n');

    const sessionDir = path.join(__dirname, 'src', 'sessions');
    
    if (!fs.existsSync(sessionDir)) {
        console.log('❌ No sessions directory found');
        return;
    }

    const sessionFiles = fs.readdirSync(sessionDir).filter(file => file.startsWith('state_') && file.endsWith('.json'));
    
    if (sessionFiles.length === 0) {
        console.log('❌ No session files found');
        return;
    }

    console.log(`📁 Found ${sessionFiles.length} session files:`);
    sessionFiles.forEach(file => {
        const username = file.replace('state_', '').replace('.json', '');
        const filePath = path.join(sessionDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        const modified = stats.mtime.toLocaleString();
        console.log(`   📄 ${username} (${sizeKB}KB, modified: ${modified})`);
    });

    console.log('\n🔐 Testing session validity...\n');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = [];

    for (const sessionFile of sessionFiles) {
        const username = sessionFile.replace('state_', '').replace('.json', '');
        const sessionPath = path.join(sessionDir, sessionFile);
        
        console.log(`🔍 Testing ${username}...`);
        
        try {
            const context = await browser.newContext({
                storageState: sessionPath,
                userAgent: config.instagram.userAgent
            });

            const page = await context.newPage();
            
            // Quick check - go to Instagram and look for login indicators
            await page.goto('https://www.instagram.com/', { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });

            // Check for various indicators
            const checks = [
                { name: 'Profile Link', locator: page.getByRole('link', { name: 'Profile' }) },
                { name: 'Home Feed', locator: page.locator('main[role="main"]') },
                { name: 'Search Box', locator: page.getByRole('textbox', { name: /search/i }) },
                { name: 'Login Form', locator: page.locator('input[name="username"]') }
            ];

            let isLoggedIn = false;
            let details = '';

            for (const check of checks) {
                try {
                    const isVisible = await check.locator.isVisible({ timeout: 3000 });
                    if (check.name === 'Login Form' && isVisible) {
                        details = '❌ Login form visible (not logged in)';
                        break;
                    } else if (['Profile Link', 'Home Feed', 'Search Box'].includes(check.name) && isVisible) {
                        isLoggedIn = true;
                        details = `✅ ${check.name} found (logged in)`;
                        break;
                    }
                } catch (e) {
                    // Continue checking other indicators
                }
            }

            if (!details) {
                details = isLoggedIn ? '✅ Appears logged in' : '❓ Status unclear';
            }

            results.push({
                username,
                status: isLoggedIn ? 'VALID' : 'INVALID',
                details,
                sessionPath
            });

            await context.close();

        } catch (error) {
            results.push({
                username,
                status: 'ERROR',
                details: `❌ Error: ${error.message}`,
                sessionPath
            });
        }
    }

    await browser.close();

    // Display results
    console.log('\n📊 Session Status Summary:');
    console.log('==========================');
    
    const validSessions = results.filter(r => r.status === 'VALID');
    const invalidSessions = results.filter(r => r.status === 'INVALID');
    const errorSessions = results.filter(r => r.status === 'ERROR');

    console.log(`\n✅ Valid Sessions (${validSessions.length}):`);
    validSessions.forEach(session => {
        console.log(`   ${session.username}: ${session.details}`);
    });

    if (invalidSessions.length > 0) {
        console.log(`\n❌ Invalid Sessions (${invalidSessions.length}):`);
        invalidSessions.forEach(session => {
            console.log(`   ${session.username}: ${session.details}`);
        });
    }

    if (errorSessions.length > 0) {
        console.log(`\n⚠️  Error Sessions (${errorSessions.length}):`);
        errorSessions.forEach(session => {
            console.log(`   ${session.username}: ${session.details}`);
        });
    }

    console.log(`\n🎯 Summary: ${validSessions.length}/${results.length} sessions are ready to use`);
    
    if (validSessions.length > 0) {
        console.log('\n💡 Recommendation:');
        console.log('   - Use existing valid sessions to avoid login challenges');
        console.log('   - The system will automatically use these sessions');
        console.log('   - Only re-login if sessions become invalid');
    } else {
        console.log('\n⚠️  Recommendation:');
        console.log('   - All sessions appear invalid or have errors');
        console.log('   - You may need to manually log in to refresh sessions');
        console.log('   - Consider running: node debug-login.js [username]');
    }
}

// Run if called directly
if (require.main === module) {
    checkSessions().catch(console.error);
}

module.exports = { checkSessions }; 