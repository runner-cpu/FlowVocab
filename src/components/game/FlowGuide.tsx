export type GuideState = 'idle' | 'hit' | 'miss' | 'level-up'
const messages: Record<GuideState, string> = { idle: '准备好，下一座岛就在前方。', hit: '命中！继续保持航向。', miss: '没关系，把这条线索带上再出发。', 'level-up': '升级了！你的探索版图正在扩大。' }

export default function FlowGuide({ state = 'idle' }: { state?: GuideState }) {
  return <div className={'flow-guide guide-' + state} aria-live="polite">
    <svg viewBox="0 0 100 108" aria-hidden="true" className="guide-character">
      <ellipse cx="50" cy="100" rx="29" ry="5" className="guide-shadow" />
      <path d="M23 72 12 85M77 72 88 85M37 88 32 98M63 88 68 98" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <rect x="22" y="34" width="56" height="57" rx="24" className="guide-body" />
      <path d="M50 34V20m-7 0h14" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <rect x="29" y="44" width="42" height="26" rx="12" className="guide-visor" />
      <path className="guide-eyes" d={state === 'miss' ? 'M36 55h8m12 0h8' : 'M39 53v6m22-6v6'} strokeWidth="4" strokeLinecap="round" />
      <path d="m43 79 7 4 7-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {state === 'level-up' && <path d="m82 13 3 7 8 2-8 3-3 7-3-7-8-3 8-2Z" fill="currentColor" />}
    </svg>
    <div><small>FLOW · 领航伙伴</small><p>{messages[state]}</p></div>
  </div>
}
