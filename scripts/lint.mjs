import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const failures = []

function walk(directory, extensions) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(path, extensions))
    else if (extensions.some(extension => entry.name.endsWith(extension))) files.push(path)
  }
  return files
}

function checkText(path, pattern, message) {
  const text = readFileSync(path, 'utf8')
  if (pattern.test(text)) failures.push(relative(root, path) + ': ' + message)
}

for (const path of walk(resolve(root, 'src'), ['.ts', '.tsx', '.css'])) {
  checkText(path, /import\s+\*\s+as\s+echarts\s+from\s+['"]echarts['"]/, 'use the registered chart facade instead of the full ECharts bundle')
  checkText(path, /\.png\b/, 'production source must reference responsive WebP assets')
}

const css = resolve(root, 'src/styles/global.css')
const cssText = readFileSync(css, 'utf8')
if ((cssText.match(/:root\s*\{/g) || []).length !== 1) failures.push('src/styles/global.css: expected one light token root')
if (!/\[data-theme=['"]dark['"]\]/.test(cssText)) failures.push('src/styles/global.css: missing dark token override')

for (const directory of ['assets', 'data', 'icons', 'output']) {
  if (existsSync(resolve(root, directory))) failures.push(directory + '/: generated root artifact directory must stay out of version control')
}

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
if (!packageJson.scripts?.lint) failures.push('package.json: missing lint script')
if (packageJson.scripts?.build?.includes('sync-pages-root')) failures.push('package.json: build must not sync generated Pages-root files')
if (!existsSync(resolve(root, 'LICENSE'))) failures.push('LICENSE: source license is missing')

if (failures.length) {
  console.error('Lint failed with ' + failures.length + ' issue(s):')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('Lint passed: source imports, media references, tokens, artifacts, and release metadata are valid.')
}
