import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const generator = readFileSync(new URL('./build-service-worker.mjs', import.meta.url), 'utf8')

test('precaches the locally bundled fonts the app loads offline', () => {
  assert.match(generator, /woff2\?/)
})
function worker(workerSource = source) {
  const handlers = {}, removed = [], opened = []
  const cache = { match: async () => new Response('cached'), put: async () => {}, addAll: async () => {} }
  const context = {
    URL, Response, Set,
    self: { location: new URL('https://example.com/FlowVocab/sw.js'), registration: { scope: 'https://example.com/FlowVocab/' }, clients: { claim: async () => {} }, skipWaiting() {}, addEventListener: (name, callback) => { handlers[name] = callback } },
    caches: { open: async name => { opened.push(name); return cache }, match: async () => undefined, keys: async () => ['flowvocab-shell-old:/FlowVocab/', 'flowvocab-shell-other:/other/', 'flowvocab-shell-v3-abcdef', 'flowvocab-runtime-flowvocab-shell-v3-abcdef'], delete: async name => { removed.push(name) } },
    fetch: async () => new Response('fresh')
  }
  vm.runInNewContext(workerSource, context)
  return { handlers, removed, opened }
}

test('does not intercept other applications on the same GitHub Pages origin', () => {
  const { handlers } = worker()
  let intercepted = false
  handlers.fetch({ request: { method: 'GET', url: 'https://example.com/OtherApp/assets/app.js', mode: 'cors' }, respondWith: () => { intercepted = true } })
  assert.equal(intercepted, false)
})

test('keeps background word revalidation alive with waitUntil', async () => {
  const { handlers } = worker()
  const waits = []
  let response
  handlers.fetch({ request: { method: 'GET', url: 'https://example.com/FlowVocab/data/words/level-0.json', mode: 'cors' }, respondWith: promise => { response = promise }, waitUntil: promise => waits.push(promise) })
  await response
  assert.ok(waits.length > 0)
  await Promise.all(waits)
})

test('removes only obsolete caches belonging to the current application scope', async () => {
  const { handlers, removed } = worker()
  let done
  handlers.activate({ waitUntil: promise => { done = promise } })
  await done
  assert.deepEqual(removed, ['flowvocab-shell-old:/FlowVocab/', 'flowvocab-shell-v3-abcdef', 'flowvocab-runtime-flowvocab-shell-v3-abcdef'])
})

test('keeps the freshly generated versioned caches during activation', async () => {
  const generated = source
    .replace("const CACHE_VERSION = 'flowvocab-shell-template'", "const CACHE_VERSION = 'flowvocab-shell-v3-current'")
    .replace('const PRECACHE = []', "const PRECACHE = ['./index.html']")
  const { handlers, removed } = worker(generated)
  let done
  handlers.activate({ waitUntil: promise => { done = promise } })
  await done
  assert.ok(!removed.includes('flowvocab-shell-v3-current:/FlowVocab/'))
  assert.ok(!removed.includes('flowvocab-runtime-flowvocab-shell-v3-current:/FlowVocab/'))
})

test('does not force an update into an open practice session', () => {
  assert.doesNotMatch(source, /self\.skipWaiting\(\)/)
})
