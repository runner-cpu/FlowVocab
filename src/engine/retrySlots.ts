export type RetrySlots = Map<number, string[]>

export function reserveRetry(slots: RetrySlots, index: number, target: number, wordId: string, random: () => number): RetrySlots {
  const remaining = target - index - 1
  if (remaining < 2) return slots
  const offset = 2 + Math.floor(random() * Math.min(4, remaining - 1))
  const slot = index + offset
  const next = new Map(slots)
  next.set(slot, [...(next.get(slot) ?? []), wordId])
  return next
}

export function consumeRetry(slots: RetrySlots, index: number): { wordId?: string; slots: RetrySlots } {
  const queued = slots.get(index) ?? []
  const [wordId, ...rest] = queued
  const next = new Map(slots)
  if (rest.length) next.set(index, rest)
  else next.delete(index)
  return { wordId, slots: next }
}
