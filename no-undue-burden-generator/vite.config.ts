import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Honour PORT so the dev server can be started by a supervisor that assigns
    // one. Vite does not read it on its own.
    ...(process.env['PORT'] === undefined ? {} : { port: Number(process.env['PORT']) }),
  },
  build: {
    // The scrub gate greps the emitted bundle. Keeping sourcemaps out of the
    // production build means the gate reads shipped code, not a copy of src.
    sourcemap: false,
    rollupOptions: {
      output: {
        // docx and jszip together are most of the payload and almost never
        // change. Splitting them keeps the app chunk small enough that a service
        // worker update re-downloads kilobytes rather than the whole bundle —
        // which matters on a tablet at a supplier's site on poor connectivity.
        manualChunks: {
          docx: ['docx', 'jszip'],
        },
      },
    },
  },
})
