const CACHE_VERSION = 'flowvocab-shell-template'
const PRECACHE = []
const SCOPE_PATH = new URL(self.registration.scope).pathname
const SHELL_CACHE = `${CACHE_VERSION}:${SCOPE_PATH}`
const RUNTIME_CACHE = `flowvocab-runtime-${CACHE_VERSION}:${SCOPE_PATH}`
const LEGACY_CACHE_PATTERN = /^(?:flowvocab-shell-v3-|flowvocab-runtime-flowvocab-shell-v3-)/
const WORDS_PREFIX = new URL('./data/words/', self.location).pathname
const isWordAsset = (pathname) => pathname.startsWith(WORDS_PREFIX)
const isStaticAsset = (request, pathname) => request.mode === 'navigate' || pathname.includes('/assets/') || pathname.includes('/icons/') || pathname.endsWith('/manifest.webmanifest')

self.addEventListener('install', (event) => {
  // Wait for existing tabs to close before replacing their hashed asset cache.
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE])
    return Promise.all(keys.filter((key) => !keep.has(key) && ((key.startsWith('flowvocab-') && key.endsWith(`:${SCOPE_PATH}`)) || (LEGACY_CACHE_PATTERN.test(key) && !key.includes(':')))).map((key) => caches.delete(key)))
  }).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) return
  if (isWordAsset(url.pathname)) {
    const fresh = revalidateWord(request)
    event.waitUntil(fresh.then(() => undefined))
    event.respondWith(staleWhileRevalidate(request, fresh))
    return
  }
  if (isStaticAsset(request, url.pathname)) event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
  const shell = await caches.open(SHELL_CACHE)
  const runtime = await caches.open(RUNTIME_CACHE)
  const cached = await shell.match(request) || await runtime.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      try { await runtime.put(request, response.clone()) } catch { /* A full cache must not prevent an online response. */ }
    }
    return response
  } catch {
    if (request.mode === 'navigate') return (await shell.match(new URL('./index.html', self.location).href)) || new Response('Offline', { status: 503 })
    return new Response('', { status: 504 })
  }
}

async function revalidateWord(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      try { await cache.put(request, response.clone()) } catch { /* IndexedDB remains the primary word cache. */ }
    }
    return response
  } catch { return null }
}

async function staleWhileRevalidate(request, fresh) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  return cached || await fresh || new Response('Word data unavailable', { status: 503 })
}
