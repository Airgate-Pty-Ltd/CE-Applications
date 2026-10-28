import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __TEST_DASHBOARD__: JSON.stringify(true),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    /* Playwright owns e2e/. Vitest must not try to run those files. */
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/fixtures/**',
      ],
      thresholds: {
        /* The engine decides inspection paths and dispositions. An unexercised
           branch there is an unexercised rule — a routing decision nobody has
           ever checked, reached by a real receipt on a real dock. */
        'src/engine/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
});
