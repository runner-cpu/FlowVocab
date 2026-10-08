import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const directory = resolve(process.argv[2] || 'dist')
const manifest = JSON.parse(await readFile(resolve(directory, '.vite/manifest.json'), 'utf8'))
const entry = Object.keys(manifest).find(key => manifest[key].isEntry)
if (!entry) throw new Error('Vite manifest does not contain an entry chunk')
const visited = new Set()
function visit(key) {
  if (visited.has(key)) return
  if (!manifest[key]) throw new Error(`Missing manifest import: ${key}`)
  visited.add(key)
  for (const dependency of manifest[key].imports || []) visit(dependency)
}
visit(entry)
let bytes = 0, gzipBytes = 0
for (const key of visited) {
  const buffer = await readFile(resolve(directory, manifest[key].file))
  bytes += buffer.byteLength
  gzipBytes += gzipSync(buffer).byteLength
}
const limit = 409600
console.log(`Initial JS graph: ${bytes} bytes; gzip ${gzipBytes} bytes; ${visited.size} chunks (limit ${limit})`)
if (bytes > limit) process.exitCode = 1
