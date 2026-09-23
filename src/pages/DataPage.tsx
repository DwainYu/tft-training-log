import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Database, Download, FileJson, Sparkles, Trash2, Upload } from "lucide-react";
import {
  buildSnapshot,
  decisionsToCsv,
  downloadText,
  importSnapshot,
  matchesToCsv,
  parseSnapshot,
  storageCounts,
  stampForFilename,
  wipeAll,
} from "../services/export-service";
import { loadDemoData, removeDemoData } from "../services/demo-service";
import { decisionRepository } from "../data/repository/decision-repository";
import { matchRepository } from "../data/repository/match-repository";
import { errorMessage } from "../lib/errors";
import { Badge, EmptyState } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageHeader, Panel, PanelHeader } from "../components/ui/Panel";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/Toast";

export function DataPage() {
  const counts = useLiveQuery(storageCounts, []);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  if (counts === undefined) return <Spinner label="读取存储" />;
  const total = counts.matches + counts.decisions + counts.reviews + counts.trainingGoals;

  async function exportJson() {
    setBusy(true);
    try {
      const snapshot = await buildSnapshot();
      downloadText(`tft-training-log-${stampForFilename()}.json`, JSON.stringify(snapshot, null, 2), "application/json");
      toast.push("JSON 已导出");
    } catch (err) {
      toast.push(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setBusy(true);
    try {
      const [matches, decisions] = await Promise.all([matchRepository.all(), decisionRepository.all()]);
      downloadText(`tft-matches-${stampForFilename()}.csv`, matchesToCsv(matches), "text/csv");
      if (decisions.length > 0) {
        downloadText(`tft-decisions-${stampForFilename()}.csv`, decisionsToCsv(decisions), "text/csv");
      }
      toast.push("CSV 已导出");
    } catch (err) {
      toast.push(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const report = await importSnapshot(parseSnapshot(text));
      toast.push(
        `导入完成：${report.matches} 对局 · ${report.decisions} 决策 · ${report.reviews} 复盘 · ${report.trainingGoals} 目标` +
          (report.skipped ? `（${report.skipped} 条无效被跳过）` : ""),
      );
    } catch (err) {
      toast.push(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  async function onLoadDemo() {
    setBusy(true);
    try {
      const report = await loadDemoData();
      toast.push(`示例数据已载入：${report.matches} 局虚构对局 · ${report.decisions} 决策 · ${report.reviews} 复盘 · ${report.trainingGoals} 目标`);
    } catch (err) {
      toast.push(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  async function onClearDemo() {
    setBusy(true);
    const removed = await removeDemoData();
    setBusy(false);
    toast.push(removed > 0 ? `已清除 ${removed} 条示例数据（真实数据保留）` : "没有示例数据");
  }

  return (
    <>
      <PageHeader title="数据" subtitle="数据 100% 保存在这台电脑的浏览器里 —— 随时可以带走" />

      <div className="flex flex-col gap-4">
        <Panel>
          <PanelHeader
            title="存储概况"
            action={
              <Badge tone="muted">
                <Database size={12} /> IndexedDB · 本机
              </Badge>
            }
          />
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            <CountTile label="对局" value={counts.matches} />
            <CountTile label="决策" value={counts.decisions} />
            <CountTile label="复盘" value={counts.reviews} />
            <CountTile label="训练目标" value={counts.trainingGoals} />
          </div>
          {total === 0 && (
            <p className="border-t border-line px-4 py-3 text-xs text-ink-600">
              还没有数据。可以先「载入示例数据」看看每个页面长什么样，或者记录一局之后再回来备份。
            </p>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="导出" subtitle="JSON = 全量备份 · CSV = 给表格软件看" />
            <div className="flex flex-col gap-2 p-4">
              <Button variant="primary" onClick={exportJson} disabled={busy || total === 0}>
                <FileJson size={15} />
                Export JSON（全部数据）
              </Button>
              <Button onClick={exportCsv} disabled={busy || counts.matches === 0}>
                <Download size={15} />
                Export CSV（对局{counts.decisions ? " + 决策" : ""}）
              </Button>
              <p className="text-[11px] leading-relaxed text-ink-600">
                JSON 包含 matches / decisions / reviews / trainingGoals 四张表，与本页导入格式一致，
                可以跨浏览器迁移或作为备份。
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="导入" subtitle="合并导入：同 id 记录覆盖，新记录追加，不删除本地数据" />
            <div className="flex flex-col gap-2 p-4">
              <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} className="hidden" id="import-json" />
              <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload size={15} />
                Import JSON
              </Button>
              <p className="text-[11px] leading-relaxed text-ink-600">
                选择之前导出的 JSON 文件。导入采用合并策略，旧备份不会毁掉新数据。
              </p>
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader
            title="示例数据"
            subtitle="虚构数据，用来浏览全部页面"
            action={
              <Badge tone="info">
                <Sparkles size={12} /> Demo · 非真实战绩
              </Badge>
            }
          />
          <div className="flex flex-wrap items-center gap-3 p-4">
            <Button variant="primary" onClick={onLoadDemo} disabled={busy}>
              <Sparkles size={15} />
              载入示例数据
            </Button>
            <Button onClick={onClearDemo} disabled={busy}>
              清除示例数据
            </Button>
            <span className="text-[11px] leading-relaxed text-ink-600">
              16 局虚构对局 + 决策 / 复盘 / 训练目标，日期自动对齐到今天；示例记录 id 以
              <code className="mx-1">demo-</code>
              开头，清除时不会影响你真实记录的数据。
            </span>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="危险区" subtitle="清掉本机全部训练数据" />
          <div className="flex flex-wrap items-center gap-3 p-4">
            <Button variant="danger" onClick={() => setConfirmWipe(true)} disabled={total === 0 || busy}>
              <Trash2 size={15} />
              清空所有数据
            </Button>
            <span className="text-[11px] text-ink-600">
              先 Export JSON 再清，才叫安全。
            </span>
          </div>
        </Panel>
      </div>

      <Modal
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="清空全部数据？"
        subtitle={`${total} 条记录将被删除，且无法恢复`}
        footer={
          <>
            <Button
              variant="danger"
              onClick={async () => {
                setBusy(true);
                await wipeAll();
                setBusy(false);
                setConfirmWipe(false);
                toast.push("全部数据已清空");
              }}
            >
              确认清空
            </Button>
            <Button onClick={() => setConfirmWipe(false)}>取消</Button>
          </>
        }
      >
        {total === 0 ? (
          <EmptyState title="当前没有可清空的数据" />
        ) : (
          <p className="text-sm text-ink-200">
            {counts.matches} 对局 · {counts.decisions} 决策 · {counts.reviews} 复盘 ·{" "}
            {counts.trainingGoals} 训练目标
          </p>
        )}
      </Modal>
    </>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-base-900/60 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-ink-600">{label}</div>
      <div className="num text-xl text-ink-50">{value}</div>
    </div>
  );
}
