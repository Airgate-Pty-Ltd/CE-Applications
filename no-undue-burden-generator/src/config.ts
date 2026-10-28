/**
 * Build-time configuration.
 *
 * The product name is a single constant so renaming is one edit — the repo name
 * is a working title and the UI name has not been settled.
 */

export const PRODUCT_NAME = 'No Undue Burden Generator'

/**
 * The test dashboard ships in dev and staging, never in production.
 *
 * `import.meta.env.DEV` is a literal at build time, so the production bundle has
 * `false && …` and Rollup drops the dashboard, its fixtures and the docx
 * text-extraction path entirely. Staging sets VITE_ENABLE_TEST_DASHBOARD=true.
 */
export const TEST_DASHBOARD_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_DASHBOARD === 'true'

/**
 * Subscription layer — built, flagged off.
 *
 * Off by default so the product runs fully unlocked. Turning it on must not
 * require rearchitecting, which is why the entitlement checks exist now rather
 * than later. Prices are read from config; none are set.
 */
export const BILLING_ENABLED = import.meta.env.VITE_FEATURE_BILLING === 'true'
