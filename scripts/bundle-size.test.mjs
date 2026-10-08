import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const script = fileURLToPath(new URL('./check-bundle-size.mjs', import.meta.url))

test('budgets the complete initial module graph, not only the tiny entry file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'flowvocab-bundle-'))
  try {
    await mkdir(join(root, '.vite'))
    await mkdir(join(root, 'assets'))
    await writeFile(join(root, '.vite/manifest.json'), JSON.stringify({
      'index.html': { isEntry: true, file: 'assets/main.js', imports: ['vendor'], dynamicImports: ['charts'] },
      vendor: { file: 'assets/vendor.js' }, charts: { file: 'assets/charts.js' }
    }))
    await writeFile(join(root, 'assets/main.js'), 'a'.repeat(100))
    await writeFile(join(root, 'assets/vendor.js'), 'a'.repeat(500_000))
    await writeFile(join(root, 'assets/charts.js'), 'a'.repeat(800_000))
    const failure = spawnSync(process.execPath, [script, root], { encoding: 'utf8' })
    assert.equal(failure.status, 1, failure.stdout + failure.stderr)
    await writeFile(join(root, 'assets/vendor.js'), 'a'.repeat(1000))
    const success = spawnSync(process.execPath, [script, root], { encoding: 'utf8' })
    assert.equal(success.status, 0, success.stdout + success.stderr)
  } finally { await rm(root, { recursive: true, force: true }) }
})
