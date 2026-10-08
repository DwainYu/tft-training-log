import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { StatisticsPage } from "./StatisticsPage";
import { addMatch, setPrimaryMistake } from "../services/match-service";
import { saveReview } from "../services/review-service";
import { resetDatabase } from "../test/db-helper";
import { renderWithProviders } from "../test/render";

/**
 * The Statistics page keeps its old shape on purpose; this guards the parts
 * this stage touched — the loading gate and the drill-down links.
 */
beforeEach(resetDatabase);

async function seed() {
  for (let i = 0; i < 6; i += 1) {
    const match = await addMatch({
      playedAt: `2026-02-0${i + 1}T13:00`,
      placement: i < 3 ? "2" : "6",
      composition: i < 4 ? "Arcader" : "Rebel",
    });
    await setPrimaryMistake(match.id, i < 3 ? "ECONOMY" : "ROLLING");
  }
}

describe("Statistics page", () => {
  it("renders the overall numbers once every query has settled", async () => {
    await seed();
    renderWithProviders(<StatisticsPage />, "/statistics");

    await screen.findByText("Games");
    expect(screen.getByText("Avg Placement")).toBeInTheDocument();
    // the whole page waits for every query, so nothing flashes "no data"
    expect(screen.queryByText(/暂无数据/)).not.toBeInTheDocument();
  });

  it("drills a composition row down to its games", async () => {
    await seed();
    renderWithProviders(<StatisticsPage />, "/statistics");

    const row = (await screen.findByText("Arcader")).closest("tr")!;
    expect(within(row).getByRole("link")).toHaveAttribute("href", "/matches?composition=Arcader");
  });

  it("groups by the opening route only where a route was marked", async () => {
    const a = await addMatch({ playedAt: "2026-02-01T13:00", placement: 2, composition: "Arcader" });
    await saveReview(a.id, {
      primaryMistake: "ECONOMY",
      biggestMistake: "利息没吃满",
      bestDecision: "2-5 存钱",
      nextGameFocus: "吃满利息",
    }, "WIN_STREAK");

    renderWithProviders(<StatisticsPage />, "/statistics");

    const panel = (await screen.findByRole("heading", { name: "开局路线" })).closest("section")!;
    // one game is a fact, not a conclusion: both derived cells refuse to speak
    expect(within(panel).getAllByText("样本不足")).toHaveLength(2);
    expect(within(panel).getByText(/已标记 1 \/ 1 局/)).toBeInTheDocument();
  });

  it("says what produces the opening statistic when nothing is marked", async () => {
    await seed();
    renderWithProviders(<StatisticsPage />, "/statistics");

    const panel = (await screen.findByRole("heading", { name: "开局路线" })).closest("section")!;
    expect(within(panel).getByText(/还没有标记过开局路线/)).toBeInTheDocument();
  });
});
