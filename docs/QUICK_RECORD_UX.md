# QUICK_RECORD_UX · 快速填写对局

> ## 已被取代（部分）
>
> **录入流程的分析与字段级判断已由 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §6 接管**
> （§6.1 三个真实用户状态 · §6.2 逐字段默认展开判断 · §6.3 Augment/Item 在而 Trait 不在的取舍 ·
> §6.4 20–60 秒预算）。数据层的决策已由 [REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md)
> §1.2 确认「`augmentIds` 已有 592 个快照却零聚合」优先于新增字段。
>
> **本文仍然独有、必须保留的两块**：
> 1. **§7 六条快速操作原则** —— `UI_CONSOLIDATION.md` 把它们当作约束条件直接引用
>    （`:268` ≤60 秒、`:269` 每字段 ≤3 次交互、`:274` 禁止二次确认弹窗），需要在本文保持可读。
> 2. **§5 数据模型与 §6「Composition 不要变实体」的结论** —— `UI_CONSOLIDATION.md` 与
>    `REVIEW_DATA_REQUIREMENTS.md` 均未涉及 `CompositionUsage` 的迁移影响与 Step 2 的触发条件。
>
> ### 随本次修订一并修正的失效断言
>
> **⚠ 入站引用失效**：`UI_CONSOLIDATION.md` 按行号引用本文 §7 的三条原则
> （`:268` ≤60 秒 / `:269` 每字段 ≤3 次交互 / `:274` 禁止二次确认弹窗）。本次修订在文首插入公告块，
> 行号已下移，对照如下：
>
> | `UI_CONSOLIDATION.md` 引用 | 原则 | 本文现位置 |
> | --- | --- | --- |
> | `:229`、§6.4 → `:268` | 一局 ≤ 60 秒 | `:312` |
> | `:249`、P1-2 → `:269` | 每字段 ≤ 3 次交互 | `:314` |
> | `:296`、P0-2 → `:274` | 禁止二次确认弹窗 | `:322` |
>
> §7 六条原则**正文一字未改**，只各追加了一条现状注记（斜体，标注该原则兑现与否）。
> | 原断言 | 实际（已复核） |
> | --- | --- |
> | §1.1 快速路径阵容是「Input + `<datalist>` + 前 6 个已知阵容 chip」 | **错。** `QuickAddDialog.tsx:203` 渲染 `CompositionSelector`（搜索框 + 最近 / 常用 / 预置三段 + 自由文本），全文件无 `datalist`。旧路径已不存在 |
> | §1.1 强化符文 / 核心装备是「文本」 | **错。** `QuickAddDialog.tsx:212` 是 `AugmentSelector`（有序、硬上限 3）、`:219` 是 `ItemSelector`（无序集合），均带搜索 |
> | §2痛点 #1 chips 整块由 `compositions.length > 0` 决定渲染与否（`:179`） | **错。** 该条件表达式已不存在，`:203` 无条件渲染 `CompositionSelector`。冷启动由预置段兜底（`CompositionSelector.tsx:152-159`） |
> | §2 痛点 #2 / #6「已知阵容」按全局总次数 Top6、不感知 Session | **已修复。** 改由 `CompositionUsage` 表驱动（`db.ts:62` 索引 `usageCount` / `lastUsedAt`）；Recent 按 `lastUsedAt`、Frequent 有 `useCount >= 2` 门槛（`suggestions.ts:45`）。`knownCompositions()`（`match-service.ts:146`）现在只服务 `MatchesPage` 的筛选下拉（`MatchesPage.tsx:39`） |
> | §2 痛点 #3 阵容写法碎片化，`compositionStats` 按 `composition.trim()` 精确分组 | **已修复。** `stats.ts:126` 已用 `normalizeCompositionKey`（`domain/composition/composition.ts:20`）分组，`"福牛"` / `"福牛 "` 合并为一行 |
> | §2 痛点 #4 海克斯 / 核心装备是自由文本 | **错。** 两者均已改为 Selector，见上 |
> | §2 痛点 #5 静态数据已就绪但 UI 没用上 | **错。** `searchAugments` / `searchItems` / `searchTraits` 分别由三个 service 接入；`augment-service.ts` 有 592 条、`item-service.ts` 186 条、`trait-service.ts` 36 条 |
> | §9 检查清单要 `src/domain/composition/ranking.ts` | **该文件不存在。** 实际是两个文件：`domain/composition/composition.ts`（`normalizeCompositionKey:20`、`summarizeCompositionUsage:39`）与 `domain/composition/suggestions.ts`（`pickCompositionSuggestions:47`、`flattenCompositionOptions:86`、`searchCompositionOptions:95`、`FREQUENT_MIN_COUNT:45`）。本文 §3.2 / §5.3 里的 `ranking.ts` 路径同步更正 |
> | §9 检查清单要 `src/services/composition-preset.ts` | **该文件不存在。** 预置数据是 `src/services/composition-usage-service.ts` 里的 `presetCompositions():35` |
>
> 配套：[PRODUCT_ROADMAP](./PRODUCT_ROADMAP.md) · [UI 优化](./UI_IMPROVEMENT_PLAN.md) · [复盘系统](./REVIEW_SYSTEM.md)
> 基线：`main` @ `7347d3f` + 工作区 Phase 2T/3A 未提交改动。本文回答两件事：
> **① 快速录入怎么改能立刻生效**（**已实施完毕，见上表**）**；② Composition 要不要升级成独立实体**（**仍未做，§6 结论不变**）。

---

## 1. 当前录入流程

### 1.1 快速路径（每天用的）

`src/components/matches/QuickAddDialog.tsx`，挂在 `AppShell` 右上，通过
`QuickAddProvider` 全局可用。

```
按 1–8           → 名次（PlacementPicker，键盘可直接选，见 effect:64）
搜索 / 点 chip   → 阵容（CompositionSelector，最近 / 常用 / 预置三段 + 搜索 + 保留输入）
搜索 / 点 chip×3 → 强化符文（AugmentSelector，有序、硬上限 3、每行带index 角标）
搜索 / 点 chip   → 核心装备（ItemSelector，无序无上限）
点选             → 本局最大问题（MistakePicker，11 类）
输入             → 下一局训练重点
datetime-local   → 对局时间（默认当前，非训练时段给警告不阻断）
        ↓
保存 / 保存并再记一局 / 保存并详细复盘
```

> 上表为**修订后**的形态。原表写的阵容「Input + `<datalist>` + 前 6 个已知阵容 chip」与
> 海克斯 / 装备「文本」均已不成立，见文首勘误表。字段级展开 / 折叠判断见
> [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §6.2。

「保存并再记一局」保留 `composition / augmentIds / coreItemIds / primaryMistake / nextGameFocus`
（`QuickAddDialog.tsx:119-125`）—— 这个设计是对的，保留下来了。
**注意**：原表称保留 3 项，实际是 **5 项**（`augmentIds` 与 `coreItemIds` 也在内），
这是 3A 把两者从文本改成 Selector 之后的必然结果——文本时代没有「保留一段字符串」的成本，
Selector 时代保留意味着下一局不用重选。

### 1.2 完整路径

`src/components/matches/MatchForm.tsx` + `match-form-model.ts`。
除了上面这些，还能填：开始/结束时间（时长自动推算）、等级、血量、金币、
羁绊、核心棋子、Session 归属、备注。**16 个可见字段、3 个面板全展开**（`UI_CONSOLIDATION.md` §7）。

### 1.3 写入路径

两条路径都收敛到同一处：

```
UI → ManualAdapter.toMatchInput(payload)   // src/data/adapters/manual-adapter.ts
   → validateMatchInput + validateMatchStaticData
   → createMatch / applyMatchInput
   → matchRepository → Dexie
```

**这个收敛非常好**，做任何 UX 改造都不要破坏它 —— 未来的截图 / LCU adapter 也要产出
同一个 `MatchInput`。

---

## 2. 当前痛点（按严重程度）

> **本节7 条痛点已全部处理或失效，当前状态如下。** 保留此表是为了记录「当初的诊断是否成立」，
> 供后续 PR 判断是否复发。逐字段的现状判断以
> [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §6.1–§6.4 为准。

| # | 原痛点 | 现状 |
| --- | --- | --- |
| **1** | 新用户首屏没有可点的东西 | **已解决。** `QuickAddDialog.tsx:203` 的 `CompositionSelector` 无条件渲染，预置段保证有内容（`CompositionSelector.tsx:152-159`）。**残留摩擦**：新用户点开「阵容」会看到 3 个分区里 2 个是空态（`:141` / `:148`），见 `UI_CONSOLIDATION.md` §6.1 状态 A |
| **2** | 「已知阵容」= 全局使用次数 Top6，和「最近在用」无关 | **已解决。** Recent 段按 `lastUsedAt`、Frequent 段按 `usageCount` 且门槛 `>= 2`（`suggestions.ts:45`），数据源换成 `CompositionUsage` 表 |
| **3** | 同一阵容写法碎片化 | **已解决。** `stats.ts:126` 用 `normalizeCompositionKey`（`composition.ts:20`）分组。**注意残留**：归一化不做语义合并，`"福牛"` 与 `"福牛法师"` 是两个 key——这是设计决策，`DASHBOARD_PLAN.md` §4.3 要求在表头提示用户 |
| **4** | 海克斯 / 核心装备是自由文本 | **已解决。** `AugmentSelector`（`:212`）/ `ItemSelector`（`:219`），带搜索。**但**：`REVIEW_DATA_REQUIREMENTS.md` §3 R6① 指出 `augmentIds` 的 592 个快照**采回来了却零聚合**——UI 有了，统计没做 |
| **5** | 静态数据已就绪但UI 没用上 | **已解决。** 三个 service 分别接入 592 / 186 / 36 条快照。**唯一仍未接入的是核心棋子**：`MatchForm.tsx:274-287` 仍是裸 `Input` + `<datalist>`（`UI_CONSOLIDATION.md` P1-12） |
| **6** | 「已知阵容」没有 Session 感知 | **未实现，且比原判断更远。** `CompositionUsage` 上根本没有 `lastSessionId` 字段（`types.ts:174-179` 只有 `compositionKey` / `usageCount` / `firstUsedAt` / `lastUsedAt`），`pickCompositionSuggestions` 也没有 session 入参。原 §3.3 的「样本 < 3 时回退全局」规则**无法实现**，要加需先动数据模型 |
| **7** | 「复制上一局」藏在 chips 区，且要历史存在才出现 | **仍然成立（位置与可见性）。** 现 `QuickAddDialog.tsx:195`，仍在 `last &&` 条件内（`:190`）、仍是 `text-[11px]` 的 hint 内按钮。已由 `UI_CONSOLIDATION.md` P1-3 立项 |

---

## 3. 阵容选择方案（核心）

> **本节方案已实现，本文只保留设计与取舍的理由，实现细节不再重复。**
> 落地形态与取舍理由见 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §2.2（`CompositionSelector`
> 与其他三个选择器的逐关注点对照，说明它为什么**不是** `value: string[]` 形态的 list selector）；
> 排序规则的可测实现见 `domain/composition/suggestions.ts`。
> §3.1 的目标形态、§3.4 的搜索逻辑、§3.5 的 Preset 来源已落地或已被后续决策覆盖，不再保留原设计稿。

### 3.2 三层的定义（保留：记录排序取舍的理由）

| 层 | 含义 | 数据源 | 排序键 | 条数 |
| --- | --- | --- | --- | --- |
| **Recent（最近使用）** | 真正反映「你现在在练什么」 | 使用情况记录表 | `lastUsedAt` 降序 | 3–5 |
| **Frequent（常用）** | 长期主力，帮助快速回归 | 使用情况记录表 | `usageCount` 降序（且不在 Recent 内） | 3–5 |
| **Preset（推荐 / 初始化）** | 冷启动兜底 + 版本强势阵容引导 | 预置数据 | 预置顺序 | 补到一行满为止 |

>原文写Frequent 的排序键是 `useCount`，实际字段名是 `usageCount`（`types.ts:174-179`，
> `db.ts:62` 索引名亦为 `usageCount`）。`useCount` 是设计稿阶段的叫法，未落地。

**关键 UX 规则（对应用户描述的演化过程）**

```
冷启动：        最近使用（空）
                常用（空）
                推荐  A B C D        ← Preset 独占一行

用过 A 一次：   最近使用  A
                常用（空）
                推荐  B C D          ← A 从 Preset 里消失（去重，不再占位置）

长期使用后：    最近使用  A X
                常用      B C D      ← B/C/D 是真实历史累计出来的，不再是 Preset
                推荐      E F        ← 只有真实数据不够撑满一行时才出现
```

即：**Preset 是填充物，不是主角**。判断规则统一写成一个纯函数，方便测试：

```ts
// domain/composition/suggestions.ts:47 —— 已实现（原文误写为 ranking.ts，该文件不存在）
pickCompositionSuggestions({ usage, presets, limit }): Suggestion[]
```

### 3.3 排序逻辑（明确取舍）

- **Recent 用 `lastUsedAt` 而不是 `usageCount`**：记录意图是「上一局在玩什么」，
  下一局大概率继续；次数是周级信号，不该挤占日级信号。**已实现。**
- **Recent 与 Frequent 去重**，同一阵容不重复出现。**已实现。**
- **Frequent 的门槛**：`usageCount >= 2` 才进入常用，避免「只打过一局的临时阵容」混进来。
  **已实现**（`suggestions.ts:45` `FREQUENT_MIN_COUNT = 2`）。
- **Session 感知（建议，不是必须）**：优先取当前 Session 的使用记录；
  当前 Session 样本 < 3 时，回退到全局再补。**无法实现** ——
  `CompositionUsage` 上**没有 `lastSessionId` 字段**（`types.ts:174-179` 只有 4 个字段），
  `pickCompositionSuggestions` 也没有 session 入参。要做需先加字段。
- **不要引入复杂算法**。不需要时间衰减因子、不需要协同过滤。
  两个字段（`usageCount` / `lastUsedAt`）+ 两条去重规则，就足够解释 95% 的场景。
  **这条判断已被现实现证成** —— 落地后就是这个形状，没有加第三个排序键。

---

## 4. 字段改造清单：哪些变成 Selector

> **本节已实施完毕，保留为「哪些字段是刻意不做Selector」的判据记录。**
> 字段级现状判断见 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §6.2（QuickAdd 七个字段逐项）
> 与§7（MatchForm 的 16 个可见字段）。

| 字段 | 原现状 | 现状 | 数据源 |
| --- | --- | --- | --- |
| 名次 | `PlacementPicker`（已点选 ✅） | 保持 | — |
| **阵容** | 文本 + datalist + chip | **已改** `CompositionSelector`（单选 + 搜索 + 三段） | `CompositionUsage` + Preset |
| **强化符文** | 文本 `"A / B / C"` | **已改** `AugmentSelector`（有序、硬上限 3、chip 带 index） | `augment-service.ts`（592 项） |
| **核心装备** | 文本 | **已改** `ItemSelector`（无序、无上限） | `item-service.ts`（186） |
| **主要羁绊** | 文本 | **已改** `TraitSelector`，**但只在 MatchForm**（`MatchForm.tsx:266`），**QuickAdd 里刻意没有** —— 理由见 `UI_CONSOLIDATION.md` §6.3 | `trait-service.ts`（36） |
| 核心棋子 | 文本 + datalist | **仍未改**：`MatchForm.tsx:274-287` 是裸 `Input` + `<datalist>`，唯一不支持搜索的「选东西」字段（`UI_CONSOLIDATION.md` P1-12） | `championRepository`（65） |
| 最大问题 | `MistakePicker`（已点选 ✅） | 保持 | — |
| Session | `Select` ✅ | 保持 | — |
| 日期 / 时间 | `datetime-local` ✅，默认当前 | 未加「现在」快捷按钮（低优先） | — |
| 时长 | 自动推算 ✅ | 保持 | — |
| 下一局训练重点 | 自由文本 | **保持自由文本**（QuickAdd `:231-238`），`UI_CONSOLIDATION.md` §6.2 建议默认折叠 | — |
| 备注 | 自由文本 | **保持自由文本**（它的价值就是一句话的自由） | — |

原则：**涉及实体身份的字段一律 Selector；表达个人思考的字段一律自由文本。**
**这条原则仍然成立并且已经完整落地** —— 12 行里 9 行是Selector，剩下 3 行是刻意保留的自由文本
（训练重点 / 备注 / 时间）。唯一未完成项是核心棋子。

---

## 5. 数据模型：使用情况怎么存

### 5.1 Current

```ts
// src/domain/types.ts:49
interface Match {
  composition?: string;   // ← 唯一的真相来源，且是自由文本
  // …
}
```

使用情况根本没被存下来，只能全表扫描推算（`knownCompositions()`）。这在几百局规模下可以接受，
但它只算得出「次数」，算不出「最近」。

### 5.2 Problem

1. 没有 `lastUsedAt` → 做不出 Recent。
2. 记录被删除后，「用过」这件事也随之消失（`knownCompositions` 直接读 matches），
   逻辑上讲，删除一局不该让推荐变差 —— 是否这样取舍可以讨论，但至少现在是隐式行为。
3. `composition` 是字符串 → 无法挂别名、无法挂「属于哪个版本」、无法做归一化 key。
4. **索引缺失**：`db.ts:38` 给 `matches` 建的索引里有 `composition`，
   但按列表/统计都是全表扫描 + JS 聚合，未来局数上千后这里是第一个瓶颈。

### 5.3 Suggested evolution（分两步，先小后大）

**Step 1（已完成）— 使用情况表 + 归一化 key，不动 `Match.composition`**

```ts
// domain/types.ts:174-179 实际落地形态（4 个字段，比设计稿少3 个）
export interface CompositionUsage {
  compositionKey: string;   // ← 字段名是 compositionKey，不是设计稿里的 key
  usageCount: number;       // ← 同上，不是 useCount
  firstUsedAt: string;
  lastUsedAt: string;
}
```

**设计稿里有、实际没做的 3 个字段**（不是遗漏，是被砍掉了，记录在此以免被重新提出）：

| 设计稿字段 | 实际 | 为什么没做 |
| --- | --- | --- |
| `key` → `compositionKey` | 改名保留 | — |
| `displayName` | **不存在** | `compositionKey` 就是展示名（`normalizeCompositionKey` 只做 trim + 内部空白归一，不小写、不做全半角转换，见 `composition.ts:20-22`）。一个 key 对一个名字，所以不需要第二个字段。**代价**：§6 说的「用 `displayName` 展示、key 分组」这个分层没落地，两者是同一个值 |
| `lastSessionId` | **不存在** | Session 感知排序因此**无法实现**，§3.3 的最后一条与 §8 的第二行都已作废（见下） |
| `lastSetVersion` | **不存在** | Step 2 才需要；Step 1 不引入 |

Dexie v3 新表，实际索引为 `compositionUsage: "compositionKey, usageCount, lastUsedAt"`（`db.ts:62`）。
`db.ts:57` 的 v3 upgrade 会从已有 matches **一次性回填**（`db.ts:71` `bulkPut`），
所以旧备份导入后不需要手工触发重建。
写入时机：`addMatch / updateMatch / quickAdd` 成功后同步更新（在 `services/composition-usage-service.ts`，
**不在 repository 里**，保持「services 持有不变量」的既有约定）。

**Preset 的实际来源与设计稿不同**：`presetCompositions():35` 直接返回**全部 36 个羁绊名**
（`traitRepository.getTraits().map(t => t.name)`），不是设计稿说的「8–12 条主要羁绊核心阵容」。
该函数的注释自己写明了理由：项目没有 `Composition` 实体，羁绊名只是起步建议——
「A羁绊是棋盘上的协同，阵容是玩家给自己这条线的标签」（`composition-usage-service.ts:30-33`）。
这与 `UI_CONSOLIDATION.md` §6.3 指出的「用户其实已经在 QuickAdd 里选羁绊名了，只是选在了阵容字段里」是同一件事。

纯函数落在**两个**文件，不是原文设想的单个 `ranking.ts`（该文件不存在）：

```ts
// domain/composition/composition.ts
normalizeCompositionKey(value: string | null | undefined): string   // :20
summarizeCompositionUsage(matches, fallbackIso?)                   // :39
minIso / maxIso                                                    // :67 / :71
// domain/composition/suggestions.ts
FREQUENT_MIN_COUNT                                                  // :45
pickCompositionSuggestions({ usage, presets, limits })             // :47
flattenCompositionOptions(sections)                                 // :86
searchCompositionOptions(...)                                       // :95
```

**Step 2（暂不做，观察）— Composition 成为独立实体**

只有当下面任一条件成立时才有必要：

- 需要「阵容 × 版本」的性能对照（换版本时同一个阵容不能直接合并统计）；
- 需要「阵容由哪些核心羁绊/棋子构成」的结构化定义（用于搜索与推荐）；
- 需要跨 Session 合并同名阵容、需要别名 many-to-one 归并。

届时新增 `Composition` 实体，`Match.compositionId?: string` **与** `Match.composition?: string`
并存（和 `augmentIds` / `augments` 并存的加法式演进完全同构）。

**Step 1 已兑现的价值**：「Recent / Frequent / Preset 排序」这个 UX 问题已解决，
且没有引入迁移负担（现有记录无需转换）。
**Step 2 的价值判断仍未兑现** —— 结构化统计还没做（见 `REVIEW_DATA_REQUIREMENTS.md` §3：
新字段落`Match` 而非 `Composition`），所以现在仍然不知道 Step 2 需要哪些字段。结论不变：**继续不做。**

### 5.4 Migration impact

| 项 | 预测 | 实际 |
| --- | --- | --- |
| Dexie version | 2 → 3，现有记录无需转换 | **一致。** `db.ts:57` v3，`db.ts:71` 从 matches 回填 |
| Snapshot schemaVersion | 建议 2 → 3，可不改 | **未改，且判断正确。** `SNAPSHOT_SCHEMA_VERSION` 仍是 2（`types.ts:228`）；`compositionUsage` 可从 matches 重算，确无进 snapshot 的必要。`REVIEW_DATA_REQUIREMENTS.md` §6 第7 条同样要求本阶段零 schema 改动 |
| 旧备份导入 | 仍可导入，缺表时提供一次性重建动作 | **部分一致。** v3 upgrade 自动回填；未提供显式「重建使用情况」入口（`DataPage.tsx` 无此动作） |
| 导出 / CSV | CSV 不受影响；JSON 默认不带使用数据 | **一致。** `export-service.ts` 不导出该表 |
| 测试 | 186 tests 不受影响；新增排序纯函数需补测试 | **一致且已补。** `suggestions.test.ts` + `composition.test.ts` + `composition-usage-service.test.ts` |

---

## 6. Composition 要不要变成独立实体？结论

**现在不要，但把路铺好。** **这条结论至今未被推翻，Step 1 已完成且证明它是正确的选择。**

- **不做的理由**：只有当「阵容」需要承载超出一个名字之外的信息时，实体化才有收益。
  目前唯一的真实需求是「排序推荐」，一张使用表就够了。提前建实体 = 提前承担
  迁移、合并（同名写法合并）、版本（跨版本同名阵容）三件事的成本。
- **要做的准备**：
  1. ~~现在就引入 `normalizeCompositionKey()`~~ **已完成**（`composition.ts:20`）。
     价值立刻兑现：`stats.ts:126` 已改用归一化 key 分组，统计表里的 `"福牛"` / `"福牛 "` 合并成一行。
     **注意归一化的实际范围很窄**：只有 `trim()` + 内部连续空白压成一个空格，
     **没有**设计稿说的「小写 / 全角半角归一」。
  2. ~~Statistic 层（`compositionStats`）改用归一化 key 分组、展示用 `displayName`~~ **分组已完成**
     （`stats.ts:126`）。**但 `displayName` 分层未做** —— 该字段不存在于 `CompositionUsage`（`types.ts:174-179`），
     key 本身就是展示名。**残留**：归一化不做语义合并，`"福牛"` 与 `"福牛法师"` 仍是两行——
     `DASHBOARD_PLAN.md` §4.3 要求在表头提示用户，否则「阵容」行数会莫名膨胀。
  3. 不在 UI 上暴露「这是一个实体」这件事，以后加实体时 UI 不需要改。**仍然成立。**

---

## 7. 快速操作原则（写下来防止以后漂移）

> **本节被[UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) 当作约束条件引用，因此必须在此保持可读：**
> `:229` 与§6.4 引第 1 条（≤60 秒）、`:249` 与 P1-2 引第 2 条（每字段 ≤3 次交互）、
> `:296` 与 P0-2 引第 6 条（禁止二次确认弹窗）。修改本节前先看那三处。

1. **一局从「打完」到「落库」≤ 60 秒**：现在的顺序已经接近最优，不要加字段到快速路径。
   *（现实现：最少 2 次操作、典型 4–5 次操作 ≈20 秒，`UI_CONSOLIDATION.md` §6.4）*
2. **每个字段 ≤ 3 次交互**：键盘 → 点选 → 保存。出现自由输入时反问自己能不能点选。
   *（选满 3 个海克斯 = 9 次点击，正是该条被违反的例子，`UI_CONSOLIDATION.md` §6.2）*
3. **不依赖历史也能用**：首屏必须有内容（Preset）+ 必须允许手动输入。
   *（已兑现：`CompositionSelector` 三段无条件渲染 + `keepTyped()` 保留输入）*
4. **默认继承上一局的合理部分**：已有「保存并再记一局」保留三项，可以进一步做
   「沿用上一局阵容」的一键操作（`reuseLast` 已有实现，把它提到显眼位置）。
   *（「保留三项」现为5 项，见 §1.1；`reuseLast` 提级为待办，`UI_CONSOLIDATION.md` P1-3）*
5. **不确定就留空，不要强制**：除了名次，全部可选 —— 这是对训练闭环正确的取舍。
6. **禁止在快速路径里加二次确认弹窗**：录错了事后到编辑页改，比录入时被拦一道便宜得多。
   *（`UI_CONSOLIDATION.md` P0-2 据此判定：删除操作应走 **toast + undo**，不能走 confirm。）*

---

## 8. 后续自动化 / 推荐的可能性（只登记）

按顺序，等到对应前置条件成熟再做：

| 能力 | 前置条件 | 说明 |
| --- | --- | --- |
| 「沿用上一局」置顶 | 无，现在就能做 | 复用已有 `reuseLast`（`QuickAddDialog.tsx:141`）→ 已立项 `UI_CONSOLIDATION.md` P1-3 |
| 根据当前 Session 调整推荐 | **需先给 `CompositionUsage` 加 `lastSessionId`** | **该字段不存在**（见 §5.3）。原判断「表已建即可做」过于乐观 |
| 阵容 × 版本的性能对照 | Step 2 实体 + 版本维度 | 「这个阵容在 18.4 还行不行」。Step 2 仍不做 |
| 训练区间回顾 | Session 已在手（`startDate`~`endDate`） | 冲榜区间结束后自动汇总该区间用过的阵容 |
| OCR 后自动匹配阵容 | 归一化 key 已就绪 + OCR 阶段 | **归一化前置已完成**（`composition.ts:20`）。OCR 见 `SCREENSHOT_IMPORT.md` |

---

## 9. 落地检查清单（给实现阶段用）

> **10 / 11 项已完成。** 已完成项保留原文并标注实际落点，因为它们记录了「设计稿的文件/字段名与
> 实际落地不一致」的地方——这类不一致正是后续读代码时最容易踩的坑。
> **两处文件名在设计稿里写错，实现时改了名，原文措辞一并更正。**

- [x] 排序与归一化纯函数 —— **不在 `src/domain/composition/ranking.ts`（该文件从未存在）**，
  实际是两个文件：`composition.ts`（`normalizeCompositionKey:20`、`summarizeCompositionUsage:39`）
  与 `suggestions.ts`（`FREQUENT_MIN_COUNT:45`、`pickCompositionSuggestions:47` 等），均带测试
- [x] `src/data/db.ts` v3：`compositionUsage` store + 索引 `compositionUsage: "compositionKey, usageCount, lastUsedAt"`（`db.ts:57,62`）
- [x] `src/data/repository/composition-usage-repository.ts`：只碰 Dexie 的一层
- [x] 写入时机服务 —— **不在 `src/services/composition-service.ts`（该文件不存在）**，
  实际是 `src/services/composition-usage-service.ts`（预置数据同文件 `presetCompositions():35`，
  **不在原文设想的 `composition-preset.ts`**）
- [x] `src/components/ui/Selector.tsx`（201 行）：6 个原语，供四个业务选择器共用
- [x] `src/components/matches/CompositionSelector.tsx`：三段 chips + 搜索 + `keepTyped()`
- [x] `QuickAddDialog`：接入 Selector（`:203` 阵容 / `:212` 海克斯 / `:219` 装备）；首屏已有内容
- [x] `MatchForm` 的 C 面板：羁绊 `:266` / 装备 `:289` / 海克斯 `:298` 均已接入。**核心棋子 `:274-287` 仍未接入**（唯一遗留项，`UI_CONSOLIDATION.md` P1-12）
- [x] Statistics 的 `compositionStats` 改用归一化 key（`stats.ts:126`）
- [ ] Export snapshot 兼容 +「从现有对局重建使用情况」入口（Data 页）
  —— 部分完成：snapshot **兼容性已成立**（`SNAPSHOT_SCHEMA_VERSION` 保持 2，该表不进快照）；
  v3 upgrade 会自动回填（`db.ts:71`），但 `DataPage.tsx` **没有**显式的「重建使用情况」入口，
  这与 `REVIEW_DATA_REQUIREMENTS.md` §6 第 7 条「本阶段不改 schema」一致，属可选项

**新增待办（来自 `UI_CONSOLIDATION.md`，不在原清单里）**：
- [ ] 核心棋子接入 Selector（`MatchForm.tsx:274-287`）—— P1-12
- [ ] QuickAdd 默认折叠海克斯 / 装备 / 时间 / 训练重点 —— P1-2，直接服务于本文 §7 第 2 条
- [ ] 「复制上一局」从 hint 提级为可见操作 —— P1-3，直接服务于本文 §7 第 4 条
