import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock, Save, Sparkles } from "lucide-react";
import { knownCompositions, quickAdd, recentMatches } from "../../services/match-service";
import { errorMessage } from "../../lib/errors";
import {
  TRAINING_WINDOW_LABEL,
  TRAINING_WINDOW_WARNING,
  isWithinTrainingWindow,
  wallClockNow,
} from "../../lib/wallclock";
import type { MistakeType } from "../../domain/types";
import { Field, Input, Label } from "../ui/Field";
import { MistakePicker } from "./MistakeSelect";
import { PlacementPicker } from "./PlacementPicker";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

interface QuickAddDraft {
  placement: number | undefined;
  composition: string;
  augments: string;
  coreItems: string;
  primaryMistake: MistakeType | "";
  nextGameFocus: string;
  playedAt: string;
}

const emptyDraft = (): QuickAddDraft => ({
  placement: undefined,
  composition: "",
  augments: "",
  coreItems: "",
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

  const compositions = useLiveQuery(() => knownCompositions(), [], []);
  const last = useLiveQuery(() => recentMatches(1), [], [])[0];

  const set = useCallback(<K extends keyof QuickAddDraft>(key: K, value: QuickAddDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

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

  const outsideWindow = useMemo(
    () => draft.playedAt !== "" && !isWithinTrainingWindow(draft.playedAt),
    [draft.playedAt],
  );

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
          augments: draft.augments,
          coreItems: draft.coreItems,
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
      augments: (last.augments ?? []).join(" / "),
      coreItems: (last.coreItems ?? []).join(" / "),
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="快速记录一局"
      subtitle="名次 → 阵容 → 问题 → 保存，一分钟内完成"
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
          <ul className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
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
            compositions.length > 0 ? (
              <span className="flex flex-wrap items-center gap-1">
                {compositions.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("composition", c)}
                    className="rounded border border-line bg-base-800 px-1.5 py-0.5 text-[11px] text-ink-400 hover:text-gold-300"
                  >
                    {c}
                  </button>
                ))}
                {last && (
                  <button
                    type="button"
                    onClick={reuseLast}
                    className="ml-1 rounded border border-gold-500/30 bg-gold-500/10 px-1.5 py-0.5 text-[11px] text-gold-300"
                  >
                    复制上一局
                  </button>
                )}
              </span>
            ) : undefined
          }
        >
          <Input
            id="qa-composition"
            list="qa-composition-options"
            value={draft.composition}
            placeholder="例如：福牛 / 枪手"
            onChange={(e) => set("composition", e.target.value)}
          />
          <datalist id="qa-composition-options">
            {compositions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="强化符文" htmlFor="qa-augments">
            <Input
              id="qa-augments"
              value={draft.augments}
              placeholder="A / B / C"
              onChange={(e) => set("augments", e.target.value)}
            />
          </Field>
          <Field label="核心装备" htmlFor="qa-items">
            <Input
              id="qa-items"
              value={draft.coreItems}
              placeholder="主C：无尽 / 巨人"
              onChange={(e) => set("coreItems", e.target.value)}
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
          <Label className="mt-1 block text-[11px] text-ink-600">
            {outsideWindow ? (
              <span className="text-amber-300">
                {TRAINING_WINDOW_WARNING}（训练时段 {TRAINING_WINDOW_LABEL}）
              </span>
            ) : (
              `训练时段 ${TRAINING_WINDOW_LABEL}`
            )}
          </Label>
        </Field>
      </div>
    </Modal>
  );
}
