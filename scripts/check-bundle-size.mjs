import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'))
const entry = Object.values(manifest).find((chunk) => chunk.isEntry)
if (!entry) throw new Error('Vite manifest does not contain an entry chunk')
const bytes = (await readFile('dist/' + entry.file)).byteLength
const limit = 409600
console.log('entry ' + entry.file + ': ' + bytes + ' bytes (limit ' + limit + ')')
if (bytes > limit) process.exit(1)
