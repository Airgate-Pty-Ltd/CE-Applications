/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: RegIntel ships as plain HTML/JS to VentraIP and talks to
  // Supabase directly from the browser (anon key + RLS). No Node server.
  output: 'export',

  reactStrictMode: true,

  // Static export cannot run the Next.js image optimizer (it needs a server).
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.faa.gov' },
      { protocol: 'https', hostname: '**.easa.europa.eu' },
    ],
  },

  // NOTE: `headers()` and `experimental.serverActions` are not available in a
  // static export. The Content-Security-Policy and other security headers move
  // to the host (VentraIP .htaccess) — see docs/DEPLOY-VENTRAIP.md.
};

export default nextConfig;
