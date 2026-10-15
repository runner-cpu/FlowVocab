import { useCallback, useEffect, useState } from 'react'

/** Chrome / Edge 在可安装时派发的事件；TS 的 DOM lib 还没有内置这个类型。 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState =
  /** 已经以独立窗口（桌面/主屏图标）运行 */
  | 'installed'
  /** 浏览器提供了安装入口，可以一键安装 */
  | 'available'
  /** 浏览器不派发安装事件（如 iOS Safari），需要按手动手册操作 */
  | 'manual'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari 用 navigator.standalone 表示「已添加到主屏」。
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/**
 * 安装到桌面/主屏的能力探测。
 *
 * 为什么要有这个 hook：作品的主打卖点之一是「免安装、可离线」，
 * 但浏览器不会主动告诉用户能安装，iOS 更是完全没有安装事件。
 * 设置面板据此给出「一键安装」或「分享 → 添加到主屏幕」的具体步骤，
 * 让评委在自己设备上真的能装起来。
 */
export function useInstallPrompt() {
  const [state, setState] = useState<InstallState>(() => (isStandalone() ? 'installed' : 'manual'))
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    const onPrompt = (event: Event) => {
      // 阻止默认迷你提示条，改由设置面板里的显式按钮触发，时机更可控。
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
      setState('available')
    }
    const onInstalled = () => { setPromptEvent(null); setState('installed') }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!promptEvent) return 'unavailable'
    setPending(true)
    try {
      await promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      if (outcome === 'accepted') setState('installed')
      setPromptEvent(null)
      return outcome
    } catch {
      return 'unavailable'
    } finally {
      setPending(false)
    }
  }, [promptEvent])

  return { state, install, pending }
}
