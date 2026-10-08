import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Open modals, oldest first. Every instance listens on `document`, so a
 * stacked pair would see the same Escape twice and both would close — or, once
 * the lower one has a selector panel open, neither would (the panel swallows
 * the key). Only the most recently registered modal is allowed to react.
 */
const modalStack: object[] = [];

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}): ReactNode {
  // Identity for this instance's stack slot, stable across open/close cycles.
  const tokenRef = useRef<object | null>(null);
  tokenRef.current ??= {};
  const token = tokenRef.current;
  // Read the latest onClose without re-registering: an inline arrow would
  // otherwise re-run the effect and push this modal back to the top of the
  // stack on every parent render, handing Escape to a buried dialog.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    modalStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Escape inside a selector panel (QuickAdd) is consumed by the panel's
      // own React handler, which calls stopPropagation on the synthetic event
      // — React's delegated listener sits below `document`, so the native
      // event never reaches this handler and the draft survives. That
      // propagation stop, not `defaultPrevented`, is what saves the draft.
      // `defaultPrevented` is kept as an independent fallback.
      if (e.defaultPrevented) return;
      // Only the topmost dialog acts; anything below it stays put.
      if (modalStack[modalStack.length - 1] !== token) return;
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      // Splice by identity rather than pop: a middle modal can unmount out of
      // order, and pop() would drop somebody else's slot and leak this one.
      const at = modalStack.indexOf(token);
      if (at !== -1) modalStack.splice(at, 1);
      document.body.style.overflow = prev;
    };
  }, [open, token]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-base-900 shadow-2xl",
          "rounded-t-2xl sm:rounded-2xl",
          size === "lg" ? "sm:max-w-3xl" : "sm:max-w-lg",
        ].join(" ")}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-50">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-base-800 hover:text-ink-50"
          >
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-base-850 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
