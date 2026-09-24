import { describe, expect, it } from "vitest";
import { validateMatchStaticData } from "./match-links";

const base = {
  traitIds: ["DA_18_Spellweaver"],
  coreUnitIds: ["DA_18_Azir"],
  coreItemIds: ["TFT_Item_ArchangelsStaff"],
  augmentIds: ["DA_18_BigGrabBag"],
};

describe("validateMatchStaticData", () => {
  it("passes for records without any ids (old data stays valid)", () => {
    expect(validateMatchStaticData({})).toEqual([]);
  });

  it("passes when every id resolves in the Set 18 snapshot", () => {
    expect(validateMatchStaticData(base)).toEqual([]);
  });

  it("fails on an unknown champion / trait / item / augment id", () => {
    expect(validateMatchStaticData({ ...base, coreUnitIds: ["DA_18_Ghost"] }))
      .toContain("棋子 id \"DA_18_Ghost\" 不存在于 Set 18 静态数据");
    expect(validateMatchStaticData({ ...base, traitIds: ["t-nope"] }))
      .toContain("羁绊 id \"t-nope\" 不存在于 Set 18 静态数据");
    expect(validateMatchStaticData({ ...base, coreItemIds: ["i-nope"] }))
      .toContain("装备 id \"i-nope\" 不存在于 Set 18 静态数据");
    expect(validateMatchStaticData({ ...base, augmentIds: ["a-nope"] }))
      .toContain("强化符文 id \"a-nope\" 不存在于 Set 18 静态数据");
  });

  it("rejects records from a set the snapshot does not cover", () => {
    const errors = validateMatchStaticData({ set: 19, ...base });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Set 18");
    expect(errors[0]).toContain("Set 19");
  });
});
