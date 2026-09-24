import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { QuickAddProvider } from "../components/matches/QuickAddProvider";
import { ToastProvider } from "../components/ui/Toast";
import { SessionProvider } from "../services/session-context";

/** Pages assume router + toast + quick-add + session context; tests need the same. */
export function renderWithProviders(ui: ReactElement, route = "/"): RenderResult {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <SessionProvider>
          <QuickAddProvider>{ui}</QuickAddProvider>
        </SessionProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
