import { cp, copyFile, readdir, unlink } from 'node:fs/promises'

await copyFile('dist/index.html', 'index.html')
const currentAssets = new Set(await readdir('dist/assets'))
for (const name of await readdir('assets')) {
  if (/^.+-[A-Za-z0-9_-]+\.(?:js|css)$/.test(name) && !currentAssets.has(name)) {
    await unlink('assets/' + name)
  }
}
await cp('dist/assets', 'assets', { recursive: true, force: true })
await cp('dist/data', 'data', { recursive: true, force: true })
await copyFile('dist/manifest.webmanifest', 'manifest.webmanifest')
await copyFile('dist/sw.js', 'sw.js')
await cp('dist/icons', 'icons', { recursive: true, force: true })
