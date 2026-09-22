# ROADMAP

## Phase 1 — TFT Training Log MVP ✅

- [x] Project bootstrap（Vite + React 19 + TS + Tailwind v4 + Dexie + Recharts + Vitest）
- [x] Domain model + IndexedDB 存储（matches / decisions / reviews / trainingGoals）
- [x] Match CRUD（创建 / 编辑 / 删除 / 级联清理）
- [x] Quick Add（名次快捷键 1–8，1–2 分钟闭环，保存并再记一局）
- [x] 完整对局表单（基础信息 / 对局状态 / 阵容装备强化，训练时段 warning）
- [x] Match List / Detail（搜索、筛选、排序、分页）
- [x] Review（开局 / 中期 / 后期 / 结论，必填四项，reviewed 状态同步）
- [x] Decision Log（回合 / 类型 / 状态 / 决定 / 原因 / 结果 / 回看）
- [x] Statistics（整体 / 最近趋势折线 / 错误柱状图 / 阵容 / 时间段统计）
- [x] Training Goals（active / completed / archived + 相关错误类型）
- [x] Weekly Review（规则摘要 + `ReviewSummaryProvider` 预留）
- [x] Dashboard（核心指标 / 最近对局 / 当前目标 / 高频问题）
- [x] Data Export / Import（JSON 全量备份、JSON 合并导入、CSV 导出）
- [x] Agent 工具门面（`agent-tools.ts`，只读、可序列化）
- [x] 响应式（Desktop 优先，Tablet / Mobile 可用）

## Phase 2 — S18 静态数据

- [ ] 棋子 / 羁绊 / 装备 / 强化符文 静态数据（下拉与自动补全替代纯文本）

## Phase 3 — 国服客户端数据采集

- [ ] LCU Adapter（读取客户端数据源，人工确认写入）

## Phase 4 — 自动对局记录

- [ ] 训练时段内自动检测/记录对局

## Phase 5 — 截图 / Replay / 关键回合

- [ ] Screenshot Adapter
- [ ] 关键回合截图与标注

## Phase 6 — Agent Coach

- [ ] `LLMSummary` 周复盘
- [ ] 基于决策日志的个性化建议（Tool Calling）

## Phase 7 — MCP

- [ ] 将 `agent-tools` 暴露为 MCP Server

## Phase 8 — Personal TFT AI Coach

- [ ] 记忆（Memory）+ RAG 检索个人决策历史
- [ ] 训练效果评估（Evaluation）
