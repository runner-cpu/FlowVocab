import { Brain, Flame, Gauge, Repeat2, Route, ShieldCheck } from 'lucide-react'

const ENGINE_POINTS = [
  {
    icon: Gauge,
    title: '自适应难度',
    body: '依据正确率与作答用时，在 5 个难度档之间动态校准练习起点，把挑战维持在「跳一跳够得着」的心流区间。'
  },
  {
    icon: Repeat2,
    title: '间隔重复',
    body: '按简化的 SM-2 算法安排复习：答对间隔翻倍（1/3/7 天起步，上限 30 天），连续 3 次答对即记为「掌握」。'
  },
  {
    icon: Route,
    title: '错因路由',
    body: '答错先归因（10 类错因），再给出规则讲解与形近词对比卡，把每一次错误变成一次针对性讲解。'
  },
  {
    icon: Flame,
    title: '无焦虑激励',
    body: '用连击蓄能替代倒计时：5 连击点亮 3 次双倍经验，答对消耗、答错中断，不让时间压力伤害学习动机。'
  }
] as const

/**
 * 教学设计说明面板：把引擎背后的学习科学逻辑讲给学习者和评委听。
 * 纯展示组件，不访问 store；口径与 engine/forget.ts、engine/combo.ts、engine/errorRouting.ts 一致。
 */
export default function LearningEnginePanel() {
  return (
    <section className="card learning-engine" aria-labelledby="learning-engine-title">
      <div className="card-title" id="learning-engine-title">
        <Brain size={16} /> 学习引擎 <span className="chart-hint">为什么这样设计</span>
      </div>
      <div className="engine-grid">
        {ENGINE_POINTS.map((point) => {
          const Icon = point.icon
          return (
            <div className="engine-item" key={point.title}>
              <span className="engine-item-icon" aria-hidden><Icon size={15} /></span>
              <div>
                <strong>{point.title}</strong>
                <p>{point.body}</p>
              </div>
            </div>
          )
        })}
      </div>
      <p className="engine-footnote">
        <ShieldCheck size={13} aria-hidden /> 学习数据只保存在本机浏览器（IndexedDB），不上传任何服务器；断网时依然可以完整练习。
      </p>
    </section>
  )
}
