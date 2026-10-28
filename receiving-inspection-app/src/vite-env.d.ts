/// <reference types="vite/client" />

/**
 * Build-time literal. Defined in vite.config.ts so the bundler can statically
 * eliminate the test dashboard — and the fixture data and rule logic it pulls
 * in — from a production build. CI asserts it is absent from dist/.
 */
declare const __TEST_DASHBOARD__: boolean;
