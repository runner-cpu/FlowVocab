import { useEffect, useRef } from 'react'
import echarts from '../../charts/echarts'
import { useProgress } from '../../store/progressStore'
import type { ModuleKey } from '../../types'

const labels = ['词汇', '语法', '句子', '听力', '写作', '阅读']

export default function RadarChart({ onModuleSelect }: { onModuleSelect?: (module: ModuleKey) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const radar = useProgress((s) => s.progress?.radar)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); chartRef.current = null }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
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
        type: 'radar', silent: true, data: [{ value: [70, 70, 70, 70, 70, 70], name: '70% target', lineStyle: { type: 'dashed', color: '#9CA3AF' }, itemStyle: { opacity: 0 } }]
      }, {
        type: 'radar',
        data: [{ value: values, name: '六维掌握度', areaStyle: { color: 'rgba(91,127,212,0.25)' }, lineStyle: { color: '#5B7FD4', width: 2 }, itemStyle: { color: '#5B7FD4' } }]
      }]
    })
  }, [radar])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const onClick = (params: echarts.ECElementEvent) => {
      const index = labels.indexOf(params?.name)
      const modules: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']
      if (typeof index === 'number' && index >= 0 && modules[index]) onModuleSelect?.(modules[index])
    }
    chart.on('click', onClick)
    return () => { chart.off('click', onClick) }
  }, [onModuleSelect])

  return <div ref={ref} style={{ width: '100%', height: 280 }} />
}
