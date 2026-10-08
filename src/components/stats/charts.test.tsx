import { cloneElement, type ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * `ResponsiveContainer` measures the DOM; jsdom has no layout, so it would
 * render 0 × 0 and the chart would never draw a single dot or bar. Swapping it
 * for a fixed-size container makes the real chart interactive and testable.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children as ReactElement<{ width?: number; height?: number }>, {
        width: 600,
        height: 300,
      }),
  };
});

import { MistakeBarChart } from "./MistakeBarChart";
import { PlacementTrendChart, type TrendPoint } from "./PlacementTrendChart";

const point = (over: Partial<TrendPoint> & { id: string }): TrendPoint => ({
  index: 1,
  label: "02-01",
  playedAt: "2026-02-01T13:00",
  placement: 4,
  top4: 1,
  ...over,
});

const trend = (n: number): TrendPoint[] =>
  Array.from({ length: n }, (_, i) =>
    point({
      id: `m${i + 1}`,
      index: i + 1,
      playedAt: `2026-02-0${i + 1}T13:00`,
      label: `02-0${i + 1}`,
      placement: (i % 8) + 1,
      top4: i % 8 < 4 ? 1 : 0,
    }),
  );

describe("PlacementTrendChart", () => {
  it("draws one drill-down target per game", () => {
    const onSelectMatch = vi.fn();
    const { container } = render(
      <PlacementTrendChart data={trend(6)} avg={4.2} onSelectMatch={onSelectMatch} />,
    );

    const dots = screen.getAllByRole("button");
    expect(dots).toHaveLength(6);

    fireEvent.click(dots[2]);
    expect(onSelectMatch).toHaveBeenCalledWith("m3");

    // keyboard gets the same drill-down
    fireEvent.keyDown(dots[0], { key: "Enter" });
    expect(onSelectMatch).toHaveBeenCalledWith("m1");

    // every point names the game it belongs to
    expect(container.querySelectorAll("title").length).toBeGreaterThan(0);
  });

  it("is not clickable without a drill-down target", () => {
    render(<PlacementTrendChart data={trend(6)} avg={4.2} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("says how many more games it needs instead of drawing noise", () => {
    render(<PlacementTrendChart data={trend(2)} avg={4.2} />);
    expect(screen.getByText(/已记录 2 局，记到 5 局后/)).toBeInTheDocument();
  });

  it("never claims 'no data' while it is still loading", () => {
    render(<PlacementTrendChart data={[]} avg={null} loading />);
    expect(screen.getByText("计算中…")).toBeInTheDocument();
    expect(screen.queryByText(/暂无数据/)).not.toBeInTheDocument();
  });

  it("explains what will appear once a game is logged", () => {
    render(<PlacementTrendChart data={[]} avg={null} />);
    expect(screen.getByText(/记录第一局后/)).toBeInTheDocument();
  });
});

describe("MistakeBarChart", () => {
  const data = (counts: [string, number][]) =>
    counts.map(([key, count]) => ({ key, label: key, count }));

  it("opens the matches behind a bar", () => {
    const onSelect = vi.fn();
    const { container } = render(<MistakeBarChart data={data([["ECONOMY", 3], ["ROLLING", 2]])} onSelect={onSelect} />);

    const bars = container.querySelectorAll(".recharts-bar-rectangle path");
    expect(bars.length).toBe(2);
    fireEvent.click(bars[0]);
    expect(onSelect).toHaveBeenCalledWith("ECONOMY");
  });

  it("waits for five marked games before drawing a distribution", () => {
    render(<MistakeBarChart data={data([["ECONOMY", 2], ["ROLLING", 2]])} />);
    expect(screen.getByText(/已记录 4 局，记到 5 局后/)).toBeInTheDocument();
  });

  it("says what produces the data when there is none", () => {
    render(<MistakeBarChart data={[]} />);
    expect(screen.getByText(/记录第一局后/)).toBeInTheDocument();
    expect(screen.getByText(/Primary Mistake/)).toBeInTheDocument();
  });
});
