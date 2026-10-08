import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { AugmentSelector, MAX_AUGMENTS } from "./AugmentSelector";
import { Field } from "../ui/Field";

const BIG_GRAB_BAG = "DA_18_BigGrabBag";

function Host({
  initial = [] as string[],
  initialLegacy = [] as string[],
}: {
  initial?: string[];
  initialLegacy?: string[];
}) {
  const [value, setValue] = useState<string[]>(initial);
  const [legacy, setLegacy] = useState<string[]>(initialLegacy);
  return (
    <>
      <Field label="强化符文" htmlFor="aug">
        <AugmentSelector
          id="aug"
          value={value}
          onChange={setValue}
          legacy={legacy}
          onLegacyChange={setLegacy}
        />
      </Field>
      <span data-testid="value">{value.join(",")}</span>
      <span data-testid="legacy">{legacy.join(",")}</span>
    </>
  );
}

const search = () => screen.getByLabelText("强化符文") as HTMLInputElement;
const firstHit = async (name: RegExp) => (await screen.findAllByRole("button", { name }))[0];

beforeEach(() => undefined);

describe("AugmentSelector", () => {
  it("offers the whole snapshot as soon as it is opened — no empty dead end", async () => {
    render(<Host />);
    fireEvent.focus(search());

    expect(await screen.findByText(/全部海克斯/)).toBeInTheDocument();
    expect((await screen.findAllByRole("button", { name: /大百宝袋/ })).length).toBeGreaterThan(0);
    expect(screen.getByText(/共 592 个/)).toBeInTheDocument();
  });

  it("filters by name while typing and shows a clear empty state", async () => {
    render(<Host />);
    fireEvent.focus(search());

    fireEvent.change(search(), { target: { value: "百宝袋" } });
    expect((await screen.findAllByRole("button", { name: /大百宝袋/ })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /绽灵花的约定/ })).not.toBeInTheDocument();

    fireEvent.change(search(), { target: { value: "一定没有的海克斯" } });
    expect(await screen.findByText("没有找到「一定没有的海克斯」")).toBeInTheDocument();
  });

  it("writes the canonical id when a row is clicked", async () => {
    render(<Host />);
    fireEvent.focus(search());
    fireEvent.click(await firstHit(/大百宝袋/));

    expect(screen.getByTestId("value")).toHaveTextContent(BIG_GRAB_BAG);
    // the picked augment leaves the list (only the chip's × still matches):
    // no accidental double pick
    expect(screen.getAllByRole("button", { name: /大百宝袋/ })).toHaveLength(1);
    expect(screen.getByText("已选择（1/3）")).toBeInTheDocument();
  });

  it("keeps the pick order — 第一 → 第二 → 第三", async () => {
    render(<Host />);
    fireEvent.focus(search());
    fireEvent.click(await firstHit(/大百宝袋/));

    fireEvent.change(search(), { target: { value: "绽灵花" } });
    fireEvent.click(await firstHit(/绽灵花的约定/));

    expect(screen.getByTestId("value")).toHaveTextContent(
      `${BIG_GRAB_BAG},DA_18_BlossomTraitAugment`,
    );
    expect(screen.getByText("已选择（2/3）")).toBeInTheDocument();
  });

  it("removes a single pick without clearing the rest", async () => {
    render(<Host initial={[BIG_GRAB_BAG, "DA_18_BlossomTraitAugment"]} />);
    fireEvent.click(screen.getByRole("button", { name: "移除大百宝袋" }));

    expect(screen.getByTestId("value")).toHaveTextContent("DA_18_BlossomTraitAugment");
    expect(screen.queryByText(/大百宝袋/)).not.toBeInTheDocument();
  });

  it("stops at three augments and says why", async () => {
    render(<Host initial={[BIG_GRAB_BAG, "DA_18_BlossomTraitAugment", "DA_18_Elderwood"]} />);
    fireEvent.focus(search());

    expect(screen.getByText(`已选择（${MAX_AUGMENTS}/3）`)).toBeInTheDocument();
    expect(await screen.findByText(/已选满 3 个海克斯/)).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<Host />);
    fireEvent.focus(search());
    await screen.findByText(/全部海克斯/);

    fireEvent.keyDown(search(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByText(/全部海克斯/)).not.toBeInTheDocument());
  });

  it("accepts the highlighted first row with Enter", async () => {
    render(<Host />);
    fireEvent.focus(search());
    await screen.findByText(/全部海克斯/);

    fireEvent.keyDown(search(), { key: "Enter" });
    // the first row of the unfiltered list — whatever it is, it is now picked
    await waitFor(() => expect(screen.getByText("已选择（1/3）")).toBeInTheDocument());
    expect(search()).toHaveValue("");
  });

  it("shows legacy text as a removable 旧记录 chip", () => {
    render(<Host initialLegacy={["不存在的海克斯"]} />);

    // scoped to the chip: the value/legacy mirrors above render the same text
    expect(
      screen.getByRole("button", { name: /不存在的海克斯/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("旧记录")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "移除旧记录文本不存在的海克斯" }));
    expect(screen.getByTestId("legacy")).toHaveTextContent("");
    expect(screen.queryByText("不存在的海克斯")).not.toBeInTheDocument();
  });

  it("does not count legacy text against the three-augment cap", async () => {
    // three unresolvable names from an old record
    render(<Host initialLegacy={["旧符文甲", "旧符文乙", "旧符文丙"]} />);

    // the cap is measured on canonical ids only, so picking is still possible
    fireEvent.focus(search());
    fireEvent.click(await firstHit(/大百宝袋/));
    expect(screen.getByTestId("value")).toHaveTextContent(BIG_GRAB_BAG);

    // and the legacy text is still there, untouched, next to the real pick
    expect(screen.getByTestId("legacy")).toHaveTextContent("旧符文甲,旧符文乙,旧符文丙");
  });

  it("still blocks a fourth canonical pick when three are already chosen", async () => {
    render(<Host initial={[BIG_GRAB_BAG, "DA_18_BlossomTraitAugment", "DA_18_Elderwood"]} />);
    fireEvent.focus(search());

    // the panel is gated by `full`, which legacy text must not be able to fake
    expect(screen.queryByText(/全部海克斯/)).not.toBeInTheDocument();
    expect(screen.getByText(/已选满 3 个海克斯/)).toBeInTheDocument();
  });
});
