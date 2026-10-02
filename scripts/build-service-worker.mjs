import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const templatePath = resolve(root, 'public/sw.js')

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else files.push(path)
  }
  return files
}

function toUrl(path) {
  return './' + path.split(sep).join('/')
}

function isPrecacheAsset(path) {
  const normalized = path.replaceAll(sep, '/')
  if (normalized === 'index.html' || normalized === 'manifest.webmanifest') return true
  if (normalized.startsWith('assets/') || normalized.startsWith('icons/')) {
    return /\.(?:js|css|webp|svg|woff2?|png|avif)$/i.test(normalized)
  }
  return false
}

export async function buildServiceWorker(distDirectory = resolve(root, 'dist')) {
  const files = (await walk(distDirectory))
    .map(path => relative(distDirectory, path))
    .filter(isPrecacheAsset)
    .sort()
  const digest = createHash('sha256')
  for (const path of files) {
    digest.update(path.replaceAll(sep, '/'))
    digest.update('\0')
    digest.update(await readFile(join(distDirectory, path)))
    digest.update('\0')
  }
  const version = `v3-${digest.digest('hex').slice(0, 12)}`
  const template = await readFile(templatePath, 'utf8')
  const withVersion = template.replace("const CACHE_VERSION = 'flowvocab-shell-template'", `const CACHE_VERSION = 'flowvocab-shell-${version}'`)
  const generated = withVersion.replace('const PRECACHE = []', `const PRECACHE = ${JSON.stringify(files.map(toUrl), null, 2)}`)
  if (generated === template || generated.includes('flowvocab-shell-template') || generated.includes('const PRECACHE = []')) {
    throw new Error('service worker template markers were not replaced')
  }
  await writeFile(join(distDirectory, 'sw.js'), generated.endsWith('\n') ? generated : `${generated}\n`, 'utf8')
  return { version, files }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const directory = resolve(process.argv[2] || resolve(root, 'dist'))
  const result = await buildServiceWorker(directory)
  console.log(`generated ${join(directory, 'sw.js')} with ${result.files.length} precached assets (${result.version})`)
}
