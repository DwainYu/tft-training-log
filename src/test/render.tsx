import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { QuickAddProvider } from "../components/matches/QuickAddProvider";
import { ToastProvider } from "../components/ui/Toast";

/** Pages assume router + toast + quick-add context; tests need the same. */
export function renderWithProviders(ui: ReactElement, route = "/"): RenderResult {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <QuickAddProvider>{ui}</QuickAddProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
