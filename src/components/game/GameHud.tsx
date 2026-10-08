import { useProgress } from '../../store/progressStore'
import { DIFFICULTY_COLORS, DIFFICULTY_NAMES } from '../../engine/difficulty'
import { MODULE_META, type ModuleKey } from '../../types'
import ComboCrown from './ComboCrown'

export default function GameHud({ module }: { module: ModuleKey }) {
  const combo = useProgress((s) => s.combo)
  const difficulty = useProgress((s) => s.difficulty)
  const session = useProgress((s) => s.session)
  const rage = combo.rageActive
  const charge = rage ? 5 : combo.combo % 5

  const meta = MODULE_META[module]

  return (
    <div>
      <div className="game-hud">
        <span className={`combo-chip ${combo.combo > 0 ? 'hot' : ''}`}>
          🔥 连击 ×{combo.combo}
        </span>
        {rage && <span className="rage-chip">💥 怒气爆发 · 双倍经验 ×{combo.rageRemaining}</span>}
        <ComboCrown />
        {module === 'vocab' && <span className="flame-meter" role="meter" aria-label="五连击蓄能" aria-valuemin={0} aria-valuemax={5} aria-valuenow={charge} aria-valuetext={rage ? '双倍经验，剩余 ' + combo.rageRemaining + ' 题' : charge + ' / 5，蓄满后接下来三题双倍经验'}>
          {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < charge ? 'charged' : ''} aria-hidden="true" />)}
          <small>{rage ? '双倍 XP · ' + combo.rageRemaining + ' 题' : charge + '/5 蓄能'}</small>
        </span>}
        <span
          className="diff-badge"
          style={{ background: DIFFICULTY_COLORS[difficulty.level], color: difficulty.level === 2 ? '#ffffff' : '#101820' }}
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
