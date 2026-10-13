/**
 * 设计一致性契约：把「一套配色、一套图标、一套刻度」变成可执行的断言。
 *
 * 放在 scripts/ 用 node:test 跑（与 service-worker / bundle-size / offline 契约同一条发布门禁），
 * 因为它需要读文件系统并遍历全部源码，不适合放进应用的 tsconfig 与 jsdom 环境。
 *
 * 覆盖四件事：
 *  1. 六个模块只有一处色源，且不再自带字符串图标。
 *  2. 用户可见源码里零 emoji、零 em-dash。
 *  3. CSS 字号与圆角全部走设计令牌，不写字面量。
 *  4. transition 必须带时长令牌与统一缓动（`transition: none` 除外）。
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const srcRoot = join(root, 'src')

function walk(directory, extensions, out = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) walk(path, extensions, out)
    else if (extensions.some((extension) => path.endsWith(extension))) out.push(path)
  }
  return out
}

const codeFiles = walk(srcRoot, ['.ts', '.tsx']).filter((path) => !path.includes('.test.'))
const cssFiles = walk(srcRoot, ['.css'])
const read = (path) => readFileSync(path, 'utf8')
const relative = (path) => path.slice(root.length).replace(/\\/g, '/')

test('keeps every module icon a component and every module colour in one place', () => {
  const types = read(join(srcRoot, 'types/index.ts'))
  const metaBlock = types.slice(types.indexOf('export const MODULE_META'), types.indexOf('// ---------- 雷达 ----------'))
  assert.doesNotMatch(metaBlock, /icon:/, 'MODULE_META 不应再携带 emoji 图标字符串')
  assert.doesNotMatch(metaBlock, /[⚔🌳🧩🎧🃏📖]/u, 'MODULE_META 不应出现 emoji')

  const sceneSource = read(join(srcRoot, 'data/learningScenes.ts'))
  assert.doesNotMatch(sceneSource, /tint:/, '场景数据不应维护第二套配色（tint）')

  const iconSource = read(join(srcRoot, 'components/ui/moduleIcons.ts'))
  for (const key of ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']) {
    assert.match(iconSource, new RegExp(`\\b${key}:\\s*[A-Z]`), `${key} 的图标必须是组件引用而不是字符串`)
  }

  const hexes = metaBlock.match(/#[0-9A-F]{6}/g) ?? []
  assert.equal(hexes.length, 6, '六个模块各应有一个颜色')
  assert.equal(new Set(hexes).size, 6, '六个模块的颜色必须互不相同')
})

test('ships no emoji and no em-dash in user-visible source', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2705}\u{274C}\u{2714}\u{2716}]/u
  const offenders = []
  for (const path of codeFiles) {
    const lines = read(path).split('\n')
    lines.forEach((line, index) => {
      const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
      if (emoji.test(code)) offenders.push(`${relative(path)}:${index + 1} emoji`)
      if (code.includes('\u2014')) offenders.push(`${relative(path)}:${index + 1} em-dash`)
    })
  }
  assert.deepEqual(offenders, [], '用户可见源码不得出现 emoji 或 em-dash')
})

test('keeps CSS sizes and radii on the token scale', () => {
  const offenders = []
  for (const path of cssFiles) {
    const text = read(path)
    for (const match of text.matchAll(/font-size:\s*[0-9.]+px/g)) offenders.push(`${relative(path)}: ${match[0]}`)
    for (const match of text.matchAll(/border-radius:\s*[0-9.]+px/g)) offenders.push(`${relative(path)}: ${match[0]}`)
  }
  assert.deepEqual(offenders, [], '字号与圆角必须使用设计令牌')
})

test('gives every transition a duration token and the shared easing token', () => {
  const offenders = []
  for (const path of cssFiles) {
    const text = read(path)
    for (const match of text.matchAll(/transition:[^;}]+/g)) {
      const value = match[0].trim()
      const normalized = value.replace(/!important/g, '').replace(/\s+/g, ' ').trim()
      if (normalized === 'transition: none') continue
      if (!/var\(--dur/.test(value)) offenders.push(`${relative(path)}: ${value} 缺少时长令牌`)
      if (!/(var\(--ease|ease-|cubic-bezier|linear|steps\()/.test(value)) offenders.push(`${relative(path)}: ${value} 缺少缓动令牌`)
    }
  }
  assert.deepEqual(offenders, [], 'transition 必须带时长与统一缓动令牌')
})
