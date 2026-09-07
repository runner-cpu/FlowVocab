import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useProgress } from '../../store/progressStore'

export default function RadarChart() {
  const ref = useRef<HTMLDivElement>(null)
  const radar = useProgress((s) => s.progress?.radar)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    const labels = ['词汇', '语法', '句子', '听力', '写作', '阅读']
    const values = radar ? [radar.vocab, radar.grammar, radar.sentence, radar.listening, radar.writing, radar.reading] : [0, 0, 0, 0, 0, 0]
    chart.setOption({
      backgroundColor: 'transparent',
      radar: {
        indicator: labels.map((name) => ({ name, max: 100 })),
        radius: '65%',
        axisName: { color: '#4B5563', fontSize: 12 },
        splitArea: { areaStyle: { color: ['rgba(91,127,212,0.03)', 'rgba(91,127,212,0.06)'] } },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
        axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
      },
      series: [{
        type: 'radar',
        data: [{ value: values, name: '六维掌握度', areaStyle: { color: 'rgba(91,127,212,0.25)' }, lineStyle: { color: '#5B7FD4', width: 2 }, itemStyle: { color: '#5B7FD4' } }]
      }]
    })
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [radar])

  return <div ref={ref} style={{ width: '100%', height: 280 }} />
}
