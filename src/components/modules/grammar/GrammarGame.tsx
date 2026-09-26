import { useMemo, useState } from 'react'
import { useProgress } from '../../../store/progressStore'
import { GRAMMAR_BRANCHES, GRAMMAR_NODES } from '../../../data/grammar'
import type { SkillNode } from '../../../types'
import GameHud from '../../game/GameHud'

export default function GrammarGame() {
  const progress = useProgress((state) => state.progress)
  const answer = useProgress((state) => state.answer)
  const completeGrammarNode = useProgress((state) => state.completeGrammarNode)
  const [activeNode, setActiveNode] = useState<SkillNode | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(false)
  const skillTree = progress?.skillTree ?? {}
  const nodeById = useMemo(() => Object.fromEntries(GRAMMAR_NODES.map((node) => [node.id, node])), [])
  const isLocked = (node: SkillNode) => !!node.parent && !skillTree[node.parent]
  const belongsToBranch = (node: SkillNode, rootId: string) => {
    let current: SkillNode | undefined = node
    while (current?.parent) current = nodeById[current.parent]
    return current?.id === rootId
  }

  function startNode(node: SkillNode) { if (isLocked(node)) return; setActiveNode(node); setQIndex(0); setPicked(null); setAnswered(false); setFinished(false) }
  function onPick(index: number) {
    if (answered || !activeNode) return
    const correct = index === activeNode.quizzes[qIndex].answer
    setPicked(index); setAnswered(true); void answer({ module: 'grammar', correct, timeMs: 6000, medianMs: 7000 })
    if (correct) window.setTimeout(() => {
      if (qIndex + 1 >= activeNode.quizzes.length) { setFinished(true); void completeGrammarNode(activeNode.id) }
      else { setQIndex((value) => value + 1); setPicked(null); setAnswered(false) }
    }, 1000)
  }

  return <div className="quiz-panel"><GameHud module="grammar" />
    {!activeNode && <div className="card"><div className="card-title">🌦️ 语法技能树</div><p className="muted">沿着连接路径逐步点亮节点；锁定节点会明确显示前置技能。</p><div className="skill-tree spatial-tree mt14">{GRAMMAR_BRANCHES.map((branch) => {
      const nodes = GRAMMAR_NODES.filter((node) => belongsToBranch(node, branch.id))
      return <section className="skill-branch" key={branch.id}><h4>{branch.name}</h4><div className="skill-branch-map"><svg className="skill-paths" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true"><path d="M42 32 C92 32 88 32 138 32 S212 32 258 32" /></svg><div className="skill-nodes">{nodes.map((node) => {
        const lit = !!skillTree[node.id]; const locked = isLocked(node); const prerequisite = node.parent ? nodeById[node.parent]?.name : null
        return <button key={node.id} className={`skill-node ${lit ? 'lit' : ''} ${locked ? 'locked' : ''}`} disabled={locked} aria-label={locked ? `${node.name}，锁定，需要先完成 ${prerequisite}` : node.name} onClick={() => startNode(node)}><span>{lit ? '✓' : locked ? '🔒' : '◆'} {node.name}</span>{locked && <small>先完成 {prerequisite}</small>}</button>
      })}</div></div></section>
    })}</div></div>}
    {activeNode && !finished && <div className="card"><div className="card-title">📌 {activeNode.name}<button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setActiveNode(null)}>返回技能树</button></div><p className="muted">{activeNode.desc}</p>{activeNode.examples.map((example) => <div key={example} className="explain-box mt8">💬 {example}</div>)}<div className="mt14">第 {qIndex + 1} / {activeNode.quizzes.length} 题</div><div className="options mt8">{activeNode.quizzes[qIndex].options.map((option, index) => { let className = 'option'; if (answered) { if (index === activeNode.quizzes[qIndex].answer) className += ' correct'; else if (picked === index) className += ' wrong' } return <button key={option} className={className} disabled={answered} onClick={() => onPick(index)}>{option}</button> })}</div>{answered && <div className="explain-box">{activeNode.quizzes[qIndex].explain}{picked !== activeNode.quizzes[qIndex].answer && <div className="mt8"><button className="btn btn-ghost" onClick={() => { setPicked(null); setAnswered(false) }}>重新作答</button></div>}</div>}</div>}
    {finished && <div className="card center"><div style={{ fontSize: 44 }}>✓</div><h2>技能点亮成功！</h2><p className="muted">{activeNode?.name} 已加入你的语法技能树。</p><button className="btn btn-primary mt14" onClick={() => setActiveNode(null)}>返回技能树</button></div>}
  </div>
}
