import { describe, expect, it } from "vitest";
import {
  applyMatchInput,
  createMatch,
  isBottom4,
  isTop4,
  isWin,
  matchToInput,
  validateMatchInput,
  type MatchInput,
} from "./match";
import { MAX_PLACEMENT } from "../types";

const base: MatchInput = {
  playedAt: "2026-02-05T13:30",
  placement: 4,
};

describe("createMatch", () => {
  it("fills ids and timestamps", () => {
    const m = createMatch(base);
    expect(m.id).toBeTruthy();
    expect(m.reviewed).toBe(false);
    expect(m.createdAt).toMatch(/^\d{4}-/);
    expect(m.updatedAt).toBe(m.createdAt);
  });

  it("derives duration from start/end when not given", () => {
    const m = createMatch({
      ...base,
      startedAt: "2026-02-05T12:50",
      endedAt: "2026-02-05T13:20",
    });
    expect(m.durationSeconds).toBe(1800);
  });

  it("keeps an explicit duration over the derived one", () => {
    const m = createMatch({
      ...base,
      startedAt: "2026-02-05T12:50",
      endedAt: "2026-02-05T13:20",
      durationSeconds: 1500,
    });
    expect(m.durationSeconds).toBe(1500);
  });

  it("drops empty optional fields instead of storing blanks", () => {
    const m = createMatch({
      ...base,
      composition: "   ",
      coreUnits: ["", "  A ", "B/", ""],
      notes: "",
    });
    expect(m.composition).toBeUndefined();
    expect(m.notes).toBeUndefined();
    expect(m.coreUnits).toEqual(["A", "B"]);
    expect("totalGold" in m).toBe(false);
  });

  it("applies later input without touching created/placement history", () => {
    const m = createMatch(base);
    const next = applyMatchInput(m, { ...base, placement: 1, composition: "Fortune" });
    expect(next.id).toBe(m.id);
    expect(next.createdAt).toBe(m.createdAt);
    expect(next.placement).toBe(1);
    expect(next.composition).toBe("Fortune");
  });
});

describe("placement predicates", () => {
  it("classifies top4 / bottom4 / win", () => {
    expect(isWin({ placement: 1 })).toBe(true);
    expect(isWin({ placement: 2 })).toBe(false);
    expect(isTop4({ placement: 4 })).toBe(true);
    expect(isTop4({ placement: 5 })).toBe(false);
    expect(isBottom4({ placement: 5 })).toBe(true);
    expect(isBottom4({ placement: 4 })).toBe(false);
  });
});

describe("validateMatchInput", () => {
  it("accepts a minimal valid record", () => {
    expect(validateMatchInput(base)).toEqual([]);
  });

  it("rejects placements outside 1-8", () => {
    expect(validateMatchInput({ ...base, placement: 0 }).length).toBeGreaterThan(0);
    expect(validateMatchInput({ ...base, placement: MAX_PLACEMENT + 1 }).length).toBeGreaterThan(0);
    expect(validateMatchInput({ ...base, placement: 3.5 }).length).toBeGreaterThan(0);
  });

  it("rejects an unparsable playedAt", () => {
    expect(validateMatchInput({ ...base, playedAt: "昨天下午" }).length).toBeGreaterThan(0);
  });

  it("rejects end before start", () => {
    const errors = validateMatchInput({
      ...base,
      startedAt: "2026-02-05T13:40",
      endedAt: "2026-02-05T13:20",
    });
    expect(errors).toContain("结束时间应晚于开始时间");
  });

  it("rejects out-of-range level / health", () => {
    expect(validateMatchInput({ ...base, finalLevel: 30 })).toContain("最终等级应在 1 – 12 之间");
    expect(validateMatchInput({ ...base, finalHealth: 120 })).toContain("最终血量应在 0 – 100 之间");
  });
});

describe("canonical static-data ids (Phase 2)", () => {
  it("normalises id lists: trim, drop empties, dedupe", () => {
    const m = createMatch({
      ...base,
      set: 18,
      traitIds: ["DA_18_Spellweaver", "DA_18_Spellweaver", " ", "DA_18_Rapidfire"],
      coreUnitIds: ["DA_18_Azir"],
      coreItemIds: ["TFT_Item_ArchangelsStaff"],
      augmentIds: ["DA_18_BigGrabBag"],
    });
    expect(m.set).toBe(18);
    expect(m.traitIds).toEqual(["DA_18_Spellweaver", "DA_18_Rapidfire"]);
    expect(m.coreUnitIds).toEqual(["DA_18_Azir"]);
    expect(m.coreItemIds).toEqual(["TFT_Item_ArchangelsStaff"]);
    expect(m.augmentIds).toEqual(["DA_18_BigGrabBag"]);
  });

  it("keeps legacy records without ids intact (backward compatibility)", () => {
    const m = createMatch({ ...base, composition: "法师爆发", traits: ["法师"] });
    expect("traitIds" in m).toBe(false);
    expect("coreUnitIds" in m).toBe(false);
    expect("set" in m).toBe(false);
    expect(m.composition).toBe("法师爆发");
    expect(validateMatchInput(matchToInput(m))).toEqual([]);
  });

  it("drops empty id arrays instead of storing them", () => {
    const m = createMatch({ ...base, traitIds: ["", "  "] });
    expect("traitIds" in m).toBe(false);
  });
});
