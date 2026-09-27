import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd(); const directory = resolve(root, 'public/data/words')
const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'))
const shards = await Promise.all(manifest.urls.map(url => readFile(resolve(directory, url), 'utf8').then(JSON.parse)))
const words = shards.flat()
const unique = new Set(words.map(word => word.word))
const ids = new Set(words.map(word => word.id))
const coverage = words.filter(word => word.pos && word.pos !== 'other').length / Math.max(words.length, 1) * 100
if (words.length !== manifest.total || words.length !== manifest.counts.reduce((sum, count) => sum + count, 0)) throw new Error('manifest counts do not match shards')
if (unique.size !== words.length || ids.size !== words.length) throw new Error('word IDs or normalized spellings are not unique')
if (words.some(word => word.source !== 'ecdict' || !word.meaning || !Array.isArray(word.tags))) throw new Error('word shard has unlicensed or incomplete data')
if (coverage < 99) throw new Error(`POS coverage ${coverage.toFixed(2)}% is below 99%`)
console.log(`Validated ${words.length} ECDICT words; POS coverage ${coverage.toFixed(2)}%; ${manifest.counts.join('/')}`)
