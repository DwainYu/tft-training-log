import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ReviewPage } from "./ReviewPage";
import { addMatch } from "../services/match-service";
import { addDecision } from "../services/decision-service";
import { saveReview, seedReview } from "../services/review-service";
import { resetDatabase } from "../test/db-helper";
import { renderWithProviders } from "../test/render";

/** Real routes so `useParams` behaves like it does in the app. */
function renderApp(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/matches/:id/review" element={<ReviewPage />} />
    </Routes>,
    route,
  );
}

/** In-app jump, so a direct move to another game's review can be exercised. */
function Jump({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      jump
    </button>
  );
}

beforeEach(resetDatabase);

async function seedGame() {
  return addMatch({
    playedAt: "2026-10-03T20:15",
    placement: "6",
    composition: "狙神运营",
    finalLevel: "8",
    durationMinutes: "32",
  });
}

describe("Review page", () => {
  it("loads the other game's answers when jumping straight to its review", async () => {
    const a = await seedGame();
    await seedReview(a.id, { biggestMistake: "3-2 之前把钱花光了" });
    const b = await addMatch({
      playedAt: "2026-10-04T21:00",
      placement: "2",
      composition: "法师爆发",
    });
    renderWithProviders(
      <>
        <Jump to={`/matches/${b.id}/review`} />
        <Routes>
          <Route path="/matches/:id/review" element={<ReviewPage />} />
        </Routes>
      </>,
      `/matches/${a.id}/review`,
    );

    await screen.findByDisplayValue("3-2 之前把钱花光了");
    fireEvent.click(screen.getByRole("button", { name: "jump" }));

    await waitFor(() =>
      expect(screen.getByLabelText("对局上下文")).toHaveTextContent("法师爆发"),
    );
    expect(screen.queryByDisplayValue("3-2 之前把钱花光了")).not.toBeInTheDocument();
  });

  it("opens with the game being reviewed in front of the player", async () => {
    const match = await seedGame();
    renderApp(`/matches/${match.id}/review`);

    const context = await screen.findByLabelText("对局上下文");
    // placement, date and composition — the three things "which game is this"
    expect(within(context).getByText("6")).toBeInTheDocument();
    expect(within(context).getByText(/2026-10-03/)).toBeInTheDocument();
    expect(within(context).getByText("狙神运营")).toBeInTheDocument();
    expect(screen.getByText("未复盘")).toBeInTheDocument();
  });

  it("shows a complete review as 已复盘", async () => {
    const match = await seedGame();
    await saveReview(match.id, {
      primaryMistake: "ECONOMY",
      biggestMistake: "3-2 之前把钱花光了",
      bestDecision: "保住了连败",
      nextGameFocus: "下次 3-2 前留 30 金币",
    });
    renderApp(`/matches/${match.id}/review`);
    await screen.findByLabelText("对局上下文");
    expect(screen.getByText("已复盘")).toBeInTheDocument();
  });

  it("shows a started but unfinished review as 复盘中", async () => {
    const match = await seedGame();
    await seedReview(match.id, { biggestMistake: "3-2 之前把钱花光了" });
    renderApp(`/matches/${match.id}/review`);
    await screen.findByLabelText("对局上下文");
    expect(screen.getByText("复盘中")).toBeInTheDocument();
  });

  it("replays the decisions of this game next to the form", async () => {
    const match = await seedGame();
    await addDecision(match.id, {
      round: "3-2",
      type: "LEVELING",
      decision: "直接上 6",
      result: "稳住了血量",
      hindsight: "correct",
    });
    await addDecision(match.id, {
      round: "4-1",
      type: "ROLLING",
      decision: "D 到底",
      hindsight: "wrong",
    });
    renderApp(`/matches/${match.id}/review`);

    await waitFor(() => expect(screen.getByText("决策回放")).toBeInTheDocument());
    const panel = screen.getByText("决策回放").closest("section")!;
    expect(within(panel).getByText("直接上 6")).toBeInTheDocument();
    expect(within(panel).getByText("D 到底")).toBeInTheDocument();
    expect(within(panel).getByText("2 条")).toBeInTheDocument();
  });
});
