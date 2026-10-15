import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = (name) => readFileSync(resolve(root, name), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const workflow = read('.github/workflows/deploy-pages.yml')
const index = read('index.html')
const serviceWorker = read('public/sw.js')
const wordBank = read('src/store/wordBank.ts')
const manifest = JSON.parse(read('public/manifest.webmanifest'))
const ignore = read('.gitignore')
const notices = read('THIRD_PARTY_NOTICES.md')
const appInfo = read('src/data/appInfo.ts')

/** PNG 头里 IHDR 的宽高（big-endian），用于断言图标与分享卡的实际像素尺寸。 */
function pngSize(name) {
  const buffer = readFileSync(resolve(root, name))
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG', name + ' must be a PNG file')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

assert.ok(packageJson.scripts.lint, 'package.json must expose npm run lint')
assert.ok(packageJson.scripts['check:release'], 'package.json must expose the release contract')
assert.match(packageJson.scripts.build, /build-service-worker/)
assert.ok(!packageJson.scripts.build.includes('sync-pages-root'), 'build must not mutate Pages-root artifacts')
assert.ok(!packageJson.scripts.build.includes('prepare-source-index'), 'build must use the stable source entry')
assert.match(index, /src\/main\.tsx/)
assert.doesNotMatch(index, /assets\/index-[^"']+\.js/)
assert.equal(existsSync(resolve(root, 'index.src.html')), false, 'duplicate source entry should be removed')
for (const directory of ['assets', 'data', 'icons', 'output']) {
  assert.equal(existsSync(resolve(root, directory)), false, 'generated root directory remains: ' + directory)
}
assert.match(serviceWorker, /\/data\/words\//, 'word shards must use stale-while-revalidate')
assert.match(serviceWorker, /PRECACHE/, 'service worker must expose a generated precache list')
assert.match(serviceWorker, /caches\.keys\(\)/, 'service worker must clean old caches')
assert.ok(existsSync(resolve(root, 'scripts/build-service-worker.mjs')), 'build-time service worker generator is required')
assert.ok(existsSync(resolve(root, 'scripts/pwa-assets-contract.mjs')), 'PWA asset contract is required')
assert.doesNotMatch(wordBank, /fetch\(['"]\/data\/words\//, 'word bank URLs must honor the Pages base path')
assert.equal(manifest.start_url, './')
assert.equal(manifest.id, './')
assert.equal(manifest.scope, './')
assert.equal(manifest.orientation, 'portrait-primary')

// PWA 图标必须同时提供矢量与位图：Android 用 maskable 位图生成自适应图标，
// iOS 不认 manifest 图标，只认 apple-touch-icon 这个 PNG。
assert.equal(manifest.name, '微光港：英语星图')
assert.equal(manifest.lang, 'zh-CN')
assert.deepEqual(manifest.categories, ['education'])
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith('./icons/'), 'manifest icons must use relative scope-safe paths: ' + icon.src)
  assert.ok(existsSync(resolve(root, 'public', icon.src.slice(2))), 'manifest icon file is missing: ' + icon.src)
}
assert.ok(manifest.icons.some((icon) => icon.purpose === 'any' && icon.sizes === '192x192'), 'manifest needs a 192px any icon')
assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'), 'manifest needs a 512px maskable icon')
assert.deepEqual(pngSize('public/icons/icon-192.png'), { width: 192, height: 192 })
assert.deepEqual(pngSize('public/icons/icon-512.png'), { width: 512, height: 512 })
assert.deepEqual(pngSize('public/icons/icon-maskable-512.png'), { width: 512, height: 512 })
assert.deepEqual(pngSize('public/icons/apple-touch-icon.png'), { width: 180, height: 180 })
assert.match(index, /rel="apple-touch-icon" href="\.\/icons\/apple-touch-icon\.png"/)
assert.match(index, /name="apple-mobile-web-app-title"/)
assert.match(index, /name="mobile-web-app-capable"/)

// 分享预览图必须是 1.91:1：社交平台按这个比例裁切，用场景插画原图会被切掉标题。
const socialCard = pngSize('public/assets/social-card.png')
assert.deepEqual(socialCard, { width: 1200, height: 630 })
const ogImage = index.match(/property="og:image" content="([^"]+)"/)?.[1]
assert.ok(ogImage?.endsWith('/assets/social-card.png'), 'og:image must point at the social card')
assert.ok(existsSync(resolve(root, 'public/assets/social-card.png')), 'og:image target must exist in the published assets')
assert.match(index, new RegExp(`property="og:image:width" content="${socialCard.width}"`))
assert.match(index, new RegExp(`property="og:image:height" content="${socialCard.height}"`))
assert.match(index, /name="twitter:image" content="[^"]+assets\/social-card\.png"/)

// 应用内「关于与许可」与 THIRD_PARTY_NOTICES.md 必须口径一致，且版本号不能与 package.json 漂移。
assert.equal(appInfo.match(/APP_VERSION = '([^']+)'/)?.[1], packageJson.version, 'appInfo version must match package.json')
assert.match(appInfo, /ECDICT[\s\S]*MIT/)
assert.match(appInfo, /Tatoeba[\s\S]*CC-BY 2\.0 FR/)
assert.match(appInfo, /Outfit[\s\S]*SIL OFL 1\.1/)
assert.match(notices, /ECDICT/)
assert.match(notices, /Creative Commons Attribution 2\.0/)
assert.ok(existsSync(resolve(root, 'public/licenses/outfit-OFL.txt')), 'bundled font licence must ship with the app')

assert.match(read('src/main.tsx'), /BASE_URL \+ ['"]sw\.js/)
assert.match(read('src/main.tsx'), /\.catch\(/)
assert.match(index, /rel=\"canonical\"/)
assert.match(index, /property=\"og:title\"/)
assert.match(index, /name=\"twitter:card\"/)
assert.match(index, /noscript/)
assert.match(index, /icons\/flowvocab-icon\.svg/)
assert.match(workflow, /npm run lint/)
assert.match(workflow, /node scripts\/validate-content\.mjs/)
assert.ok(existsSync(resolve(root, 'LICENSE')), 'project source license is required')
for (const entry of ['/assets/', '/data/', '/icons/', '/output/']) {
  assert.match(ignore, new RegExp('^\\' + entry + '$', 'm'))
}

console.log('release quality contract passed')
