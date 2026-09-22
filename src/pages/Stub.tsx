import type { ReactNode } from "react";

/** Placeholder used only while later phases fill the app out. */
export function Stub({ title }: { title: string }): ReactNode {
  return <div className="panel p-6 text-ink-400">{title} · 待实现</div>;
}
