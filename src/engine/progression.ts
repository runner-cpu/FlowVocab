const XP_PER_LEVEL = 100
const ENERGY_PER_PLANET_LEVEL = 250
const MAX_PLANET_LEVEL = 10
const REVIEWED_WORD_CREDIT = 0.25

export function levelFromXp(totalXp: number): number {
  return Math.max(0, Math.floor(totalXp / XP_PER_LEVEL))
}

export function planetLevelFromEnergy(energy: number): number {
  return Math.min(MAX_PLANET_LEVEL, Math.max(0, Math.floor(energy / ENERGY_PER_PLANET_LEVEL)))
}

export function vocabMasteryScore(mastered: number, reviewed: number, target: number): number {
  const progress = mastered + reviewed * REVIEWED_WORD_CREDIT
  return Math.min(100, Math.max(0, Math.round((progress / Math.max(target, 1)) * 100)))
}

export function heatmapScale(values: number[], dailyGoal: number): number {
  const nonZero = values.filter((value) => value > 0).sort((a, b) => a - b)
  const percentile = nonZero.length === 0 ? 0 : nonZero[Math.ceil(nonZero.length * 0.8) - 1]
  return Math.max(dailyGoal, percentile)
}
