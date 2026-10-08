import { describe, expect, it } from "vitest";
import {
  EXTERNAL_RESOURCES,
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_LABELS,
  RESOURCE_CATEGORY_ORDER,
  resourceSections,
} from "./external-resources";

/**
 * The catalog is static and developer-authored, so the tests are the review
 * gate: a broken URL shape, a duplicate id or an unlabelled category fails
 * here instead of shipping.
 */
describe("external resource catalog", () => {
  it("has unique, non-empty ids", () => {
    const ids = EXTERNAL_RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it("only links https URLs — never javascript: or data:", () => {
    expect(EXTERNAL_RESOURCES.every((r) => r.url.startsWith("https://"))).toBe(true);
  });

  it("keeps titles and one-line descriptions on every resource", () => {
    for (const r of EXTERNAL_RESOURCES) {
      expect(r.title.trim()).not.toBe("");
      expect(r.description.trim()).not.toBe("");
      // descriptions describe when to open the site; they must not pretend to
      // be live data this app does not fetch
      expect(r.description).not.toMatch(/实时|最新排名|当前热门|实时胜率/);
    }
  });

  it("uses only declared categories, and every declared category is labelled", () => {
    for (const r of EXTERNAL_RESOURCES) {
      expect(RESOURCE_CATEGORIES).toContain(r.category);
    }
    for (const c of RESOURCE_CATEGORIES) {
      expect(RESOURCE_CATEGORY_LABELS[c]).toBeTruthy();
      expect(RESOURCE_CATEGORY_ORDER).toContain(c);
    }
  });

  it("groups by category in display order, keeping empty sections visible", () => {
    const sections = resourceSections();
    expect(sections.map((s) => s.category)).toEqual(RESOURCE_CATEGORY_ORDER);
    // every resource appears exactly once across the sections
    const flat = sections.flatMap((s) => s.resources);
    expect(flat).toHaveLength(EXTERNAL_RESOURCES.length);
    // the shipped catalog has no empty section — the empty-state branch stays
    // covered by the page test's sections contract instead
    expect(sections.every((s) => s.resources.length > 0)).toBe(true);
  });
});
