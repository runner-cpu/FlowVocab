export type RetrySlots = Map<number, string>

export function reserveRetry(slots: RetrySlots, index: number, target: number, wordId: string, random: () => number): RetrySlots {
  const remaining = target - index - 1
  if (remaining < 2) return slots
  const offsets = Array.from({ length: Math.min(4, remaining - 1) }, (_, position) => position + 2)
  const preferred = Math.floor(random() * offsets.length)
  const offset = Array.from({ length: offsets.length }, (_, position) => offsets[(preferred + position) % offsets.length]).find(candidate => !slots.has(index + candidate))
  if (offset === undefined) return slots
  const slot = index + offset
  const next = new Map(slots)
  next.set(slot, wordId)
  return next
}

export function consumeRetry(slots: RetrySlots, index: number): { wordId?: string; slots: RetrySlots } {
  const wordId = slots.get(index)
  const next = new Map(slots)
  next.delete(index)
  return { wordId, slots: next }
}
