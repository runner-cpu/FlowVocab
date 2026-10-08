import { useEffect, useMemo, useState } from 'react'
import { ChartDataDetails, ChartError } from '../../charts/ChartDataDetails'
import { useChartAppearance, useDashboardChart } from '../../charts/useDashboardChart'
import { db } from '../../store/db'
import { whenWritesSettled } from '../../store/progressStore'
import { DIFFICULTY_NAMES } from '../../engine/difficulty'

type AxisTooltipParam = { dataIndex?: unknown; value?: unknown }

function formatTooltip(params: unknown): string {
  const first = Array.isArray(params) ? params[0] : params
  if (typeof first !== 'object' || first === null) return ''
  const candidate = first as AxisTooltipParam
  const dataIndex = typeof candidate.dataIndex === 'number' ? candidate.dataIndex : 0
  const value = typeof candidate.value === 'number' ? candidate.value : 0
  return `第 ${dataIndex + 1} 题 · ${DIFFICULTY_NAMES[value] ?? '未知难度'}`
}

export default function DifficultyFlow() {
  const [flow, setFlow] = useState<number[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const appearance = useChartAppearance()

  useEffect(() => {
    let active = true
    setFlow(null)
    setLoadError(false)
    void (async () => {
      try {
        // The previous module's session is committed by its unmount cleanup, so wait for queued writes first.
        await whenWritesSettled()
        const sessions = await db.sessions.orderBy('time').reverse().limit(10).toArray()
        if (active) setFlow([...sessions].reverse().flatMap((session) => session.difficultyFlow).slice(-60))
      } catch {
        if (active) setLoadError(true)
      }
    })()
    return () => { active = false }
  }, [attempt])

  const option = useMemo(() => {
    if (!flow?.length) return null
    const { palette, animation, tooltip } = appearance
    return {
      backgroundColor: 'transparent', animation,
      textStyle: { color: palette.text },
      tooltip: { ...tooltip, trigger: 'axis', formatter: formatTooltip },
      grid: { left: 72, right: 16, top: 16, bottom: 24 },
      xAxis: { type: 'category', data: flow.map((_, index) => index + 1), axisLabel: { color: palette.secondary, fontSize: 10 }, axisLine: { lineStyle: { color: palette.line } } },
      yAxis: {
        type: 'value', min: 0, max: 4, interval: 1,
        axisLabel: { color: palette.secondary, fontSize: 10, formatter: (value: number) => DIFFICULTY_NAMES[value] ?? '未知难度' },
        splitLine: { lineStyle: { color: palette.line } },
      },
      series: [{
        type: 'line', data: flow, smooth: true, symbolSize: 6,
        lineStyle: { color: palette.accent, width: 2.5 },
        itemStyle: { color: palette.accent },
        markPoint: {
          data: [
            { type: 'max', name: '最高难度', itemStyle: { color: palette.highlight } },
            { type: 'min', name: '最低难度', itemStyle: { color: palette.accent } },
          ],
          label: { fontSize: 10, color: palette.surface },
        },
      }],
    }
  }, [flow, appearance])
  const chart = useDashboardChart(option)
  const loading = flow === null && !loadError

  return (
    <figure className="chart-panel" aria-label="难度变化" aria-busy={loading}>
      {loading && <p className="chart-status" role="status">正在加载难度数据…</p>}
      {loadError && <ChartError message="难度数据加载失败，请重试。" onRetry={() => setAttempt((value) => value + 1)} />}
      {flow?.length === 0 && <p className="chart-status" role="status">还没有难度数据，去任意模块刷一轮吧！</p>}
      {chart.error && <ChartError message={chart.error} onRetry={chart.retry} />}
      <div ref={chart.ref} aria-hidden="true" hidden={!option || !!chart.error} style={{ width: '100%', height: 260 }} />
      {!!flow?.length && (
        <ChartDataDetails caption="难度变化（最近 10 次练习，最多 60 题）" headers={['题目顺序', '难度']}>
          {flow.map((difficulty, index) => <tr key={index}><th scope="row">{index + 1}</th><td>{DIFFICULTY_NAMES[difficulty] ?? '未知难度'}</td></tr>)}
        </ChartDataDetails>
      )}
    </figure>
  )
}
