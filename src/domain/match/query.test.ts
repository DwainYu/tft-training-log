import { describe, expect, it } from "vitest";
import { queryMatches } from "./query";
import type { MatchForQuery } from "./match";

const m = (over: Partial<MatchForQuery> & { id: string }): MatchForQuery => ({
  playedAt: "2026-02-05T13:00",
  placement: 4,
  reviewed: false,
  ...over,
});

const matches: MatchForQuery[] = [
  m({ id: "a", playedAt: "2026-02-05T13:00", placement: 1, composition: "Arcader", reviewed: true, primaryMistake: "ROLLING", durationSeconds: 1800, notes: "锁血成功" }),
  m({ id: "b", playedAt: "2026-02-04T20:30", placement: 5, composition: "Arcader", durationSeconds: 1500, augments: ["升级"] }),
  m({ id: "c", playedAt: "2026-02-03T18:10", placement: 3, composition: "Rebel", coreUnits: ["Kaisa"], primaryMistake: "POSITIONING" }),
];

const ids = (list: MatchForQuery[]) => list.map((x) => x.id);

describe("queryMatches", () => {
  it("sorts by playedAt descending by default", () => {
    expect(ids(queryMatches(matches, {}))).toEqual(["a", "b", "c"]);
  });

  it("sorts ascending when asked", () => {
    expect(ids(queryMatches(matches, { sortDir: "asc" }))).toEqual(["c", "b", "a"]);
  });

  it("filters top4 vs bottom4 vs win", () => {
    expect(ids(queryMatches(matches, { placement: "top4" }))).toEqual(["a", "c"]);
    expect(ids(queryMatches(matches, { placement: "bottom4" }))).toEqual(["b"]);
    expect(ids(queryMatches(matches, { placement: "win" }))).toEqual(["a"]);
  });

  it("filters reviewed state", () => {
    expect(ids(queryMatches(matches, { reviewed: "reviewed" }))).toEqual(["a"]);
    expect(ids(queryMatches(matches, { reviewed: "unreviewed" }))).toEqual(["b", "c"]);
  });

  it("filters composition and mistake type", () => {
    expect(ids(queryMatches(matches, { composition: "Arcader" }))).toEqual(["a", "b"]);
    expect(ids(queryMatches(matches, { mistake: "ROLLING" }))).toEqual(["a"]);
    expect(ids(queryMatches(matches, { mistake: "none" }))).toEqual(["b"]);
  });

  it("filters by inclusive date range", () => {
    expect(ids(queryMatches(matches, { from: "2026-02-04", to: "2026-02-04" }))).toEqual(["b"]);
    expect(ids(queryMatches(matches, { from: "2026-02-04" }))).toEqual(["a", "b"]);
    expect(ids(queryMatches(matches, { to: "2026-02-03" }))).toEqual(["c"]);
  });

  it("searches composition, units, augments, notes and placement", () => {
    expect(ids(queryMatches(matches, { search: "kaisa" }))).toEqual(["c"]);
    expect(ids(queryMatches(matches, { search: "锁血" }))).toEqual(["a"]);
    expect(ids(queryMatches(matches, { search: "升级" }))).toEqual(["b"]);
    expect(ids(queryMatches(matches, { search: "nomatch" }))).toEqual([]);
  });

  it("applies several filters together", () => {
    expect(
      ids(queryMatches(matches, { composition: "Arcader", placement: "top4", sortDir: "asc" })),
    ).toEqual(["a"]);
  });
});
