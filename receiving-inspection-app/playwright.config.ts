import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  /* Serial in CI for stable timings; Playwright picks the default locally.
     Spread rather than `undefined`, which exactOptionalPropertyTypes rejects. */
  ...(process.env['CI'] ? { workers: 1 } : {}),
  reporter: process.env['CI'] ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      /* Supervisor and quality manager on a laptop. */
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      /* The primary use case: an inspector on a tablet at the receiving bench.
         Check execution must be usable on this viewport, not merely render. */
      name: 'tablet',
      use: { ...devices['iPad (gen 7) landscape'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
