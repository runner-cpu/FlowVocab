import { BarChart3, Keyboard, Map, Route, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useUI } from '../../store/gameStore'

export default function FirstRunGuide() {
  const open = useUI((state) => state.guideOpen)
  const close = useUI((state) => state.closeGuide)
  const go = useUI((state) => state.go)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])
  if (!open) return null

  return <div className="guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <section className="first-run-guide" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
      <button ref={closeButton} className="guide-close" aria-label="关闭新手指南" onClick={close}><X size={18} /></button>
      <span className="guide-kicker">FLOWVOCAB EXPEDITION</span><h2 id="first-run-title">选择你的第一条航线</h2><p>所有进度都保存在本机。你可以从每日词汇任务出发，也可以直接进入六个训练模块。</p>
      <div className="guide-steps"><div><Map aria-hidden="true" /><strong>学习舱</strong><span>选择模块和学习路线，随时切换训练方向。</span></div><div><Route aria-hidden="true" /><strong>每日任务</strong><span>词汇航线共 30 站，答题保存后才会前往下一站。</span></div><div><Keyboard aria-hidden="true" /><strong>快捷键</strong><span>选择题使用数字键 1–4，答题保存后按 Enter 继续。</span></div><div><BarChart3 aria-hidden="true" /><strong>成长图谱</strong><span>查看能力雷达、复习负担和错词森林。</span></div></div>
      <div className="guide-actions"><button className="btn btn-ghost" onClick={() => { close(); go('dashboard') }}>先看成长图谱</button><button className="btn btn-primary" onClick={() => { close(); go('vocab') }}>开始每日任务</button></div>
    </section>
  </div>
}
