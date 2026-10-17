/**
 * 启动兜底契约：确保「打不开页面」时用户看到的是可操作的说明，而不是白屏。
 *
 * 背景：开发入口 index.html 的脚本是 ./src/main.tsx。用普通静态服务器或 file:// 打开时，
 * 浏览器按 MIME / CORS 规则拒绝执行模块脚本，页面就停在空白。这段兜底脚本必须满足：
 *  1. 是普通脚本而不是 module —— 模块加载失败时 module 自己也不会执行，兜底就失效了；
 *  2. 按打开方式给出对得上的原因和步骤，不能一律让人「清缓存」；
 *  3. 应用正常挂载时不产生任何可见变化。
 *
 * 这里用 vm 把内联脚本跑在伪造的 window/document 上，直接断言它生成的文案，
 * 而不是用正则去匹配源码字符串——文案改了措辞也不该让契约失效。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

/** 取出 index.html 里唯一的普通脚本（兜底脚本），module 入口不算。 */
function fallbackSource() {
  const blocks = [...html.matchAll(/<script(?![^>]*\btype=)[^>]*>([\s\S]*?)<\/script>/g)]
  assert.equal(blocks.length, 1, 'index.html 里应当恰好有一段内联普通脚本作为启动兜底')
  return blocks[0][1]
}

/**
 * 在伪造环境里执行兜底脚本，返回它生成的兜底面板文本。
 * @param {{protocol: string, entrySrc: string, mounted: boolean}} scenario
 */
function runFallback(scenario) {
  const appended = []
  const root = { childElementCount: scenario.mounted ? 1 : 0 }
  const entry = { getAttribute: () => scenario.entrySrc }
  const document = {
    getElementById: (id) => (id === 'root' ? root : appended.find((el) => el.id === id) ?? null),
    querySelectorAll: () => [entry],
    createElement: () => ({ id: '', setAttribute() {}, innerHTML: '' }),
    body: {
      appendChild(el) {
        appended.push(el)
      }
    }
  }
  const listeners = {}
  const timers = []
  const context = {
    document,
    location: { protocol: scenario.protocol, pathname: '/', search: '' },
    Date,
    console,
    window: {
      addEventListener: (name, handler) => {
        listeners[name] = handler
      },
      setInterval: (handler, ms) => {
        timers.push({ handler, ms })
        return timers.length
      },
      clearInterval: () => {}
    }
  }
  vm.runInNewContext(fallbackSource(), context)
  assert.ok(listeners.load, '兜底脚本必须在 load 事件后开始判断')

  listeners.load()
  assert.ok(timers.length > 0, '兜底脚本必须轮询等待应用挂载')
  // 直接推进到宽限期结束：把 Date.now 推到足够远，再跑一次轮询回调。
  const realNow = Date.now
  Date.now = () => realNow() + 60_000
  try {
    timers[0].handler()
  } finally {
    Date.now = realNow
  }
  return appended
}

test('ships the fallback as a classic script, not a module', () => {
  assert.doesNotMatch(html, /<script type="module">[\s\S]*boot-fallback/, '兜底逻辑不能放进 module')
  assert.match(fallbackSource(), /boot-fallback/, '兜底脚本应当负责创建 #boot-fallback')
})

test('explains file:// opening instead of blaming the cache', () => {
  const panels = runFallback({ protocol: 'file:', entrySrc: './assets/index-abc.js', mounted: false })
  assert.equal(panels.length, 1, 'file:// 下应当显示兜底面板')
  const text = panels[0].innerHTML
  assert.match(text, /file:\/\//, '要点明是 file:// 直接打开导致的')
  assert.match(text, /ES Module|模块/, '要说明是模块脚本被安全策略拦住')
  assert.match(text, /本地服务器|npm run dev|start-server/, '要给出可执行的替代打开方式')
  assert.doesNotMatch(text, /清.*缓存/, 'file:// 场景不该建议清缓存，那对不上原因')
})

test('tells a developer the plain dev entry needs the build tool', () => {
  const panels = runFallback({ protocol: 'http:', entrySrc: './src/main.tsx', mounted: false })
  assert.equal(panels.length, 1, '开发入口直开时应当显示兜底面板')
  const text = panels[0].innerHTML
  assert.match(text, /开发用入口/, '要点明这是开发入口')
  assert.match(text, /npm run dev/, '要给出开发服务器命令')
  assert.match(text, /npm run build[\s\S]*npm run preview/, '要给出预览命令')
  assert.match(text, /start-server\.mjs|启动\.bat/, '要提醒离线包不要双击 index.html')
})

test('falls back to actionable steps for a built page that failed to start', () => {
  const panels = runFallback({ protocol: 'https:', entrySrc: './assets/index-abc.js', mounted: false })
  assert.equal(panels.length, 1, '构建产物启动失败时应当显示兜底面板')
  const text = panels[0].innerHTML
  assert.match(text, /刷新|重新加载/, '要给出刷新入口')
  assert.match(text, /换一个浏览器|无痕/, '要给出换浏览器的建议')
  assert.doesNotMatch(text, /开发用入口/, '构建产物里不该说这是开发入口')
})

test('stays invisible while the app mounts normally', () => {
  const panels = runFallback({ protocol: 'https:', entrySrc: './assets/index-abc.js', mounted: true })
  assert.deepEqual(panels, [], '应用正常挂载时不得插入兜底面板')
})
