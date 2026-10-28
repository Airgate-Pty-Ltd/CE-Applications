import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// The test dashboard is a development and staging deliverable only.
// VITE_ENABLE_TEST_DASHBOARD is forced off for production builds so the route
// cannot be reached in a customer deployment.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __TEST_DASHBOARD_ENABLED__: JSON.stringify(mode !== 'production'),
  },
  build: {
    sourcemap: mode !== 'production',
  },
}))
