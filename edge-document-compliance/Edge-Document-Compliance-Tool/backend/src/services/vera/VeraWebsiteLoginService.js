/**
 * VERA Website Login Service
 * 
 * Handles automated login to websites using stored credentials
 * Uses Puppeteer for browser automation
 * 
 * NOTE: Puppeteer is an optional dependency. If not available,
 * login features will return appropriate error messages.
 */

// Optional puppeteer import - use dynamic import to prevent module load failure
let puppeteer = null;
let puppeteerAvailable = false;

// Try to load puppeteer (non-blocking)
try {
  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;
  puppeteerAvailable = true;
  console.log('[VeraWebsiteLoginService] ✅ Puppeteer loaded successfully');
} catch (error) {
  console.warn('[VeraWebsiteLoginService] ⚠️  Puppeteer not available:', error.message);
  console.warn('[VeraWebsiteLoginService]    Website login features will be disabled');
  puppeteerAvailable = false;
}

import * as VeraCredentialService from './VeraCredentialService.js';

/**
 * Login configuration maps for different websites
 */
const loginMaps = {
  'ansi.org': {
    loginUrl: 'https://www.ansi.org/account/login',
    usernameSelector: 'input[name="email"], input[type="email"], #email',
    passwordSelector: 'input[name="password"], input[type="password"], #password',
    submitSelector: 'button[type="submit"], input[type="submit"], button.login-button',
    successSelector: '.user-profile-menu, .account-menu, [data-user-menu]',
    delay: 2000,
    requiresLogin: true
  },
  'asq.org': {
    loginUrl: 'https://www.asq.org/login',
    usernameSelector: 'input[id="email"], input[name="email"], #email',
    passwordSelector: 'input[id="password"], input[name="password"], #password',
    submitSelector: 'button[id="login-submit"], button[type="submit"]',
    successSelector: '.user-menu, .account-menu, .member-menu',
    delay: 2000,
    requiresLogin: true
  },
  'iso.org': {
    loginUrl: 'https://www.iso.org/account',
    usernameSelector: 'input[name="user"], input[name="username"], #username',
    passwordSelector: 'input[name="password"], input[type="password"], #password',
    submitSelector: 'button[type="submit"], input[type="submit"]',
    successSelector: '.profile-section, .account-section, [data-account]',
    delay: 2000,
    requiresLogin: true
  },
  'faa.gov': {
    requiresLogin: false,
    publicAccess: true
  },
  'fda.gov': {
    requiresLogin: false,
    publicAccess: true
  },
  'easa.europa.eu': {
    requiresLogin: false,
    publicAccess: true
  }
};

class VeraWebsiteLoginService {
  /**
   * Get login configuration for a website
   * @param {string} website - Website identifier
   * @returns {Object|null} Login configuration
   */
  static getLoginMap(website) {
    return loginMaps[website] || null;
  }

  /**
   * Test login to a website
   * @param {string} website - Website identifier
   * @param {string} username - Username/email
   * @param {string} password - Password
   * @returns {Promise<Object>} Login result
   */
  async loginToWebsite(website, username, password) {
    const loginMap = this.constructor.getLoginMap(website);

    if (!loginMap) {
      return {
        success: false,
        message: `Login configuration not found for ${website}`,
        requires_credential: true,
        action: 'ADD_LOGIN',
        website: website
      };
    }

    if (loginMap.publicAccess) {
      return {
        success: true,
        message: `${website} is publicly accessible`,
        requires_credential: false,
        action: 'NO_LOGIN_NEEDED',
        website: website
      };
    }

    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 720 });
      
      // Navigate to login page
      await page.goto(loginMap.loginUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for form to be ready
      await page.waitForSelector(loginMap.usernameSelector, { timeout: 10000 });

      // Fill in credentials
      await page.type(loginMap.usernameSelector, username, { delay: 100 });
      await page.type(loginMap.passwordSelector, password, { delay: 100 });

      // Click submit
      await page.click(loginMap.submitSelector);

      // Wait for navigation or success indicator
      try {
        await Promise.race([
          page.waitForSelector(loginMap.successSelector, { timeout: 10000 }),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        ]);

        // Additional delay to ensure page is loaded
        await page.waitForTimeout(loginMap.delay || 1000);

        // Check if we're logged in by looking for success indicator
        const isLoggedIn = await page.$(loginMap.successSelector) !== null;

        await browser.close();

        if (isLoggedIn) {
          return {
            success: true,
            message: `Successfully logged into ${website}`,
            website: website,
            loginTime: new Date().toISOString(),
            action: 'LOGIN_SUCCESS'
          };
        } else {
          return {
            success: false,
            message: `Login to ${website} may have failed - success indicator not found`,
            website: website,
            action: 'LOGIN_UNCERTAIN'
          };
        }
      } catch (e) {
        await browser.close();
        return {
          success: false,
          message: `Login to ${website} failed - ${e.message}`,
          website: website,
          action: 'LOGIN_FAILED',
          error: e.message
        };
      }
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      return {
        success: false,
        message: `Error logging into ${website}: ${error.message}`,
        website: website,
        action: 'LOGIN_ERROR',
        error: error.message
      };
    }
  }

  /**
   * Fetch content from a website using stored credentials
   * @param {string} website - Website identifier
   * @param {string} url - URL to fetch
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Fetch result with content
   */
  async fetchWithCredentials(website, url, userId) {
    // Get stored credentials
    const cred = await VeraCredentialService.getCredentials(userId, website);

    if (!cred) {
      return {
        success: false,
        message: `No credentials stored for ${website}. Please add them first.`,
        action: 'CREDENTIAL_MISSING',
        website: website,
        setup_link: `Please visit ${website} and log in, then provide credentials to VERA`
      };
    }

    // Check if credential is expired
    if (await VeraCredentialService.isCredentialExpired(cred.id)) {
      return {
        success: false,
        message: `Credentials for ${website} have expired`,
        action: 'CREDENTIAL_EXPIRED',
        website: website,
        membership_expired_on: cred.expiration_date
      };
    }

    const loginMap = this.constructor.getLoginMap(website);

    if (!loginMap || loginMap.publicAccess) {
      // Public access - no login needed
      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const content = await page.content();
        await browser.close();

        return {
          success: true,
          content: content,
          website: website,
          accessed_at: new Date().toISOString()
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to fetch from ${website}: ${error.message}`,
          website: website,
          action: 'FETCH_ERROR'
        };
      }
    }

    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Log in first
      await page.goto(loginMap.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector(loginMap.usernameSelector, { timeout: 10000 });
      await page.type(loginMap.usernameSelector, cred.username, { delay: 100 });
      await page.type(loginMap.passwordSelector, cred.password, { delay: 100 });
      await page.click(loginMap.submitSelector);
      
      // Wait for login success
      await Promise.race([
        page.waitForSelector(loginMap.successSelector, { timeout: 10000 }),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      ]);
      await page.waitForTimeout(loginMap.delay || 1000);

      // Navigate to requested URL
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Get page content
      const content = await page.content();
      const title = await page.title();

      await browser.close();

      // Log the usage
      await VeraCredentialService.logCredentialAudit(
        userId, 
        cred.id, 
        'used', 
        { website, url: url.substring(0, 100) } // Truncate URL for logging
      );

      return {
        success: true,
        content: content,
        title: title,
        website: website,
        accessed_at: new Date().toISOString()
      };
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      return {
        success: false,
        message: `Failed to fetch from ${website}: ${error.message}`,
        website: website,
        action: 'FETCH_ERROR',
        error: error.message
      };
    }
  }
}

// Export singleton instance
const websiteLoginService = new VeraWebsiteLoginService();
export default websiteLoginService;

// Also export class for testing
export { VeraWebsiteLoginService };

