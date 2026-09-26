import { useEffect, useRef } from 'react'
import echarts from '../../charts/echarts'
import { db } from '../../store/db'
import { dayKey } from '../../engine/forget'
import { heatmapScale } from '../../engine/progression'
import type { DailyStat } from '../../types'

export function buildHeatmapData(stats: DailyStat[], days: number, dailyGoal: number, today: Date) {
  const map = new Map(stats.map((stat) => [stat.date, stat.xp]))
  const start = new Date(today); start.setDate(today.getDate() - days)
  const values: number[] = []
  for (const cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) values.push(map.get(dayKey(cursor.getTime())) ?? 0)
  return { values, max: heatmapScale(values, dailyGoal) }
}

export default function Heatmap({ days = 90 }: { days?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let chart: echarts.ECharts | null = null
    let disposed = false
    const onResize = () => chart?.resize()
    db.dailyStats.toArray().then((stats) => {
      if (disposed || !ref.current) return
      // 生成最近一段时间，支持 7 / 30 / 90 天切换
      const today = new Date()
      const start = new Date(today)
      start.setDate(today.getDate() - days)
      // 对齐到周一
      const dow = (start.getDay() + 6) % 7
      start.setDate(start.getDate() - dow)
      const calendarDays = Math.round((today.getTime() - start.getTime()) / 86400000)
      const heatmap = buildHeatmapData(stats, calendarDays, 100, today)

      const data: [number, number, number][] = []
      const weeks: string[] = []
      let wk = 0
      let day = 0
      const cursor = new Date(start)
      const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      while (cursor <= today) {
        const val = heatmap.values[day] ?? 0
        data.push([wk, (cursor.getDay() + 6) % 7, val])
        if (wk % 2 === 0 && (cursor.getDay() + 6) % 7 === 0) weeks[wk] = ''
        if (weeks[wk] === undefined) weeks[wk] = ''
        cursor.setDate(cursor.getDate() + 1)
        day += 1
        if ((cursor.getDay() + 6) % 7 === 0) wk++
      }

      chart = echarts.init(ref.current)
      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { position: 'top', formatter: (p: any) => `${p.value[2] > 0 ? 'XP ' + p.value[2] : '未学习'}` },
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
  }, [days])

  return <div ref={ref} style={{ width: '100%', height: 220 }} />
}
