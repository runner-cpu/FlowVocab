import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import FlowGuide from './FlowGuide'
import { CHAPTERS, MAX_STARS, applyChapterResult, chapterView, nextChapterId, starsForResult } from '../../engine/chapters'
import { isModuleAvailable } from '../../data/curriculum'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/gameStore'
import type { ModuleKey } from '../../types'
import './WorldMap.css'

/**
 * 结算门槛：模块在“一轮/一个节点”结束时上报该轮成绩。
 * 门槛设为 2 题，既能挡住单题侥幸（还叠加了短轮次星级封顶），
 * 又不会让小学路线这种只有 2 道语法题的章节永远拿不到星。
 */
export const SETTLE_MIN_ANSWERS = 2

interface ChapterResultContextValue {
  /**
   * 上报**本次进入模块后的累计作答**（已答题数、其中答对数），而不是单轮增量。
   * 例如语法练完 2 个节点后报 (4, 3)。章节壳只取各项的单调最大值：
   * 重复上报不会翻倍计分，较差的后续上报也不会覆盖已经拿到的好成绩。
   */
  report: (answered: number, correct: number) => void
}

const ChapterResultContext = createContext<ChapterResultContextValue>({ report: () => {} })

export function useChapterResult(): ChapterResultContextValue {
  return useContext(ChapterResultContext)
}

/** 关卡壳：为复用的训练模块提供章节进度、星级结算与下一关入口。 */
export default function ChapterShell({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const track = useUI((state) => state.track)
  const go = useUI((state) => state.go)
  const progress = useProgress((state) => state.progress)
  const recordChapterResult = useProgress((state) => state.recordChapterResult)
  /** 本轮会话最高连击：用于「高正确率 + 高连击」的 3 星补偿。 */
  const sessionCombo = useProgress((state) => state.session.comboMax)
  const [result, setResult] = useState<{ stars: number; total: number; correct: number; stardust: number } | null>(null)
  /** 本次进入模块的“最好成绩快照”；模块上报快照，这里负责择优与结算。 */
  const tally = useRef({ total: 0, correct: 0 })
  const heading = useRef<HTMLHeadingElement>(null)

  const chapter = useMemo(() => CHAPTERS.find((entry) => entry.module === module) ?? null, [module])
  const views = useMemo(
    () => chapterView(CHAPTERS, progress?.chapterStars ?? {}, (key) => isModuleAvailable(track, key), track),
    [progress?.chapterStars, track]
  )
  const view = chapter ? views.find((entry) => entry.id === chapter.id) ?? null : null

  const resetRun = useCallback(() => {
    setResult(null)
    tally.current = { total: 0, correct: 0 }
  }, [])

  useEffect(() => { resetRun() }, [module, track, resetRun])

  const report = useCallback((answered: number, correct: number) => {
    if (!chapter) return
    const safeAnswered = Number.isFinite(answered) ? Math.max(0, Math.floor(answered)) : 0
    const safeCorrect = Number.isFinite(correct) ? Math.max(0, Math.min(safeAnswered, Math.floor(correct))) : 0
    if (safeAnswered <= 0) return
    // 模块上报的是“本次进入模块后的累计成绩”，因此更晚的上报一定覆盖更多题目。
    // 只保留题数最多的一次（题数相同则取答对数更多的一次）：
    // 重复上报不会翻倍计分，也不会有更短的一轮覆盖更完整的一轮。
    const current = tally.current
    const moreComplete = safeAnswered > current.total
    const sameLengthButBetter = safeAnswered === current.total && safeCorrect > current.correct
    if (current.total > 0 && !moreComplete && !sameLengthButBetter) return
    tally.current = { total: safeAnswered, correct: safeCorrect }
    if (safeAnswered < SETTLE_MIN_ANSWERS) return
    const stars = starsForResult(safeAnswered, safeCorrect, sessionCombo)
    // 星尘只补差额：这个 star 数没有超过该章节已记录的成绩时不会重复掉落。
    const settlement = applyChapterResult(progress?.chapterStars ?? {}, chapter.id, stars)
    void recordChapterResult(chapter.id, safeAnswered, safeCorrect, stars)
    setResult({
      stars,
      total: safeAnswered,
      correct: safeCorrect,
      stardust: settlement.improved ? settlement.stardustGained : 0
    })
  }, [chapter, progress?.chapterStars, recordChapterResult, sessionCombo])

  useEffect(() => {
    if (result) heading.current?.focus()
  }, [result])

  if (!chapter || !view) return <>{children}</>

  const nextId = nextChapterId(views, chapter.id)
  const next = nextId ? views.find((entry) => entry.id === nextId) ?? null : null

  return <ChapterResultContext.Provider value={{ report }}>
    <div className="chapter-shell">
      <div className="chapter-strip">
        <div className="chapter-strip-copy">
          <small>第 {view.order} 站 · {view.place}</small>
          <strong>{view.title}</strong>
          <small>{view.subtitle}</small>
        </div>
        <span className="chapter-stars" role="img" aria-label={`本章最好成绩：${view.stars} / ${MAX_STARS} 星`}>
          <span aria-hidden="true">{'★'.repeat(view.stars)}{'☆'.repeat(MAX_STARS - view.stars)}</span>
        </span>
        <div className="chapter-strip-actions">
          <span className="muted" style={{ fontSize: 11 }}>星尘 {progress?.stardust ?? 0}</span>
          {next && <button className="btn btn-ghost" onClick={() => go(next.module)}>下一站：{next.place} <ArrowRight size={15} /></button>}
        </div>
      </div>
      {children}
      {result && (
        <section className="card chapter-summary" aria-label="关卡结算">
          <FlowGuide state={result.stars >= 3 ? 'level-up' : result.stars > 0 ? 'hit' : 'miss'} />
          <p className="mission-eyebrow">CHAPTER CLEAR</p>
          <h2 tabIndex={-1} ref={heading}>{result.stars > 0 ? '灯塔点亮' : '再试一次'}</h2>
          <p className="muted">完成 {result.total} 题 · 答对 {result.correct} 题</p>
          <div className="chapter-summary-stars" role="img" aria-label={`本章结算：${result.stars} / 3 星`}>
            <span aria-hidden="true">{'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</span>
          </div>
          <p className="chapter-dust">{result.stardust > 0 ? `获得星尘 +${result.stardust}` : '本章星尘已拿满，重玩不再重复掉落'}</p>
          <div className="chapter-strip-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={resetRun}><RotateCcw size={15} /> 再来一轮</button>
            {next && <button className="btn btn-primary" onClick={() => go(next.module)}>前往下一站 <ArrowRight size={15} /></button>}
          </div>
        </section>
      )}
    </div>
  </ChapterResultContext.Provider>
}
