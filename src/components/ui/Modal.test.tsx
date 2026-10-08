import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Modal } from "./Modal";
import { AugmentSelector } from "../matches/AugmentSelector";

/**
 * Escape routing for stacked dialogs. React portals do not move focus, so the
 * key can be pressed inside a dialog that is *underneath* another one; only
 * the topmost modal may act on it.
 */
function Stack({ middle = true }: { middle?: boolean }) {
  const [lowerOpen, setLowerOpen] = useState(true);
  const [midOpen, setMidOpen] = useState(true);
  const [topOpen, setTopOpen] = useState(true);
  return (
    <>
      <Modal open={lowerOpen} onClose={() => setLowerOpen(false)} title="底层">
        <button type="button">底层内容</button>
      </Modal>
      {middle && (
        <Modal open={midOpen} onClose={() => setMidOpen(false)} title="中间层">
          <button type="button">中间层内容</button>
        </Modal>
      )}
      <Modal open={topOpen} onClose={() => setTopOpen(false)} title="最上层">
        <button type="button">最上层内容</button>
      </Modal>
      <button type="button" onClick={() => setMidOpen(false)}>
        卸载中间层
      </button>
    </>
  );
}

const dialogs = () => screen.queryAllByRole("dialog");

/** Fire Escape where a real keypress would land: inside the top dialog. */
function escapeFromTop() {
  const closeButtons = screen.getAllByRole("button", { name: "关闭" });
  fireEvent.keyDown(closeButtons[closeButtons.length - 1], { key: "Escape" });
}

describe("Modal Escape routing", () => {
  it("still closes a lone dialog on Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="单独">
        <button type="button">内容</button>
      </Modal>,
    );

    fireEvent.keyDown(screen.getByText("内容"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes only the topmost of two stacked dialogs", () => {
    render(<Stack middle={false} />);
    expect(dialogs()).toHaveLength(2);

    escapeFromTop();

    // the upper dialog goes, the one underneath is untouched
    expect(dialogs()).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "底层" })).toBeInTheDocument();

    // and with the top gone, Escape now reaches the remaining one
    escapeFromTop();
    expect(dialogs()).toHaveLength(0);
  });

  it("closes the top dialog after a middle one unmounts out of order", () => {
    render(<Stack />);
    expect(dialogs()).toHaveLength(3);

    // a middle dialog leaves without being the top one
    fireEvent.click(screen.getByRole("button", { name: "卸载中间层" }));
    expect(dialogs()).toHaveLength(2);

    // the stack must not have lost 最上层 or promoted 底层
    escapeFromTop();
    expect(screen.queryByRole("dialog", { name: "最上层" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "底层" })).toBeInTheDocument();

    escapeFromTop();
    expect(dialogs()).toHaveLength(0);
  });

  it("keeps the topmost dialog dismissable while a selector panel is open below it", async () => {
    // the MatchFormPage delete-confirm shape: a confirm stacked over the page
    // dialog, focus still parked in a selector input of the lower one
    function Page() {
      const [lowerOpen, setLowerOpen] = useState(true);
      const [ids, setIds] = useState<string[]>([]);
      const [confirm, setConfirm] = useState(true);
      return (
        <>
          <Modal open={lowerOpen} onClose={() => setLowerOpen(false)} title="编辑对局">
            <label htmlFor="aug">强化符文</label>
            <AugmentSelector id="aug" value={ids} onChange={setIds} />
          </Modal>
          <Modal open={confirm} onClose={() => setConfirm(false)} title="删除这局对局？">
            <button type="button">确认删除</button>
          </Modal>
        </>
      );
    }
    render(<Page />);

    const search = screen.getByLabelText("强化符文");
    fireEvent.focus(search);
    await screen.findByText(/全部海克斯/);

    // first Escape belongs to the open panel: it closes, and nothing else
    fireEvent.keyDown(search, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText(/全部海克斯/)).not.toBeInTheDocument());
    expect(dialogs()).toHaveLength(2);

    // second Escape has no panel to consume it, so the topmost dialog must be
    // the one that closes — before the fix nothing moved at all here
    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "删除这局对局？" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "编辑对局" })).toBeInTheDocument();
  });

  it("lets Escape in a selector panel close only the panel", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="快速记录">
        <label htmlFor="aug2">强化符文</label>
        <AugmentSelector id="aug2" value={[]} onChange={() => undefined} />
      </Modal>,
    );

    const search = screen.getByLabelText("强化符文");
    fireEvent.focus(search);
    await screen.findByText(/全部海克斯/);

    fireEvent.keyDown(search, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText(/全部海克斯/)).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "快速记录" })).toBeInTheDocument();
  });
});
