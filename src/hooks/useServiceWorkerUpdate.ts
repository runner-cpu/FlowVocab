import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 检测已下载但尚未接管页面的新版本 Service Worker。
 *
 * 项目刻意不在 install 里 skipWaiting：练习进行到一半被强制刷新会丢当前一轮。
 * 因此新版本会停在 waiting，由用户点「立即更新」后再激活。
 */
export function useServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const reloading = useRef(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    let cancelled = false
    let registration: ServiceWorkerRegistration | null = null
    const onUpdateFound = () => {
      const installing = registration?.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (cancelled || installing.state !== 'installed') return
        // 首次安装时没有 controller，此时 waiting 只是初始版本，不该提示更新。
        if (!navigator.serviceWorker.controller) return
        setWaiting(registration?.waiting ?? installing)
      })
    }
    const onControllerChange = () => {
      if (reloading.current) return
      reloading.current = true
      window.location.reload()
    }

    // 注册可能晚于组件挂载（main.tsx 在 load 后才 register），
    // 所以先查已有注册，没有再等 ready。
    navigator.serviceWorker.getRegistration()
      .then((reg) => reg ?? navigator.serviceWorker.ready)
      .then((reg) => {
        if (cancelled) return
        registration = reg
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting)
        reg.addEventListener('updatefound', onUpdateFound)
      })
      .catch(() => undefined)

    // 浏览器默认最多 24 小时才检查 sw.js；页面回到前台时补一次。
    const check = () => {
      if (document.visibilityState !== 'visible') return
      void registration?.update().catch(() => undefined)
    }
    const timer = window.setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', check)
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      registration?.removeEventListener('updatefound', onUpdateFound)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    waiting?.postMessage({ type: 'SKIP_WAITING' })
  }, [waiting])

  return { updateReady: waiting !== null, applyUpdate }
}
