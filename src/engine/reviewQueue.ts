import type { UserWord, Word } from '../types'

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

export function orderReviewCandidates(words: Word[], reviews: UserWord[], now: number, random: () => number = Math.random, requestedWordId?: string | null): Word[] {
  const reviewByWordId = new Map(reviews.map((review) => [review.wordId, review]))
  const requested = requestedWordId ? words.find((word) => word.id === requestedWordId || word.word === requestedWordId) : undefined
  const rest = words.filter((word) => word.id !== requested?.id)
  const due = rest.filter((word) => { const review = reviewByWordId.get(word.id); return review && review.nextReview <= now }).sort((a, b) => reviewByWordId.get(a.id)!.nextReview - reviewByWordId.get(b.id)!.nextReview)
  const unseen = shuffle(rest.filter((word) => !reviewByWordId.has(word.id)), random)
  const future = rest.filter((word) => { const review = reviewByWordId.get(word.id); return review && review.nextReview > now }).sort((a, b) => reviewByWordId.get(a.id)!.nextReview - reviewByWordId.get(b.id)!.nextReview)
  return [...(requested ? [requested] : []), ...due, ...unseen, ...future]
}
