import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    /* The test dashboard is dev and staging only. Defining this as a literal
       lets the bundler eliminate the route and everything it imports — fixture
       data and the internal rule logic included — from a production build.
       CI asserts the result is absent from dist/. */
    __TEST_DASHBOARD__: JSON.stringify(
      mode !== 'production' || process.env['VITE_FEATURE_TEST_DASHBOARD'] === 'true'
    ),
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
}));
