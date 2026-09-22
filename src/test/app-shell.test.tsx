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
});
