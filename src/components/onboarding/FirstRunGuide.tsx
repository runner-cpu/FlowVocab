import { BarChart3, Keyboard, Map, Route, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useUI } from '../../store/gameStore'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function FirstRunGuide() {
  const open = useUI((state) => state.guideOpen)
  const close = useUI((state) => state.closeGuide)
  const go = useUI((state) => state.go)
  const closeButton = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const inertNodes = useRef<Array<{ node: HTMLElement; inert: string | null; ariaHidden: string | null }>>([])

  useEffect(() => {
    if (!open) return
    const backdrop = document.querySelector<HTMLElement>('.guide-backdrop')
    const app = backdrop?.closest<HTMLElement>('.app')
    const nodes = app ? Array.from(app.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== backdrop) : []
    inertNodes.current = nodes.map((node) => ({ node, inert: node.getAttribute('inert'), ariaHidden: node.getAttribute('aria-hidden') }))
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : nodes[0]?.querySelector<HTMLElement>(FOCUSABLE) ?? null
    nodes.forEach((node) => { node.setAttribute('inert', ''); node.setAttribute('aria-hidden', 'true') })
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key !== 'Tab') return
      const dialog = document.querySelector<HTMLElement>('.first-run-guide')
      const focusables = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      inertNodes.current.forEach(({ node, inert, ariaHidden }) => {
        if (inert === null) node.removeAttribute('inert')
        else node.setAttribute('inert', inert)
        if (ariaHidden === null) node.removeAttribute('aria-hidden')
        else node.setAttribute('aria-hidden', ariaHidden)
      })
      inertNodes.current = []
      opener.current?.focus()
    }
  }, [open, close])

  if (!open) return null

  return <div className="guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <section className="first-run-guide" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
      <button ref={closeButton} className="guide-close" aria-label="关闭新手指南" onClick={close}><X size={18} /></button>
      <span className="guide-kicker">FLOWVOCAB EXPEDITION</span><h2 id="first-run-title">选择你的第一条航线</h2><p>所有进度都保存在本机。六个训练模块串成一条港口航线，按章节点亮灯塔，不需要网络。</p>
      <div className="guide-steps"><div><Map aria-hidden="true" /><strong>航线地图</strong><span>首页按顺序解锁六座灯塔，完成后掉落星尘与星级。</span></div><div><Route aria-hidden="true" /><strong>关卡结算</strong><span>每关按正确率给 1–3 星，只保留最好成绩，重玩不掉星。</span></div><div><Keyboard aria-hidden="true" /><strong>快捷键</strong><span>选择题使用数字键 1–4，答题保存后按 Enter 继续。</span></div><div><BarChart3 aria-hidden="true" /><strong>离线智能</strong><span>听力含语音陪练跟读评分；答错会显示错因卡与形近词对比。</span></div></div>
      <div className="guide-actions"><button className="btn btn-ghost" onClick={() => { close(); go('dashboard') }}>先看成长图谱</button><button className="btn btn-primary" onClick={() => { close(); go('home') }}>前往航线地图</button></div>
    </section>
  </div>
}

