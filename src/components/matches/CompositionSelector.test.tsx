import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { CompositionSelector, PRESET_NOTE } from "./CompositionSelector";
import { Field } from "../ui/Field";
import { addMatch } from "../../services/match-service";
import { compositionUsageRepository } from "../../data/repository/composition-usage-repository";
import { resetDatabase } from "../../test/db-helper";

/** The selector is controlled, so tests need a host that owns the value. */
function Host({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Field label="阵容" htmlFor="comp">
        <CompositionSelector id="comp" value={value} onChange={setValue} />
      </Field>
      <span data-testid="value">{value}</span>
    </>
  );
}

const openPanel = () => fireEvent.focus(screen.getByLabelText("阵容"));
const input = () => screen.getByLabelText("阵容") as HTMLInputElement;

beforeEach(resetDatabase);

describe("CompositionSelector", () => {
  it("shows presets — and honest empty states — with no history at all", async () => {
    render(<Host />);
    openPanel();

    expect(screen.getByText("最近使用")).toBeInTheDocument();
    expect(screen.getByText("暂无最近使用")).toBeInTheDocument();
    expect(screen.getByText("常用阵容")).toBeInTheDocument();
    expect(screen.getByText("暂无常用阵容")).toBeInTheDocument();
    await screen.findByText("预置标签");
    // a brand-new player still has something to click
    expect(await screen.findByRole("button", { name: "法师" })).toBeInTheDocument();
  });

  it("labels the preset list as starting tags, not as a composition catalogue", async () => {
    render(<Host />);
    openPanel();

    // the source is Set 18 trait names — the UI must not claim they are 阵容
    expect(await screen.findByText("预置标签")).toBeInTheDocument();
    expect(screen.getByText(PRESET_NOTE)).toBeInTheDocument();
    expect(screen.queryByText("全部阵容")).not.toBeInTheDocument();
  });

  it("lists 最近使用 with the usage count once history exists", async () => {
    await addMatch({ playedAt: "2026-02-01T13:00", placement: "3", composition: "福牛" });
    await addMatch({ playedAt: "2026-02-02T13:00", placement: "1", composition: "福牛" });

    render(<Host />);
    openPanel();
    expect(await screen.findByText("最近使用")).toBeInTheDocument();
    const chip = await screen.findByRole("button", { name: /^福牛/ });
    expect(chip).toHaveTextContent("2 次");
  });

  it("filters every section while typing", async () => {
    render(<Host />);
    openPanel();
    await screen.findByRole("button", { name: "法师" });

    fireEvent.change(input(), { target: { value: "法" } });
    expect(await screen.findByText("搜索结果")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "法师" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重装战士" })).not.toBeInTheDocument();
    expect(screen.queryByText("最近使用")).not.toBeInTheDocument();
  });

  it("fills the form when a chip is clicked, without recording usage", async () => {
    render(<Host />);
    openPanel();
    fireEvent.click(await screen.findByRole("button", { name: "法师" }));

    expect(screen.getByTestId("value")).toHaveTextContent("法师");
    expect(input()).toHaveValue("法师");
    // picking is a form edit — usage is still counted at match creation only
    expect(await compositionUsageRepository.get("法师")).toBeUndefined();
  });

  it("keeps a custom composition that matches nothing", async () => {
    render(<Host />);
    openPanel();
    fireEvent.change(input(), { target: { value: "自定义测试阵容" } });

    expect(await screen.findByText("没有找到「自定义测试阵容」")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "使用「自定义测试阵容」" }));
    expect(screen.getByTestId("value")).toHaveTextContent("自定义测试阵容");
  });

  it("normalizes what the player typed (Enter keeps the normalized key)", async () => {
    render(<Host />);
    openPanel();
    fireEvent.change(input(), { target: { value: "  福牛  战神  " } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(screen.getByTestId("value")).toHaveTextContent("福牛 战神");
  });

  it("can be cleared so the whole preset list is browsable again", async () => {
    render(<Host initial="法师" />);
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "清空阵容" }));
    expect(input()).toHaveValue("");
    expect(await screen.findByText("最近使用")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<Host />);
    openPanel();
    await screen.findByText("最近使用");
    fireEvent.keyDown(input(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("最近使用")).not.toBeInTheDocument());
  });
});
