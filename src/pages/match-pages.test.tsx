import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { MatchesPage } from "./MatchesPage";
import { MatchDetailPage } from "./MatchDetailPage";
import { addMatch, allMatches } from "../services/match-service";
import { saveReview } from "../services/review-service";
import { resetDatabase } from "../test/db-helper";
import { renderWithProviders } from "../test/render";

/** Real routes so `useParams` behaves like it does in the app. */
function renderApp(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/matches" element={<MatchesPage />} />
      <Route path="/matches/:id" element={<MatchDetailPage />} />
    </Routes>,
    route,
  );
}

const table = () => within(screen.getByRole("table"));

beforeEach(resetDatabase);

async function seed() {
  const a = await addMatch({
    playedAt: "2026-02-05T13:20",
    placement: "1",
    composition: "Arcader",
    finalLevel: "8",
    durationMinutes: "31",
    primaryMistake: "POSITIONING",
  });
  await saveReview(a.id, {
    primaryMistake: "POSITIONING",
    biggestMistake: "决赛圈主 C 被对面刺客切死",
    bestDecision: "3-2 上 6 抢节奏",
    nextGameFocus: "决赛圈把主 C 放左下角",
  });
  await addMatch({
    playedAt: "2026-02-04T20:15",
    placement: "7",
    composition: "Rebel",
    finalLevel: "6",
    coreUnits: "Jhin / Vi",
  });
}

describe("Matches page", () => {
  it("lists matches with placement, comp, level, duration, reviewed and mistake", async () => {
    await seed();
    renderApp("/matches");

    await screen.findByRole("table");
    const row = (await table().findByText("Arcader")).closest("tr")!;
    expect(within(row).getByText("第 1 名")).toBeInTheDocument();
    expect(within(row).getByText("8")).toBeInTheDocument();
    expect(within(row).getByText("31分00秒")).toBeInTheDocument();
    expect(within(row).getByText("已复盘")).toBeInTheDocument();
    expect(within(row).getByText("站位")).toBeInTheDocument();

    expect(table().getByText("Rebel")).toBeInTheDocument();
    expect(table().getByText("未复盘")).toBeInTheDocument();
  });

  it("filters with the reviewed and placement selects", async () => {
    await seed();
    renderApp("/matches");
    await screen.findByRole("table");
    await table().findByText("Arcader");

    fireEvent.change(screen.getByLabelText("复盘"), { target: { value: "unreviewed" } });
    await waitFor(() =>
      expect(table().queryByText("Arcader")).not.toBeInTheDocument(),
    );
    expect(table().getByText("Rebel")).toBeInTheDocument();

    // reset brings the reviewed match back
    fireEvent.click(screen.getByRole("button", { name: "清空筛选" }));
    await waitFor(() => expect(table().getByText("Arcader")).toBeInTheDocument());
  });

  it("searches free text across the record", async () => {
    await seed();
    renderApp("/matches");
    await screen.findByRole("table");
    await table().findByText("Arcader");

    fireEvent.change(screen.getByLabelText("搜索"), { target: { value: "jhIN" } });
    await waitFor(() => expect(table().queryByText("Arcader")).not.toBeInTheDocument());
    expect(table().getByText("Rebel")).toBeInTheDocument();
  });

  it("starts from the unreviewed filter when linked from the dashboard", async () => {
    await seed();
    renderApp("/matches?reviewed=unreviewed");
    await screen.findByRole("table");
    await table().findByText("Rebel");
    expect(table().queryByText("Arcader")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing is logged", async () => {
    renderApp("/matches");
    expect(await screen.findByText("没有符合条件的对局")).toBeInTheDocument();
  });
});

describe("Match detail page", () => {
  it("shows the record, its review conclusion and delete action", async () => {
    await seed();
    const match = await addMatch({ playedAt: "2026-02-03T18:00", placement: "3", composition: "Fortune" });
    renderApp(`/matches/${match.id}`);

    expect(await screen.findByText("第 3 名 · Fortune")).toBeInTheDocument();
    expect(screen.getByText("2026-02-03")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /删除/ })).toBeInTheDocument();
    expect(screen.getAllByText("开始复盘").length).toBeGreaterThan(0);
    expect(screen.getByText("还没有记录决策")).toBeInTheDocument();
  });

  it("reports a missing match instead of crashing", async () => {
    renderApp("/matches/does-not-exist");
    expect(await screen.findByText("找不到这局对局")).toBeInTheDocument();
  });

  it("deletes the match from the detail page", async () => {
    const m = await addMatch({ playedAt: "2026-02-03T18:00", placement: "5" });
    await addMatch({ playedAt: "2026-02-02T18:00", placement: "5" });
    renderApp(`/matches/${m.id}`);

    fireEvent.click(await screen.findByRole("button", { name: /删除/ }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(async () => expect(await allMatches()).toHaveLength(1));
  });
});
