import { useEffect, useRef } from 'react'

interface OptionKeyboardOptions {
  /** 只有当前真实处于“待作答”状态时才响应，避免结算后重复触发。 */
  enabled: boolean
  /** 选项数量，决定接受 1..count 哪些数字键。 */
  count: number
  /** 按下数字键时选中的下标（0 起）。 */
  onPick: (index: number) => void
  /** 按下 Enter 时的确认动作；不传则 Enter 不生效。 */
  onConfirm?: () => void
}

/** 焦点在可输入或可点击控件上时，交给控件自己的原生行为。 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
}

/** 焦点在按钮上时，Enter / 空格应当激活那个按钮，而不是触发全局确认。 */
function isButtonTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest('button, a[href], [role="button"]')
}

/**
 * 选择题的数字键作答：1..N 选中，Enter 确认。
 *
 * 新手引导向用户承诺了「选择题使用数字键 1–4，答题后 Enter 继续」，
 * 但此前只有词汇模块真正实现。六个模块各写一遍监听器容易漏掉守卫条件，
 * 所以统一收到这里：忽略长按重复、输入法合成态和修饰键组合，
 * 焦点在输入框时完全让路，焦点在按钮上时不劫持 Enter。
 */
export function useOptionKeyboard({ enabled, count, onPick, onConfirm }: OptionKeyboardOptions) {
  // 把回调放进 ref：模块里 onPick 通常是每次渲染新建的闭包，
  // 直接进依赖数组会让监听器每题都解绑重绑；用 ref 后只在开关或选项数变化时重装。
  const pickRef = useRef(onPick)
  const confirmRef = useRef(onConfirm)
  pickRef.current = onPick
  confirmRef.current = onConfirm

  useEffect(() => {
    if (!enabled || count <= 0) return
    function onKey(event: KeyboardEvent) {
      if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
      if (isEditableTarget(event.target)) return
      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1
        if (index >= count) return
        event.preventDefault()
        pickRef.current(index)
        // 用数字键作答后，焦点若还停在上一个按钮（常见于刚点过任务标签），
        // 下一次 Enter 会被浏览器当成"激活那个按钮"，确认动作就落空了。
        // 这里把焦点交还文档，让后续 Enter 明确落到确认逻辑上。
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        return
      }
      const confirm = confirmRef.current
      if (event.key === 'Enter' && confirm && !isButtonTarget(event.target)) {
        event.preventDefault()
        confirm()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, count])
}

/** 供界面直接复用的快捷键说明文案，保证六个模块口径一致。 */
export function optionKeyHint(count: number, confirm = '确认'): string {
  const range = count > 1 ? `1–${Math.min(count, 9)}` : '1'
  return `数字键 ${range} 选择答案 · Enter ${confirm}`
}
