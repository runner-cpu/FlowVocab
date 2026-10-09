import { useCallback, useEffect, useMemo, useState } from 'react'
import type echarts from '../../charts/echarts'
import { ChartDataDetails, ChartError } from '../../charts/ChartDataDetails'
import { useChartAppearance, useDashboardChart } from '../../charts/useDashboardChart'
import { db } from '../../store/db'
import { dayKey } from '../../engine/forget'
import { heatmapScale } from '../../engine/progression'
import { useProgress } from '../../store/progressStore'
import { MODULE_META, type DailyStat, type ModuleKey } from '../../types'

function localDate(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function addLocalDays(value: Date, days: number): Date {
  const next = localDate(value)
  next.setDate(next.getDate() + days)
  return next
}

/** Build a range ending on `today`; `days` is the number of cells, not an offset. */
export function buildHeatmapData(stats: DailyStat[], days: number, dailyGoal: number, today: Date) {
  const map = new Map(stats.map((stat) => [stat.date, stat]))
  const count = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  const end = localDate(today)
  const start = addLocalDays(end, -(count - 1))
  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    const cursor = addLocalDays(start, index)
    values.push(map.get(dayKey(cursor.getTime()))?.xp ?? 0)
  }
  return { values, max: heatmapScale(values, dailyGoal) }
}

/** 某一天的完整记录，供点击热力格后展示（这些字段本来就在日报里，之前没有出口）。 */
export function dailyDetail(stat: DailyStat | undefined): { xp: number; energy: number; comboMax: number; modules: Array<{ module: ModuleKey; count: number }> } | null {
  if (!stat) return null
  return {
    xp: stat.xp,
    energy: stat.energy,
    comboMax: stat.comboMax,
    modules: (Object.entries(stat.modules) as Array<[ModuleKey, number]>)
      .filter(([, count]) => count > 0)
      .map(([module, count]) => ({ module, count }))
  }
}

type HeatmapCell = { name: string; value: [number, number, number] }

function formatTooltip(params: unknown): string {
  if (typeof params !== 'object' || params === null || !('data' in params)) return ''
  const data = params.data as Partial<HeatmapCell> | null
  if (!data || typeof data.name !== 'string' || !Array.isArray(data.value)) return ''
  return `${data.name} · ${data.value[2]} XP${data.value[2] === 0 ? ' · 未学习' : ' · 点击查看当日明细'}`
}

export default function Heatmap({ days = 90, today: todayKey }: { days?: number; today?: string }) {
  const daily = useProgress((state) => state.daily)
  const dailyGoal = useProgress((state) => state.planet?.dailyGoal ?? 100)
  const requestedDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  const [stats, setStats] = useState<DailyStat[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const appearance = useChartAppearance()

  useEffect(() => {
    let active = true
    setStats(null)
    setLoadError(false)
    setPickedDate(null)
    void (async () => {
      try {
        const result = await db.dailyStats.toArray()
        if (active) setStats(result)
      } catch {
        if (active) setLoadError(true)
      }
    })()
    return () => { active = false }
  }, [requestedDays, daily?.date, daily?.xp, attempt, todayKey])

  const heatmap = useMemo(() => {
    if (!stats) return null
    const today = todayKey ? localDate(new Date(`${todayKey}T00:00:00`)) : localDate(new Date())
    const start = addLocalDays(today, -(requestedDays - 1))
    const { values, max } = buildHeatmapData(stats, requestedDays, dailyGoal, today)
    const firstWeekday = (start.getDay() + 6) % 7
    // Calendar offsets preserve weekdays over 23/25-hour DST days. Leading slots
    // stay empty: they are never data points, never included in the scale/table.
    const data: HeatmapCell[] = values.map((xp, index) => ({
      name: dayKey(addLocalDays(start, index).getTime()),
      value: [Math.floor((firstWeekday + index) / 7), (firstWeekday + index) % 7, xp],
    }))
    const weeks = Array.from({ length: Math.ceil((firstWeekday + values.length) / 7) }, (_, index) => String(index))
    return { data, weeks, max }
  }, [stats, requestedDays, dailyGoal, todayKey])

  const option = useMemo(() => {
    if (!heatmap?.data.length) return null
    const { palette, animation, tooltip } = appearance
    return {
      backgroundColor: 'transparent', animation,
      textStyle: { color: palette.text },
      tooltip: { ...tooltip, position: 'top', formatter: formatTooltip },
      grid: { left: 40, right: 8, top: 10, bottom: 30 },
      xAxis: { type: 'category', data: heatmap.weeks, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false } },
      yAxis: { type: 'category', inverse: true, data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'], axisLabel: { color: palette.secondary, fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false } },
      visualMap: {
        min: 0, max: heatmap.max, dimension: 2, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
        inRange: { color: [palette.background, palette.accentBackground, palette.accentLight, palette.accent] },
        textStyle: { fontSize: 10, color: palette.secondary },
      },
      series: [{
        type: 'heatmap', data: heatmap.data, label: { show: false },
        cursor: 'pointer',
        itemStyle: { borderColor: palette.surface, borderWidth: 2 },
        emphasis: { itemStyle: { borderColor: palette.text, borderWidth: 2 } },
        selectedMode: 'single',
      }],
    }
  }, [heatmap, appearance])
  const onClick = useCallback((params: echarts.ECElementEvent) => {
    const data = (params as { data?: Partial<HeatmapCell> }).data
    if (data && typeof data.name === 'string') setPickedDate(data.name)
  }, [])
  const chart = useDashboardChart(option, onClick)
  const loading = stats === null && !loadError
  const picked = useMemo(() => {
    const stat = pickedDate ? stats?.find((entry) => entry.date === pickedDate) : undefined
    return pickedDate ? { date: pickedDate, detail: dailyDetail(stat) } : null
  }, [pickedDate, stats])

  return (
    <figure className="chart-panel" aria-label="学习热力图" aria-busy={loading}>
      {loading && <p className="chart-status" role="status">正在加载学习热力图…</p>}
      {loadError && <ChartError message="学习热力图数据加载失败，请重试。" onRetry={() => setAttempt((value) => value + 1)} />}
      {heatmap?.data.length === 0 && <p className="chart-status" role="status">所选范围没有日期。</p>}
      {chart.error && <ChartError message={chart.error} onRetry={chart.retry} />}
      <div ref={chart.ref} aria-hidden="true" hidden={!option || !!chart.error} style={{ width: '100%', height: 220 }} />
      {picked && (
        <div className="heatmap-detail" role="status">
          <strong>{picked.date}</strong>
          {picked.detail
            ? <p>{picked.detail.xp} XP · 能量 {picked.detail.energy} · 最高连击 {picked.detail.comboMax} · 涵盖 {picked.detail.modules.length || 0} 个模块</p>
            : <p>这一天没有学习记录。</p>}
          {picked.detail && picked.detail.modules.length > 0 && (
            <ul className="heatmap-detail-modules">
              {picked.detail.modules.map(({ module, count }) => <li key={module}>{MODULE_META[module].icon} {MODULE_META[module].name.split('·')[0]} · {count} 题</li>)}
            </ul>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => setPickedDate(null)}>收起当日明细</button>
        </div>
      )}
      {!!heatmap?.data.length && (
        <ChartDataDetails caption={`学习热力图（最近 ${requestedDays} 天）`} headers={['日期', 'XP']}>
          {heatmap.data.map(({ name, value }) => <tr key={name}><th scope="row">{name}</th><td>{value[2]} XP</td></tr>)}
        </ChartDataDetails>
      )}
    </figure>
  )
}
