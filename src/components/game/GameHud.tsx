import { useProgress } from '../../store/progressStore'
import { DIFFICULTY_COLORS, DIFFICULTY_NAMES } from '../../engine/difficulty'
import { MODULE_META, type ModuleKey } from '../../types'

export default function GameHud({ module }: { module: ModuleKey }) {
  const combo = useProgress((s) => s.combo)
  const difficulty = useProgress((s) => s.difficulty)
  const session = useProgress((s) => s.session)
  const rage = combo.rageActive

  const meta = MODULE_META[module]

  return (
    <div>
      <div className="game-hud">
        <span className={`combo-chip ${combo.combo > 0 ? 'hot' : ''}`}>
          🔥 连击 ×{combo.combo}
        </span>
        {rage && <span className="rage-chip">💥 怒气爆发 · 双倍经验 ×{combo.rageRemaining}</span>}
        <span
          className="diff-badge"
          style={{ background: DIFFICULTY_COLORS[difficulty.level] }}
          key={difficulty.level}
        >
          {DIFFICULTY_NAMES[difficulty.level]} 难度
        </span>
        <span className="progress-strip">
          <span>✅ {session.correct}/{session.total}</span>
          <span>🏆 本轮最佳连击 {session.comboMax}</span>
        </span>
      </div>
      <div className="subtitle">
        {meta.icon} {meta.name} · {meta.desc}
      </div>
    </div>
  )
}
