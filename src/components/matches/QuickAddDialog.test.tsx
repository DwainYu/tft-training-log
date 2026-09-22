import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickAddDialog } from "./QuickAddDialog";
import { allMatches, getMatchBundle } from "../../services/match-service";
import { resetDatabase } from "../../test/db-helper";
import { ToastProvider } from "../ui/Toast";

// The dialog navigates on "保存并详细复盘"; a stub keeps this test about data.
const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

function renderDialog() {
  return render(
    <ToastProvider>
      <QuickAddDialog open onClose={() => undefined} />
    </ToastProvider>,
  );
}

beforeEach(async () => {
  await resetDatabase();
  navigate.mockClear();
});

describe("Quick Add", () => {
  it("requires a placement before saving", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /^保存$/ }));
    expect(await screen.findByText("请先选择名次")).toBeInTheDocument();
    expect(await allMatches()).toHaveLength(0);
  });

  it("saves a complete match in one pass", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: "第 3 名" }));
    fireEvent.change(screen.getByLabelText("阵容"), { target: { value: "Arcader" } });
    fireEvent.change(screen.getByLabelText("强化符文"), { target: { value: "升级 / 经济" } });
    fireEvent.change(screen.getByLabelText("核心装备"), { target: { value: "主C：无尽" } });
    fireEvent.click(screen.getByRole("button", { name: "D牌" }));
    fireEvent.change(screen.getByLabelText("下一局训练重点"), {
      target: { value: "4-1 前不 D 超过 30 金" },
    });
    fireEvent.change(screen.getByLabelText("对局时间"), {
      target: { value: "2026-02-05T13:20" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^保存$/ }));

    await waitFor(async () => expect(await allMatches()).toHaveLength(1));
    const [match] = await allMatches();
    expect(match.placement).toBe(3);
    expect(match.composition).toBe("Arcader");
    expect(match.augments).toEqual(["升级", "经济"]);
    expect(match.coreItems).toEqual(["主C：无尽"]);
    expect(match.primaryMistake).toBe("ROLLING");
    expect(match.playedAt).toBe("2026-02-05T13:20");
    expect(match.reviewed).toBe(false);

    // the focus lands on the seeded review, not on the match record
    const bundle = await getMatchBundle(match.id);
    expect(bundle?.review?.nextGameFocus).toBe("4-1 前不 D 超过 30 金");
  });

  it("sets the placement with the 1–8 keyboard shortcuts", async () => {
    renderDialog();
    fireEvent.keyDown(window, { key: "7" });
    fireEvent.click(screen.getByRole("button", { name: /^保存$/ }));
    await waitFor(async () => expect(await allMatches()).toHaveLength(1));
    const [match] = await allMatches();
    expect(match.placement).toBe(7);
  });

  it("warns when the time is outside the 12:00–22:00 window but still saves", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "第 1 名" }));
    fireEvent.change(screen.getByLabelText("对局时间"), {
      target: { value: "2026-02-05T23:40" },
    });
    expect(screen.getByText(/当前时间不在云顶之巅训练时段/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^保存$/ }));
    await waitFor(async () => expect(await allMatches()).toHaveLength(1));
  });

  it("stays open for the next game when saving with 保存并再记一局", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "第 4 名" }));
    fireEvent.change(screen.getByLabelText("阵容"), { target: { value: "Rebel" } });
    fireEvent.click(screen.getByRole("button", { name: "保存并再记一局" }));

    await waitFor(async () => expect(await allMatches()).toHaveLength(1));
    expect(screen.getByLabelText("阵容")).toHaveValue("Rebel");
    expect(screen.getByRole("radio", { name: "第 4 名" })).toHaveAttribute("aria-checked", "false");
  });
});
