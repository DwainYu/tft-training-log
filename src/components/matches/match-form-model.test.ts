import { describe, expect, it } from "vitest";
import {
  draftFromMatch,
  draftToPayload,
  emptyDraft,
  splitAugments,
  splitCoreItems,
  splitTraits,
} from "./match-form-model";
import type { Match } from "../../domain/types";

const match = (extra: Partial<Match>): Match => ({
  id: "m1",
  playedAt: "2026-02-05T13:20",
  placement: 3,
  reviewed: false,
  createdAt: "2026-02-05T05:00:00.000Z",
  updatedAt: "2026-02-05T05:00:00.000Z",
  ...extra,
});

describe("match form + traits", () => {
  it("keeps the recorded time when editing an existing match", () => {
    // Editing must show the game's own times, never the current clock.
    const draft = draftFromMatch(
      match({ playedAt: "2026-02-05T09:30", startedAt: "2026-02-05T09:00" }),
    );
    expect(draft.date).toBe("2026-02-05");
    expect(draft.startTime).toBe("09:00");
    expect(draft.endTime).toBe("09:30");
  });

  it("pre-fills ids from a record that already has them", () => {
    const draft = draftFromMatch(match({ traitIds: ["DA_18_Spellweaver"] }));
    expect(draft.traitIds).toEqual(["DA_18_Spellweaver"]);
    expect(draft.traitsLegacy).toEqual([]);
  });

  it("recovers ids from official names and keeps shorthand as legacy text", () => {
    const draft = draftFromMatch(match({ traits: ["法师", "重装", "先锋"] }));
    expect(draft.traitIds).toEqual(["DA_18_Spellweaver"]);
    expect(draft.traitsLegacy).toEqual(["重装", "先锋"]);
  });

  it("prefers ids and never duplicates one that is already known", () => {
    expect(splitTraits(["DA_18_Spellweaver"], ["法师", "斗士"])).toEqual({
      traitIds: ["DA_18_Spellweaver", "DA_18_Brawler"],
      traitsLegacy: [],
    });
  });

  it("writes legacy text first, then the names the ids resolve to", () => {
    const payload = draftToPayload({
      ...emptyDraft(),
      date: "2026-02-05",
      placement: 3,
      traitIds: ["DA_18_Spellweaver"],
      traitsLegacy: ["重装"],
    });
    expect(payload.traitIds).toEqual(["DA_18_Spellweaver"]);
    expect(payload.traits).toBe("重装 / 法师");
  });

  it("leaves both trait fields empty when nothing was picked", () => {
    const payload = draftToPayload({ ...emptyDraft(), date: "2026-02-05", placement: 3 });
    expect(payload.traitIds).toEqual([]);
    expect(payload.traits).toBe("");
  });
});

describe("match form + core items", () => {
  it("pre-fills ids from a record that already has them", () => {
    const draft = draftFromMatch(match({ coreItemIds: ["TFT_Item_ArchangelsStaff"] }));
    expect(draft.coreItemIds).toEqual(["TFT_Item_ArchangelsStaff"]);
    expect(draft.coreItemsLegacy).toEqual([]);
  });

  it("recovers ids from official names and keeps shorthand as legacy text", () => {
    const draft = draftFromMatch(match({ coreItems: ["大天使之杖", "无尽", "蓝buff"] }));
    expect(draft.coreItemIds).toEqual(["TFT_Item_ArchangelsStaff"]);
    expect(draft.coreItemsLegacy).toEqual(["无尽", "蓝buff"]);
  });

  it("prefers ids and never duplicates one that is already known", () => {
    expect(
      splitCoreItems(["TFT_Item_ArchangelsStaff"], ["大天使之杖", "狂徒铠甲"]),
    ).toEqual({
      coreItemIds: ["TFT_Item_ArchangelsStaff", "TFT_Item_WarmogsArmor"],
      coreItemsLegacy: [],
    });
  });

  it("writes legacy text first, then the names the ids resolve to", () => {
    const payload = draftToPayload({
      ...emptyDraft(),
      date: "2026-02-05",
      placement: 3,
      coreItemIds: ["TFT_Item_ArchangelsStaff"],
      coreItemsLegacy: ["无尽"],
    });
    expect(payload.coreItemIds).toEqual(["TFT_Item_ArchangelsStaff"]);
    expect(payload.coreItems).toBe("无尽 / 大天使之杖");
  });

  it("leaves both item fields empty when nothing was picked", () => {
    const payload = draftToPayload({ ...emptyDraft(), date: "2026-02-05", placement: 3 });
    expect(payload.coreItemIds).toEqual([]);
    expect(payload.coreItems).toBe("");
  });
});

describe("match form + augments", () => {
  it("pre-fills canonical ids when the record has them", () => {
    const draft = draftFromMatch(match({ augmentIds: ["DA_18_BigGrabBag"] }));
    expect(draft.augmentIds).toEqual(["DA_18_BigGrabBag"]);
  });

  it("recovers ids from the names older records typed by hand", () => {
    const draft = draftFromMatch(match({ augments: ["大百宝袋", "不存在的海克斯"] }));
    expect(draft.augmentIds).toEqual(["DA_18_BigGrabBag"]);
    // a name the Set 18 snapshot does not contain must survive as legacy
    // text, not vanish — pressing 保存 used to destroy it silently
    expect(draft.augmentsLegacy).toEqual(["不存在的海克斯"]);
  });

  it("prefers ids and never duplicates one that is already known", () => {
    expect(splitAugments(["DA_18_BigGrabBag"], ["大百宝袋", "我的旧符文"])).toEqual({
      augmentIds: ["DA_18_BigGrabBag"],
      augmentsLegacy: ["我的旧符文"],
    });
  });

  it("round-trips a legacy record without losing the unresolvable name", () => {
    // open an old record, change nothing but the date, press 保存
    const original = match({ augments: ["大百宝袋", "不存在的海克斯"] });
    const payload = draftToPayload(draftFromMatch(original));

    expect(payload.augmentIds).toEqual(["DA_18_BigGrabBag"]);
    // both the resolved name and the dead text are still there
    expect(payload.augments).toBe("不存在的海克斯 / 大百宝袋");
  });

  it("derives the free-text names the rest of the app still reads", () => {
    const payload = draftToPayload({
      ...emptyDraft(),
      date: "2026-02-05",
      placement: 3,
      augmentIds: ["DA_18_BigGrabBag", "DA_18_BlossomTraitAugment"],
    });
    expect(payload.augmentIds).toEqual(["DA_18_BigGrabBag", "DA_18_BlossomTraitAugment"]);
    expect(payload.augments).toBe("大百宝袋 / 绽灵花的约定");
  });

  it("leaves both augment fields empty when nothing was picked", () => {
    const payload = draftToPayload({ ...emptyDraft(), date: "2026-02-05", placement: 3 });
    expect(payload.augmentIds).toEqual([]);
    expect(payload.augments).toBe("");
  });
});
