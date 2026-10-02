const CACHE_VERSION = 'flowvocab-shell-template'
const PRECACHE = []
const SHELL_CACHE = CACHE_VERSION
const RUNTIME_CACHE = `flowvocab-runtime-${CACHE_VERSION}`
const WORDS_PREFIX = new URL('./data/words/', self.location).pathname
const isWordAsset = (pathname) => pathname.startsWith(WORDS_PREFIX)
const isStaticAsset = (request, pathname) => request.mode === 'navigate' || pathname.includes('/assets/') || pathname.includes('/icons/') || pathname.endsWith('/manifest.webmanifest')

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE])
    return Promise.all(keys.filter((key) => key.startsWith('flowvocab-') && !keep.has(key)).map((key) => caches.delete(key)))
  }).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  const pathname = new URL(request.url).pathname
  if (isWordAsset(pathname)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok && isStaticAsset(request, new URL(request.url).pathname)) {
      const cache = await caches.open(RUNTIME_CACHE)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    if (request.mode === 'navigate') return (await caches.match('./index.html')) || new Response('Offline', { status: 503 })
    return new Response('', { status: 504 })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  const fresh = fetch(request).then((response) => {
    if (response.ok) void cache.put(request, response.clone())
    return response
  }).catch(() => cached || new Response('[]', { headers: { 'content-type': 'application/json' } }))
  return cached || fresh
}
