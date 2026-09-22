import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { QuickAddDialog } from "./QuickAddDialog";

interface QuickAddApi {
  open: boolean;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
}

const QuickAddContext = createContext<QuickAddApi>({
  open: false,
  openQuickAdd: () => undefined,
  closeQuickAdd: () => undefined,
});

export function useQuickAdd(): QuickAddApi {
  return useContext(QuickAddContext);
}

/** Quick Add is reachable from every screen — that is the whole point of it. */
export function QuickAddProvider({ children }: { children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false);
  const openQuickAdd = useCallback(() => setOpen(true), []);
  const closeQuickAdd = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openQuickAdd, closeQuickAdd }), [open, openQuickAdd, closeQuickAdd]);

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <QuickAddDialog open={open} onClose={closeQuickAdd} />
    </QuickAddContext.Provider>
  );
}
