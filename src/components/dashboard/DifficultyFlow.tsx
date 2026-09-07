import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { db } from '../../store/db'
import { DIFFICULTY_COLORS, DIFFICULTY_NAMES } from '../../engine/difficulty'

export default function DifficultyFlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let chart: echarts.ECharts | null = null
    let disposed = false
    db.sessions.orderBy('time').reverse().limit(10).toArray().then((sessions) => {
      if (disposed || !ref.current) return
      const sessionsRev = [...sessions].reverse()
      const all: number[] = []
      sessionsRev.forEach((s) => all.push(...s.difficultyFlow))
      if (all.length === 0) {
        ref.current!.innerHTML = '<div style="padding:30px;text-align:center;color:#6B7280;font-size:13px;">还没有难度数据，去任意模块刷一轮吧！</div>'
        return
      }
      const flow = all.slice(-60)
      chart = echarts.init(ref.current!)
      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: (p: any) => `第 ${p[0].dataIndex + 1} 题 · ${DIFFICULTY_NAMES[p[0].value]}` },
        grid: { left: 40, right: 16, top: 16, bottom: 24 },
        xAxis: { type: 'category', data: flow.map((_, i) => i + 1), axisLabel: { color: '#6B7280', fontSize: 10 }, axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } } },
        yAxis: {
          type: 'value', min: 0, max: 4, interval: 1,
          axisLabel: { color: '#6B7280', fontSize: 10, formatter: (v: number) => DIFFICULTY_NAMES[v] },
          splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
        },
        series: [{
          type: 'line', data: flow, smooth: true, symbolSize: 6,
          lineStyle: { color: '#5B7FD4', width: 2.5 },
          itemStyle: { color: '#5B7FD4' },
          markPoint: {
            data: [
              { type: 'max', name: '最高难度', itemStyle: { color: '#EA4335' } },
              { type: 'min', name: '最低难度', itemStyle: { color: '#52C41A' } }
            ],
            label: { fontSize: 10 }
          }
        }],
        visualMap: { show: false, dimension: 1, pieces: [{ min: 0, max: 4 }] }
      })
      const onResize = () => chart?.resize()
      window.addEventListener('resize', onResize)
    })
    return () => {
      disposed = true
      chart?.dispose()
    }
  }, [])

  return <div ref={ref} style={{ width: '100%', height: 260 }} />
}
