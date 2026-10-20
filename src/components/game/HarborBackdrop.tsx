import './HarborBackdrop.css'

/**
 * 夜景港湾背景：远山、水面反光与船灯三层，用纯 CSS 视差。
 * 装饰层固定且 pointer-events: none，不参与布局与滚动计算。
 * quiet：练习页整体是深色竞技场，背景层退到最低存在感，避免在浅色页面
 * 上出现一条横贯屏幕的浅色山带（曾被误读为“白色块”）。
 */
export default function HarborBackdrop({ quiet = false }: { quiet?: boolean }) {
  return <div className={quiet ? 'harbor-backdrop harbor-backdrop-quiet' : 'harbor-backdrop'} aria-hidden="true">
    <span className="harbor-layer harbor-sky" />
    <span className="harbor-layer harbor-hills" />
    <span className="harbor-layer harbor-water" />
    <span className="harbor-layer harbor-lights">
      <i /><i /><i /><i /><i /><i />
    </span>
  </div>
}
