import { useEffect, useState } from 'react'
import { useProgress } from '../../store/progressStore'
import './ComboCrown.css'

/** 连击 ≥3 时点亮屏幕边缘火光；怒气态转为橙色脉冲。装饰层 aria-hidden。 */
export default function ComboCrown() {
  const combo = useProgress((state) => state.combo)
  const rage = combo.rageActive
  const hot = rage || combo.combo >= 3
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 先挂载再切类，保证过渡动画在首次出现时也能播放。
    setMounted(hot)
  }, [hot])

  if (!mounted) return null
  return <div className={`combo-crown ${hot ? 'is-hot' : ''} ${rage ? 'is-rage' : ''}`} aria-hidden="true" />
}
