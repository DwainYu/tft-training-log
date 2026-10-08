import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useListPickerState } from "./use-list-picker-state";

/**
 * The hook under test, wired to a plain input + panel so the assertions are
 * about the *interaction* (open/query/Esc/Enter/outside click) and not about
 * any one selector's business rules. `capRef` lets a test flip the caller's
 * `canAdd` decision between picks, which is how Augment's three-slot cap and
 * the uncapped item/trait lists share one code path.
 */
function Host({
  rows,
  canAdd = true,
  onAdd,
}: {
  rows: { id: string; label: string }[];
  canAdd?: boolean;
  onAdd?: (id: string) => void;
}) {
  const [committed, setCommitted] = useState<string[]>([]);

  const { open, query, boxRef, changeQuery, openPanel, closePanel, add, onKeyDown } = useListPickerState({
    canAdd,
    getFirstResultId: () => rows[0]?.id,
    onAdd: (id) => {
      if (committed.includes(id)) return false;
      setCommitted((c) => [...c, id]);
      onAdd?.(id);
      return true;
    },
  });

  return (
    <div>
      <div ref={boxRef} data-testid="box">
        <input
          aria-label="搜索"
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          onFocus={openPanel}
          onKeyDown={onKeyDown}
        />
        {open && (
          <div data-testid="panel">
            {rows.map((r) => (
              <button key={r.id} type="button" onClick={() => add(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={closePanel}>
          关闭面板
        </button>
      </div>
      <span data-testid="committed">{committed.join(",")}</span>
      <span data-testid="state">{`${open ? "open" : "shut"}|${query}`}</span>
    </div>
  );
}

const ROWS = [
  { id: "a", label: "第一行" },
  { id: "b", label: "第二行" },
];
const search = () => screen.getByLabelText("搜索") as HTMLInputElement;
const panel = () => screen.queryByTestId("panel");
const committed = () => screen.getByTestId("committed").textContent;
const state = () => screen.getByTestId("state").textContent;

describe("useListPickerState", () => {
  it("starts closed and opens on focus", () => {
    render(<Host rows={ROWS} />);
    expect(panel()).not.toBeInTheDocument();

    fireEvent.focus(search());
    expect(panel()).toBeInTheDocument();
    expect(state()).toBe("open|");
  });

  it("opens and records the query as you type", () => {
    render(<Host rows={ROWS} />);
    fireEvent.change(search(), { target: { value: "法师" } });

    expect(panel()).toBeInTheDocument();
    expect(state()).toBe("open|法师");
  });

  it("closes without touching the value or the query", () => {
    render(<Host rows={ROWS} />);
    fireEvent.change(search(), { target: { value: "法师" } });
    fireEvent.click(screen.getByRole("button", { name: "关闭面板" }));

    expect(panel()).not.toBeInTheDocument();
    // closing is not a reset: the text the player typed is still there to
    // re-open with, and nothing was committed
    expect(state()).toBe("shut|法师");
    expect(committed()).toBe("");
  });

  it("clears the query on add but leaves the panel open", () => {
    render(<Host rows={ROWS} />);
    fireEvent.change(search(), { target: { value: "法师" } });
    fireEvent.click(screen.getByRole("button", { name: "第一行" }));

    expect(committed()).toBe("a");
    // panel stays open so several rows can be picked in a row
    expect(panel()).toBeInTheDocument();
    expect(state()).toBe("open|");
  });

  it("keeps the query when the caller's cap refuses the add", () => {
    // Augment at three augments: the row is there, the pick is not allowed
    render(<Host rows={ROWS} canAdd={false} />);
    fireEvent.change(search(), { target: { value: "法师" } });
    fireEvent.click(screen.getByRole("button", { name: "第一行" }));

    expect(committed()).toBe("");
    // a refused pick is not a pick, so the search text survives
    expect(state()).toBe("open|法师");
  });

  it("closes on Escape and consumes the key", () => {
    const onDocKey = vi.fn();
    document.addEventListener("keydown", onDocKey);
    try {
      render(<Host rows={ROWS} />);
      fireEvent.focus(search());
      expect(panel()).toBeInTheDocument();

      fireEvent.keyDown(search(), { key: "Escape" });

      expect(panel()).not.toBeInTheDocument();
      // the load-bearing assertion: the key never reached `document`, so an
      // enclosing Modal's listener cannot see it and close the parent dialog
      expect(onDocKey).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", onDocKey);
    }
  });

  it("leaves Escape alone when no panel is open", () => {
    const onDocKey = vi.fn();
    document.addEventListener("keydown", onDocKey);
    try {
      render(<Host rows={ROWS} />);
      // no focus, so no panel: Escape belongs to whatever is above us
      fireEvent.keyDown(search(), { key: "Escape" });

      expect(onDocKey).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener("keydown", onDocKey);
    }
  });

  it("picks the first row on Enter and resets the query", () => {
    render(<Host rows={ROWS} />);
    fireEvent.change(search(), { target: { value: "法师" } });
    fireEvent.keyDown(search(), { key: "Enter" });

    expect(committed()).toBe("a");
    expect(state()).toBe("open|");
  });

  it("does nothing on Enter when the list is empty", () => {
    render(<Host rows={[]} />);
    fireEvent.focus(search());
    fireEvent.keyDown(search(), { key: "Enter" });

    expect(committed()).toBe("");
  });

  it("does nothing on Enter when the caller's cap refuses the pick", () => {
    render(<Host rows={ROWS} canAdd={false} />);
    fireEvent.focus(search());
    fireEvent.keyDown(search(), { key: "Enter" });

    expect(committed()).toBe("");
  });

  it("closes when the click lands outside the box, and only then", () => {
    render(<Host rows={ROWS} />);
    fireEvent.focus(search());
    expect(panel()).toBeInTheDocument();

    // inside the box: a click on a row is a pick, not a dismissal
    fireEvent.click(screen.getByRole("button", { name: "第一行" }));
    expect(panel()).toBeInTheDocument();
    expect(committed()).toBe("a");

    // outside: the document-level mousedown sees it and the panel goes
    fireEvent.mouseDown(document.body);
    expect(panel()).not.toBeInTheDocument();
  });
});
