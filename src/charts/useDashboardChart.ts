import { useEffect, useMemo, useRef, useState } from 'react'
import { useUI } from '../store/gameStore'
import echarts from './echarts'

function readPalette(theme: 'light' | 'dark') {
  const dark = theme === 'dark'
  const styles = typeof document === 'undefined' ? null : getComputedStyle(document.documentElement)
  const token = (name: string, light: string, night: string) => styles?.getPropertyValue(name).trim() || (dark ? night : light)
  // Canvas cannot resolve var(--token); read resolved CSS values on each theme change.
  return {
    text: token('--ink', '#12243d', '#eff7ff'),
    secondary: token('--ink2', '#45617f', '#b6c9dc'),
    surface: token('--card', '#ffffff', '#0e2943'),
    background: token('--bg', '#f3f7fb', '#07182a'),
    line: token('--line', '#dfe9f3', 'rgba(133, 188, 228, .18)'),
    accent: token('--accent', '#16b88a', '#39d9ab'),
    accentLight: token('--accent-light', '#54d7b0', '#75f3d1'),
    accentBackground: token('--accent-bg', '#e3f8f1', 'rgba(57, 217, 171, .13)'),
    highlight: token('--gold', '#f28c5c', '#ffbd62'),
  }
}

export function useChartAppearance() {
  const theme = useUI((state) => state.theme)
  const palette = useMemo(() => readPalette(theme), [theme])
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const update = () => setReducedMotion(media.matches)
    update()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener?.(update)
    return () => media.removeListener?.(update)
  }, [])

  return useMemo(() => ({
    palette,
    animation: !reducedMotion,
    tooltip: {
      renderMode: 'richText' as const,
      backgroundColor: palette.surface,
      borderColor: palette.line,
      textStyle: { color: palette.text },
      transitionDuration: reducedMotion ? 0 : 0.2,
      confine: true,
    },
  }), [palette, reducedMotion])
}

export type ChartEventHandler = (event: echarts.ECElementEvent) => void
/** 允许绑定的图表事件：覆盖点击与指针悬停反馈。 */
export type ChartEventName = 'click' | 'mouseover' | 'mousemove' | 'mouseout'
export interface ChartHandlers {
  click?: ChartEventHandler
  hover?: ChartEventHandler
  leave?: ChartEventHandler
}

/**
 * Keep one renderer across data/theme updates; every observer and listener has an owner.
 *
 * `handlers` accepts either a single click handler (legacy call style) or an object with
 * click/hover/leave so charts can offer pointer feedback without a second hook.
 */
export function useDashboardChart(option: echarts.EChartsCoreOption | null, handlers: ChartEventHandler | ChartHandlers = {}) {
  const { click, hover, leave } = typeof handlers === 'function' ? { click: handlers, hover: undefined, leave: undefined } : handlers
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const enabled = option !== null

  useEffect(() => {
    setError(null)
    if (!enabled || !ref.current) return
    let chart: echarts.ECharts
    try {
      chart = echarts.init(ref.current)
      chartRef.current = chart
    } catch {
      setError('图表绘制失败，仍可查看下方数据表。')
      return
    }
    let active = true
    const resize = () => { if (active) chart.resize() }
    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver === 'function') {
      try {
        observer = new ResizeObserver(resize)
        observer.observe(ref.current)
      } catch {
        observer?.disconnect()
        observer = undefined
      }
    }
    if (!observer) window.addEventListener('resize', resize)
    return () => {
      active = false
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      chart.dispose()
      chartRef.current = null
    }
  }, [enabled, attempt])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !option) return
    try {
      chart.setOption(option, { notMerge: true })
      setError(null)
    } catch {
      setError('图表绘制失败，仍可查看下方数据表。')
    }
  }, [option, attempt])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || (!click && !hover && !leave)) return
    type Binding = { event: ChartEventName; handler: ChartEventHandler }
    const bindings: Binding[] = []
    if (click) bindings.push({ event: 'click', handler: click })
    if (hover) { bindings.push({ event: 'mouseover', handler: hover }); bindings.push({ event: 'mousemove', handler: hover }) }
    if (leave) bindings.push({ event: 'mouseout', handler: leave })
    const bind = ({ event, handler }: Binding) => { chart.on(event, handler as (params: unknown) => void) }
    const unbind = ({ event, handler }: Binding) => { chart.off(event, handler as (params: unknown) => void) }
    // 图表初始化晚于本 effect 时（首次渲染顺序），下一次 render 会重新绑定。
    bindings.forEach(bind)
    return () => { bindings.forEach(unbind) }
  }, [enabled, click, hover, leave, attempt])

  return { ref, error, retry: () => { setError(null); setAttempt((value) => value + 1) } }
}
