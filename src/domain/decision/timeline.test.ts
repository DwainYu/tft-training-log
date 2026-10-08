import { describe, expect, it } from "vitest";
import { buildTimeline, type DecisionForTimeline, type MatchForTimeline } from "./timeline";

const match: MatchForTimeline = {
  placement: 3,
  finalHealth: 28,
  primaryMistake: "ECONOMY",
};

const d = (over: Partial<DecisionForTimeline> & { id: string }): DecisionForTimeline => ({
  round: "2-1",
  type: "ECONOMY",
  decision: "不升级，吃利息",
  createdAt: "2026-10-01T10:00:00.000Z",
  ...over,
});

describe("buildTimeline", () => {
  it("always ends with the outcome, even with no decisions", () => {
    const events = buildTimeline(match, []);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      kind: "outcome",
      id: "outcome",
      placement: 3,
      finalHealth: 28,
      primaryMistake: "ECONOMY",
    });
  });

  it("orders decisions by round across stages", () => {
    const events = buildTimeline(match, [
      d({ id: "c", round: "4-1" }),
      d({ id: "a", round: "2-3" }),
      d({ id: "b", round: "2-1" }),
    ]);
    expect(events.map((e) => (e.kind === "decision" ? e.round : "outcome"))).toEqual([
      "2-1",
      "2-3",
      "4-1",
      "outcome",
    ]);
  });

  it("sorts 10-1 after 7-5 and keeps unparseable rounds last", () => {
    const events = buildTimeline(match, [
      d({ id: "late", round: "10-1" }),
      d({ id: "mid", round: "7-5" }),
      d({ id: "text", round: "最终" }),
      d({ id: "early", round: "2-1" }),
    ]);
    expect(events.map((e) => (e.kind === "decision" ? e.round : "outcome"))).toEqual([
      "2-1",
      "7-5",
      "10-1",
      "最终",
      "outcome",
    ]);
  });

  it("keeps the raw round text instead of guessing a stage", () => {
    const events = buildTimeline(match, [d({ id: "x", round: "中期发力" })]);
    const decision = events[0];
    if (decision.kind !== "decision") throw new Error("expected a decision event");
    expect(decision.round).toBe("中期发力");
    expect(decision.sortKey).toBeNull();
  });

  it("breaks ties between identical rounds by creation time", () => {
    const events = buildTimeline(match, [
      d({ id: "second", round: "2-1", createdAt: "2026-10-01T11:00:00.000Z" }),
      d({ id: "first", round: "2-1", createdAt: "2026-10-01T09:00:00.000Z" }),
    ]);
    expect(events.map((e) => (e.kind === "decision" ? e.id : "outcome"))).toEqual([
      "first",
      "second",
      "outcome",
    ]);
  });

  it("carries hindsight and the raw decision type", () => {
    const events = buildTimeline(match, [
      d({ id: "w", round: "4-2", type: "ROLLING", hindsight: "wrong" }),
    ]);
    const decision = events[0];
    if (decision.kind !== "decision") throw new Error("expected a decision event");
    expect(decision.type).toBe("ROLLING");
    expect(decision.hindsight).toBe("wrong");
  });

  it("reads outcome facts from the match without inventing in-game states", () => {
    const events = buildTimeline(match, [d({ id: "a", round: "3-1" })]);
    const outcome = events[events.length - 1];
    if (outcome.kind !== "outcome") throw new Error("expected the outcome last");
    expect(outcome.placement).toBe(3);
    expect(outcome.finalHealth).toBe(28);
    expect(outcome.primaryMistake).toBe("ECONOMY");
    // no decision event claims a health or economy value
    expect(events[0].kind).toBe("decision");
  });

  it("handles a match without optional outcome fields", () => {
    const events = buildTimeline({ placement: 8 }, [d({ id: "a" })]);
    const outcome = events[events.length - 1];
    expect(outcome).toMatchObject({ kind: "outcome", placement: 8 });
    if (outcome.kind !== "outcome") throw new Error("expected the outcome last");
    expect(outcome.finalHealth).toBeUndefined();
    expect(outcome.primaryMistake).toBeUndefined();
  });

  it("does not mutate the decisions it is given", () => {
    const decisions = [
      d({ id: "b", round: "5-2" }),
      d({ id: "a", round: "2-1", createdAt: "2026-10-01T09:00:00.000Z" }),
    ];
    const frozen = JSON.stringify(decisions);
    buildTimeline(match, decisions);
    expect(JSON.stringify(decisions)).toBe(frozen);
  });
});
