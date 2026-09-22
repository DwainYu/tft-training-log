import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

type Toast = { id: number; message: string; tone: "ok" | "warn" };
type ToastApi = { push: (message: string, tone?: "ok" | "warn") => void };

const ToastContext = createContext<ToastApi>({ push: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: "ok" | "warn" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`panel pointer-events-auto flex items-center gap-2 px-3 py-2.5 text-sm shadow-xl ${
              t.tone === "warn" ? "border-amber-500/40 text-amber-200" : "border-emerald-500/35 text-emerald-200"
            }`}
          >
            {t.tone === "warn" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span className="min-w-0 flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
