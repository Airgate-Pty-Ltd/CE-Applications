/*!
 * config.js — AIMS-in-a-Box (ISO/IEC 42001) Command Center UI
 * (c) 2026 Conform-Edge Quality Consulting LLC. Proprietary. All rights reserved.
 *
 * Runtime configuration only. No secrets, no tenant-specific data.
 * The Express backend serves this UI same-origin in production
 * (express.static against app/src/ui/). In local dev the API may run
 * standalone on port 3100, so we auto-detect and point fetches there.
 */
(function () {
  var isBrowserDevHost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].indexOf(window.location.hostname) !== -1 &&
    window.location.port !== '3100';

  window.APP_CONFIG = Object.freeze({
    // Empty string = same-origin (relative fetch to "/api/..."), used in production
    // once the backend serves this UI directly. Falls back to the documented dev
    // port when the UI is opened from a different local port (e.g. a static preview server).
    API_BASE: isBrowserDevHost ? 'http://localhost:3100' : '',
    TENANT_ID: 'default',
    PRODUCT_NAME: 'AIMS-in-a-Box',
    PRODUCT_TAGLINE: 'ISO/IEC 42001 AI Management System',
    // Polling interval for ambient condition checks (drives the Intelligence Thread
    // pulse and keeps the Overview cockpit current without the user refreshing).
    CONDITION_POLL_MS: 25000
  });
})();
