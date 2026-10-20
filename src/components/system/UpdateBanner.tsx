import { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useServiceWorkerUpdate } from '../../hooks/useServiceWorkerUpdate'

/**
 * 新版本提示条。
 *
 * Service Worker 的 activate 会清掉旧缓存，但新版本默认停在 waiting；
 * 用户不点就永远看不到更新。这里给一个明确、可关闭的入口，
 * 而不是偷偷刷新打断正在进行的练习。
 */
export default function UpdateBanner() {
  const { updateReady, applyUpdate } = useServiceWorkerUpdate()
  const [dismissed, setDismissed] = useState(false)
  if (!updateReady || dismissed) return null
  return <div className="update-banner" role="status" aria-live="polite">
    <RefreshCw size={16} aria-hidden="true" />
    <span>发现新版本，更新后即可看到最新航线。</span>
    <button className="btn btn-ghost" onClick={applyUpdate}>立即更新</button>
    <button className="update-banner-later" onClick={() => setDismissed(true)} aria-label="稍后更新"><X size={15} aria-hidden="true" /></button>
  </div>
}
