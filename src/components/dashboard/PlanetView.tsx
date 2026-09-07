import { useProgress } from '../../store/progressStore'

export default function PlanetView({ compact = false }: { compact?: boolean }) {
  const planet = useProgress((s) => s.planet)
  if (!planet) return null
  const stale = Date.now() - planet.lastActive > 86400000 // 超1天未活跃 → 停滞
  const lv = planet.level

  return (
    <div className="planet-wrap">
      <div className="planet-scene" style={compact ? { transform: 'scale(0.8)' } : {}}>
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
