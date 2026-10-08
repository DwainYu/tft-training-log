import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DashboardPage } from "./DashboardPage";
import { addMatch, setPrimaryMistake, setReviewed } from "../services/match-service";
import { resetDatabase } from "../test/db-helper";
import { renderWithProviders } from "../test/render";
import type { MistakeType } from "../domain/types";

/**
 * The Dashboard answers "how am I training lately?". These tests pin the parts
 * that are easy to get wrong: 0 games must not render a wall of zeros, 1–2
 * games must not produce conclusions, and every panel must lead to the matches
 * behind it.
 */
const render = () => renderWithProviders(<DashboardPage />, "/");

/** A panel by its heading — the page repeats words like 场次 across panels. */
const findPanel = async (title: string) =>
  (await screen.findByRole("heading", { name: title })).closest("section")!;

/** The KPI tile labelled `label` (its label is a div; table headers are `th`). */
const kpi = (label: string) =>
  screen.getByText(label, { selector: "div" }).parentElement!;

interface Game {
  placement: number;
  composition?: string;
  mistake?: MistakeType;
  reviewed?: boolean;
}

let clock = 0;
async function log(game: Game): Promise<void> {
  // Distinct timestamps keep the ordering deterministic.
  const day = String(10 + Math.floor(clock / 2)).padStart(2, "0");
  const time = clock % 2 === 0 ? "13:00" : "20:30";
  clock += 1;
  const match = await addMatch({
    playedAt: `2026-02-${day}T${time}`,
    placement: String(game.placement),
    composition: game.composition,
  });
  if (game.mistake) await setPrimaryMistake(match.id, game.mistake);
  if (game.reviewed) await setReviewed(match.id, true);
}

/** 12 games: enough for the trend (≥5) and for one composition row (≥3). */
async function seedNormal() {
  for (let i = 0; i < 4; i += 1) {
    await log({ placement: 2, composition: "Arcader", mistake: "ECONOMY", reviewed: true });
    await log({ placement: 6, composition: "Arcader", mistake: "ROLLING" });
    await log({ placement: 5, composition: "Rebel", mistake: "ECONOMY" });
  }
}

beforeEach(() => {
  clock = 0;
  return resetDatabase();
});

describe("Dashboard · no data", () => {
  it("invites the first game instead of rendering zeros", async () => {
    render();
    expect(await screen.findByText("这个训练下还没有记录对局")).toBeInTheDocument();
    // no KPI wall: a "场次 0" tile tells the user nothing
    expect(screen.queryByText("场次")).not.toBeInTheDocument();
    expect(screen.queryByText(/暂无数据/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN|undefined/)).not.toBeInTheDocument();
  });
});

describe("Dashboard · tiny samples", () => {
  it("shows the game but refuses to conclude anything from one", async () => {
    await log({ placement: 1, composition: "Arcader", mistake: "ECONOMY", reviewed: true });
    render();

    await screen.findByText("场次", { selector: "div" });
    expect(within(kpi("场次")).getByText("1")).toBeInTheDocument();
    // one game is not a trend and not a mistake profile
    expect(screen.getAllByText(/已记录 1 局，记到 5 局后/).length).toBeGreaterThan(0);
    // and it is definitely not a "best composition"
    expect(screen.getAllByText("样本不足").length).toBeGreaterThan(0);
    expect(screen.queryByText(/最佳阵容/)).not.toBeInTheDocument();
  });

  it("still refuses conclusions at two games", async () => {
    await log({ placement: 1, composition: "Arcader", reviewed: true });
    await log({ placement: 8, composition: "Arcader", reviewed: true });
    render();

    await screen.findByText("场次", { selector: "div" });
    expect(screen.getAllByText(/已记录 2 局，记到 5 局后/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("样本不足").length).toBeGreaterThan(0);
  });
});

describe("Dashboard · normal sample", () => {
  it("renders KPIs that each say something different", async () => {
    await seedNormal();
    render();

    await screen.findByText("场次", { selector: "div" });
    expect(within(kpi("场次")).getByText("12")).toBeInTheDocument();
    expect(screen.getByText("4 局已复盘")).toBeInTheDocument();
    // "吃鸡" is the count of 1st places; a second tile for the same numerator
    // (Win Rate) was removed, and Top4 has its own tile.
    expect(screen.queryByText("Win Rate")).not.toBeInTheDocument();
    // 12 games cannot fill two windows of 10, so no direction is claimed
    expect(screen.getByText("满 20 局后显示变化")).toBeInTheDocument();
  });

  it("links the unreviewed backlog to the filtered list", async () => {
    await seedNormal();
    render();

    const link = await screen.findByRole("link", { name: /未复盘 8 局/ });
    expect(link).toHaveAttribute("href", "/matches?reviewed=unreviewed");
  });

  it("drills every composition row down to its games", async () => {
    await seedNormal();
    render();

    const comps = await findPanel("阵容表现");
    const row = within(comps).getByText("Arcader").closest("tr")!;
    expect(within(row).getByText("8")).toBeInTheDocument(); // 8 games, not "样本不足"
    expect(within(row).getByRole("link")).toHaveAttribute("href", "/matches?composition=Arcader");
  });

  it("treats a composition as the name the player logged, never as a trait", async () => {
    await seedNormal();
    render();

    const comps = await findPanel("阵容表现");
    expect(within(comps).getByText("Arcader")).toBeInTheDocument();
    expect(within(comps).getByText(/羁绊单独记录/)).toBeInTheDocument();
  });

  it("drills the top mistakes down to their games", async () => {
    await seedNormal();
    render();

    const link = await screen.findByRole("link", { name: /经济 × 8/ });
    expect(link).toHaveAttribute("href", "/matches?mistake=ECONOMY");
  });

  it("lists the recent games so one can be opened", async () => {
    await seedNormal();
    render();

    const recent = await findPanel("最近对局");
    expect(within(recent).getAllByRole("link", { name: "详情" })).toHaveLength(8);
  });
});

describe("Dashboard · narrow screen", () => {
  it("folds the match list into cards instead of a sideways-scrolling table", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 391 });
    await seedNormal();
    render();

    const recent = await findPanel("最近对局");
    // MatchList switches to cards below 768px
    expect(within(recent).queryByRole("table")).not.toBeInTheDocument();
    expect(within(recent).getAllByText(/第 \d 名/).length).toBeGreaterThan(0);
    // the priority order still starts with the KPIs
    expect(screen.getByText("场次", { selector: "div" })).toBeInTheDocument();
  });
});
