import { beforeEach, describe, expect, it } from "vitest";
import { addMatch, getMatch } from "./match-service";
import { deleteReview, getReview, saveReview, seedReview } from "./review-service";
import { ValidationError } from "../lib/errors";
import { resetDatabase } from "../test/db-helper";

beforeEach(resetDatabase);

describe("review service", () => {
  it("rejects an incomplete 复盘结论 without writing", async () => {
    const m = await addMatch({ playedAt: "2026-02-05T13:20", placement: "5" });
    await expect(saveReview(m.id, { nextGameFocus: "存钱" })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await getReview(m.id)).toBeUndefined();
  });

  it("marks the match reviewed and syncs the primary mistake", async () => {
    const m = await addMatch({ playedAt: "2026-02-05T13:20", placement: "5" });
    await saveReview(m.id, {
      primaryMistake: "ECONOMY",
      biggestMistake: "利息没吃满",
      bestDecision: "3-1 直接 D 到 2 星",
      nextGameFocus: "2-5 存 50 再 D",
      selfScore: 3,
    });

    const after = await getMatch(m.id);
    expect(after?.reviewed).toBe(true);
    expect(after?.primaryMistake).toBe("ECONOMY");

    const review = await getReview(m.id);
    expect(review?.selfScore).toBe(3);
  });

  it("seeded reviews keep the match flagged as unreviewed", async () => {
    const m = await addMatch({ playedAt: "2026-02-05T13:20", placement: "4" });
    const seeded = await seedReview(m.id, { nextGameFocus: "4-1 前只 D 30 金" });
    expect(seeded.nextGameFocus).toBe("4-1 前只 D 30 金");
    expect((await getMatch(m.id))?.reviewed).toBe(false);

    // a later full save upgrades the same record instead of duplicating it
    await saveReview(m.id, {
      primaryMistake: "ROLLING",
      biggestMistake: "D 牌过深",
      bestDecision: "保血",
      nextGameFocus: "按计划 D",
    });
    const reviews = await getReview(m.id);
    expect(reviews?.nextGameFocus).toBe("按计划 D");
    expect(reviews?.id).toBe(seeded.id);
    expect((await getMatch(m.id))?.reviewed).toBe(true);
  });

  it("deleting the review resets the reviewed flag but keeps the mistake", async () => {
    const m = await addMatch({ playedAt: "2026-02-05T13:20", placement: "6" });
    await saveReview(m.id, {
      primaryMistake: "POSITIONING",
      biggestMistake: "主 C 站脸",
      bestDecision: "开局节奏",
      nextGameFocus: "主 C 放角落",
    });
    await deleteReview(m.id);

    expect(await getReview(m.id)).toBeUndefined();
    const after = await getMatch(m.id);
    expect(after?.reviewed).toBe(false);
    expect(after?.primaryMistake).toBe("POSITIONING");
  });
});
