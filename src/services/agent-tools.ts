import { allMatches, getMatchBundle, recentMatches } from "./match-service";
import { recentReviews } from "./review-service";
import { allGoals } from "./training-service";
import { commonMistakes, compositionChart } from "./stats-service";
import { weeklyReport } from "./weekly-service";

/**
 * Agent tool surface — Phase 6+ (Agent Coach / MCP) will wrap these exact
 * functions as tool definitions. Deliberately:
 *
 * - plain async functions returning JSON-serializable data (no Dexie/React),
 * - read-only,
 * - one function per capability the coach needs.
 */

export const agentTools = {
  /** `get_recent_matches()` — the last N games, newest first. */
  get_recent_matches: (limit = 10) => recentMatches(limit),

  /** `get_match(id)` — one game with its review + decisions. */
  get_match: (id: string) => getMatchBundle(id),

  /** `get_recent_reviews()` — recent review conclusions with their match context. */
  get_recent_reviews: (limit = 5) => recentReviews(limit),

  /** `get_common_mistakes()` — ranked Primary-Mistake counts. */
  get_common_mistakes: (limit = 5) => commonMistakes(limit),

  /** `get_composition_stats()` — per-composition games / avg placement / top4. */
  get_composition_stats: () => compositionChart(),

  /** `get_training_goals()` — every goal, active first (already sorted). */
  get_training_goals: () => allGoals(),

  /** `get_weekly_summary()` — the current week's aggregates + rule-based digest. */
  get_weekly_summary: (offset = 0) => weeklyReport(offset),

  /** Raw feed for custom aggregation (kept last, not a tool by default). */
  _all_matches: () => allMatches(),
} as const;

export type AgentTool = keyof typeof agentTools;
