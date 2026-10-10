import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock, Save, Sparkles } from "lucide-react";
import { quickAdd, recentMatches } from "../../services/match-service";
import { getActiveSession } from "../../services/session-service";
import { augmentOptions } from "../../services/augment-service";
import { itemOptions } from "../../services/item-service";
import { errorMessage } from "../../lib/errors";
import { wallClockNow } from "../../lib/wallclock";
import type { MistakeType } from "../../domain/types";
import { Field, Input } from "../ui/Field";
import { AugmentSelector } from "./AugmentSelector";
import { CompositionSelector } from "./CompositionSelector";
import { ItemSelector } from "./ItemSelector";
import { MistakePicker } from "./MistakeSelect";
import { PlacementPicker } from "./PlacementPicker";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

interface QuickAddDraft {
  placement: number | undefined;
  composition: string;
  /** Canonical augment ids in pick order; names are derived on save. */
  augmentIds: string[];
  /** Canonical item ids; names are derived on save. */
  coreItemIds: string[];
  primaryMistake: MistakeType | "";
  nextGameFocus: string;
  playedAt: string;
}

const emptyDraft = (): QuickAddDraft => ({
  placement: undefined,
  composition: "",
  augmentIds: [],
  coreItemIds: [],
  primaryMistake: "",
  nextGameFocus: "",
  playedAt: wallClockNow(),
});

export function QuickAddDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<QuickAddDraft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const activeSession = useLiveQuery(getActiveSession, []);
  const last = useLiveQuery(() => recentMatches(1), [], [])[0];

  const set = useCallback(<K extends keyof QuickAddDraft>(key: K, value: QuickAddDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  // The dialog stays mounted while hidden (QuickAddProvider keeps it next to
  // the app shell), so the useState initializer pins `playedAt` to whenever
  // the page first loaded. Every fresh open is a new quick-create flow: seed
  // it with the time the player actually clicked. Rendering while open never
  // re-runs this, so manual edits survive; "保存并再记一局" re-seeds via its
  // own emptyDraft() reset.
  useEffect(() => {
    if (open) set("playedAt", wallClockNow());
  }, [open, set]);

  // Keys 1–8 set the placement: the fastest possible start for the next record.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const n = Number(e.key);
      if (n >= 1 && n <= 8) set("placement", n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, set]);

  async function submit(mode: "close" | "again" | "review") {
    if (!draft.placement) {
      setErrors(["请先选择名次"]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const match = await quickAdd(
        {
          playedAt: draft.playedAt || wallClockNow(),
          placement: String(draft.placement),
          composition: draft.composition,
          augments: augmentOptions(draft.augmentIds)
            .map((a) => a.name)
            .join(" / "),
          augmentIds: draft.augmentIds,
          coreItems: itemOptions(draft.coreItemIds)
            .map((i) => i.name)
            .join(" / "),
          coreItemIds: draft.coreItemIds,
          primaryMistake: draft.primaryMistake,
        },
        draft.nextGameFocus,
      );

      if (mode === "review") {
        onClose();
        navigate(`/matches/${match.id}/review`);
        return;
      }
      if (mode === "again") {
        // Keep the fields the player is likely to reuse, clear the rest.
        setDraft({
          ...emptyDraft(),
          composition: draft.composition,
          augmentIds: draft.augmentIds,
          coreItemIds: draft.coreItemIds,
          primaryMistake: draft.primaryMistake,
          nextGameFocus: draft.nextGameFocus,
        });
        toast.push(`已记录第 ${match.placement} 名 · 继续下一局`);
        return;
      }
      toast.push(`已记录第 ${match.placement} 名 · ${draft.composition || "未填阵容"}`);
      setDraft(emptyDraft());
      onClose();
    } catch (err) {
      setErrors([errorMessage(err)]);
    } finally {
      setBusy(false);
    }
  }

  const reuseLast = () => {
    if (!last) return;
    setDraft((d) => ({
      ...d,
      composition: last.composition ?? d.composition,
      augmentIds: last.augmentIds ?? d.augmentIds,
      coreItemIds: last.coreItemIds ?? d.coreItemIds,
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="快速记录一局"
      subtitle={`名次 → 阵容 → 问题 → 保存，一分钟内完成 · 记入「${activeSession?.name ?? "日常训练"}」`}
      size="lg"
      footer={
        <>
          <Button variant="primary" onClick={() => submit("close")} disabled={busy}>
            <Save size={15} />
            保存
          </Button>
          <Button onClick={() => submit("again")} disabled={busy}>
            保存并再记一局
          </Button>
          <Button onClick={() => submit("review")} disabled={busy}>
            <Sparkles size={15} />
            保存并详细复盘
          </Button>
          <span className="ml-auto text-[11px] text-ink-600">按 1–8 直接选名次</span>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {errors.length > 0 && (
          <ul className="rounded-lg border border-bad/35 bg-bad/10 px-3 py-2 text-xs text-bad">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <Field label="最终名次" required hint="快捷键 1 – 8">
          <PlacementPicker value={draft.placement} onChange={(p) => set("placement", p)} />
        </Field>

        <Field
          label="阵容"
          htmlFor="qa-composition"
          hint={
            last && (
              <button
                type="button"
                onClick={reuseLast}
                className="rounded border border-gold-500/30 bg-gold-500/10 px-1.5 py-0.5 text-[11px] text-gold-300"
              >
                复制上一局
              </button>
            )
          }
        >
          <CompositionSelector
            id="qa-composition"
            value={draft.composition}
            onChange={(v) => set("composition", v)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="强化符文" htmlFor="qa-augments">
            <AugmentSelector
              id="qa-augments"
              value={draft.augmentIds}
              onChange={(ids) => set("augmentIds", ids)}
            />
          </Field>
          <Field label="核心装备" htmlFor="qa-items">
            <ItemSelector
              id="qa-items"
              value={draft.coreItemIds}
              onChange={(ids) => set("coreItemIds", ids)}
            />
          </Field>
        </div>

        <Field label="本局最大问题">
          <MistakePicker value={draft.primaryMistake} onChange={(v) => set("primaryMistake", v)} />
        </Field>

        <Field label="下一局训练重点" htmlFor="qa-focus">
          <Input
            id="qa-focus"
            value={draft.nextGameFocus}
            placeholder="例如：4-1 之前不 D 超过 30 金币"
            onChange={(e) => set("nextGameFocus", e.target.value)}
          />
        </Field>

        <Field label="对局时间" htmlFor="qa-time">
          <div className="flex items-center gap-2">
            <Clock size={14} className="shrink-0 text-ink-600" />
            <Input
              id="qa-time"
              type="datetime-local"
              value={draft.playedAt}
              onChange={(e) => set("playedAt", e.target.value)}
              className="max-w-56"
            />
          </div>
        </Field>
      </div>
    </Modal>
  );
}
