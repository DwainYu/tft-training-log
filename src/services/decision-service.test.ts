import { beforeEach, describe, expect, it } from "vitest";
import { addDecision, decisionCountByMatch, listDecisions, removeDecision, updateDecision } from "./decision-service";
import { addMatch } from "./match-service";
import { ValidationError } from "../lib/errors";
import { resetDatabase } from "../test/db-helper";

beforeEach(resetDatabase);

describe("decision service", () => {
  it("adds decisions to a match and lists them in round order", async () => {
    const m = await addMatch({ playedAt: "2026-02-05T13:20", placement: "4" });
    await addDecision(m.id, {
      round: "4-1",
      type: "ROLLING",
      situation: "30 金币",
      decision: "只 D 到 2 星主 C",
      reasoning: "控制预算",
    });
    await addDecision(m.id, {
      round: "2-1",
      type: "LEVELING",
      decision: "直接上 5",
      reasoning: "强度足够",
      result: "连胜两轮",
      hindsight: "correct",
    });

    const list = await listDecisions(m.id);
    expect(list.map((d) => d.round)).toEqual(["2-1", "4-1"]);
    expect(list[0].hindsight).toBe("correct");

    expect(await decisionCountByMatch()).toEqual({ [m.id]: 2 });
  });

  it("rejects decisions without the required fields", async () => {
    const m = await addMatch({ playedAt: "2026-02-05T13:20", placement: "5" });
    await expect(
      addDecision(m.id, { round: "", type: "OTHER", situation: "", decision: "x", reasoning: "" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates a decision in place", async () => {
    const m = await addMatch({ playedAt: "2026-02-05T13:20", placement: "5" });
    const d = await addDecision(m.id, {
      round: "3-2",
      type: "COMPOSITION",
      decision: "转阵",
      reasoning: "卡等级",
    });
    const updated = await updateDecision(d.id, {
      round: "3-2",
      type: "COMPOSITION",
      situation: "4 级 40 血",
      decision: "提前转阵",
      reasoning: "卡等级",
      hindsight: "wrong",
      hindsightNote: "转早了，白亏一波",
    });
    expect(updated.hindsight).toBe("wrong");
    const [again] = await listDecisions(m.id);
    expect(again.id).toBe(d.id);
    expect(again.hindsightNote).toBe("转早了，白亏一波");
  });

  it("removes one decision", async () => {
    const m = await addMatch({ playedAt: "2026-02-05T13:20", placement: "6" });
    const d = await addDecision(m.id, { round: "2-5", type: "ECONOMY", decision: "存钱", reasoning: "x" });
    await removeDecision(d.id);
    expect(await listDecisions(m.id)).toHaveLength(0);
  });
});
