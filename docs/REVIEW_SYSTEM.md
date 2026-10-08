# REVIEW_SYSTEM · 复盘系统（模板化）

> ## 字段清单正在修订中 —— 本文是「模板长什么样」的参考，不是「应该有哪些字段」的判断
>
> **[REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md) 从「Dashboard 未来要回答的问题」
> 倒推出了另一套字段清单，与本文 §4 冲突，且已经论证过本文的取舍。** 两文关系是：
> 本文 = 被评估的对象，RDR = 评估结论。
>
> **为什么本文必须保留而不是删除**：`REVIEW_DATA_REQUIREMENTS.md` §7 逐条写了
> 「`REVIEW_SYSTEM.md` 说了什么 → 本文的态度（补充 / 修正 / 不动）」，其§5.2的逐字段砍除理由
> 直接引用本文 §4 的字段表。读者要判断那些结论对不对，必须能在同一处看到本文主张了什么。
>
> ### 已被推翻的判断（以 RDR 为准，本文保留原文作为「被论证的对象」）
>
> | 本文断言 | RDR 的结论 | 依据 |
> | --- | --- | --- |
> | §6「建议必填（新增 2 项）：`openingPlan` + `openingQuality`」（`:212`） | **反对。** 改为可选，且一律不进 `isReviewComplete`。理由：`reviewed` 是所有统计的可用性门槛（`DashboardPage.tsx:144-148`、`StatisticsPage.tsx:124`），加必填等于在已有 3 段手写 + 4 项必填之上再抬门槛 | RDR §5.4 |
> | §4 的字段优先级论证（按「可统计性」排序，`openingPlan` / `openingQuality` 最高性价比） | **被点击预算核算取代。** 硬规则是「采集成本 > 1 次点击且解锁图表 < 1 张就砍掉」，本文从未做过这个核算 | RDR §5.1–§5.2 |
> | §4 的 4 个 `*Note` 自由文本字段（`openingNote:108` / `augmentNote:116` / `transitionNote:127` / `turningPointNote:135` / `itemNote:143`） | **全部砍掉**（5 个 note 字段）。理由：不可聚合，而 `opening` / `midGame` / `lateGame` 三个自由文本已经是它们的容器 | RDR §5.2 |
> | §4.1 `openingItem`（`:107`，9 值单选） | **砍掉**。装备类型 × 名次的图会因样本太散而不可读 | RDR §5.2 |
> | §4.2 `augmentChoice: [string,string,string]`（`:114`） | **砍掉**。`Match.augmentIds` 已存在且已采集（`MatchForm.tsx:298`），Review 只需存**理由** | RDR §7、`types.ts:81` |
> | §4.5 `coreItemIds`（`:142`） | **砍掉**。`Match.coreItemIds` 已存在（`types.ts:80`，`MatchForm.tsx:289`），复盘页应预填展示不要求重选。**本文 §5.1「预填」表其实已指出这一点** | RDR §7、`types.ts:80` |
> | §4.6 `compCompletion`（`:153`） | **砍掉**。与 `itemPlan` 高度重叠，且 `placement` 本身是成型度的终极度量 | RDR §5.2 |
> | §4的 7 个独立 Section（`:74`） | **部分接受**：各段的结构化部分接受，**7 个独立 Section 拒绝** —— 每多一个 Section 就多一次视觉跳转，与「让复盘更快」相反 | RDR §7 |
> | §8.3 `ReviewStructured` + `version` 字段 + 提升到顶层的 `openingPlan` / `openingQuality`（`:264-285`） | **可以整体推迟或放弃**：新字段全部落 `Match`（`Match` 才是所有统计的唯一入口，`stats-service.ts:30`），因此不需要结构化对象，也不需要版本号 | RDR §4.3、§7 |
> | §11优先级表的 P0 =「`domain/review/template.ts` + `ReviewStructured` + 版本字段」 | **排序被取代。** RDR §6「执行顺序建议」第0 步是**零新字段**地聚合已有数据（`augmentIds` × 名次、`Decision.hindsight`、`primaryMistake` 时间序列…），第 1 步才加第一个字段 | RDR §6 |
>
> ### 仍然成立、不要改的判断
>
> - **§1.3 不变量「统计只读一个字段」** —— `primaryMistake` 从 Review 回写到 Match（`review-service.ts:57`）。
>   RDR §6 第 1 条明确要求这条不得被破坏。
> - **§6 的 4 项必填**（`primaryMistake` / `biggestMistake` / `bestDecision` / `nextGameFocus`）
>   —— RDR §5.4 判「不动，一字不改」。
> - **§9 结尾「不要删除三段自由文本，而是在它前面加一层结构化事实」**
>   —— RDR §6 第 5 条确认，且要求在 UI 上说清这三段**不进任何统计**。
> - **§7 完整度从布尔到百分比** —— RDR §7 判「不动，但排序在后」：转百分比需要先有可选字段，
>   否则权重全在 4 个必填上，百分比恒等于布尔值。
> - **§5.1 预填表** —— RDR §7 逐条确认（海克斯 / 装备 / 最终阵容 / `primaryMistake` / `nextGameFocus`）。
>
> ### 行号对照（`REVIEW_DATA_REQUIREMENTS.md` 按旧行号引用本文）
>
> 本次修订在文首插入了公告块，行号整体下移。RDR 的引用按下表换算：
>
> | RDR 引用 | 内容 | 本文现位置 |
> | --- | --- | --- |
> | `:53` | 不变量「统计只读一个字段」 | `:116` |
> | `:61` | 问题 1「三段自由散文」 | `:124` |
> | `:70` | 「点选 80% + 补充 20%」 | `:133` |
> | `:74` | 七段闭环 | `:137` |
> | `:99` | 约定「不用嵌套对象」 | `:174-175` |
> | `:107` / `:108` | `openingItem` / `openingNote` | `:183` / `:184` |
> | `:114` / `:116` | `augmentChoice` / `augmentNote` | `:193` / `:195` |
> | `:126` / `:127` | `transitionProblems` / `transitionNote` | `:213` / `:214` |
> | `:135` | `turningPointNote` | `:226` |
> | `:142` / `:143` | `coreItemIds` / `itemNote` | `:238` / `:239` |
> | `:145-146` | 装备栏应从 Match 预填 | `:241-242` |
> | `:209` | 必填 4 项 | `:326` |
> | `:212` | 建议必填新增 2 项 | `:332` |
> | `:220-236` | 完整度百分比方案 | `:344-365` |
> | `:290` | `ReviewStructured` | `:398-412` |
> | `:316-327` | §9 统计分析可能性表 | `:463-472` |
> | `:330-332` | 不要删除三段自由文本 | `:474-478` |
> | `:339` / `:340` | 不要做成 wizard / 紧凑视图 | `:489` / `:488` |
> | `:352` | 优先级表 P0 行 | `:507` |
>
> 配套：[PRODUCT_ROADMAP](./PRODUCT_ROADMAP.md) · [UI 优化](./UI_IMPROVEMENT_PLAN.md) · [快速录入](./QUICK_RECORD_UX.md) · **[复盘数据需求](./REVIEW_DATA_REQUIREMENTS.md)**
> 基线：`main` @ `7347d3f` + 工作区 Phase 2T/3A 未提交改动。目标：**把「写复盘」变成「完成复盘模板」**。

---

## 1. 当前状态

### 1.1 数据模型

```ts
// src/domain/types.ts:121
export interface Review {
  id: string;
  matchId: string;

  /** 三段自由文本 */
  opening?: string;    // 开局
  midGame?: string;    // 中期
  lateGame?: string;   // 后期

  bestDecision?: string;
  biggestMistake?: string;
  primaryMistake?: MistakeType;
  nextGameFocus?: string;

  selfScore?: number;  // 1–5
  createdAt: string;
  updatedAt: string;
}
```

### 1.2 唯一的完整度判据

三个 Section 的提示词和「复盘是否完成」的判据都在 `src/domain/review/review.ts`：

```ts
REVIEW_SECTIONS = { opening: {prompts:[…]}, midGame: {…}, lateGame: {…} }
isReviewComplete(input) = primaryMistake && biggestMistake && bestDecision && nextGameFocus
```

### 1.2 UI

`src/components/reviews/ReviewForm.tsx`：三个大 Textarea（4/5/4 行）+ 结论 Panel
（`MistakePicker` + 三个必填 textarea + `selfScore` 1–5 按钮组）。
`ReviewPage.tsx:89` 用 `lg:grid-cols-[1fr_300px]`，右侧 aside 显示对局速览 + 决策入口。

### 1.3 不变量（写得很清楚，要保留）

`src/services/review-service.ts:51` 的 `writeReviewRecord`：
`match.reviewed` 只在四必填齐全时才为 true，`primaryMistake` 从 Review 回写到 Match，
保证**统计只读一个字段**。这条规则不能变。

---

## 2. 当前问题

| # | 问题 | 后果 |
| --- | --- | --- |
| 1 | 复盘 = 三段自由散文（"按提示逐条写，一两句话就够"） | 需要动笔的地方太多，复盘率低；写出来的东西无法统计 |
| 2 | 可被统计的字段只有 `primaryMistake` 一个 | 「某种开局策略表现如何」「某个海克斯表现如何」全部回答不了 |
| 3 | `isReviewComplete` 是**布尔** | 没法表达「只差一点点」，也没法做「先看一环再补一环」 |
| 4 | 没有步骤感：三段 + 结论一次性铺开 | 页面很长，心理负担集中在打开的第一秒 |
| 5 | `selfScore`（1–5 按钮组）是唯一的结构化字段 | 说明「点选式」玩家是接受的，只是没被推广到前面三段 |
| 6 | 开局 / 中期 / 后期三段全是自由文本，比例过高 | 绝大多数内容要靠书写，与「复盘从写作变成勾选」（G2）相背 |
| 7 | 小于 lg 时右侧「本局信息」aside 掉到页面最底 | 复盘时最需要参照的东西不在视野内 |

> 第 6 条的重点不是「消灭自由文本」，而是**把它压到「补充」的位置** ——
> 目标比例是「点选 80% + 补充 20%」，而不是反过来。

---

## 3. 目标流程（七段闭环）

```
开局
 ↓
海克斯
 ↓
过渡
 ↓
中期转折
 ↓
装备
 ↓
最终阵容
 ↓
总结
```

每一步的交互成本从高到低递减：**前六步以点选为主，最后一步才写**。

---

## 4. 模板字段设计

> **⚠ 本节是被评估的对象，请勿直接实现。**
> [REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md) §5.2 对本节逐字段做了点击预算核算，
> 结论是**保留 7 个（5 必选 + 2 可选，最坏 8 次点击）、砍掉 6 个**（5 个 `*Note` + `openingItem` +
> `compCompletion`），另有 3 个「勉强保留但优先级低」（`compMatchPlan` / `openingQuality`）。
> 本节表格**原样保留**，因为 RDR 的论证需要读者看到原文才能判断。
> 已砍字段在表内用删除线标出。
>
> 本节自身的两个内在矛盾，一并记在这里：
> - §4.5 `coreItemIds` 与 §5.1 预填表「复盘里的这栏应该从 Match 预填，而不是让人再填一遍」自相矛盾。
>   RDR 采信后者。
> - §4.2 `augmentChoice` 与 §4.5 `coreItemIds` 是**重复采集** —— 两者都已在 `Match` 上
>   （`types.ts:81` / `:80`），`MatchForm.tsx:288-303` 已采集。RDR 采信「不要在 Review 里再选一次」。

> 约定：`Ctrl` = 单选（radio/chips）·`Multi` = 多选（checkbox/chips）·`Text?` = 可选补充文本
> 存储层字段类型为标量或字符串数组——**不用嵌套对象**，方便后续进 Dexie 索引和统计分组。

### 4.1 开局 `opening`

| 字段 | 类型 | 取值 | 必填 | 可统计 |
| --- | --- | --- | --- | --- |
| `openingPlan` | Ctrl | `WIN_STREAK` 连胜 / `LOSE_STREAK` 连败 / `STANDARD` 正常运营 / `ECONOMY` 走经济 / `FORCE` 硬玩某阵容 | ✅ | ✅ |
| `openingQuality` | Ctrl | `GOOD` 很好 / `OK` 一般 / `BAD` 很差 | ✅ | ✅ |
| ~~`openingItem`~~ | Ctrl | `SWORD` 大剑 / `BOW` 弓 / `ROD` 法棒 / `TEAR` 眼泪 / `VEST` 锁子甲 / `CLOAK` 斗篷 / `BELT` 腰带 / `SPATULA` 铲子 / `GLOVE` 拳套 | ⬜ | ✅ |
| ~~`openingNote`~~ | Text? | 少于 30 字 | ⬜ | ⬜ |

> **勘误（本文）**：`openingPlan` / `openingQuality` 两行的「必填 ✅」**已被 RDR §5.4 推翻**，
> 改为可选且不进 `isReviewComplete`。`openingItem` / `openingNote` 两行已被 RDR §5.2 砍掉。

### 4.2 海克斯 `augments`（三个槽位）

| 字段 | 类型 | 取值 | 必填 | 可统计 |
| --- | --- | --- | --- | --- |
| ~~`augmentChoice: [string, string, string]`~~ | Selection ×3 | 数据源 `augmentRepository`（592），写 `augmentIds` | ⬜ | ✅✅ |
| `augmentReason` | Multi | `COMP_FIT` 阵容契合 / `ITEM_FIT` 装备契合 / `ECONOMY` 经济需求 / `TEMPO` 节奏需求 / `PIVOT` 临场转型 / `FLEX` 没得选/保底 / `OTHER` 其他 | ⬜ | ✅ |
| ~~`augmentNote`~~ | Text? | — | ⬜ | ⬜ |

> 海克斯三个槽位的顺序本身有信息量（第一/第二/第三），因此用**定长数组**而不是 Set。
>
> **勘误（本文 + RDR）**：本节「✅✅ 最有价值的一列」的判断**方向对但对象错**。
> 海克斯 × 名次的统计**今天就能做，且不需要 Review 上的任何字段** ——
> `Match.augmentIds` 已在每局上（`types.ts:81`），`AugmentSelector` 已采集（`MatchForm.tsx:298`），
> `augment-service.ts` 有 592 条快照，但全仓库零聚合。RDR §3 R6 把这一条标为
> **「★ 零新采集，纯改造」**并列为第 0 步执行项。在 `Review.augmentChoice` 上再存一份是重复采集。
>
> 因此本节应保留的是 `augmentReason`（理由确实只有复盘时才知道），不是 `augmentChoice`。

### 4.3 过渡 `transition`

| 字段 | 类型 | 取值 | 必填 | 可统计 |
| --- | --- | --- | --- | --- |
| `transitionStage` | Ctrl | `STAGE_2` / `STAGE_3` / `STAGE_4` / `NONE` 没过渡（一路到底） | ⬜ | ✅ |
| `transitionStrategy` | Ctrl | `WIN_STREAK_HOLD` 保连胜 / `ECON_HOLD` 保经济 / `LOSE_STREAK` 走连败 / `STABILIZE` 先稳血 / `FAST_LEVEL` 抢人口 | ⬜ | ✅ |
| `transitionProblems` | Multi | `NO_FRONTLINE` 前排不足 / `NO_DAMAGE` 输出不足 / `NO_ECONOMY` 经济不足 / `BAD_ITEMS` 装备不理想 / `BAD_ROLLS` 搜牌不顺 / `HP_PRESSURE` 血量压力 / `NO_SPACE` 人口不够 / `CONTESTED` 被同行卡 | ⬜ | ✅✅（出现频率分析的核心） |
| ~~`transitionNote`~~ | Text? | — | ⬜ | ⬜ |

> RDR §7 接受本节的 `transition.problems` 8 值建议（R3），但要求**必须是多选**且**可留空**
> （一局可能同时「装备没做出来」+「搜牌不顺」）。`transitionStage` / `transitionStrategy`
> 未被 RDR 采纳进那7 个字段 —— 若要保留需自行论证点击预算。

### 4.4 中期转折 `turningPoint`

| 字段 | 类型 | 取值 | 必填 | 可统计 |
| --- | --- | --- | --- | --- |
| `turningPointType` | Multi | `CORE_UPGRADE` 核心棋子升星 / `KEY_ITEM` 获得关键装备 / `AUGMENT_PIVOT` 海克斯改变路线 / `OPPONENT_PRESSURE` 对手压力 / `SHOP_LUCK` 商店刷新情况 / `FORCED_PIVOT` 临时转型 / `NONE` 没有明显转折 | ⬜ | ✅ |
| `turningPointStage` | Ctrl | `STAGE_3` / `STAGE_4` / `STAGE_5` / `LATE` | ⬜ | ✅ |
| ~~`turningPointNote`~~ | Text? | — | ⬜ | ⬜ |

> **勘误（本文 + RDR）**：RDR §3 R2 采纳的是 `turningPointStage`，但取值域**与本节不同**：
> RDR 用字符串 `"2-1" | "3-2" | "4-1" | "5-1" | "FINAL"`（复用 `Decision.round` 的既有写法），
> 而不是本节的枚举 `STAGE_3 / STAGE_4 / STAGE_5 / LATE`。RDR 的理由是可与 `DecisionPanel.tsx:63`
> 已有的 `<datalist>`（`3-2` / `4-1` / `最终`）对齐。`turningPointType` 未被 RDR 采纳。

### 4.5 装备 `items`

| 字段 | 类型 | 取值 | 必填 | 可统计 |
| --- | --- | --- | --- | --- |
| `itemCarrierPlan` | Ctrl | `PLANNED` 按计划给到主 C / `IMPROVISE` 临时拼凑 / `SCATTERED` 装备分散 / `UNFINISHED` 没做出来 | ⬜ | ✅ |
| ~~`coreItemIds`~~ | Selection | `itemRepository`（186） | ⬜ | ✅ |
| ~~`itemNote`~~ | Text? | — | ⬜ | ⬜ |

> 注意：`Match` 上已有 `coreItems` / `coreItemIds` —— 复盘里的这栏应该**从 Match 预填**，
> 而不是让人再填一遍（见 §5「预填」）。
>
> **本文的这条判断被 RDR 采信并加强**：`coreItemIds` 是**重复采集**，应从 Review 里整个去掉
> （`types.ts:80`，`MatchForm.tsx:289` 已采集）。`itemCarrierPlan` 被 RDR §3 R4 采纳，
> 但**改名 `itemPlan`**，且取值域减为 4 值（去掉 `SCATTERED`，因为它与 `IMPROVISE` 区分度低）。

### 4.6 最终阵容 `finalComp`

| 字段 | 类型 | 取值 | 必填 | 可统计 |
| --- | --- | --- | --- | --- |
| `compMatchPlan` | Ctrl | `ON_PLAN` 跟开局一致 / `PARTIAL_PIVOT` 部分转型 / `FULL_PIVOT` 完全转型 / `FORCED` 被迫 | ⬜ | ✅ |
| ~~`compCompletion`~~ | Ctrl | `FULL` 成型 / `PARTIAL` 半成型 / `UNFINISHED` 没成型 | ⬜ | ✅ |
| `positioningIssue` | Multi | `NONE` / `FRONTLINE` 前排站位 / `BACKLINE` 后排站位 / `CARRY_FOCUSED` 主 C 被切 / `NO_REPOSITION` 没换站位 | ⬜ | ✅ |

> **勘误（本文 + RDR）**：`compCompletion` 被砍 —— 与 `itemPlan` 高度重叠，且 `placement` 本身就是
> 「成型度」的终极度量。`positioningIssue` 被 RDR §3 R5 采纳，但**取值域调整**：
> RDR 要求它包含 `NONE` 以便显式记录「站位没问题」，否则「没填」与「没问题」无法区分、会污染统计 ——
> 本节的 `NONE` 混在7 个值里且未标注语义，实践中会被当成一个真问题。
> `compMatchPlan` 被判「勉强保留，优先级低于 `itemPlan`：两者问的都是有没有按计划走」。

### 4.7 总结 `conclusion`（保留自由输入）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `primaryMistake` | Ctrl（`MistakePicker`，11 类） | ✅ | **保持现状** —— 它是已有统计的唯一入口 |
| `biggestMistake` | Text | ✅ | 本局最大的问题 |
| `bestDecision` | Text | ✅ | 本局最成功的地方 |
| `nextGameFocus` | Text | ✅ | 下一局应该注意什么 |
| `selfScore` | 1–5 按钮组 | ⬜ | 保持现状 ✅ |

**唯一保留大段自由输入的地方就是这里**，而且每项都是「一句话」，不是散文。

---

## 5. 关联设计

### 5.1 预填（减少重复劳动）

| 复盘字段 | 从哪来 |
| --- | --- |
| 海克斯三槽位 | `Match.augmentIds` / `Match.augments`（已经在入选–adaptor 写入里存在） |
| 核心装备 | `Match.coreItemIds` / `Match.coreItems` |
| 最终阵容 | `Match.composition` / 未来 `compositionId` |
| `primaryMistake` | `Match.primaryMistake`（快速录入时已选的话） |
| `nextGameFocus` | 上一份复盘的 `nextGameFocus`（「上次说要练的，这次练了吗」） |

### 5.2 快速录入的半自动复盘

现状：`quickAdd` 会调 `seedReview()` 把 `nextGameFocus` 存进 Review，但**不标记 reviewed**
（`review-service.ts:34`、README 也写明）。这是正确的 —— 保持。
新的可能性：在 `/matches/:id/review` 打开时，把已有的一切预填好，
玩家只需要补剩下的部分。**这条比任何新字段都更能提升复盘率。**

### 5.3 Timeline 衔接

Phase 3C 落地后，Timeline 就有了可用素材：

```
2-x 开局 (openingPlan / openingQuality)
3-2 第一海克斯选择        ← 素材已存在：Match.augmentIds，无需等模板
   过渡 (transitionStage / transitionProblems)
4-x 中期转折 (turningPointStage / turningPointType)
   关键决策 (Decision.round 结构化后并入)
5-x 最终阵容 (compCompletion)
结果 名次 + primaryMistake
```

因此拆 `Decision.round` → `{stage, round}` 应为 P2 且与 Timeline 同期做。

> **勘误（本文 + RDR）**：`Phase 3C` 这个编号已不存在于任何当前文档，且 Timeline 的实现依赖已变：
> - 第 3 行「第一海克斯选择」的素材**今天就有** —— `Match.augmentIds` 每局都有（`types.ts:81`）。
>   RDR §6 把「`augmentIds` × 名次」列为执行顺序**第 0 步**，不依赖任何模板。
> - 第 6 行 `compCompletion` 已被 RDR §5.2 砍掉。
> - 「拆 `Decision.round` → `{stage, round}`」不再是任何新字段的前置：RDR R2 用的是字符串
>   `"2-1" | "3-2" | ...`，不解构 `round`。Timeline 方案本身仍只存在于
>   `UI_IMPROVEMENT_PLAN.md` §9。

---

## 6. 必填 / 可选策略（明确界限）

> **⚠ 本节的「建议必填（新增 2 项）」已被 [REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md)
> §5.4 明确反对。** 原文本保留，因为它是被论证的对象。

**必填（4 项，和现状完全一致）**：`primaryMistake` / `biggestMistake` / `bestDecision` / `nextGameFocus`。
理由：这是训练闭环的出口 —— 没有「下一局练什么」，复盘就没有闭环。**这条不要放宽。**
→ **RDR §5.4 判「一字不改」**，并追加理由：`isReviewComplete`（`review.ts:38-45`）是 4 个 `&&`，
任一为falsy → `match.reviewed = false`（`review-service.ts:57`）→ `reviewed` 是所有统计的
可用性门槛（`DashboardPage.tsx:144-148` 的 badge、`StatisticsPage.tsx:124` 的「N 局已复盘」）。

**~~建议必填（新增 2 项）~~** ~~`openingPlan`、`openingQuality`~~。
理由：这两项是最高性价比的统计维度，而且开局印象最深，点一下几乎不花时间。
→ **RDR §5.4 反对，理由可验证**：加 2 个必填 = 在已经需要 3 段手写 + 4 项必填的表单上再加 2 个点击，
门槛直接抬高。RDR 要求**新增字段一律可选、一律不进 `isReviewComplete`**，
引导用 `MatchForm` 已有的 `selfScore` 模式（可选 + hint + `aria-pressed`，`ReviewForm.tsx:125,132`），
而不是照抄 `primaryMistake` 的必填模式。

**其余全部可选**：任何时期都不应该因为「模板没填完」而阻止保存 ——
除了上述出口字段。**必填 / 可选之间只影响 UX 提示，不参与拦截。**

---

## 7. 复盘完整度（从布尔到百分比）

> **本节保留，但排序被 RDR §7 判为「不动，排在最后」**：转百分比需要先有可选字段，
> 否则权重全在 4 个必填上，百分比恒等于布尔值。RDR §5.5 给出的落地形态不同 ——
> **默认显示 8 次点击的 chip 组，三段手写折叠成「补充说明」**，而不是本节第 2 点设想的七段指示器。

```ts
// domain/review/review.ts —— 建议新增
export interface ReviewCompleteness { filled: number; total: number; percent: number; missing: string[] }

reviewCompleteness(review: Review): ReviewCompleteness
```

设计要点：

1. 分成**必填权重**和**可选权重**：必填全满 = 100%？不 —— 应该是必填全满 = 60%，
   可选字段填满剩下的 40%。这样「已完成复盘」仍然是一个二元事实（保持现有不变量），
   而完整度是一个**激励指标**，而不是门槛。
2. UI 上按七段渲染指示器：「未开始 / 部分 / 完成」，而不是一个抽象的总分。
3. 列表页可以增加「复盘完整度」列 —— 用它在**没有允许复查版的完整度纠纷**的情况下
   告诉用户哪些局值得回去补。
4. `isReviewComplete` 保留不动，它是 `match.reviewed` 的唯一判据。

---

## 8. 存储方案

> **⚠ 本节的方案 C 已被 [REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md) §4.3 判为
> 不需要，且 §4.4 证明 7 个新字段全部可以是零 schema 改动。**
> 关键差异：本节把结构化字段放在 `Review` 上并需要 `version` 做迁移；RDR 把它们放在 `Match` 上，
> 于是 `ReviewStructured` 对象和版本字段**都不存在**，「模板存储方案」这个问题整体消失。
> 原文保留作为被论证的对象；RDR 的三个选项对照见其 §4.4。

### 8.1 Current

`Review` 的字段是扁平标量 / string[]，三个大 textarea。

### 8.2 Problem

增加 ~20 个结构化字段：

- **方案 A：全部拍平成 `Review` 一列**
  → `Review` 字段膨胀到 30+，domain / UI / export 都要跟着改，以后加字段继续膨胀。
- **方案 B：塞进一个 `structured` JSON 列**
  → 字段演进自由，但**失去类型边界**，且无法直接被 Dexie 索引（统计要全表扫描后 JS 分组 ——
  考虑到数据是单人规模，几百到几千条，**这其实可以接受**）。
- **方案 C（推荐）：B + 少量「提升」字段**

### 8.3 Suggested evolution

> **已被 RDR §4.3 修正**：新字段落 `Match` 而非 `Review`，因此 `ReviewStructured` 与 `version`
> **都不需要**，`Review` 的存储方案可以整体推迟或放弃。以下代码块保留原文，仅作对照。

```ts
export interface Review {
  // … 现有字段全部保留，不删除、不改名 …

  /** 模板化复盘数据。undefined = 旧格式记录（三段自由文本） */
  structured?: ReviewStructured;
}

export interface ReviewStructured {
  /** 模板版本：新增/废弃字段时才 +1，用于向前兼容解析 */
  version: 1;
  opening?:  { plan?: OpeningPlan; quality?: OpeningQuality; item?: OpeningItem; note?: string };
  augments?: { picks?: (string|null)[]; reasons?: AugmentReason[]; note?: string };
  transition?: { stage?: Stage; strategy?: TransitionStrategy; problems?: TransitionProblem[]; note?: string };
  turningPoint?: { types?: TurningPointType[]; stage?: Stage; note?: string };
  items?: { carrierPlan?: ItemPlan; coreItemIds?: string[]; note?: string };
  finalComp?: { matchPlan?: CompMatchPlan; completion?: CompCompletion; positioningIssue?: PositioningIssue[] };
}

/** 提升到顶层的少量高频统计维度 —— 便于将来进 Dexie 索引 */
export interface Review {
  openingPlan?: OpeningPlan;
  openingQuality?: OpeningQuality;
  primaryFailureReason?: FailureReason;  // 可选：后期口推出的单一主要失败原因
}
```

规则：

1. **模板定义为单一真源**：新增 `domain/review/template.ts`，导出 `REVIEW_TEMPLATE`
   （字段名 + 类型 + 选项 + 必填 + 是否可统计）。UI 由它驱动渲染，
   `validateReviewInput` 由它驱动校验，export 由它描述 —— 不再三处各写一遍。
2. **`version` 内置**：将来改字段名时，写迁移纯函数 `migrateStructured(v1 → v2)`，
   读的时候惰性升级，不重写历史记录。
3. 所有取值用 **`as const` 联合类型**（和现有 `MISTAKE_TYPES` / `DECISION_TYPES` 的写法一致），
   不要引入 class / schema 库。
4. 枚举名一律用英文常量 + zh 文案映射（现有 `domain/labels.ts` 的 `mistakeLabel` 就是这么做的），
   UI 显示走 label 函数，不要直接显示常量。

### 8.4 Migration impact

| 项 | 影响 |
| --- | --- |
| `Review` | 纯加法，旧记录 `structured === undefined`，UI 走 fallback（继续显示三段自由文本） |
| Dexie | **不需要改版本号**（对象内的新字段无需 index）；只有把 `openingPlan` 提升为索引时才走 v3 |
| Snapshot | 建议 bump `SNAPSHOT_SCHEMA_VERSION` → 3，因为多了字段（旧 snapshot 仍可导入） |
| CSV | 导出时把结构化字段摊平成若干列（向后兼容，旧 CSV 结构不变） |
| `isReviewComplete` | 完全不变 → `match.reviewed` 语义不变 → 现有统计测试全部通过 |
| 测试 | 需补：`template` 完整性、版本迁移、完整度计算 |

---

## 9. 统计分析可能性（这是做模板化的最大理由）

> **本节 10 行里，5 行今天就能答且不需要任何新字段。**
> [REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md) §7 判「接受方向，但重排优先级」，
> §2 列出了13 个**零schema 改动**就能回答的问题（名次分布 / 错误趋势 / `Decision.hindsight` 统计 /
> 阵容统计 / 时段 / session 对比 / 周对比 / 复盘率 / 连续天数 / 时长相关性 / 血量相关性……）。
> 下面第 3 行（海克斯）尤其要注意：它问的「某个海克斯是否值得选」**不需要 `augments.picks[i]`** ——
> `Match.augmentIds` 已经在每局上（`types.ts:81`，`augment-service.ts` 592 条快照），RDR 标为
> 「★ 零新采集，纯改造」并排在执行顺序第 0 步。

Phase 4 的纯函数都放 `src/domain/stats/`，结构照搬现有 `CompositionStat`：

| 问题 | 维度 | 指标 | RDR 优先级 |
| --- | --- | --- | --- |
| 哪种开局策略表现更好？ | `openingPlan` | games / avgPlacement / top4Rate | R1 · **保留**（1 击） |
| 开局质量是否决定结果？ | `openingQuality` | avgPlacement 分组 + 与 selfScore 对照 | **勉强保留**，与 `primaryMistake` 争夺同一批判断 |
| 某个海克斯是否值得选？ | `augments.picks[i]` | 该海克斯出现场次、top4Rate、是谁（第几轮）选的 | **改用 `Match.augmentIds`** —— 数据已有，只差一个纯函数 |
| 选海克斯的理由是否影响结果？ | `augments.reasons` | 按 reason 分组的 top4Rate | R6② · **保留**（0–3 击，可整行留空） |
| 哪种过渡方式更容易崩？ | `transition.strategy` | avgPlacement / bottom4Rate | 未采纳，未论证 |
| 最常见的问题是什么？ | `transition.problems` | 出现频率 Top N（比 mistake 分类更细、更贴近实战） | R3 · **保留**（1–3 击，多选可留空） |
| 中期转折通常发生在什么时候？ | `turningPoint.stage` | 分布 + 与最终名次的相关性 | R2 · **保留**（1 击），但若要再砍先砍它 |
| 装备给主 C 了吗？ | `items.carrierPlan` | top4Rate 分组 | R4 · **保留**（1 击，改名 `itemPlan`） |
| 按计划走 vs 被迫转型？ | `finalComp.matchPlan` | avgPlacement 分组 | **勉强保留**，优先级低于 `itemPlan` |
| 站位是否拖后腿？ | `finalComp.positioningIssue` | 频率 + top4Rate | R5 · **保留**（预选 `NONE`，期望成本≈0） |

**这里有一条重要的产品判断**：
现有 `primaryMistake`（11 类）是「归因结论」，而上面这些字段是「过程事实」。
结论可以被美化，过程不会。两者同时存在才有说服力 —— 这也是为什么不要删除三段自由文本，
而是**在它前面加一层结构化事实**。

> **本判断被 RDR §5.3 确认并加强**：R1–R5 的作用不是替代 `primaryMistake`，
> 而是提供它给不出的分辨率。RDR 追加一条执行规则：三段自由文本**保留但必须明确不进任何统计**，
> UI 上要用hint 说清，否则用户会以为写了就会被统计。

---

## 10. UI 形态建议

- **步骤化但不强制线性**：顶部七段指示器，点哪段跳哪段；保存按钮始终在最底部 + 顶部 sticky。
- **一次性铺开 vs 分步**：建议默认铺开（复盘时经常要前后对照），但提供「紧凑视图」开关。
  不要做成 wizard —— 复盘不是填表考试。
- **右侧 aside 在小屏**：把「本局信息」做成可折叠但**默认展开**的 summary，
  并且 sticky（现在 `< lg` 时它掉到了页面最底，见 `ReviewPage.tsx:89`）。
- **草稿保护**：至少加 `beforeunload` 提示或 localStorage 草稿，防止写了半天丢失。
- **键盘优先**：单选 chip 支持左右方向键切换，与 `PlacementPicker` 现有的按键习惯一致。

---

## 11. 优先级与顺序

> **⚠ 本表的 P0 排序已被 [REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md) §6
> 「执行顺序建议」取代。** 差别是根本性的：本文的 P0 是「先建结构」（`template.ts` +
> `ReviewStructured` + 版本字段），RDR 的第 0 步是**零新字段、零schema 改动**地聚合已有数据 ——
> 因为有 13 个问题今天就能答（其 §2），先把它们答了才知道还缺什么。
> 本文原表保留如下。

| 优先级 | 事项 | 说明 |
| --- | --- | --- |
| ~~P0~~ | `domain/review/template.ts` + `ReviewStructured` + 版本字段 | 数据结构先落地，UI 可以渐进 → **RDR §4.3 判不需要**：字段落 `Match`，无结构化对象、无版本字段 |
| P0 | UI：把「开局」段做成模板（验证模式可行） | 单段试点，快速验证能否提升复盘率 → 改为 chip 组形态，见 RDR §5.5 |
| P0 | 从 Match 预填复盘字段 + 快速录入后的半自动复盘 | 零数据成本、收益最大 → **RDR §7 逐条确认，保留**。本文 §5.2 的判断（「这条比任何新字段都更能提升复盘率」）被 RDR 采纳为硬性要求第 5 条 |
| P1 | 其余六段模板化 + 完整度指示器 | → **7 个独立 Section 被 RDR §7 拒绝**（每多一个 Section 就多一次视觉跳转） |
| P1 | Phase 4 统计分析（先做 `openingPlan` / `transition.problems` / 海克斯三） | 证明模板化的价值 → RDR §6 把这三项**提到第 0/1/2 步，且前两项零新字段** |
| P2 | Timeline / `Decision.round` 结构化 | 依赖意义完备的结构化字段 → 依赖已被 RDR 推迟，`Decision.round` 不再是新字段的前置（R2 用字符串） |
| P3 | 完整度进列表页 / 导出列 | → RDR §7 判「不动，但排序在后」 |

**落地顺序建议**：先做「预填 + 开局段模板」，这是成本最低、能立刻看到复盘率变化的一组改动。
→ **前半句仍成立并被 RDR 采纳**（预填是硬性要求第 5 条）；
**「开局段模板」的形态已被改为**默认显示 8 次点击的 chip 组 + 三段手写折叠（RDR §5.5），
且 RDR 追加一条验证规则：**加完第一个字段（`openingPlan`）后先看复盘完成率是否真的下降**，
降了再继续加，没降就停（RDR §6 第 1 步）。
