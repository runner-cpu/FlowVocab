/**
 * 作品离线包：把 dist 打成可离线运行的交付包（评委/审核老师本地双击即可用）。
 *
 * 为什么不直接发 dist 压缩包：
 * 1. 本项目是 ES Module + Service Worker 应用，用 file:// 直接打开会被浏览器安全策略拦截，
 *    必须经 HTTP 提供；包内自带零依赖的 Node 静态服务器脚本，双击即可起服务。
 * 2. 包内附《启动说明》，把「打不开怎么办」写在最前面，避免现场因为环境问题丢分。
 *
 * 产物目录 dist-offline/（已 gitignore，不进版本库），同时尝试生成 zip。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(root, 'dist')
const outRoot = resolve(root, 'dist-offline')
const pkgDir = join(outRoot, 'FlowVocab-offline')

if (!existsSync(join(dist, 'index.html'))) {
  console.error('离线包需要先构建产物：请先运行 npm run build')
  process.exit(1)
}

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const releasedAt = new Date().toISOString().slice(0, 10)

rmSync(outRoot, { recursive: true, force: true })
mkdirSync(pkgDir, { recursive: true })
cpSync(dist, pkgDir, { recursive: true })

const server = `/**
 * 零依赖静态服务器：只用 Node 内置模块，无需联网安装任何东西。
 * 用法：node start-server.mjs   然后浏览器打开终端里打印的地址。
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('./', import.meta.url)))
const port = Number(process.env.PORT || 8080)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
}

const server = createServer((request, response) => {
  const requested = decodeURIComponent((request.url || '/').split('?')[0])
  let target = join(rootDir, normalize(requested).replace(/^([/\\\\])+/, ''))
  if (!target.startsWith(rootDir)) { response.writeHead(403).end('forbidden'); return }
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html')
  // 单页应用：找不到的路径回退到首页（本站使用 hash 路由，正常不会触发）。
  if (!existsSync(target)) target = join(rootDir, 'index.html')
  response.writeHead(200, { 'content-type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream' })
  createReadStream(target).pipe(response)
})

server.listen(port, () => {
  console.log('微光港：英语星图 已在本机启动')
  console.log('请在浏览器打开： http://localhost:' + port + '/')
  console.log('（关闭这个窗口即停止服务；不要用 file:// 直接打开 index.html）')
})
`

const readme = `《微光港：英语星图》作品离线包
======================================

一、最简启动方式（推荐）
------------------------
1. 在本文件夹打开终端（Windows：在地址栏输入 cmd 回车）。
2. 执行：node start-server.mjs
   也可以直接双击 启动.bat（Windows）。
3. 浏览器打开终端提示的地址：http://localhost:8080/

注意：请不要用 file:// 直接双击 index.html 打开。本站是标准 Web 应用
（ES Module + Service Worker），浏览器安全策略要求经 HTTP 访问。


二、运行环境要求
------------------------
- 操作系统：Windows / macOS / Linux 均可
- 浏览器：Chrome 90+ 或 Edge 90+（推荐）
- 本地服务器：需要 Node.js 14+（仅用于起一个本地静态服务，不联网、不安装依赖）
  若本机没有 Node.js，也可用任意静态服务器指向本文件夹，例如：
    python -m http.server 8080
    npx serve .
- 学习进度保存在浏览器本地（IndexedDB），不需要账号、不需要联网。


三、离线能力说明
------------------------
首次打开后，页面资源与词库会被浏览器缓存；此后断网刷新仍可继续练习。
可在浏览器地址栏右侧点击「安装」把本站装到桌面/主屏，像普通软件一样使用。


四、内容与许可
------------------------
- 界面语言：简体中文；练习内容：英语（覆盖小学 / 初高中 / 高中 / 四六级四条学段路线）
- 英文词库来源：ECDICT（MIT）；例句语料：Tatoeba（CC-BY 2.0 FR）
- 界面字体：Outfit（SIL OFL 1.1）；许可文件随包提供于 licenses/ 与 data/words/ 目录
- 学习数据不上传任何服务器，语音识别在浏览器本地完成，请放心试用

版本：${packageJson.version}　·　打包日期：${releasedAt}
`

const bat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [提示] 未检测到 Node.js。请安装 Node.js 后重试，
  echo        或在 Python 环境中执行: python -m http.server 8080
  pause
  exit /b 1
)
echo 正在启动本地服务器，启动后浏览器打开 http://localhost:8080/
node start-server.mjs
pause
`

const sh = `#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "[提示] 未检测到 Node.js。可用 python3 -m http.server 8080 代替。"
  exit 1
fi
echo "正在启动本地服务器，启动后浏览器打开 http://localhost:8080/"
node start-server.mjs
`

writeFileSync(join(pkgDir, 'start-server.mjs'), server)
writeFileSync(join(pkgDir, '启动.bat'), bat.replace(/\n/g, '\r\n'))
writeFileSync(join(pkgDir, 'start.sh'), sh)
writeFileSync(join(pkgDir, '启动说明.txt'), readme.replace(/\n/g, '\r\n'))

function directorySize(directory) {
  let total = 0
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    total += entry.isDirectory() ? directorySize(path) : statSync(path).size
  }
  return total
}

const sizeMb = (directorySize(pkgDir) / 1024 / 1024).toFixed(1)
console.log(`离线包已生成：${pkgDir}（${sizeMb} MB）`)

const zipPath = join(outRoot, 'FlowVocab-offline.zip')
const zipped = process.platform === 'win32'
  ? spawnSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${pkgDir}' -DestinationPath '${zipPath}' -Force`], { stdio: 'inherit' })
  : spawnSync('zip', ['-r', '-q', zipPath, 'FlowVocab-offline'], { cwd: outRoot, stdio: 'inherit' })
if (zipped.status === 0 && existsSync(zipPath)) {
  console.log(`压缩包已生成：${zipPath}`)
} else {
  console.log('已跳过压缩（当前环境缺少 Compress-Archive 或 zip），可直接分发上面的文件夹。')
}
console.log('提示：请现场用「启动说明.txt」的步骤实测一次，再作为作品附件提交。')
