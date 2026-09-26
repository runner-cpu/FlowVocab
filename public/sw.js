const SHELL_CACHE = 'flowvocab-shell-v1'
const RUNTIME_CACHE = 'flowvocab-runtime-v1'
const WORDS_URL = new URL('./data/words.json', self.location).pathname

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(['./', './index.html'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (new URL(request.url).pathname === WORDS_URL) {
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
    if (response.ok && (request.url.includes('/assets/') || request.mode === 'navigate')) {
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
