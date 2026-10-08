import { useCallback, useMemo, useState } from 'react'
import type echarts from '../../charts/echarts'
import { ChartDataDetails, ChartError } from '../../charts/ChartDataDetails'
import { useChartAppearance, useDashboardChart } from '../../charts/useDashboardChart'
import { useProgress } from '../../store/progressStore'
import type { ModuleKey } from '../../types'

export const RADAR_LABELS = ['词汇', '语法', '句子', '听力', '写作', '阅读'] as const
const RADAR_MODULES: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']

export function moduleForRadarLabel(label: string): ModuleKey | null {
  const index = RADAR_LABELS.indexOf(label as (typeof RADAR_LABELS)[number])
  return index >= 0 ? RADAR_MODULES[index] : null
}

export default function RadarChart({ onModuleSelect }: { onModuleSelect?: (module: ModuleKey) => void }) {
  const radar = useProgress((state) => state.progress?.radar)
  const ready = useProgress((state) => state.ready)
  const initError = useProgress((state) => state.initError)
  const retryInit = useProgress((state) => state.retryInit)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const appearance = useChartAppearance()
  const values = useMemo(() => radar ? RADAR_MODULES.map((module) => radar[module]) : null, [radar])
  const loading = retrying || (!ready && !initError && !retryError)
  const error = retryError || initError
  const hasData = ready && !error && !loading && values !== null

  const option = useMemo(() => {
    if (!hasData || !values) return null
    const { palette, animation, tooltip } = appearance
    return {
      backgroundColor: 'transparent', animation,
      textStyle: { color: palette.text }, tooltip,
      radar: {
        indicator: RADAR_LABELS.map((name) => ({ name, max: 100 })),
        radius: '65%', triggerEvent: true,
        axisName: { color: palette.secondary, fontSize: 12 },
        splitArea: { areaStyle: { color: [palette.surface, palette.accentBackground] } },
        splitLine: { lineStyle: { color: palette.line } },
        axisLine: { lineStyle: { color: palette.line } },
      },
      series: [{
        type: 'radar', silent: true,
        data: [{ value: [70, 70, 70, 70, 70, 70], name: '目标 70%', lineStyle: { type: 'dashed', color: palette.secondary }, itemStyle: { opacity: 0 } }],
      }, {
        type: 'radar',
        data: [{ value: values, name: '六维掌握度', areaStyle: { color: palette.accent, opacity: 0.25 }, lineStyle: { color: palette.accent, width: 2 }, itemStyle: { color: palette.accent } }],
      }],
    }
  }, [hasData, values, appearance])
  const onClick = useCallback((params: echarts.ECElementEvent) => {
    const label = typeof params.name === 'string' ? params.name : ''
    const module = moduleForRadarLabel(label)
    if (module) onModuleSelect?.(module)
  }, [onModuleSelect])
  const chart = useDashboardChart(option, onClick)

  const retry = async () => {
    setRetrying(true)
    setRetryError(null)
    try {
      await retryInit()
    } catch {
      setRetryError('掌握度数据加载失败，请重试。')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <figure className="chart-panel" aria-label="六维掌握度" aria-busy={loading}>
      {loading && <p className="chart-status" role="status">正在加载掌握度数据…</p>}
      {!loading && error && <ChartError message={error} onRetry={() => { void retry() }} />}
      {!loading && !error && !values && <p className="chart-status" role="status">暂无掌握度数据，完成练习后可查看。</p>}
      {chart.error && <ChartError message={chart.error} onRetry={chart.retry} />}
      <div ref={chart.ref} aria-hidden="true" hidden={!option || !!chart.error} style={{ width: '100%', height: 280 }} />
      {hasData && values && (
        <ChartDataDetails caption="六维掌握度" headers={['学习模块', '当前掌握度', '目标']}>
          {RADAR_LABELS.map((label, index) => (
            <tr key={label}>
              <th scope="row">{onModuleSelect ? <button type="button" className="btn btn-ghost" onClick={() => onModuleSelect(RADAR_MODULES[index])}>{label}</button> : label}</th>
              <td>{values[index]}%</td><td>70%</td>
            </tr>
          ))}
        </ChartDataDetails>
      )}
    </figure>
  )
}
