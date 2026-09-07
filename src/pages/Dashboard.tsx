import { useProgress } from '../store/progressStore'
import PlanetView from '../components/dashboard/PlanetView'
import Heatmap from '../components/dashboard/Heatmap'
import RadarChart from '../components/dashboard/RadarChart'
import DifficultyFlow from '../components/dashboard/DifficultyFlow'

export default function Dashboard() {
  const profile = useProgress((s) => s.profile)
  const planet = useProgress((s) => s.planet)
  const daily = useProgress((s) => s.daily)

  return (
    <div>
      <div className="section-title">📊 数据仪表盘</div>
      <div className="stat-row">
        <div className="stat"><div className="v">{profile?.totalXp ?? 0}</div><div className="k">累计 XP</div></div>
        <div className="stat"><div className="v">{profile?.bestCombo ?? 0}</div><div className="k">最佳连击</div></div>
        <div className="stat"><div className="v">{daily?.comboMax ?? 0}</div><div className="k">今日最佳连击</div></div>
        <div className="stat"><div className="v">{Math.floor(planet?.energy ?? 0)}</div><div className="k">星球能量</div></div>
        <div className="stat"><div className="v">{planet?.level ?? 0}/5</div><div className="k">星球等级</div></div>
      </div>

      <div className="grid mt20" style={{ alignItems: 'stretch' }}>
        <div className="card">
          <div className="card-title">🎯 六维能力雷达</div>
          <RadarChart />
        </div>
        <div className="card">
          <div className="card-title">🌍 词汇星球</div>
          <PlanetView />
        </div>
      </div>

      <div className="card">
        <div className="card-title">🌊 难度流 · 心流质量</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          曲线反映你每轮答题时难度随表现的变化。理想心流：难度在挑战中温和爬升、偶有回落。
        </p>
        <DifficultyFlow />
      </div>

      <div className="card">
        <div className="card-title">🔥 学习热力图（近 90 天）</div>
        <Heatmap />
      </div>
    </div>
  )
}
