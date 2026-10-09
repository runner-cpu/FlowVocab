import { useState } from 'react'
import { useProgress } from '../../store/progressStore'
import { planetLevelFromEnergy } from '../../engine/progression'

/** 与 engine/progression 的每 250 能量一档保持一致。 */
export const ENERGY_PER_LEVEL = 250
export const PLANET_STAGES = ['未启航', '微光萌芽', '潮汐聚能', '航线成形', '星环初现', '海湾繁星', '群山起伏', '云端跃迁', '极光澎湃', '星门开启', '生命繁盛']

export function planetStage(level: number): string {
  return PLANET_STAGES[Math.max(0, Math.min(PLANET_STAGES.length - 1, Math.floor(level)))]
}

/** 距离下一档还差多少能量；已满级返回 null。 */
export function nextLevelGap(energy: number): { level: number; current: number; needed: number; percent: number } | null {
  const safeEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0
  const level = planetLevelFromEnergy(safeEnergy)
  if (level >= 10) return null
  const current = safeEnergy - level * ENERGY_PER_LEVEL
  return { level, current, needed: ENERGY_PER_LEVEL, percent: Math.round((current / ENERGY_PER_LEVEL) * 100) }
}

export default function PlanetView({ compact = false }: { compact?: boolean }) {
  const planet = useProgress((s) => s.planet)
  const [showStage, setShowStage] = useState(false)
  if (!planet) return null
  const stale = Date.now() - planet.lastActive > 86400000 // 超1天未活跃 → 停滞
  const lv = planet.level
  const stage = planetStage(lv)
  const gap = nextLevelGap(planet.energy)

  return (
    <div className="planet-wrap">
      <div className="planet-scene" role="img" aria-label={`星球等级 ${lv} · ${stage}`} data-level={lv} style={compact ? { transform: 'scale(0.8)' } : {}}>
        <div className={`planet-core p${lv} ${stale ? 'stale' : ''}`} />
        <div className="planet-ring" />
        <div className="planet-orbit">
          <div className="planet-moon" />
        </div>
      </div>
      <div className="center planet-copy" style={{ marginLeft: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          {stale ? '🌫️ 星球进入停滞' : `🌍 词汇星球 Lv.${lv}`}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {stale ? '做一轮复习，让星球重新生长' : `阶段：${stage}`}
        </div>
        {gap ? (
          <div className="planet-progress">
            <div
              className="planet-progress-track"
              role="progressbar"
              aria-label={`距离 Lv.${gap.level + 1} 还差 ${Math.round(gap.needed - gap.current)} 能量`}
              aria-valuemin={0}
              aria-valuemax={gap.needed}
              aria-valuenow={Math.round(gap.current)}
            ><i style={{ width: `${gap.percent}%` }} /></div>
            <small className="muted">距 Lv.{gap.level + 1} 还差 {Math.round(gap.needed - gap.current)} 能量</small>
          </div>
        ) : <small className="muted">已达最高阶段</small>}
        <button
          type="button"
          className="btn btn-ghost planet-stage-toggle"
          aria-expanded={showStage}
          onClick={() => setShowStage((value) => !value)}
        >{showStage ? '收起阶段说明' : '阶段说明'}</button>
        {showStage && (
          <p className="planet-stage-note" role="status">
            每 {ENERGY_PER_LEVEL} 能量推进一个阶段，共 10 段：{PLANET_STAGES.slice(1).join(' → ')}。
            能量来自答题与每日补给，也可以在航线地图的星尘工坊用星尘灌注。
          </p>
        )}
      </div>
    </div>
  )
}
