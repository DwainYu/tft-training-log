import type { Review } from "../../domain/types";
import { db } from "../db";

/** One review per match, keyed by `matchId`. */
export interface ReviewRepository {
  put(review: Review): Promise<Review>;
  bulkPut(reviews: Review[]): Promise<void>;
  get(id: string): Promise<Review | undefined>;
  byMatch(matchId: string): Promise<Review | undefined>;
  all(): Promise<Review[]>;
  removeByMatch(matchId: string): Promise<void>;
  clear(): Promise<void>;
}

export const reviewRepository: ReviewRepository = {
  async put(review) {
    await db.reviews.put(review);
    return review;
  },
  async bulkPut(reviews) {
    await db.reviews.bulkPut(reviews);
  },
  async get(id) {
    return db.reviews.get(id);
  },
  async byMatch(matchId) {
    return db.reviews.where("matchId").equals(matchId).first();
  },
  async all() {
    return db.reviews.toArray();
  },
  async removeByMatch(matchId) {
    await db.reviews.where("matchId").equals(matchId).delete();
  },
  async clear() {
    await db.reviews.clear();
  },
};
