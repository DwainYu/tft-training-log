import { matchRepository } from "../data/repository/match-repository";
import { reviewRepository } from "../data/repository/review-repository";
import {
  applyReviewInput,
  createReview,
  isReviewComplete,
  validateReviewInput,
  type ReviewInput,
} from "../domain/review/review";
import { ValidationError } from "../lib/errors";
import { nowIso } from "../lib/utils";
import type { Review } from "../domain/types";

export async function getReview(matchId: string): Promise<Review | undefined> {
  return reviewRepository.byMatch(matchId);
}

export async function allReviews(): Promise<Review[]> {
  return reviewRepository.all();
}

/**
 * Upsert the review for a match. A complete review flips `match.reviewed` and
 * keeps `match.primaryMistake` as the single source of truth for statistics,
 * so Quick Add and Review can never disagree.
 */
export async function saveReview(matchId: string, input: ReviewInput): Promise<Review> {
  const match = await matchRepository.get(matchId);
  if (!match) throw new ValidationError([`对局不存在：${matchId}`]);

  const errors = validateReviewInput(input);
  if (errors.length) throw new ValidationError(errors);

  const existing = await reviewRepository.byMatch(matchId);
  const review = existing
    ? applyReviewInput(existing, input)
    : createReview(matchId, input);
  await reviewRepository.put(review);

  const reviewed = isReviewComplete(input);
  if (match.reviewed !== reviewed || match.primaryMistake !== input.primaryMistake) {
    await matchRepository.put({
      ...match,
      reviewed,
      primaryMistake: input.primaryMistake ?? match.primaryMistake,
      updatedAt: nowIso(),
    });
  }

  return review;
}

export async function deleteReview(matchId: string): Promise<void> {
  await reviewRepository.removeByMatch(matchId);
  const match = await matchRepository.get(matchId);
  if (match) {
    await matchRepository.put({ ...match, reviewed: false, updatedAt: nowIso() });
  }
}

/** Reviews joined to their match, newest first — used by Weekly Review + agent tools. */
export async function recentReviews(limit: number): Promise<{ review: Review; matchTitle: string }[]> {
  const [reviews, matches] = await Promise.all([reviewRepository.all(), matchRepository.all()]);
  const byId = new Map(matches.map((m) => [m.id, m]));
  return reviews
    .filter((r) => byId.has(r.matchId))
    .sort((a, b) => (byId.get(b.matchId)!.playedAt < byId.get(a.matchId)!.playedAt ? -1 : 1))
    .slice(0, limit)
    .map((review) => {
      const m = byId.get(review.matchId)!;
      return { review, matchTitle: `${m.playedAt.slice(5, 10)} · 第${m.placement}名 · ${m.composition ?? "未填阵容"}` };
    });
}
