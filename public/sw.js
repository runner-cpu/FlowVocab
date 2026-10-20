const CACHE_VERSION = 'flowvocab-shell-template'
const PRECACHE = []
const SCOPE_PATH = new URL(self.registration.scope).pathname
const SHELL_CACHE = `${CACHE_VERSION}:${SCOPE_PATH}`
const RUNTIME_CACHE = `flowvocab-runtime-${CACHE_VERSION}:${SCOPE_PATH}`
const LEGACY_CACHE_PATTERN = /^(?:flowvocab-shell-v3-|flowvocab-runtime-flowvocab-shell-v3-)/
const WORDS_PREFIX = new URL('./data/words/', self.location).pathname
const isWordAsset = (pathname) => pathname.startsWith(WORDS_PREFIX)
const isStaticAsset = (request, pathname) => pathname.includes('/assets/') || pathname.includes('/icons/') || pathname.endsWith('/manifest.webmanifest')
const INDEX_URL = new URL('./index.html', self.location).href

self.addEventListener('install', (event) => {
  // Wait for existing tabs to close before replacing their hashed asset cache.
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(async () => {
    // 没有正在练习的页面时直接接管：否则用户会一直停在 waiting，
    // 刷新多少次都还是旧缓存里的 index.html。
    // 练习页存在时保持等待，交给「立即更新」提示条或关闭标签页后再切换。
    const windows = await self.clients.matchAll({ type: 'window' })
    if (!windows.some((client) => client.url.includes('#/module/'))) await self.skipWaiting()
  }))
})

self.addEventListener('message', (event) => {
  // 只有用户点「立即更新」才会跳过等待，避免练习到一半被强制刷新。
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
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
  // 页面导航必须走网络优先：否则用户会长期停在旧 index.html，看不到新版本。
  else if (request.mode === 'navigate') event.respondWith(networkFirst(request))
})

/**
 * 导航请求优先取网络，失败才回退缓存。
 * 旧实现把 navigate 也塞进 cacheFirst，部署后用户可能几个月都看不到更新。
 */
async function networkFirst(request) {
  const shell = await caches.open(SHELL_CACHE)
  const runtime = await caches.open(RUNTIME_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      try { await runtime.put(request, response.clone()) } catch { /* A full cache must not prevent an online response. */ }
    }
    return response
  } catch {
    return (await shell.match(request)) || (await shell.match(INDEX_URL)) || (await runtime.match(request)) || new Response('Offline', { status: 503 })
  }
}

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
