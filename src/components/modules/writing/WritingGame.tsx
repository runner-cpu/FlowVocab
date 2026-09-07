import { useEffect, useMemo, useState } from 'react'
import { useProgress } from '../../../store/progressStore'
import { WRITING_TASKS } from '../../../data/writing'
import type { WritingTask } from '../../../types'
import GameHud from '../../game/GameHud'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WritingGame() {
  const answer = useProgress((s) => s.answer)
  const submitWriting = useProgress((s) => s.submitWriting)

  const [taskIdx, setTaskIdx] = useState(0)
  const task: WritingTask = WRITING_TASKS[taskIdx]

  // 排序题状态
  const [shuffled, setShuffled] = useState<string[]>(() => shuffle(task.segments ?? []))
  const [order, setOrder] = useState<string[]>([])
  // 改错题状态
  const [pickErr, setPickErr] = useState<number | null>(null)
  // 提交后判定
  const [result, setResult] = useState<{ pass: boolean; reveal: boolean } | null>(null)

  // 切题重置
  useEffect(() => {
    setShuffled(shuffle(task.segments ?? []))
    setOrder([])
    setPickErr(null)
    setResult(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskIdx])

  const sortDone = useMemo(
    () => (task.type === 'sort' ? order.length === (task.segments?.length ?? 0) : false),
    [task.type, order, task]
  )
  const errDone = task.type === 'error' && pickErr !== null

  const submit = () => {
    if (result) return
    let pass = false
    if (task.type === 'sort') {
      pass = order.every((seg, i) => seg === task.segments?.[i])
    } else {
      pass = pickErr === task.answer
    }
    setResult({ pass, reveal: true })
    answer({ module: 'writing', correct: pass, timeMs: 15000, medianMs: 25000 })
    submitWriting(task.id, pass ? 5 : 1)
  }

  const next = () => {
    if (taskIdx + 1 >= WRITING_TASKS.length) {
      setTaskIdx(0)
    } else {
      setTaskIdx(taskIdx + 1)
    }
  }

  return (
    <div className="quiz-panel">
      <GameHud module="writing" />
      <div className="card">
        <div className="card-title">🃏 写作·句型工坊（排序 / 改错）</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {WRITING_TASKS.map((t, i) => (
            <button
              key={t.id}
              className={`btn ${i === taskIdx ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12, padding: '5px 10px' }}
              onClick={() => setTaskIdx(i)}
            >
              {t.type === 'sort' ? '🧩' : '✏️'} {t.title}
            </button>
          ))}
        </div>

        <div className="explain-box">
          <b>📝 {task.title}（{task.type === 'sort' ? '句子排序' : '句子改错'}）</b>
          <div className="ex-eg">{task.prompt}</div>
        </div>

        {/* ---------- 排序题 ---------- */}
        {task.type === 'sort' && (
          <>
            <div className="card-title mt14">你的答案（按正确顺序点选）</div>
            <div className="sort-answer" style={{ minHeight: 44 }}>
              {order.length === 0 && <span className="muted">点击下方片段加入句子…</span>}
              {order.map((seg, i) => (
                <button
                  key={i}
                  className="sort-chip placed"
                  onClick={() => !result && setOrder(order.filter((_, k) => k !== i))}
                >
                  {seg}
                </button>
              ))}
            </div>

            <div className="card-title mt14">待选片段</div>
            <div className="word-options">
              {shuffled.map((seg, i) => {
                const usedIdx = order.indexOf(seg)
                const placed = usedIdx !== -1
                return (
                  <button
                    key={i}
                    className={`btn ${placed ? 'btn-ghost' : 'btn-primary'}`}
                    disabled={placed || !!result}
                    onClick={() => !result && setOrder([...order, seg])}
                    style={{ minWidth: 120, marginBottom: 6 }}
                  >
                    {placed ? '✓ 已选' : seg}
                  </button>
                )
              })}
            </div>
            {result && (
              <div className={`score-report ${result.pass ? '' : 'miss'}`}>
                <div style={{ fontSize: 18, fontWeight: 900, color: result.pass ? 'var(--ok)' : 'var(--err)' }}>
                  {result.pass ? '✅ 排序正确！' : '❌ 顺序有误'}
                </div>
                <div className="ex-eg mt8">💡 {task.explain}</div>
              </div>
            )}
          </>
        )}

        {/* ---------- 改错题 ---------- */}
        {task.type === 'error' && (
          <>
            <div className="explain-box mt8" style={{ background: 'var(--card2, #faf8f4)' }}>
              <div className="ex-eg" style={{ fontSize: 15, fontWeight: 600 }}>“{task.sentence}”</div>
            </div>
            <div className="card-title mt14">选择正确的改法</div>
            <div className="options">
              {(task.options ?? []).map((opt, i) => {
                let cls = 'option'
                if (result) {
                  if (i === task.answer) cls += ' correct'
                  else if (pickErr === i) cls += ' wrong'
                } else if (pickErr === i) {
                  cls += ' picked'
                }
                return (
                  <button key={i} className={cls} disabled={!!result} onClick={() => setPickErr(i)}>
                    {opt}
                  </button>
                )
              })}
            </div>
            {result && (
              <div className={`score-report ${result.pass ? '' : 'miss'}`}>
                <div style={{ fontSize: 18, fontWeight: 900, color: result.pass ? 'var(--ok)' : 'var(--err)' }}>
                  {result.pass ? '✅ 改对了！' : '❌ 再想想'}
                </div>
                <div className="ex-eg mt8">💡 {task.explain}</div>
              </div>
            )}
          </>
        )}

        <div className="progress-strip mt14" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!sortDone && !errDone}
            style={{ flex: 1 }}
          >
            {result ? '已判定' : '提交判定'}
          </button>
          {result && (
            <button className="btn btn-ghost" onClick={next}>
              {taskIdx + 1 >= WRITING_TASKS.length ? '再来一轮' : '下一题 →'}
            </button>
          )}
        </div>
        <p className="muted mt8" style={{ fontSize: 12 }}>
          第 {taskIdx + 1} / {WRITING_TASKS.length} 题 · 答对得 5 星计入写作维度，P2 将接入 AI 开放式批改。
        </p>
      </div>
    </div>
  )
}
