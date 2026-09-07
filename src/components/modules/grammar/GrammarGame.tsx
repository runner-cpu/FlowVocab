import { useMemo, useState } from 'react'
import { useProgress } from '../../../store/progressStore'
import { GRAMMAR_NODES, GRAMMAR_BRANCHES } from '../../../data/grammar'
import type { SkillNode } from '../../../types'
import GameHud from '../../game/GameHud'

export default function GrammarGame() {
  const progress = useProgress((s) => s.progress)
  const answer = useProgress((s) => s.answer)
  const completeGrammarNode = useProgress((s) => s.completeGrammarNode)

  const [activeNode, setActiveNode] = useState<SkillNode | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [passed, setPassed] = useState(0)
  const [finished, setFinished] = useState(false)

  const skillTree = progress?.skillTree ?? {}
  const nodeById = useMemo(() => {
    const m: Record<string, SkillNode> = {}
    GRAMMAR_NODES.forEach((n) => (m[n.id] = n))
    return m
  }, [])

  const isLocked = (node: SkillNode) => {
    if (!node.parent) return false
    return !skillTree[node.parent]
  }

  const startNode = (node: SkillNode) => {
    if (isLocked(node)) return
    setActiveNode(node)
    setQIndex(0)
    setPicked(null)
    setAnswered(false)
    setPassed(0)
    setFinished(false)
  }

  const onPick = (idx: number) => {
    if (answered || !activeNode) return
    const quiz = activeNode.quizzes[qIndex]
    const correct = idx === quiz.answer
    setPicked(idx)
    setAnswered(true)
    answer({ module: 'grammar', correct, timeMs: 6000, medianMs: 7000 })
    if (correct) {
      setTimeout(() => {
        if (qIndex + 1 >= activeNode.quizzes.length) {
          const np = passed + 1
          if (np >= activeNode.quizzes.length) {
            setFinished(true)
            completeGrammarNode(activeNode.id)
          } else {
            setPassed(np)
          }
        } else {
          setQIndex(qIndex + 1)
          setPicked(null)
          setAnswered(false)
        }
      }, 1000)
    }
  }

  const retry = () => {
    setPicked(null)
    setAnswered(false)
  }

  return (
    <div className="quiz-panel">
      <GameHud module="grammar" />
      {!activeNode && (
        <div className="card">
          <div className="card-title">🌳 语法技能树</div>
          <p className="muted" style={{ fontSize: 13 }}>每个分支代表一大语法主题，点亮全部节点即可掌握该分支。子节点需要先点亮父节点。</p>
          <div className="skill-tree mt14">
            {GRAMMAR_BRANCHES.map((b) => {
              const root = nodeById[b.id]
              // 取分支内节点（根 + 后代）
              const branchNodes = [root, ...GRAMMAR_NODES.filter((n) => n.parent === b.id)]
              return (
                <div className="skill-branch" key={b.id}>
                  <h4>{b.name}</h4>
                  <div className="skill-nodes">
                    {branchNodes.map((n) => {
                      const lit = !!skillTree[n.id]
                      const locked = isLocked(n)
                      return (
                        <button
                          key={n.id}
                          className={`skill-node ${lit ? 'lit' : ''} ${locked ? 'locked' : ''}`}
                          disabled={locked}
                          onClick={() => startNode(n)}
                        >
                          {lit ? '✅' : locked ? '🔒' : '🔓'} {n.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeNode && !finished && (
        <div className="card">
          <div className="card-title">📘 {activeNode.name} <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px' }} onClick={() => setActiveNode(null)}>返回技能树</button></div>
          <p className="muted">{activeNode.desc}</p>
          {activeNode.examples.map((e, i) => (
            <div key={i} className="explain-box" style={{ background: 'rgba(0,0,0,0.03)', marginTop: 8 }}>
              💬 {e}
            </div>
          ))}
          <div className="mt14" style={{ fontWeight: 700 }}>
            第 {qIndex + 1} / {activeNode.quizzes.length} 题
          </div>
          <div className="options mt8">
            {activeNode.quizzes[qIndex].options.map((opt, i) => {
              let cls = 'option'
              if (answered) {
                if (i === activeNode.quizzes[qIndex].answer) cls += ' correct'
                else if (picked === i) cls += ' wrong'
              }
              return (
                <button key={i} className={cls} disabled={answered} onClick={() => onPick(i)}>
                  {opt}
                </button>
              )
            })}
          </div>
          {answered && (
            <div className="explain-box">
              {activeNode.quizzes[qIndex].explain}
              {picked !== activeNode.quizzes[qIndex].answer && (
                <div className="mt8"><button className="btn btn-ghost" onClick={retry}>重新作答</button></div>
              )}
            </div>
          )}
        </div>
      )}

      {finished && (
        <div className="card center">
          <div style={{ fontSize: 44 }}>✅</div>
          <h2 className="mt8">技能点亮成功！</h2>
          <p className="muted mt8">{activeNode?.name} 已加入你的语法技能树。</p>
          <button className="btn btn-primary mt14" onClick={() => setActiveNode(null)}>返回技能树</button>
        </div>
      )}
    </div>
  )
}
