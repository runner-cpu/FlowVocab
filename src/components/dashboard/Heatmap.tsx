import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { db } from '../../store/db'
import { dayKey } from '../../engine/forget'

export default function Heatmap() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let chart: echarts.ECharts | null = null
    let disposed = false
    db.dailyStats.toArray().then((stats) => {
      if (disposed || !ref.current) return
      const map = new Map(stats.map((s) => [s.date, s.xp]))
      // 生成最近 91 天（13 周）
      const today = new Date()
      const start = new Date(today)
      start.setDate(today.getDate() - 90)
      // 对齐到周一
      const dow = (start.getDay() + 6) % 7
      start.setDate(start.getDate() - dow)

      const data: [number, number, number][] = []
      const weeks: string[] = []
      let wk = 0
      const cursor = new Date(start)
      const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      while (cursor <= today) {
        const key = dayKey(cursor.getTime())
        const val = Math.min(map.get(key) ?? 0, 12)
        data.push([wk, (cursor.getDay() + 6) % 7, val])
        if (wk % 2 === 0 && (cursor.getDay() + 6) % 7 === 0) weeks[wk] = ''
        if (weeks[wk] === undefined) weeks[wk] = ''
        cursor.setDate(cursor.getDate() + 1)
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
          min: 0, max: 12, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
          inRange: { color: ['#EEEDE8', '#F4D37A', '#F4B400', '#C98600'] },
          textStyle: { fontSize: 10, color: '#6B7280' }
        },
        series: [{
          type: 'heatmap', data, label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } }
        }]
      })
      window.addEventListener('resize', () => chart?.resize())
    })
    return () => {
      disposed = true
      chart?.dispose()
    }
  }, [])

  return <div ref={ref} style={{ width: '100%', height: 220 }} />
}
