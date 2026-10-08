# PRODUCT_ROADMAP · TFT Training Log

> 规划文档（非 API 参考）。基于 **2026-10-04** 仓库实际状态（`main` @ `7347d3f`）编写。
> 项目级英文文档仍以 [README.md](../README.md) / [ROADMAP.md](../ROADMAP.md) 为准，
> 本目录回答的是「下一阶段**怎么演进**」。

配套文档：[UI 优化](./UI_IMPROVEMENT_PLAN.md) · [快速录入](./QUICK_RECORD_UX.md) ·
[复盘系统](./REVIEW_SYSTEM.md) · [数据中心](./DATA_CENTER.md) · [截图录入](./SCREENSHOT_IMPORT.md)

---

## 1. 当前产品定位

**个人 TFT 训练闭环工具**，不是战术查询工具。

README 已经把这点写死了：外部世界不缺「当前什么阵容强」的数据，缺的是
**训练闭环** —— 打完之后你只记得烂局、下周重复同样的三个错误。
所以产品的判断标准从来不是「信息量」，而是：

> 这条记录 / 这个图表 / 这个字段，是否让「记录 → 复盘 → 分析 → 下一局」这一步更容易发生？

定位约束（来自现有代码，不是新规定）：

- 纯本地优先。数据只在本机 IndexedDB（库名 `tft-training-log`），出口只有 export 按钮。
- 无后端、无账号、无 telemetry、无崩溃上报。
- 面向**国服**：时间是北京时间墙钟字符串（`YYYY-MM-DDTHH:mm`，无时区），
  通用时间工具在 `src/lib/wallclock.ts`；产品不再绑定固定训练时段。
- 明确不做**对局实时辅助**类能力（cheat-adjacent）。这是 ROADMAP 的 out-of-scope 红线。

---

## 2. 当前已有能力（实测清单）

以下内容均已上线并有测试覆盖（186 tests / 21 files，CI 每次 push 跑 typecheck + test + build）。

### 记录侧

| 能力 | 落点 | 备注 |
| --- | --- | --- |
| 快速记录一局 | `src/components/matches/QuickAddDialog.tsx` | 键盘 `1–8` 直接选名次；保存 / 再记一局 / 保存并复盘 |
| 完整对局表单 | `src/components/matches/MatchForm.tsx`（356 行，三大 Panel） | A 基础信息 / B 对局状态 / C 阵容装备强化 |
| Session 归属 | `src/domain/session/`、`src/services/session-context.tsx` | 新对局继承当前 Session，可整体迁移 |


### 复盘侧

| 能力 | 落点 | 备注 |
| --- | --- | --- |
| 四段式复盘 | `src/domain/review/review.ts`、`src/components/reviews/ReviewForm.tsx` | 开局 / 中期 / 后期三个大 textarea + 结论四必填 |
| 关键决策日志 | `src/domain/decision/decision.ts`、`src/components/decisions/DecisionPanel.tsx` | 回合 / 类型 / 当时的判断 / 事后 hindsight |

### 分析侧

| 能力 | 落点 |
| --- | --- |
| 统计页 | `src/pages/StatisticsPage.tsx` + `src/domain/stats/stats.ts`（纯函数 + 手写 fixture 测试） |
| Dashboard | `src/pages/DashboardPage.tsx`：6 个 StatCard + 最近 8 局表 |
| 训练目标 | `src/pages/TrainingGoalsPage.tsx`（active / completed / archived，可挂相关 mistake） |
| 周复盘 | `src/pages/WeeklyReviewPage.tsx`，规则引擎在 `ReviewSummaryProvider` 后面（预留 LLM 插槽） |

### 数据与基建

| 能力 | 落点 |
| --- | --- |
| Dexie / IndexedDB | `src/data/db.ts` —— v1 `matches`/`decisions`/`reviews`/`trainingGoals`；v2 +`trainingSessions`/`settings` |
| 分层架构 | `pages → components → services → domain → data/repository → Dexie`，`domain/` 不 import React / Dexie |
| Set 18 静态数据 | `data/tft/set18/`（65 棋子 / 36 羁绊 / 186 装备 / 592 海克斯）+ `src/data/tft/repositories.ts` |
| 规范 id 落盘 | `Match.traitIds` / `coreUnitIds` / `coreItemIds` / `augmentIds`（加法式，与自由文本并存） |
| 外部录入接口槽 | `src/data/adapters/types.ts` —— `DataSourceAdapter`，现仅 `ManualAdapter`，预留 `lcu`/`screenshot`/`riot` |
| 只读 Agent facade | `src/services/agent-tools.ts`（留给未来 Agent Coach / MCP） |
| 导入导出 | `src/services/export-service.ts`：全量 JSON snapshot（merge-import）+ CSV |

### 还不具备的（本次规划的出发点）

1. 阵容选择只是 `<datalist>` + 手写 chips，**没有** Recent / Frequent / Preset 分层。
2. 复盘是**三个大 textarea**，因此可被统计的字段只有 `primaryMistake` 一个维度。
3. Dashboard **没有一张图**，判断「有没有变好」要自己对数字做心算。
4. Set 18 静态数据**没有 UI 出口**，羁绊 / 装备 / 海克斯仍然是手打文本。
5. 没有 Timeline / 阶段视图；`Decision.round` 是自由文本字符串。
6. 没有任何自动录入：**全部人工**。

---

## 3. 用户核心流程

### 3.1 已跑通的主流程

```
打完一局
  ↓ 「快速记录一局」（1–8 选名次 → 阵容 → 海克斯/核心装备 → 最大问题 → 下局重点）
  ↓ 保存（可选：保存并再记一局 / 保存并详细复盘）
对局落库（继承当前 Session，reviewed=false）
  ↓
统计 / Dashboard 立刻可查（liveQuery 响应式）
  ↓
回头做完整复盘（四个必填通过 → match.reviewed=true，primaryMistake 回写到 Match）
  ↓
训练目标 / 周复盘 → 产出「下一局要练什么」
  ↓
回到下一局
```

### 3.2 目标流程（本次规划的终态）

```
        ┌──────── 手动 ────────┐        ┌──── 半自动 ────┐
        ↓                      ↓        ↓               ↓
    快速记录                完整表单              截图上传
 （Selector 优先）        （全部 Picker）    （OCR → 候选 → 人工确认）
        └────────────┬──────────┴───────────┬───────────┘
                     ↓                      ↓
                Match 记录            ImportDraft（置信度 + 原始图）
                     ↓                      ↓
                     └──────────┬───────────┘
                                ↓
                按模板补完复盘（结构化字段 + 少量自由文本）
                                ↓
                结构化统计（开局 / 海克斯 / 过渡 / 失败原因 …）
                                ↓
              先看自己的数据 → 再去数据中心查外部参照 / 版本背景
                                ↓
                          下一局训练重点
```

**关键顺序判断**：`记录 → 复盘 → 分析` 的闭环收益，远高于提前建 Data Center 或 OCR。
任何新页面都必须能回答「它对这条闭环的哪一步负责」。

---

## 4. 产品目标（按价值排序）

| # | 目标 | 判据 |
| --- | --- | --- |
| G1 | **录入成本必须低** | 一局从「打完」到「落库」≤ 60 秒，不需要回忆格式怎么打 |
| G2 | **复盘从写作变成勾选** | 不再是「对着三个空 textarea 发呆」，而是完成一份模板；多数字段可点选 |
| G3 | **统计要能被复盘字段喂饱** | 除 Primary Mistake 外，还能回答「开局策略 / 海克斯 / 过渡失败原因」各自的表现 |
| G4 | **数据要能自己看懂** | 每张图只回答一个问题；Dashboard 一眼看出「最近在变好还是变差」 |
| G5 | **静态数据要给 UI 用** | Set 18 快照不只服务校验，要变成可选、可搜、可跳转的页面能力 |
| G6 | **为自动录入留通道，而不是现在建成** | 先定义 adapter 接口与「人工确认」UI 形态，OCR 后置 |

---

## 5. 阶段规划

> 阶段编号接现有 ROADMAP.md（Phase 1 MVP ✅ / 1.5 发布 ✅ / 2 静态数据 ✅ / 2.5 Session ✅）。
> 每个阶段必须**单独可用**，不存在「做到一半才有意义」的中间态。

### Phase 2T（尾巴）— 补齐静态数据 Picker 🟡 P1

ROADMAP Phase 2 最后一个未勾选项：羁绊 / 装备 / 海克斯仍是自由文本。

- 在 `QuickAddDialog` / `MatchForm` 引入**海克斯 Picker**（592 项，必须带搜索）
- 装备 Picker（`coreItemIds`，`coreItems` 继续作展示兜底）
- 羁绊 Picker（`traitIds`）
- **不改动 `Match`**：继续写已有的 `augmentIds/coreItemIds/traitIds`，纯 UI 增量
- 影响数据模型：**否**

### Phase 3A — 快速录入 UX + 阵容 Selector 🔴 P0

详见 [QUICK_RECORD_UX.md](./QUICK_RECORD_UX.md)。

- 新增**本地使用情况数据源**（新 IndexedDB 表），支撑 Recent / Frequent / Preset 三层排序
- 「已知阵容 chips」从「有历史才出现」改成「首屏就有内容」
- 首启注入少量 Preset，随用户真实数据逐步让位
- 评估但不立即执行：Composition 升级为独立实体
- 影响数据模型：**是（加法，Dexie v3）**

### Phase 3B — UI 组件级优化 🔴 P0 / 🟡 P1

详见 [UI_IMPROVEMENT_PLAN.md](./UI_IMPROVEMENT_PLAN.md)。

- P0：Dashboard 信息化、图表 token 共享、状态与筛选的一致性
- P1：图表升级（每图一问、Tooltip 与列表联动）、Form / Review 分步化
- 明确 **不**做整页重写，逐组件替换
- 影响数据模型：**否**（Review 结构化算 3C）

### Phase 3C — 复盘模板化 🔴 P0

详见 [REVIEW_SYSTEM.md](./REVIEW_SYSTEM.md)。

- `Review` 增加 `structured` JSON（内置 `version`），**保留** `opening/midGame/lateGame` 不删除
- 七段模板：开局 → 海克斯 → 过渡 → 中期转折 → 装备 → 最终阵容 → 总结
- 只有「总结」保留自由输入（最成功 / 最该改 / 下局注意）
- 复盘完整度从布尔值变成百分比
- Migration：**纯加法，存量记录无需转换**（旧记录 `structured === undefined`）

### Phase 4 — 结构化统计与图表升级 🟡 P1

复盘模板落地之后才有得算。

- `src/domain/stats/` 新增纯函数：按开局类型 / 海克斯 / 过渡问题 / 失败原因 分组的
  `games / avgPlacement / top4Rate`
- 拆 `Decision.round` → 结构化阶段，引入 Timeline 视图
- 图表：共享 design token（目前 `PlacementTrendChart` / `MistakeBarChart` 各自硬编码 `#1e2635` 等）
- 影响数据模型：**可能**（视是否需要 Dexie 索引；优先纯内存聚合）

### Phase 5 — 数据中心 🟢 P2

详见 [DATA_CENTER.md](./DATA_CENTER.md)。**前提是静态数据已有 UI 出口（Phase 2T）。**

- V1：**外部资源聚合 + 内置快照浏览**（新增路由 `/data-center`）
- V2：海克斯 / 装备 / 棋子 检索页 + 与自己记录对照
- V3：按版本组织数据（`set18@18.3` → `set19@…`），拥抱外部数据源但闸门可控
- 影响数据模型：**是（Dexie v3 起）**

### Phase 6 — 截图录入 🟣 P3

详见 [SCREENSHOT_IMPORT.md](./SCREENSHOT_IMPORT.md)。**本次只出设计，不实现 OCR。**

- 六段流水线，核心是**保留人工确认**：识别结果永远是「候选」
- V1 文字数字 → V2 海克斯 / 装备 / 阵容 → V3 棋盘 / 棋子 / 羁绊
- 依赖 Phase 3A 的 Composition 归一化，否则 OCR 出来的阵容字符串照样没法统计

---

## 6. 优先级总表

**P0 = 当前体验明显有问题，应优先处理 · P1 = 下一阶段核心体验 · P2 = 中期增强 · P3 = 未来探索**

| 优先级 | 事项 | 阶段 | 改数据模型 | 依赖 |
| --- | --- | --- | --- | --- |
| **P0** | 快速录入 UX（阵容三层选择、搜索、Preset 让位） | 3A | 是（加法） | — |
| **P0** | 静态数据 Picker：海克斯 / 装备 / 羁绊 | 2T | 否 | 静态数据 ✅ |
| **P0** | 复盘模板化 + 复盘完整度 | 3C | 是（加法，兼容） | — |
| **P0** | Dashboard 信息化 + 图表 token 共享 | 3B | 否 | — |
| **P1** | 图表升级（每图一问、Tooltip / 筛选联动、趋势分析） | 4 | 否 | 3C 提供字段 |
| **P1** | UI 组件优化：MatchCard / Filter / Form / Review UI | 3B | 否 | — |
| **P1** | 结构化复盘字段的统计分析 | 4 | 可能 | 3C |
| **P2** | Timeline / 阶段视图（含 `Decision.round` 结构化） | 4 | 是（小） | 3C |
| **P2** | 数据中心 V1（外部资源聚合 + 快照浏览） | 5 | 是（v3） | 2T |
| **P2** | 版本维度（记录标注 set / version、跨版本对比） | 5 | 是 | 5-V1 |
| **P3** | 截图 OCR V1 → V3 | 6 | 是 | 3A / 3C / 5-V1 |
| **P3** | LCU / 自动录入 adapter | 现有 Phase 3 | 否（走 adapter） | 人工确认 UI |
| **P3** | Agent Coach / MCP | 现有 Phase 6–8 | 否 | agent-tools ✅ |

---

## 7. 推荐开发顺序（本次任务的结论）

> 既不是「UI 先行」也不是「数据先行」，判断依据是：**哪一步能让下一次记录更便宜**。

```
Step 0  基线：不做任何重构，保持 main 随时可发布
Step 1  Composition 使用情况写入（新 IndexedDB 表，先只写不展示）
        └─ Recent / Frequent 必须有真实数据才能排序，
           先攒数据、再上 UI，是成本最低的顺序
Step 2  阵容 Selector 落地到 QuickAddDialog
        └─ 收益最大的单页改动：每天都要用
Step 3  静态数据 Picker（海克斯 → 装备 → 羁绊）
        └─ 与前一步共用同一个 Selector 组件
Step 4  Dashboard 信息化 + 图表 token / 一致性
        └─ 不动数据模型，纯 UI 收益
Step 5  复盘模板化（structured + template + 完整度）
        └─ 数据模型唯一「必做」的改动，做完才有 Step 6
Step 6  结构化统计 + 图表升级
Step 7  Timeline / 阶段视图
Step 8  数据中心 V1
Step 9  OCR V1 设计与 Spike（不实现）
```

**为什么 OCR 与 LCU 排在最后**：它们都依赖「录入的因果关系能被正确归因」，
也就是 Composition 归一化 + Review 结构化。地基不先做完，自动录入只会**更快地产生脏数据**。

---

## 8. 技术依赖关系

```
                Set 18 静态快照（✅ 已完成）
                        │
        ┌───────────────┼─────────────────┐
        ↓               ↓                 ↓
  静态数据 Picker    阵容 Preset       数据中心 V1
      (2T)            (3A)              (5)
        │               │                 │
        └───── 共用同一个 Selector 组件 ───┤
                        │                 │
     使用情况表         │                 │
      (3A)              │                 │
                        ↓                 ↓
                  Composition 归一化 ←—— 截图录入 (6)
                        │
                        ↓
            复盘结构化字段 (3C) → 结构化统计 (4) → 图表升级 (4)
                                                      │
                                                      ↓
                                        Timeline (4) / 版本维度 (5)
```

关键约束：

- **写库路径只有一条**：`UI → services → repository → Dexie`。
  新功能应在此框架内增加 `domain/*` 纯函数 + `services/*` 编排，**不允许页面直接 import `db`**。
- **`DataSourceAdapter` 是自动录入的唯一入口**。LCU / 截图 / Riot 都产出 `MatchInput`，
  因此不会触及 domain 与统计。接缝现在就在 `src/data/adapters/types.ts`，不要绕开。
- **`ReviewSummaryProvider` / `agent-tools` 同理**：新增统计列时一并暴露，保证人看到和 Agent 看到的是同一份数据。

---

## 9. 暂不做什么（明确的负清单）

| 不做 | 原因 |
| --- | --- |
| 现在实现 OCR / 图像模型 | 没有 Composition 归一化和 Review 结构化之前，OCR 只能产出无法统计的字符串 |
| 接入大批外部数据源 / 写爬虫 | V1 只需要链接；Data Dragon 抓取脚本是**离线 generator**，不是运行时依赖 |
| 云同步 / 账号 / 后端 | 违反本地优先定位；export JSON 已足够作为迁移手段 |
| 实时对局辅助（读进程 / overlay） | 明确红线（cheat-adjacent） |
| 「推荐你玩什么阵容」的建议系统 | 先服务好自己的历史数据；建议依赖大量自身样本，现在不足 |
| 整局录像 / 回放分析 | 远超单人项目；Key-round 截图已覆盖 Phase 5 的 scope |
| LLM 自动生成复盘正文 | 规则引擎已够；先让结构化字段积累起来 |
| 为了「看起来完整」而造页面 | 每个新页面必须能对闭环的某一步负责 |
| 大规模重构现有分层 | 分层本身是好的，改动应落在边界处 |
| 替换 Tailwind / React Router / Dexie | 无收益，纯风险 |

---

## 10. 长期演进方向（只登记，不排期）

```
        手动录入
           ↓
    快速录入（Selector + Recent/Frequent）
           ↓
    模板化复盘（结构化字段）
           ↓
    结构化分析（开局 / 海克斯 / 过渡 / 失败原因）
           ↓
    数据中心（内部快照 + 外部参照 + 版本维度）
           ↓
    截图半自动录入（人工确认）
           ↓
    自动录入（LCU / 窗口内识别）
           ↓
    Agent Coach（基于本人历史 + MCP）
```

每一层在现有代码里都已有对应接缝：

| 未来能力 | 已存在的接缝 |
| --- | --- |
| 截图 / LCU / Riot 录入 | `src/data/adapters/types.ts` 的 `DataSourceAdapter` |
| LLM 周复盘 | `src/services/review-summary.ts` 的 `ReviewSummaryProvider` |
| Agent Coach / MCP | `src/services/agent-tools.ts`（JSON-serializable，只读） |
| 静态数据版本切换 | `src/data/tft/registry.ts` 的 set registry（当前只有 set 18） |
| 风格 / 主题统一 | `src/index.css` 的 `@theme`（但要先消灭图表里重复的颜色常量） |
