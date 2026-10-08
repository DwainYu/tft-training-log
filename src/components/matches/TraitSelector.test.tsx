import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import { TraitSelector } from "./TraitSelector";
import { Field } from "../ui/Field";

const MAGE = "DA_18_Spellweaver"; // 法师 — tiers 2 / 4 / 6
const SLASHER = "DA_18_Slayer"; // 狂战士

function Host({ initial = [] as string[], legacy = [] as string[] }: { initial?: string[]; legacy?: string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  const [texts, setTexts] = useState<string[]>(legacy);
  return (
    <>
      <Field label="主要羁绊" htmlFor="traits">
        <TraitSelector
          id="traits"
          value={value}
          onChange={setValue}
          legacy={texts}
          onLegacyChange={setTexts}
        />
      </Field>
      <span data-testid="ids">{value.join(",")}</span>
      <span data-testid="legacy">{texts.join(",")}</span>
    </>
  );
}

const search = () => screen.getByLabelText("主要羁绊") as HTMLInputElement;

describe("TraitSelector", () => {
  it("opens onto the whole trait snapshot", async () => {
    render(<Host />);
    fireEvent.focus(search());

    expect(await screen.findByText(/全部羁绊/)).toBeInTheDocument();
    expect(screen.getByText(/共 36 个/)).toBeInTheDocument();
    expect((await screen.findAllByRole("button", { name: /法师/ })).length).toBeGreaterThan(0);
  });

  it("shows the published tiers next to the name", async () => {
    render(<Host />);
    fireEvent.focus(search());
    fireEvent.change(search(), { target: { value: "狂战士" } });

    const row = (await screen.findAllByRole("button", { name: /狂战士/ }))[0];
    expect(row).toHaveTextContent("2 / 4 / 6");
  });

  it("writes the trait id when a row is clicked", async () => {
    render(<Host />);
    fireEvent.focus(search());
    fireEvent.change(search(), { target: { value: "法师" } });
    fireEvent.click((await screen.findAllByRole("button", { name: /^法师/ }))[0]);

    expect(screen.getByTestId("ids")).toHaveTextContent(MAGE);
    expect(screen.getByText("当前选择")).toBeInTheDocument();
    // picked traits leave the list: no accidental duplicate
    expect(screen.queryByRole("button", { name: /^法师/ })).not.toBeInTheDocument();
  });

  it("keeps the selection as an unordered set — no slot numbers", async () => {
    render(<Host initial={[MAGE, SLASHER]} />);
    expect(screen.getByText("法师")).toBeInTheDocument();
    expect(screen.getByText("狂战士")).toBeInTheDocument();
    // 1 / 2 / 3 would invent an order the data model does not have
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("removes one trait and leaves the rest", () => {
    render(<Host initial={[MAGE, SLASHER]} />);
    fireEvent.click(screen.getByRole("button", { name: "移除法师" }));

    expect(screen.getByTestId("ids")).toHaveTextContent(SLASHER);
    expect(screen.queryByText("法师")).not.toBeInTheDocument();
  });

  it("keeps legacy shorthand visible and removable", () => {
    render(<Host legacy={["重装", "先锋"]} />);
    expect(screen.getByText("重装")).toBeInTheDocument();
    expect(screen.getAllByText("旧记录")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "移除旧记录文本先锋" }));
    expect(screen.getByTestId("legacy")).toHaveTextContent("重装");
  });

  it("closes on Escape and picks the highlighted row on Enter", async () => {
    render(<Host />);
    fireEvent.focus(search());
    await screen.findByText(/全部羁绊/);

    fireEvent.keyDown(search(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByText(/全部羁绊/)).not.toBeInTheDocument());

    fireEvent.focus(search());
    fireEvent.change(search(), { target: { value: "法师" } });
    await screen.findAllByRole("button", { name: /法师/ });
    fireEvent.keyDown(search(), { key: "Enter" });
    // Enter takes whatever row is highlighted — assert it landed, not which
    // trait the snapshot happens to rank first
    await waitFor(() => expect(screen.getByText("当前选择")).toBeInTheDocument());
    expect((screen.getByTestId("ids").textContent ?? "").length).toBeGreaterThan(0);
  });
});
