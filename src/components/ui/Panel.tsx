import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}): ReactNode {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}): ReactNode {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink-50">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-600">{subtitle}</p>}
      </div>
      {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink-50 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-ink-600 sm:text-sm">{subtitle}</p>}
      </div>
      {action && <div className="ml-auto flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
