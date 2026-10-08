import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import FlowGuide from './FlowGuide'
import { CHAPTERS, MAX_STARS, chapterView, nextChapterId, starsForResult, stardustForStars } from '../../engine/chapters'
import { isModuleAvailable } from '../../data/curriculum'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/gameStore'
import type { ModuleKey } from '../../types'
import './WorldMap.css'

/** 至少完成这么多题才允许结算本章，避免空会话也能拿星。 */
export const SETTLE_MIN_ANSWERS = 5

interface ChapterResultContextValue {
  /** 模块完成一轮后上报成绩，用于章节星级与星尘结算。 */
  report: (total: number, correct: number) => void
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
  const [result, setResult] = useState<{ stars: number; total: number; correct: number; stardust: number } | null>(null)
  const reported = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)

  const chapter = useMemo(() => CHAPTERS.find((entry) => entry.module === module) ?? null, [module])
  const views = useMemo(
    () => chapterView(CHAPTERS, progress?.chapterStars ?? {}, (key) => isModuleAvailable(track, key), track),
    [progress?.chapterStars, track]
  )
  const view = chapter ? views.find((entry) => entry.id === chapter.id) ?? null : null

  useEffect(() => {
    setResult(null)
    reported.current = false
  }, [module, track])

  const report = useCallback((total: number, correct: number) => {
    if (!chapter || reported.current || total < SETTLE_MIN_ANSWERS) return
    reported.current = true
    const stars = starsForResult(total, correct)
    void recordChapterResult(chapter.id, total, correct)
    setResult({ stars, total, correct, stardust: stardustForStars(stars) })
  }, [chapter, recordChapterResult])

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
          <p className="chapter-dust">获得星尘 +{result.stardust}</p>
          <div className="chapter-strip-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={() => { setResult(null); reported.current = false }}><RotateCcw size={15} /> 再来一轮</button>
            {next && <button className="btn btn-primary" onClick={() => go(next.module)}>前往下一站 <ArrowRight size={15} /></button>}
          </div>
        </section>
      )}
    </div>
  </ChapterResultContext.Provider>
}
