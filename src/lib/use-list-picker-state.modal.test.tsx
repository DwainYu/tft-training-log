import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useListPickerState } from "./use-list-picker-state";
import { Modal } from "../components/ui/Modal";

/**
 * The invariant, end to end: a picker nested in a dialog owns the first
 * Escape, and the dialog owns the second.
 *
 * This is the one place the guarantee is asserted against a *real* Modal
 * rather than a test double, because the guarantee is a claim about two
 * independent mechanisms cooperating:
 *  - the hook stops the Escape from propagating past React's root, so the
 *    dialog's `document` listener never sees the first one at all;
 *  - `Modal`'s `modalStack` decides which of several dialogs may act on one.
 * Neither test alone proves it, and breaking either one silently costs the
 * player a half-filled record.
 */

const ROWS = [
  { id: "a", label: "第一行" },
  { id: "b", label: "第二行" },
];

function Picker({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const { open, query, boxRef, changeQuery, openPanel, add, onKeyDown } = useListPickerState({
    canAdd: true,
    getFirstResultId: () => ROWS[0]?.id,
    onAdd: (id) => {
      if (ids.includes(id)) return false;
      onChange([...ids, id]);
      return true;
    },
  });
  return (
    <div ref={boxRef}>
      <input aria-label="搜索" value={query} onChange={(e) => changeQuery(e.target.value)} onFocus={openPanel} onKeyDown={onKeyDown} />
      {open && (
        <div data-testid="panel">
          {ROWS.map((r) => (
            <button key={r.id} type="button" onClick={() => add(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A dialog with a draft the player has already typed, plus a real save. */
function DraftDialog({ onSave }: { onSave: (draft: string) => void }) {
  const [open, setOpen] = useState(true);
  const [ids, setIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="快速记录一局">
      <label htmlFor="note">下一局训练重点</label>
      <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
      <Picker ids={ids} onChange={setIds} />
      <button type="button" onClick={() => onSave(note)}>
        保存
      </button>
    </Modal>
  );
}

const search = () => screen.getByLabelText("搜索") as HTMLInputElement;
const panel = () => screen.queryByTestId("panel");

describe("picker Escape inside a dialog", () => {
  it("closes the picker, leaves the dialog open, and keeps the draft savable", async () => {
    const onSave = vi.fn();
    render(<DraftDialog onSave={onSave} />);

    // the player has typed a note, then opened a picker on top of it
    fireEvent.change(screen.getByLabelText("下一局训练重点"), { target: { value: "4-1 前不 D" } });
    fireEvent.focus(search());
    await waitFor(() => expect(panel()).toBeInTheDocument());

    // one Escape, and it belongs to the picker
    fireEvent.keyDown(search(), { key: "Escape" });

    await waitFor(() => expect(panel()).not.toBeInTheDocument());
    // the dialog did NOT take the same key: it is still on screen...
    expect(screen.getByRole("dialog", { name: "快速记录一局" })).toBeInTheDocument();
    // ...with the draft the player had already typed, still there and usable
    expect(screen.getByLabelText("下一局训练重点")).toHaveValue("4-1 前不 D");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith("4-1 前不 D");
  });

  it("gives the second Escape to the dialog once no panel is open", () => {
    // no focus on the picker, so there is no panel to consume the key —
    // this is the "Esc still closes QuickAdd" behaviour, one layer up
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="快速记录一局">
        <label htmlFor="note2">下一局训练重点</label>
        <input id="note2" />
      </Modal>,
    );

    fireEvent.keyDown(screen.getByLabelText("下一局训练重点"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes only the topmost of two stacked dialogs, picker or not", () => {
    function Stacked() {
      const [lower, setLower] = useState(true);
      const [top, setTop] = useState(true);
      return (
        <>
          <Modal open={lower} onClose={() => setLower(false)} title="编辑对局">
            <button type="button">底层内容</button>
          </Modal>
          <Modal open={top} onClose={() => setTop(false)} title="删除这局对局？">
            <button type="button">确认删除</button>
          </Modal>
        </>
      );
    }
    render(<Stacked />);
    expect(screen.getAllByRole("dialog")).toHaveLength(2);

    const closeButtons = screen.getAllByRole("button", { name: "关闭" });
    fireEvent.keyDown(closeButtons[closeButtons.length - 1], { key: "Escape" });

    // only the top one goes; the one underneath is untouched, and the stack
    // has not been corrupted — a second Escape still finds the survivor
    expect(screen.queryByRole("dialog", { name: "删除这局对局？" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "编辑对局" })).toBeInTheDocument();

    fireEvent.keyDown(screen.getAllByRole("button", { name: "关闭" })[0], { key: "Escape" });
    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
  });
});
