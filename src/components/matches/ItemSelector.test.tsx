import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import { ItemSelector } from "./ItemSelector";
import { Field } from "../ui/Field";

const STAFF = "TFT_Item_ArchangelsStaff"; // 大天使之杖 — a unique name in the snapshot

function Host({ initial = [] as string[], legacy = [] as string[] }: { initial?: string[]; legacy?: string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  const [texts, setTexts] = useState<string[]>(legacy);
  return (
    <>
      <Field label="核心装备" htmlFor="items">
        <ItemSelector
          id="items"
          value={value}
          onChange={setValue}
          legacy={texts}
          onLegacyChange={setLegacy(setTexts)}
        />
      </Field>
      <span data-testid="ids">{value.join(",")}</span>
      <span data-testid="legacy">{texts.join(",")}</span>
    </>
  );
}

const setLegacy = (fn: (v: string[]) => void) => (v: string[]) => fn(v);

const search = () => screen.getByLabelText("核心装备") as HTMLInputElement;

describe("ItemSelector", () => {
  it("opens straight onto the snapshot — no empty dead end", async () => {
    render(<Host />);
    fireEvent.focus(search());

    expect(await screen.findByText(/全部装备/)).toBeInTheDocument();
    expect((await screen.findAllByRole("button", { name: /大天使之杖/ })).length).toBeGreaterThan(0);
    expect(screen.getByText(/共 186 件/)).toBeInTheDocument();
  });

  it("filters while typing and states clearly when nothing matches", async () => {
    render(<Host />);
    fireEvent.focus(search());

    fireEvent.change(search(), { target: { value: "大天使之杖" } });
    expect((await screen.findAllByRole("button", { name: /大天使之杖/ })).length).toBeGreaterThan(0);

    fireEvent.change(search(), { target: { value: "一定没有的装备" } });
    expect(await screen.findByText("没有找到「一定没有的装备」")).toBeInTheDocument();
  });

  it("writes the item id when a row is clicked", async () => {
    render(<Host />);
    fireEvent.focus(search());
    fireEvent.change(search(), { target: { value: "大天使之杖" } });
    fireEvent.click((await screen.findAllByRole("button", { name: /大天使之杖/ }))[0]);

    expect(screen.getByTestId("ids")).toHaveTextContent(STAFF);
    expect(screen.getByText("当前选择")).toBeInTheDocument();
    // picked items leave the list: no accidental duplicate
    expect(screen.queryByRole("button", { name: /^大天使之杖/ })).not.toBeInTheDocument();
  });

  it("takes several items and drops only the one that is removed", async () => {
    render(<Host initial={[STAFF, "TFT_Item_WarmogsArmor"]} />);
    fireEvent.click(screen.getByRole("button", { name: "移除大天使之杖" }));

    expect(screen.getByTestId("ids")).toHaveTextContent("TFT_Item_WarmogsArmor");
    expect(screen.queryByText("大天使之杖")).not.toBeInTheDocument();
    expect(screen.getByText("狂徒铠甲")).toBeInTheDocument();
  });

  it("keeps legacy shorthand text visible and removable", async () => {
    render(<Host legacy={["无尽", "蓝buff"]} />);
    expect(screen.getByText("无尽")).toBeInTheDocument();
    expect(screen.getAllByText("旧记录")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "移除旧记录文本蓝buff" }));
    expect(screen.getByTestId("legacy")).toHaveTextContent("无尽");
    expect(screen.queryByText("蓝buff")).not.toBeInTheDocument();
  });

  it("closes on Escape and picks the highlighted row on Enter", async () => {
    render(<Host />);
    fireEvent.focus(search());
    await screen.findByText(/全部装备/);

    fireEvent.keyDown(search(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByText(/全部装备/)).not.toBeInTheDocument());

    fireEvent.focus(search());
    fireEvent.change(search(), { target: { value: "大天使之杖" } });
    await screen.findAllByRole("button", { name: /大天使之杖/ });
    fireEvent.keyDown(search(), { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("ids")).toHaveTextContent(STAFF));
  });
});
