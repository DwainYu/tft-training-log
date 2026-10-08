import { describe, expect, it } from "vitest";
import {
  itemCategoryLabel,
  itemCount,
  itemIdByName,
  itemOptions,
  searchItems,
} from "./item-service";

describe("item service (real Set 18 snapshot)", () => {
  it("sees the bundled items", () => {
    expect(itemCount()).toBeGreaterThan(100);
    expect(searchItems("").length).toBeGreaterThan(0);
  });

  it("searches by name", () => {
    const hits = searchItems("无尽之刃");
    expect(hits.map((i) => i.name)).toContain("无尽之刃");
  });

  it("searches by id and by description", () => {
    expect(searchItems("TFT_Item_ArchangelsStaff").map((i) => i.name)).toContain("大天使之杖");
    expect(searchItems("法术加成").map((i) => i.name)).toContain("大天使之杖");
  });

  it("trims, ignores case and finds nothing when there is nothing", () => {
    expect(searchItems("  大天使之杖  ").map((i) => i.name)).toContain("大天使之杖");
    expect(searchItems("  archangelsstaff ").map((i) => i.name)).toContain("大天使之杖");
    expect(searchItems("这个装备一定不存在")).toEqual([]);
  });

  it("keeps the result list bounded", () => {
    expect(searchItems("之").length).toBeLessThanOrEqual(30);
  });

  it("labels the category so 组件 and 成装 are told apart", () => {
    const component = searchItems("暴风之剑")[0];
    const completed = searchItems("金铲铲冠冕")[0];
    expect(component.categoryLabel).toBe("组件");
    expect(completed.categoryLabel).toBe("成装");
    expect(itemCategoryLabel("radiant")).toBe("光明");
    expect(itemCategoryLabel("whatever")).toBe("whatever");
  });
});

describe("item selection view model", () => {
  it("resolves ids to names", () => {
    const options = itemOptions(["TFT_Item_ArchangelsStaff"]);
    expect(options[0].name).toBe("大天使之杖");
  });

  it("keeps an unknown id visible instead of hiding it", () => {
    expect(itemOptions(["legacy-item"])[0].name).toBe("legacy-item");
  });

  it("looks up an id from the exact official name only", () => {
    expect(itemIdByName("大天使之杖")).toBe("TFT_Item_ArchangelsStaff");
    expect(itemIdByName("  大天使之杖 ")).toBe("TFT_Item_ArchangelsStaff");
    // community shorthand is *not* guessed at — it stays legacy text
    expect(itemIdByName("大天使")).toBeUndefined();
  });
});
