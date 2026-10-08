import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { ReviewForm } from "./ReviewForm";
import type { Review } from "../../domain/types";

/**
 * A review is written after a game, i.e. tired. These tests pin the two things
 * that make that survivable: one click records the structured fact, and an old
 * record still opens exactly as it was.
 */
const render = (props: Partial<Parameters<typeof ReviewForm>[0]> = {}) => {
  const onSave = vi.fn();
  renderWithProviders(<ReviewForm onSave={onSave} {...props} />);
  return { onSave };
};

const save = () => fireEvent.click(screen.getByRole("button", { name: "保存复盘" }));

/** A record written before `openingPlan` existed. */
const legacyReview: Review = {
  id: "r1",
  matchId: "m1",
  opening: "开局拿了弓",
  midGame: "3-2 上 6",
  lateGame: "决赛圈主 C 被切",
  primaryMistake: "POSITIONING",
  biggestMistake: "主 C 站脸",
  bestDecision: "保住了连胜",
  nextGameFocus: "主 C 放角落",
  createdAt: "2026-02-05T13:20:00.000Z",
  updatedAt: "2026-02-05T13:20:00.000Z",
};

describe("ReviewForm · legacy records", () => {
  it("opens an old free-text record without losing a single line", () => {
    render({ initial: legacyReview });

    expect(screen.getByDisplayValue("开局拿了弓")).toBeInTheDocument();
    expect(screen.getByDisplayValue("决赛圈主 C 被切")).toBeInTheDocument();
    expect(screen.getByDisplayValue("主 C 放角落")).toBeInTheDocument();
    // no structured route was ever recorded, so no chip is pressed
    for (const label of ["连胜", "连败", "正常运营", "走经济", "硬玩"]) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("folds the free text away when nothing has been written yet", () => {
    render();
    expect(screen.getByText("过程补充 · 开局 / 中期 / 后期")).toBeInTheDocument();
    expect(screen.getByText("自由文本，不进入任何统计")).toBeInTheDocument();
  });
});

describe("ReviewForm · structured opening plan", () => {
  it("records the route with one click and sends it on save", () => {
    const { onSave } = render();

    fireEvent.click(screen.getByRole("button", { name: "走经济" }));
    expect(screen.getByRole("button", { name: "走经济" })).toHaveAttribute("aria-pressed", "true");

    save();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({}), "ECONOMY");
  });

  it("sends null when the player deselects it again", () => {
    const { onSave } = render({ initialOpeningPlan: "FORCE" });
    expect(screen.getByRole("button", { name: "硬玩" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "硬玩" }));
    save();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({}), null);
  });

  it("pre-fills from the match so saving twice cannot lose it", () => {
    const { onSave } = render({ initialOpeningPlan: "WIN_STREAK" });
    save();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({}), "WIN_STREAK");
  });

  it("offers exactly the five routes a statistic can group by", () => {
    render();
    const group = screen.getByRole("group", { name: "开局路线" });
    expect(within(group).getAllByRole("button")).toHaveLength(5);
  });
});

describe("ReviewForm · completeness", () => {
  it("starts at 0%", () => {
    render();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("复盘完整度 0%")).toBeInTheDocument();
  });

  it("never calls one filled field complete", () => {
    render();
    fireEvent.click(screen.getByRole("button", { name: "连败" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByText(/缺：/)).toHaveTextContent("主要问题");
  });

  it("reaches 60% on the conclusion alone — the reviewed gate stays readable", () => {
    render({ initial: legacyReview });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText("已满足必填")).toBeInTheDocument();
  });
});
