export function elapsedSince(startedAt: number, now: number): number {
  return Math.max(1, now - startedAt)
}
