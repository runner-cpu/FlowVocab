import './HarborBackdrop.css'

/**
 * 夜景港湾背景：远山、水面反光与船灯三层，用纯 CSS 视差。
 * 装饰层固定且 pointer-events: none，不参与布局与滚动计算。
 */
export default function HarborBackdrop() {
  return <div className="harbor-backdrop" aria-hidden="true">
    <span className="harbor-layer harbor-sky" />
    <span className="harbor-layer harbor-hills" />
    <span className="harbor-layer harbor-water" />
    <span className="harbor-layer harbor-lights">
      <i /><i /><i /><i /><i /><i />
    </span>
  </div>
}
