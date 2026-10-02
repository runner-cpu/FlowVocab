import { useEffect, useRef } from 'react'
import echarts from '../../charts/echarts'
import { db } from '../../store/db'
import { dayKey } from '../../engine/forget'
import { heatmapScale } from '../../engine/progression'
import { useProgress } from '../../store/progressStore'
import type { DailyStat } from '../../types'

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
  const map = new Map(stats.map((stat) => [stat.date, stat.xp]))
  const count = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  const end = localDate(today)
  const start = addLocalDays(end, -(count - 1))
  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    const cursor = addLocalDays(start, index)
    values.push(map.get(dayKey(cursor.getTime())) ?? 0)
  }
  return { values, max: heatmapScale(values, dailyGoal) }
}

export default function Heatmap({ days = 90 }: { days?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const daily = useProgress((state) => state.daily)

  useEffect(() => {
    let chart: echarts.ECharts | null = null
    let disposed = false
    const onResize = () => chart?.resize()
    db.dailyStats.toArray().then((stats) => {
      if (disposed || !ref.current) return
      const today = localDate(new Date())
      const requestedDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 1
      const requestedStart = addLocalDays(today, -(requestedDays - 1))
      // Align the visual grid to Monday without changing the requested range.
      const start = addLocalDays(requestedStart, -((requestedStart.getDay() + 6) % 7))
      const calendarDays = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1
      const heatmap = buildHeatmapData(stats, calendarDays, 100, today)

      const data: [number, number, number][] = []
      const weeks: string[] = []
      let week = 0
      let day = 0
      const cursor = new Date(start)
      const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      while (cursor <= today) {
        const weekday = (cursor.getDay() + 6) % 7
        data.push([week, weekday, heatmap.values[day] ?? 0])
        if (weeks[week] === undefined) weeks[week] = ''
        cursor.setDate(cursor.getDate() + 1)
        day += 1
        if (((cursor.getDay() + 6) % 7) === 0) week += 1
      }

      chart = echarts.init(ref.current)
      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          position: 'top',
          formatter: (params: unknown) => {
            const candidate = typeof params === 'object' && params !== null && 'value' in params
              ? (params as { value?: unknown }).value
              : undefined
            const xp = Array.isArray(candidate) && typeof candidate[2] === 'number' ? candidate[2] : 0
            return xp > 0 ? `XP ${xp}` : '未学习'
          }
        },
        grid: { left: 40, right: 8, top: 10, bottom: 24 },
        xAxis: { type: 'category', data: weeks, splitArea: { show: true }, axisLabel: { color: '#6B7280', fontSize: 10 }, axisLine: { show: false } },
        yAxis: { type: 'category', data: weekdayNames, splitArea: { show: true }, axisLabel: { color: '#6B7280', fontSize: 10 }, axisLine: { show: false } },
        visualMap: {
          min: 0, max: heatmap.max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
          inRange: { color: ['#EEEDE8', '#F4D37A', '#F4B400', '#C98600'] },
          textStyle: { fontSize: 10, color: '#6B7280' }
        },
        series: [{
          type: 'heatmap', data, label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } }
        }]
      })
      window.addEventListener('resize', onResize)
    })
    return () => {
      disposed = true
      window.removeEventListener('resize', onResize)
      chart?.dispose()
    }
  }, [days, daily?.date, daily?.xp])

  return <div ref={ref} style={{ width: '100%', height: 220 }} />
}
