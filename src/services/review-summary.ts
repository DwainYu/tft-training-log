import type { MistakeType, TrainingGoal } from "../domain/types";

/**
 * What a weekly review is built from. Everything is plain data on purpose:
 * the *aggregation* stays deterministic, only the *phrasing* (future phases)
 * is delegated to a provider.
 */
export interface WeeklySummaryInput {
  weekStart: string; // Monday, YYYY-MM-DD
  weekEnd: string;
  games: number;
  avgPlacement: number | null;
  top4Rate: number | null;
  wins: number;
  bottom4: number;
  mostCommonMistakes: { type: MistakeType | "UNCLASSIFIED"; label: string; count: number }[];
  topComposition: { composition: string; games: number; avgPlacement: number | null } | null;
  currentGoal: Pick<TrainingGoal, "id" | "title" | "description"> | null;
}

export interface ReviewSummary {
  provider: string;
  headline: string;
  /** Short bullets, in display order. */
  points: string[];
  /** Suggested next-step, or null when there is nothing to suggest. */
  nextStep: string | null;
}

/**
 * Future phases plug in `LLMSummary` / `AgentCoach` here; the Weekly page and
 * any agent tool only depend on this interface.
 */
export interface ReviewSummaryProvider {
  readonly key: "rule-based" | "llm" | "agent-coach";
  readonly label: string;
  summarize(input: WeeklySummaryInput): Promise<ReviewSummary>;
}

/** Phase 1: no LLM — deterministic phrasing from the raw numbers. */
export const RuleBasedSummary: ReviewSummaryProvider = {
  key: "rule-based",
  label: "规则摘要",

  async summarize(input: WeeklySummaryInput): Promise<ReviewSummary> {
    const points: string[] = [];

    if (input.games === 0) {
      points.push("本周还没有记录对局。");
    } else {
      points.push(`本周 ${input.games} 局，平均名次 ${input.avgPlacement}，Top4 率 ${Math.round((input.top4Rate ?? 0) * 100)}%。`);
      if (input.wins > 0) points.push(`吃鸡 ${input.wins} 次。`);
      if (input.bottom4 > 0) points.push(`Bottom4 ${input.bottom4} 次。`);
      if (input.mostCommonMistakes.length > 0) {
        const top = input.mostCommonMistakes
          .filter((m) => m.type !== "UNCLASSIFIED")
          .slice(0, 3)
          .map((m) => `${m.label} × ${m.count}`)
          .join("、");
        if (top) points.push(`高频问题：${top}。`);
      }
      if (input.topComposition) {
        points.push(
          `最常玩：${input.topComposition.composition}（${input.topComposition.games} 局，平均第 ${input.topComposition.avgPlacement} 名）。`,
        );
      }
    }

    let nextStep: string | null = null;
    if (input.currentGoal) {
      nextStep = `继续执行训练目标「${input.currentGoal.title}」。`;
    } else if (input.mostCommonMistakes[0] && input.mostCommonMistakes[0].type !== "UNCLASSIFIED") {
      nextStep = `围绕高频问题「${input.mostCommonMistakes[0].label}」设一个新的训练目标。`;
    }

    const headline =
      input.games === 0
        ? "本周还没有开始训练"
        : input.avgPlacement !== null && input.avgPlacement <= 4
          ? "本周平均名次在 Top4 内"
          : input.top4Rate !== null && input.top4Rate >= 0.5
            ? "Top4 率过半"
            : "本周以积累有效实战为主";

    return { provider: this.key, headline, points, nextStep };
  },
};

/** The provider the app actually uses today. Swap implementations here. */
export const activeSummaryProvider: ReviewSummaryProvider = RuleBasedSummary;
