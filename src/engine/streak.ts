export function updateStreak(
  lastStudyDate: string | null,
  streakDays: number,
  today: string
): { streakDays: number; lastStudyDate: string } {
  if (lastStudyDate === today) {
    return { streakDays, lastStudyDate: today }
  }

  const [year, month, day] = today.split('-').map(Number)
  const previousDay = new Date(year, month - 1, day)
  previousDay.setDate(previousDay.getDate() - 1)
  const previousKey = [
    previousDay.getFullYear(),
    String(previousDay.getMonth() + 1).padStart(2, '0'),
    String(previousDay.getDate()).padStart(2, '0')
  ].join('-')

  return {
    streakDays: lastStudyDate === previousKey ? streakDays + 1 : 1,
    lastStudyDate: today
  }
}
