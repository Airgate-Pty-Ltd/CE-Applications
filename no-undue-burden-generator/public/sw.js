/**
 * Offline service worker.
 *
 * The use case this exists for is an auditor on a tablet at a supplier's site,
 * often with no usable connectivity. The application has no backend, so once its
 * assets are cached there is nothing else it needs to run — intake, the rules
 * engine and .docx generation all execute locally.
 *
 * Strategy:
 *   - Navigations: network first, falling back to the cached shell. A fresh
 *     deploy is picked up when online; a plane or a factory floor still works.
 *   - Static assets: cache first. Vite hashes filenames, so a cached asset is
 *     immutable and a changed asset has a different URL.
 *
 * Nothing user-entered is cached here. Plans and the organization profile live
 * in IndexedDB, which the browser persists independently of this cache.
 */

const VERSION = 'v1'
const SHELL_CACHE = `nub-shell-${VERSION}`
const ASSET_CACHE = `nub-assets-${VERSION}`
const SHELL_URL = './index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      await cache.addAll([SHELL_URL, './manifest.webmanifest'])
      // Take over promptly: a half-updated app that serves a new shell against
      // an old asset chunk is worse than a brief reload.
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE])
      for (const key of await caches.keys()) {
        if (!keep.has(key)) await caches.delete(key)
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(SHELL_CACHE)
          cache.put(SHELL_URL, fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(SHELL_URL)
          if (cached !== undefined) return cached
          return new Response('Offline and no cached shell available.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      })(),
    )
    return
  }

  if (/\.(?:js|css|svg|png|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached !== undefined) return cached
        const fresh = await fetch(request)
        if (fresh.ok) {
          const cache = await caches.open(ASSET_CACHE)
          cache.put(request, fresh.clone())
        }
        return fresh
      })(),
    )
  }
})
