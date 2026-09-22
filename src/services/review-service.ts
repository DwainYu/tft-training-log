import { matchRepository } from "../data/repository/match-repository";
import { reviewRepository } from "../data/repository/review-repository";
import {
  applyReviewInput,
  createReview,
  isReviewComplete,
  patchReview,
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

/** Full 复盘 submit — must pass the 复盘结论 requirements. */
export async function saveReview(matchId: string, input: ReviewInput): Promise<Review> {
  const errors = validateReviewInput(input);
  if (errors.length) throw new ValidationError(errors);
  return writeReview(matchId, input);
}

/**
 * Partial write used by Quick Add: stores what the player typed in the fast
 * flow without pretending the match has been reviewed.
 */
export async function seedReview(matchId: string, patch: ReviewInput): Promise<Review> {
  const existing = await reviewRepository.byMatch(matchId);
  const review = existing ? patchReview(existing, patch) : createReview(matchId, patch);
  return writeReviewRecord(review);
}

async function writeReview(matchId: string, input: ReviewInput): Promise<Review> {
  const existing = await reviewRepository.byMatch(matchId);
  const review = existing ? applyReviewInput(existing, input) : createReview(matchId, input);
  return writeReviewRecord(review);
}

/**
 * Single place where a review and its match are kept consistent: `reviewed`
 * mirrors the conclusion block and `primaryMistake` stays on the match so
 * statistics only ever read one field.
 */
async function writeReviewRecord(review: Review): Promise<Review> {
  const match = await matchRepository.get(review.matchId);
  if (!match) throw new ValidationError([`对局不存在：${review.matchId}`]);

  await reviewRepository.put(review);

  const reviewed = isReviewComplete(review);
  const primaryMistake = review.primaryMistake ?? match.primaryMistake;
  if (match.reviewed !== reviewed || match.primaryMistake !== primaryMistake) {
    await matchRepository.put({ ...match, reviewed, primaryMistake, updatedAt: nowIso() });
  }
  return review;
}

export async function deleteReview(matchId: string): Promise<void> {
  await reviewRepository.removeByMatch(matchId);
  const match = await matchRepository.get(matchId);
  if (match?.reviewed) {
    await matchRepository.put({ ...match, reviewed: false, updatedAt: nowIso() });
  }
}

/** Reviews joined to their match, newest first — Weekly Review + future agent tools. */
export async function recentReviews(limit: number): Promise<
  { review: Review; matchId: string; matchLabel: string }[]
> {
  const [reviews, matches] = await Promise.all([reviewRepository.all(), matchRepository.all()]);
  const byId = new Map(matches.map((m) => [m.id, m]));
  return reviews
    .filter((r) => byId.has(r.matchId))
    .sort(
      (a, b) =>
        byId.get(b.matchId)!.playedAt.localeCompare(byId.get(a.matchId)!.playedAt) ||
        b.updatedAt.localeCompare(a.updatedAt),
    )
    .slice(0, limit)
    .map((review) => {
      const m = byId.get(review.matchId)!;
      return {
        review,
        matchId: m.id,
        matchLabel: `${m.playedAt.slice(5, 10)} · 第 ${m.placement} 名 · ${m.composition ?? "未填阵容"}`,
      };
    });
}
