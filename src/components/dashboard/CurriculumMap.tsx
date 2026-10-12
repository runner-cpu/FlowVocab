import { useMemo } from 'react'
import { Grid3x3, Route as RouteIcon } from 'lucide-react'
import { useUI } from '../../store/gameStore'
import { LEARNING_TRACKS, MODULE_META, type LearningTrack, type ModuleKey } from '../../types'
import { trackScopes, type ModuleScope } from '../../data/curriculumOverview'
import './CurriculumMap.css'

const TRACK_ORDER: LearningTrack[] = ['primary', 'middle-high', 'advanced', 'cet']
const MODULE_ORDER: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']

/**
 * 知识结构地图：把「学习路线 × 训练模块」的开放范围摊开给学习者。
 *
 * 数据全部来自 curriculumOverview（派生自 curriculum.ts 与各题库长度），
 * 组件本身不写死任何数字，避免课程叙事与实现脱节。
 * 点击某个可用单元 = 切换路线并进入该模块；未开放单元保持禁用并说明原因。
 */
export default function CurriculumMap() {
  const track = useUI((state) => state.track)
  const setTrack = useUI((state) => state.setTrack)
  const go = useUI((state) => state.go)
  const scopes = useMemo(() => trackScopes(track), [track])
  const matrix = useMemo(
    () => Object.fromEntries(TRACK_ORDER.map((item) => [item, trackScopes(item)])) as Record<LearningTrack, ModuleScope[]>,
    []
  )
  const current = LEARNING_TRACKS[track]

  return (
    <section className="card curriculum-map" aria-labelledby="curriculum-map-title">
      <div className="card-title" id="curriculum-map-title">
        <Grid3x3 size={16} /> 知识结构 · 学段 × 模块
        <span className="chart-hint">点单元格切换路线并进入</span>
      </div>
      <p className="curriculum-map-lead">
        四条学段路线共用同一套训练引擎，内容范围按课程大纲划开。数字表示「该路线开放的条目数 / 内容库总数」，
        未开放的单元格说明该学段尚未涉及这类训练。
      </p>

      <div className="curriculum-matrix-scroll">
        <table className="curriculum-matrix">
          <caption>{current.label}：开放 {scopes.filter((scope) => scope.available).length} 个模块，共 {scopes.reduce((sum, scope) => sum + scope.open, 0)} 个可练条目</caption>
          <thead>
            <tr>
              <th scope="col">训练模块</th>
              {TRACK_ORDER.map((item) => (
                <th key={item} scope="col" className={item === track ? 'is-current' : undefined} aria-current={item === track ? 'true' : undefined}>
                  {LEARNING_TRACKS[item].shortLabel}
                  {item === track && <small>当前</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_ORDER.map((module) => (
              <tr key={module}>
                <th scope="row">
                  <span className="curriculum-module-name">{MODULE_META[module].name.split('·')[0]}</span>
                  <small>{MODULE_META[module].name.split('·')[1]}</small>
                </th>
                {TRACK_ORDER.map((item) => {
                  const scope = matrix[item].find((entry) => entry.module === module)
                  const available = !!scope?.available
                  const isCurrent = item === track
                  if (!available || !scope) {
                    return (
                      <td key={item} className={isCurrent ? 'is-current' : undefined}>
                        <span className="curriculum-cell is-closed" aria-label={`${LEARNING_TRACKS[item].label} 未开放 ${MODULE_META[module].name}，该学段暂未涉及这类训练`}>—</span>
                      </td>
                    )
                  }
                  const full = scope.open >= scope.total
                  return (
                    <td key={item} className={isCurrent ? 'is-current' : undefined}>
                      <button
                        type="button"
                        className={`curriculum-cell is-open ${full ? 'is-full' : ''}`}
                        aria-label={`切换到${LEARNING_TRACKS[item].label}路线并进入${MODULE_META[module].name}，开放 ${scope.open} / ${scope.total} 个${scope.unit}`}
                        onClick={() => {
                          if (!isCurrent) setTrack(item)
                          go(module)
                        }}
                      >
                        <strong>{scope.open}<span>/{scope.total}</span></strong>
                        <small>{full ? '全开放' : `开放 ${Math.round((scope.open / scope.total) * 100)}%`}</small>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="curriculum-focus">
        <h3><RouteIcon size={14} aria-hidden /> {current.label} · 各模块训练侧重</h3>
        <ul>
          {scopes.map((scope) => (
            <li key={scope.module} className={scope.available ? undefined : 'is-closed'}>
              <span className="curriculum-focus-module">{MODULE_META[scope.module].name.split('·')[0]}</span>
              {scope.available
                ? <><span className="curriculum-focus-text">{scope.focus}</span><em>{scope.open} {scope.unit}</em></>
                : <><span className="curriculum-focus-text">{scope.focus}</span><em>本路线未开放</em></>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
