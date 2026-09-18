import { cp, copyFile } from 'node:fs/promises'

await copyFile('dist/index.html', 'index.html')
await cp('dist/assets', 'assets', { recursive: true, force: true })
await cp('dist/data', 'data', { recursive: true, force: true })
