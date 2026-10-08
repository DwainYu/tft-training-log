import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../App";

describe("App shell", () => {
  it("renders the brand and every primary navigation entry", () => {
    render(<App />);
    // brand appears in both the desktop sidebar and the mobile top bar
    expect(screen.getAllByText("TFT Training Log").length).toBeGreaterThanOrEqual(2);
    for (const label of ["Dashboard", "对局", "统计", "训练目标", "周复盘", "数据"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("no longer advertises a fixed training window in the sidebar", () => {
    render(<App />);
    // the product is a general TFT training log: no 12:00–22:00 window anywhere
    expect(screen.queryByText(/训练时间段/)).not.toBeInTheDocument();
    expect(screen.queryByText(/训练时段/)).not.toBeInTheDocument();
    expect(screen.queryByText(/12:00/)).not.toBeInTheDocument();
    expect(screen.queryByText(/22:00/)).not.toBeInTheDocument();
    // the footer note that stays is about local storage, not hours
    expect(screen.getAllByText(/数据全部保存在本机浏览器/).length).toBeGreaterThan(0);
  });
});
