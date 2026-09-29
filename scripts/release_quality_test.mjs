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

assert.ok(packageJson.scripts.lint, 'package.json must expose npm run lint')
assert.ok(!packageJson.scripts.build.includes('sync-pages-root'), 'build must not mutate Pages-root artifacts')
assert.ok(!packageJson.scripts.build.includes('prepare-source-index'), 'build must use the stable source entry')
assert.match(index, /src\/main\.tsx/)
assert.doesNotMatch(index, /assets\/index-[^"']+\.js/)
assert.equal(existsSync(resolve(root, 'index.src.html')), false, 'duplicate source entry should be removed')
for (const directory of ['assets', 'data', 'icons', 'output']) {
  assert.equal(existsSync(resolve(root, directory)), false, 'generated root directory remains: ' + directory)
}
assert.match(serviceWorker, /\/data\/words\//, 'word shards must use stale-while-revalidate')
assert.doesNotMatch(wordBank, /fetch\(['"]\/data\/words\//, 'word bank URLs must honor the Pages base path')
assert.equal(manifest.start_url, './')
assert.match(read('src/main.tsx'), /register\(['"]\.\/sw\.js/)
assert.match(workflow, /npm run lint/)
assert.match(workflow, /node scripts\/validate-content\.mjs/)
assert.ok(existsSync(resolve(root, 'LICENSE')), 'project source license is required')
for (const entry of ['/assets/', '/data/', '/icons/', '/output/']) {
  assert.match(ignore, new RegExp('^\\' + entry + '$', 'm'))
}

console.log('release quality contract passed')
