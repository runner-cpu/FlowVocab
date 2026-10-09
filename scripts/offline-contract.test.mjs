import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const generator = readFileSync(new URL('./build-service-worker.mjs', import.meta.url), 'utf8')

test('precaches the locally bundled fonts the app loads offline', () => {
  assert.match(generator, /woff2\?/)
})

test('documents that only the shell and downloaded shards are offline', () => {
  // 词库分片走 stale-while-revalidate：只有下载过的等级才离线可用。
  assert.match(source, /isWordAsset/)
  assert.match(source, /staleWhileRevalidate/)
  assert.doesNotMatch(source, /precache.*data\/words/i)
})

test('keeps the app shell precache independent from user data', () => {
  assert.match(source, /const PRECACHE = \[\]/)
  assert.match(generator, /index\.html/)
  assert.match(generator, /manifest\.webmanifest/)
})
