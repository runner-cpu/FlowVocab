import { useProgress } from '../../store/progressStore'

export default function PlanetView({ compact = false }: { compact?: boolean }) {
  const planet = useProgress((s) => s.planet)
  if (!planet) return null
  const stale = Date.now() - planet.lastActive > 86400000 // 超1天未活跃 → 停滞
  const lv = planet.level
  const stages = ['未启航', '微光萌芽', '潮汐聚能', '航线成形', '星环初现', '海湾繁星', '群山起伏', '云端跃迁', '极光澎湃', '星门开启', '生命繁盛']
  const stage = stages[Math.max(0, Math.min(10, lv))]

  return (
    <div className="planet-wrap">
      <div className="planet-scene" role="img" aria-label={`星球等级 ${lv} · ${stage}`} data-level={lv} style={compact ? { transform: 'scale(0.8)' } : {}}>
        <div className={`planet-core p${lv} ${stale ? 'stale' : ''}`} />
        <div className="planet-ring" />
        <div className="planet-orbit">
          <div className="planet-moon" />
        </div>
      </div>
      <div className="center" style={{ marginLeft: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          {stale ? '🌫️ 星球进入停滞' : `🌍 词汇星球 Lv.${lv}`}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {stale ? '做一轮复习，让星球重新生长' : '能量驱动生长 · 复习让它更快'}
        </div>
      </div>
    </div>
  )
}
