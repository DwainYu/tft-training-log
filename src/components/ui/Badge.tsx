import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "good" | "bad" | "info" | "muted";
  className?: string;
}): ReactNode {
  const tones: Record<string, string> = {
    neutral: "border-line bg-base-800 text-ink-200",
    gold: "border-gold-500/35 bg-gold-500/10 text-gold-300",
    good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    bad: "border-red-500/30 bg-red-500/10 text-red-300",
    info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    muted: "border-transparent bg-base-800/70 text-ink-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="text-sm font-medium text-ink-200">{title}</div>
      {description && <p className="max-w-md text-xs leading-relaxed text-ink-600">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
