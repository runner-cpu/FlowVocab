import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const script = join(root, 'scripts', 'build-service-worker.mjs')

const run = (directory) => {
  const result = spawnSync(process.execPath, [script, directory], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
}

const fixture = await mkdtemp(join(tmpdir(), 'flowvocab-pwa-'))
try {
  await mkdir(join(fixture, 'assets'), { recursive: true })
  await mkdir(join(fixture, 'icons'), { recursive: true })
  await mkdir(join(fixture, 'data', 'words'), { recursive: true })
  await writeFile(join(fixture, 'index.html'), '<html></html>')
  await writeFile(join(fixture, 'manifest.webmanifest'), '{}')
  await writeFile(join(fixture, 'assets', 'app-abc123.js'), 'console.log(1)')
  await writeFile(join(fixture, 'assets', 'style-def456.css'), 'body{}')
  await writeFile(join(fixture, 'assets', 'scene-789.webp'), 'webp')
  await writeFile(join(fixture, 'icons', 'flowvocab-icon.svg'), '<svg/>')
  await writeFile(join(fixture, 'data', 'words', 'level-0.json'), '[]')

  run(fixture)
  const first = await readFile(join(fixture, 'sw.js'), 'utf8')
  assert.match(first, /flowvocab-shell-v\d+-[a-f0-9]{12}/)
  assert.match(first, /\.\/assets\/app-abc123\.js/)
  assert.match(first, /\.\/assets\/style-def456\.css/)
  assert.match(first, /\.\/assets\/scene-789\.webp/)
  assert.match(first, /caches\.keys\(\)/)
  assert.match(first, /staleWhileRevalidate/)
  assert.doesNotMatch(first, /__FLOWVOCAB_/)

  run(fixture)
  const second = await readFile(join(fixture, 'sw.js'), 'utf8')
  assert.equal(second, first, 'service worker generation must be deterministic')
} finally {
  await rm(fixture, { recursive: true, force: true })
}

console.log('PWA asset contract passed')
