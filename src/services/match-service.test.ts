import { beforeEach, describe, expect, it } from "vitest";
import {
  addMatch,
  allMatches,
  deleteMatch,
  getMatch,
  getMatchBundle,
  knownCompositions,
  listMatches,
  recentMatches,
  trainedDateKeys,
  updateMatch,
} from "./match-service";
import { addDecision } from "./decision-service";
import { saveReview } from "./review-service";
import { ValidationError } from "../lib/errors";
import { resetDatabase } from "../test/db-helper";
import type { ReviewInput } from "../domain/review/review";

const completeReview = (primaryMistake: "ECONOMY" | "ROLLING"): ReviewInput => ({
  primaryMistake,
  biggestMistake: primaryMistake === "ROLLING" ? "4-1 D 牌过深" : "利息没吃满",
  bestDecision: "3-2 直接上 6 保住了血量",
  nextGameFocus: "4-1 之后只 D 到 2 星主 C",
});

beforeEach(resetDatabase);

describe("match service CRUD", () => {
  it("creates a match from a manual payload", async () => {
    const created = await addMatch({
      playedAt: "2026-02-05T13:20",
      placement: "3",
      composition: "Arcader",
      coreUnits: "A / B / C",
      durationMinutes: "28",
    });

    expect(created.id).toBeTruthy();
    expect(created.placement).toBe(3);
    expect(created.durationSeconds).toBe(1680);
    expect(created.coreUnits).toEqual(["A", "B", "C"]);
    expect(created.reviewed).toBe(false);

    const stored = await getMatch(created.id);
    expect(stored).toEqual(created);
    expect(await allMatches()).toHaveLength(1);
  });

  it("rejects invalid payloads and stores nothing", async () => {
    await expect(addMatch({ playedAt: "2026-02-05T13:20", placement: "9" })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(addMatch({ playedAt: "2026-02-05T13:20" })).rejects.toThrow();
    expect(await allMatches()).toHaveLength(0);
  });

  it("defaults playedAt to now when the form leaves it blank", async () => {
    const created = await addMatch({ placement: "4" });
    expect(created.playedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("edits a match without changing its identity", async () => {
    const created = await addMatch({ playedAt: "2026-02-05T13:20", placement: "6" });
    const updated = await updateMatch(created.id, {
      playedAt: created.playedAt,
      placement: "2",
      composition: "Fortune",
    });
    expect(updated.id).toBe(created.id);
    expect(updated.placement).toBe(2);
    expect(updated.composition).toBe("Fortune");
    expect((await getMatch(created.id))?.placement).toBe(2);
  });

  it("deletes a match and cascades decisions + review", async () => {
    const created = await addMatch({ playedAt: "2026-02-05T13:20", placement: "5" });
    await addDecision(created.id, {
      round: "3-2",
      type: "LEVELING",
      situation: "42 金币，72 血",
      decision: "直接上 6",
      reasoning: "保持战斗力",
    });
    await saveReview(created.id, completeReview("ECONOMY"));
    expect((await getMatchBundle(created.id))?.review).toBeTruthy();

    await deleteMatch(created.id);
    expect(await getMatchBundle(created.id)).toBeNull();
    expect(await allMatches()).toHaveLength(0);
  });

  it("marks a match reviewed only when the review is complete", async () => {
    const created = await addMatch({ playedAt: "2026-02-05T13:20", placement: "4" });
    await saveReview(created.id, completeReview("ROLLING"));
    const after = await getMatch(created.id);
    expect(after?.reviewed).toBe(true);
    // review's primary mistake becomes the single source of truth on the match
    expect(after?.primaryMistake).toBe("ROLLING");
  });

  it("queries and sorts through the service", async () => {
    await addMatch({ playedAt: "2026-02-05T13:20", placement: "1", composition: "Arcader" });
    await addMatch({ playedAt: "2026-02-04T20:10", placement: "7", composition: "Rebel" });
    await addMatch({ playedAt: "2026-02-03T18:00", placement: "2", composition: "Arcader" });

    const top4 = await listMatches({ placement: "top4" });
    expect(top4.map((m) => m.placement)).toEqual([1, 2]);

    const recent = await recentMatches(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].playedAt).toBe("2026-02-05T13:20");

    expect(await knownCompositions()).toEqual(["Arcader", "Rebel"]);
    expect(await trainedDateKeys()).toEqual(["2026-02-05", "2026-02-04", "2026-02-03"]);
  });
});
