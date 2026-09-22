import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

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
