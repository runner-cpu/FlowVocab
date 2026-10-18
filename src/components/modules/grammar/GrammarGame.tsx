import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleCheck, Diamond, GitBranch, Lock, MessageSquare, Pin } from 'lucide-react'
import { elapsedSince } from '../../../engine/sessionTiming'
import { useProgress } from '../../../store/progressStore'
import { GRAMMAR_BRANCHES, GRAMMAR_NODES } from '../../../data/grammar'
import { itemsForTrack } from '../../../data/curriculum'
import { useUI } from '../../../store/gameStore'
import type { SkillNode } from '../../../types'
import GameHud from '../../game/GameHud'
import ErrorCard from '../../game/ErrorCard'
import { useChapterResult } from '../../game/ChapterShell'
import RoadmapNote from '../../game/RoadmapNote'
import { inferErrorTag, type ErrorTag } from '../../../engine/errorRouting'
import { displayOptions } from '../../../engine/optionOrder'
import { useOptionKeyboard } from '../../../hooks/useOptionKeyboard'

export default function GrammarGame() {
  const track = useUI((state) => state.track)
  const nodesForTrack = itemsForTrack(track, 'grammar', GRAMMAR_NODES)
  const progress = useProgress((state) => state.progress)
  const answer = useProgress((state) => state.answer)
  const completeGrammarNode = useProgress((state) => state.completeGrammarNode)
  const [activeNode, setActiveNode] = useState<SkillNode | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(false)
  // 答错后旁路渲染的离线错因卡；只在当前题目答错时存在，题目前进/重答/换节点/换路线即卸载。
  const [errorCard, setErrorCard] = useState<{ tag: ErrorTag; chosen?: string; correctAnswer?: string; explain?: string } | null>(null)
  const chapterResult = useChapterResult()
  /** 本次进入模块后的累计作答（不随节点重置），每次节点结束把累计快照交给章节壳。 */
  const runTally = useRef({ total: 0, correct: 0 })
  const startedAt = useRef(performance.now())
  const advanceTimer = useRef<number | null>(null)
  const skillTree = progress?.skillTree ?? {}
  useEffect(() => { startedAt.current = performance.now() }, [activeNode?.id, qIndex])
  useEffect(() => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    advanceTimer.current = null
    setActiveNode(null)
    setQIndex(0)
    setPicked(null)
    setAnswered(false)
    setFinished(false)
    setErrorCard(null)
    runTally.current = { total: 0, correct: 0 }
    startedAt.current = performance.now()
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
  }, [track])
  const nodeById = useMemo(() => Object.fromEntries(nodesForTrack.map((node) => [node.id, node])), [nodesForTrack])
  // 从错题回顾回到语法时，直接落到那道题的节点与题号上，而不是让学习者自己找。
  const reviewTarget = useUI((state) => state.reviewTarget)
  const consumeReviewTarget = useUI((state) => state.consumeReviewTarget)
  useEffect(() => {
    if (!reviewTarget || reviewTarget.module !== 'grammar') return
    const [nodeId, rawIndex] = reviewTarget.contentId.split('#')
    const node = nodesForTrack.find((candidate) => candidate.id === nodeId)
    const index = Number(rawIndex)
    consumeReviewTarget()
    if (!node || !Number.isInteger(index) || index < 0 || index >= node.quizzes.length) return
    setActiveNode(node)
    setQIndex(index)
    setPicked(null)
    setAnswered(false)
    setFinished(false)
    setErrorCard(null)
  }, [reviewTarget, nodesForTrack, consumeReviewTarget])
  const isLocked = (node: SkillNode) => !!node.parent && !skillTree[node.parent]
  const belongsToBranch = (node: SkillNode, rootId: string) => {
    let current: SkillNode | undefined = node
    while (current?.parent) current = nodeById[current.parent]
    return current?.id === rootId
  }
  // 只渲染当前路线真正有节点的分支，避免出现空分支标题（小学路线只有 1 个分支）。
  const activeBranches = useMemo(
    () => GRAMMAR_BRANCHES
      .map((branch) => ({ branch, nodes: nodesForTrack.filter((node) => belongsToBranch(node, branch.id)) }))
      .filter((entry) => entry.nodes.length > 0),
    // belongsToBranch 依赖 nodeById，nodeById 又只依赖 nodesForTrack。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodesForTrack]
  )

  function startNode(node: SkillNode) { if (isLocked(node)) return; setActiveNode(node); setQIndex(0); setPicked(null); setAnswered(false); setFinished(false); setErrorCard(null) }
  // 选项按题目种子重排：正确项不再永远停在第一位，位置由 id 决定，刷新也不会跳。
  const quiz = activeNode?.quizzes[qIndex]
  const quizView = useMemo(
    () => (quiz ? displayOptions(quiz.options, quiz.answer, `${activeNode?.id ?? 'node'}#${qIndex}`) : []),
    [quiz, activeNode?.id, qIndex]
  )
  function onPick(displayIndex: number) {
    if (answered || !activeNode) return
    const option = quizView[displayIndex]
    if (!option || !quiz) return
    const index = option.sourceIndex
    const correct = index === quiz.answer
    setPicked(index); setAnswered(true)
    // 答错时叠加离线错因路由；答对立即清空，保证同一时刻最多一张错因卡。
    const tag = inferErrorTag({ module: 'grammar', prompt: quiz.prompt, options: quiz.options, chosen: quiz.options[index], correctAnswer: quiz.options[quiz.answer], explain: quiz.explain })
    setErrorCard(correct ? null : { tag, chosen: quiz.options[index], correctAnswer: quiz.options[quiz.answer], explain: quiz.explain })
    void answer({
      module: 'grammar',
      correct,
      timeMs: elapsedSince(startedAt.current, performance.now()),
      // 同一节点的同一道题算同一条错题：答错记入、再答对自动移出。
      mistake: {
        module: 'grammar',
        contentId: `${activeNode.id}#${qIndex}`,
        prompt: quiz.prompt || activeNode.name,
        chosen: quiz.options[index],
        correctAnswer: quiz.options[quiz.answer],
        tag,
        explain: quiz.explain
      }
    })
    runTally.current = { total: runTally.current.total + 1, correct: runTally.current.correct + (correct ? 1 : 0) }
    if (correct) advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null
      if (qIndex + 1 >= activeNode.quizzes.length) {
        setFinished(true)
        void completeGrammarNode(activeNode.id)
        // 节点完成时把本节点成绩交给章节壳；章节壳按门槛累计，短节点不会白拿星也不会白答。
        chapterResult.report(runTally.current.total, runTally.current.correct)
      }
      else { setQIndex((value) => value + 1); setPicked(null); setAnswered(false); setErrorCard(null) }
    }, 1000)
  }
  function retryQuestion() { setPicked(null); setAnswered(false); setErrorCard(null) }

  const quizOptions = quizView
  const quizCorrect = quiz?.answer
  // 引导里承诺过「数字键 1–4 选择答案」，语法节点也要兑现。
  // 答对后会自动进入下一题，所以只有答错时 Enter 才承担「重新作答」的角色。
  useOptionKeyboard({
    enabled: !!activeNode && !finished,
    count: quizOptions.length,
    onPick,
    onConfirm: answered && picked !== quizCorrect ? retryQuestion : undefined
  })

  return <div className="quiz-panel"><GameHud module="grammar" />
    {!activeNode && <div className="card"><div className="card-title"><GitBranch size={16} /> 语法技能树</div><p className="muted">沿着连接路径逐步点亮节点；锁定节点会明确显示前置技能。</p>
      {activeBranches.length === 0
        ? <p className="muted mt14" role="status">当前路线暂无语法节点，请切换学习路线后重试。</p>
        : <>
          <div className="skill-tree spatial-tree mt14">{activeBranches.map(({ branch, nodes }) => (
            <section className="skill-branch" key={branch.id}><h4>{branch.name}</h4><div className="skill-branch-map"><svg className="skill-paths" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true"><path d="M42 32 C92 32 88 32 138 32 S212 32 258 32" /></svg><div className="skill-nodes">{nodes.map((node) => {
              const lit = !!skillTree[node.id]; const locked = isLocked(node); const prerequisite = node.parent ? nodeById[node.parent]?.name : null
              return <button key={node.id} className={`skill-node ${lit ? 'lit' : ''} ${locked ? 'locked' : ''}`} disabled={locked} aria-label={locked ? `${node.name}，锁定，需要先完成 ${prerequisite}` : node.name} onClick={() => startNode(node)}><span>{lit ? <Check size={13} aria-hidden /> : locked ? <Lock size={13} aria-hidden /> : <Diamond size={13} aria-hidden />} {node.name}</span>{locked && <small>先完成 {prerequisite}</small>}</button>
            })}</div></div></section>
          ))}</div>
          {activeBranches.length < GRAMMAR_BRANCHES.length && <p className="muted mt14" role="note">当前路线开放 {activeBranches.length} / {GRAMMAR_BRANCHES.length} 个语法分支；切换学习路线可以看到更多节点。</p>}
          <RoadmapNote module="grammar" />
        </>}
    </div>}
    {activeNode && !finished && <div className="card"><div className="card-title"><Pin size={16} /> {activeNode.name}<button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setActiveNode(null)}>返回技能树</button></div><p className="muted">{activeNode.desc}</p>{activeNode.examples.map((example) => <div key={example} className="explain-box mt8"><MessageSquare size={14} aria-hidden /> {example}</div>)}<div className="mt14">第 {qIndex + 1} / {activeNode.quizzes.length} 题</div><div className="options mt8">{quizView.map((option, index) => { let className = 'option'; if (answered) { if (option.correct) className += ' correct'; else if (picked === option.sourceIndex) className += ' wrong' } return <button key={option.text} className={className} disabled={answered} onClick={() => onPick(index)}><kbd aria-hidden="true">{index + 1}</kbd><span>{option.text}</span></button> })}</div>{answered && <div className="explain-box">{activeNode.quizzes[qIndex].explain}{picked !== activeNode.quizzes[qIndex].answer && <div className="mt8"><button className="btn btn-ghost" onClick={retryQuestion}>重新作答</button></div>}</div>}{errorCard && <ErrorCard tag={errorCard.tag} chosen={errorCard.chosen} correctAnswer={errorCard.correctAnswer} explain={errorCard.explain} onDismiss={() => setErrorCard(null)} />}<p className="interaction-hint muted mt8">{answered ? (picked === quizCorrect ? '答对了，正在进入下一题…' : 'Enter 重新作答') : (quizOptions.length > 1 ? `数字键 1–${quizOptions.length} 选择答案` : '')}</p></div>}
    {finished && <div className="card center"><CircleCheck size={44} aria-hidden /><h2>技能点亮成功！</h2><p className="muted">{activeNode?.name} 已加入你的语法技能树。</p><button className="btn btn-primary mt14" onClick={() => setActiveNode(null)}>返回技能树</button></div>}
  </div>
}
