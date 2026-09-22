import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  CalendarRange,
  ClipboardList,
  Database,
  LayoutDashboard,
  Menu,
  Plus,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { AddMatchButton } from "../../components/matches/AddMatchButton";

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/matches", label: "对局", icon: ClipboardList },
  { to: "/statistics", label: "统计", icon: BarChart3 },
  { to: "/goals", label: "训练目标", icon: Target },
  { to: "/weekly", label: "周复盘", icon: CalendarRange },
  { to: "/data", label: "数据", icon: Database },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-line lg:bg-base-900/70 lg:backdrop-blur">
        <div className="flex h-full flex-col gap-6 px-4 py-6">
          <Brand />
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <NavItem key={item.to} {...item} onNavigate={() => undefined} />
            ))}
          </nav>
          <div className="mt-auto">
            <AddMatchButton />
            <p className="mt-4 text-[11px] leading-relaxed text-ink-600">
              训练时段 12:00 – 22:00（北京时间）
              <br />
              数据全部保存在本机浏览器
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-base-900/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          aria-label="打开菜单"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-line p-2 text-ink-200 hover:bg-base-800"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Brand />
        <div className="ml-auto">
          <AddMatchButton compact />
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-b border-line bg-base-900/95 px-4 pb-4">
          <nav className="grid grid-cols-2 gap-2">
            {NAV.map((item) => (
              <NavItem key={item.to} {...item} onNavigate={() => setOpen(false)} stacked />
            ))}
          </nav>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-gold-500/40 bg-gold-500/10 text-gold-300">
        <Plus size={16} strokeWidth={3} />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-wide text-ink-50">TFT Training Log</div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-ink-600">S18 · 云顶之巅</div>
      </div>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
  stacked,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  onNavigate: () => void;
  stacked?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
          stacked && "gap-2 px-3 py-2",
          isActive
            ? "border-gold-500/35 bg-gold-500/10 text-gold-300"
            : "border-transparent text-ink-400 hover:bg-base-800 hover:text-ink-200",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
