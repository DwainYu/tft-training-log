# REVIEW_DATA_REQUIREMENTS · 复盘数据需求（下一阶段）

> 配套：[DASHBOARD_PLAN](./DASHBOARD_PLAN.md) · [REVIEW_SYSTEM](./REVIEW_SYSTEM.md) · [UI 优化](./UI_IMPROVEMENT_PLAN.md)
> 基线：工作区（`main` @ `7347d3f` + Phase 2T/3A 未提交改动）。
> 本文**不定义完整 Review schema**，不提出 20 个字段。本文只做一件事：**从「Dashboard / 统计页未来要回答的问题」倒推「需要什么数据」，并对每个字段做成本核算。**
> 本阶段不改数据模型：`db.ts` 保持 Dexie v3（`db.ts:57`），`SNAPSHOT_SCHEMA_VERSION` 保持 2（`types.ts:228`）。

---

## 勘误

| # | 流传的说法 | 实际 | 依据 |
| --- | --- | --- | --- |
| 1 | 「`REVIEW_SYSTEM.md` 的完整度规则是 4 字段布尔」 | **准确。** `isReviewComplete` = `primaryMistake && biggestMistake?.trim() && bestDecision?.trim() && nextGameFocus?.trim()`。本文不改这条规则本身，只指出它有一个未被讨论的后果（见 §5） | `review.ts:38-45` |
| 2 | 「`REVIEW_SYSTEM.md` §4 已经指定了 7 段模板字段」 | 属实，但**§4 里的 `coreItemIds`（`:142`）和 `augmentChoice`（`:114`）是重复采集**——两者都已在 `Match` 上（`types.ts:80`、`:81`），`MatchForm` 已采集（`MatchForm.tsx:288-303`）。把它们放进 Review 是让用户在复盘页再选一次同样的东西 | `types.ts:80-81`、`MatchForm.tsx:288-303` |
| 3 | 「`review-service.ts` 保持不变」 | 大体对，但有一个必须记下的约束：`primaryMistake` 从 Review **回写**到 `Match`（`review-service.ts:57`），`reviewed` 只在四必填齐全时为 `true`（`:57`）。这条「统计只读一个字段」的不变量（`REVIEW_SYSTEM.md:53`）是整个统计体系的地基，**新增字段不能破坏它** | `review-service.ts:51-63` |
| 4 | 「自由文本可以被 AI/LLM 事后解析成结构化字段」 | 这是一个**未验证的前提**，不是一个方案。`RuleBasedSummary` 是纯本地规则引擎（`review-summary.ts:37-40`），`WeeklySummaryInput`（`:6-20`）是明确定义的数据结构，**没有任何 LLM 接口**。在 `WeeklySummaryProvider` 的 `llm` 分支落地之前，「以后解析」和「永远不解析」在工程上没有区别。本文按「不可聚合」处理 | `review-summary.ts:6-30` |

---

## 1. 现在就有的：不要重复造

在讨论「需要什么新数据」之前，必须先承认**数据模型里已经有两个被严重低估的结构化资产**。

### 1.1 `primaryMistake` —— 11 值受控词表（最重要的一块既有资产）

```
MISTAKE_TYPES = [ECONOMY, LEVELING, ROLLING, COMPOSITION, ITEM,
                 AUGMENT, POSITIONING, SCOUTING, TEMPO, TRANSITION, OTHER]  // types.ts:13-25
```

- **11 个值，逐局 1 个**，`Match.primaryMistake`（`types.ts:91`）是 `Review.primaryMistake`（`types.ts:132`）的**回写镜像**（`review-service.ts:58`）。
- **它是受控词表，不是自由文本**——所以它可聚合，而且已经被聚合了。
- **当前消费面**：`mistakeCounts`（`stats.ts:89-103`）→ `MistakeBarChart`（1 个柱状图，`MistakeBarChart.tsx`）；`commonMistakes(3)`（`stats-service.ts:67`）→ Dashboard 的 3 个 badge（`DashboardPage.tsx:226-236`）；`weekStats` 内联重写的版本（`weekly-service.ts:38-49`）→ 周复盘的 badge（`WeeklyReviewPage.tsx:110-120`）。
- **三个消费面，全部是「当前截面计数」。** 没有任何一处问：**这个错误占比在降还是在升？** 「我最近打得更好但错误结构没变」和「我最近打得更好且错误结构在改善」是两回事——前者说明你在用**同样的错误**打出更好的结果（技术上是进步），后者说明你在**减少**错误（更值得表扬）。数据全都在，只差一个时间维度。

**结论：11 个受控值 + 每局 1 个 + 零采集成本 + 只做了 1 张图 + 1 个 KPI badge。这是整个数据模型里投入产出比最高的一块，而它只被用掉了一成。**

### 1.2 `Decision.hindsight` —— 被完全忽略的第二块资产

```
DECISION_HINDSIGHTS = ["correct", "wrong", "mixed"]    // types.ts:118
Decision.type: 12 值受控词表                          // types.ts:29-42
Decision.round: string（如 "3-2"）                     // types.ts:103
```

- `DecisionPanel` 已经提供了完整的录入 UI（`DecisionPanel.tsx:90` 渲染 `DECISION_TYPE_LIST`，hindsight 有对应控件 `:34`）。
- `decisions` 表在 Dexie 里已索引 `matchId` 和 `type`（`db.ts:48`）。
- **`grep -rn "hindsight" src/domain/stats/ src/services/stats-service.ts src/services/weekly-service.ts src/pages/*.tsx` → 零命中。** `Decision.hindsight` 从来没有被聚合过。
- 示例数据里有 15 条 decision（`data/examples/demo-matches.json`），但没有任何界面显示过它们的统计。

**这条更正了一个可能的偏见**：`DASHBOARD_PLAN.md` §2 Q7 写「为什么输」被阻塞，但**「我在哪些环节做了正确/错误/混合的决定」这个统计今天就能出，且一条新字段都不需要**。示例数据里 `round` 和 `type` 都已有值。

> 这条应该排在所有新字段之前：**先聚合已有的两个受控字段，再考虑新增。**

---

## 2. 现在就有答案的（零 schema 改动，零采集成本）

**这一节的存在意义**：防止下一阶段为已经能回答的问题新增字段。下表每一行都只需要**写一个纯函数**（像 `stats.ts` 里已有的 8 个那样），不需要碰 `db.ts`、`types.ts` 或任何录入 UI。

| 问题 | 需要的数据 | 今天为什么能答 | 缺的是什么 |
| --- | --- | --- | --- |
| 名次分布如何？8 档各几局？ | `placement` | `MAX_PLACEMENT = 8`（`types.ts:46`），全 8 档都有意义 | **一个把 1–8 全档都画出来的分布图**。现在只有均值（`stats.ts:41`）和一个 `YAxis domain={[1,8]}`（`PlacementTrendChart.tsx:60`），没有直方图 |
| 我的失败集中在哪几类错误？ | `primaryMistake` | `mistakeCounts` 已实现（`stats.ts:89-103`） | 已有图表（`MistakeBarChart`）。**不需要新东西** |
| **错误结构是在改善还是恶化？** | `primaryMistake` × `playedAt` | 两个字段都在 `Match` 上，`mistakeCounts` 已经是纯函数，两次调用按时间切分即可 | **一个时间序列图 / 两期对比数字**。`stats.ts` 里没有任何按时间分桶的统计（唯一的时间函数是 `timeSlotStats`，按小时不按日） |
| 我在哪些环节做了正确/错误的决定？ | `Decision.hindsight` + `type` + `round` | 12+3 值受控，`decisions` 表已建，UI 已存在 | **纯函数 + 一张图**。零新字段 |
| 某类决定做对的比例是多少？ | 同上 | 同上 | 按 `type` 分组统计 `hindsight` 分布。`decision-service.ts:46` 已有 `hindsightStats` 类的入口但无人调用 |
| 哪些阵容值得继续玩？ | `composition` + `placement` | `compositionStats` 已实现（`stats.ts:123-141`） | **最小样本保护**（`stats.ts:136` 无除零守卫 → 「1 局 100%」），见 `DASHBOARD_PLAN.md` §6 |
| 哪些阵容我玩得最多/最少？ | `CompositionUsage` | `usageCount` / `firstUsedAt` / `lastUsedAt` 已存（`types.ts:174-179`），Dexie 已索引 `usageCount` 和 `lastUsedAt`（`db.ts:62`） | 「最近常用」在 `CompositionSelector` 里已经用上了（Recent/Frequent 三段），但**没有统计视图** |
| 哪个时段打得更稳？ | `playedAt` | `timeSlotStats` 已实现（`stats.ts:155-180`） | 修 0 局桶被隐藏的 bug（`stats.ts:165`），加 weekday 聚合（`playedAt` 完全够） |
| 这个 Session 比上一个好吗？ | `sessionId` + `playedAt` | 两个字段都在 `Match` 上（`types.ts:88`、`:53`），`TrainingSession` 已建表 | **一组并排对比数字**。`session-service` 存在，但没有任何界面同时显示两个 session 的 `overallStats` |
| 我这周比上周进步了吗？ | `playedAt` | `weeklyReport(offset)` 已支持任意周偏移（`weekly-service.ts:88-96`） | **两期对比视图**。`WeeklyReviewPage` 一次只看一期（`offset` 单值，`:16`） |
| 我的复盘率是多少？ | `reviewed` | `reviewedGames` 已算（`stats.ts:38`），`StatisticsPage:124` 已把它塞进 `Games` 的 sub | 「未复盘 N 局」作为一个**可点击的待办**（`DASHBOARD_PLAN.md` P0-2） |
| 我连续练了多少天？ | `playedAt` | `trainingStreak` 已实现（`stats.ts:191-202`），Dashboard 已有 tile | 无 |
| 对局长度和结果有关吗？ | `durationSeconds` + `placement` | **两个字段都在，且 `durationSeconds` 存了但从未被聚合**（`grep durationSeconds` 在 `src/domain/stats/` → 零命中） | 一个相关性统计。**零新字段，已有数据完全没被用** |
| 我的经济/血量控制如何？ | `totalGold` + `finalHealth` + `placement` | **同样存了但从未被聚合**（`grep` 在 stats 目录零命中），只在 `MatchDetailPage:122-123` 显示单局值 | 「最终血量与名次的关系」。**零新字段**。但注意 `MatchForm` 里这两个是**可选**（`MatchForm.tsx` Panel B），所以覆盖率未知——见 §5 的覆盖率约束 |

**13 个问题，今天全都能答。** 其中 5 个只需要写纯函数 + 画图，0 个需要碰数据模型。

**这张表本身就是本阶段最重要的结论**：下面 §3 要提的新字段，只解决这张表**覆盖不到**的问题。

---

## 3. 需要新数据的：逐条倒推

每行：**问题 → 所需数据 → 来源 → 是否必须结构化 → 建议字段 → 解锁的统计 → 采集成本 → 不做的代价**。

「是否必须结构化」的判据只有一条：**这个统计需要「按值分组」。** 自由文本无法分组，因为 `groupBy` 需要 key，而自由文本有无穷多种取值。**没有第二种情况。**

---

### R1 · 开局策略有效性 ★ 最高价值

| | |
| --- | --- |
| **问题** | 连胜开局 / 连败开局 / 正常运营 / 走经济 / 硬玩，哪个平均名次最好？ |
| **所需数据** | 本局的**开局路线类型**（单选枚举） |
| **来源** | 新字段（`Match` 上无任何对应列，`types.ts:49-96` 无开局相关项） |
| **是否必须结构化** | **是。** 分组统计要求 key。`opening` 自由文本（`types.ts:126`）有无穷取值，`groupBy(opening)` 等于「每局一行」，毫无统计意义 |
| **建议字段** | `openingPlan?: OpeningPlan`（`Review` 上，或 `Match` 上，见 §4）<br>取值域（5）：`WIN_STREAK` 连胜 / `LOSE_STREAK` 连败 / `STANDARD` 正常运营 / `ECONOMY` 走经济 / `FORCE` 硬玩 |
| **解锁的统计** | `groupBy(openingPlan)` → games / avgPlacement / top4Rate / bottom4Rate。这直接回答「我该不该连胜开局」，是 TFT 里最有价值的一个策略性问题 |
| **采集成本** | **1 次点击**（5 个 chip 横排，与 `MistakePicker` 同构，`MistakeSelect.tsx`）。可被 `openingItem` 复用同一个「开局面板」容器 |
| **不做的代价** | `DASHBOARD_PLAN.md` Q6 永久无法回答。玩家会继续凭感觉决定开局路线，而感觉恰恰是最容易自我欺骗的部分 |

### R2 · 转折点阶段

| | |
| --- | --- |
| **问题** | 我在第几个阶段掉的最多？（2-1 / 3-2 / 4-1） |
| **所需数据** | 转折发生的回合阶段（单选枚举） |
| **来源** | 新字段。`Decision.round` 有回合信息（`types.ts:103`，格式如 `"3-2"`）但它是自由字符串、且 `Decision` 是**另一张表**，与 `Review` 无关联 |
| **是否必须结构化** | **是。** 要按阶段分组 |
| **建议字段** | `turningPointStage?: "2-1" \| "3-2" \| "4-1" \| "5-1" \| "FINAL"`（5 值，复用 `Decision.round` 的既有写法 `DecisionPanel.tsx:63` 已用 `<datalist>` 提供 `3-2/4-1/最终`） |
| **解锁的统计** | 阶段 × 名次分布；「我在 4-1 崩掉的比例」。比 `openingPlan` 更细，且能定位到具体回合 |
| **采集成本** | **1 次点击**（5 个 chip） |
| **不做的代价** | 只能知道「第 4 阶段崩了」，不知道是 4-1 还是 4-5。粒度太粗，无法指导下一步 |

### R3 · 过渡失败原因（多选）

| | |
| --- | --- |
| **问题** | 过渡（从开局阵容切到终局阵容）失败的最常见原因是什么？ |
| **所需数据** | 过渡失败原因（**多选**枚举） |
| **来源** | 新字段 |
| **是否必须结构化** | **是。** 而且必须是**多选**——一局可能同时「装备没做出来」+「搜牌不顺」。`REVIEW_SYSTEM.md:126` 已给出 8 值建议：`NO_FRONTLINE` / `NO_DAMAGE` / `NO_ECONOMY` / `BAD_ITEMS` / `BAD_ROLLS` / `HP_PRESSURE` / `NO_SPACE` / `CONTESTED` |
| **建议字段** | `transitionProblems?: TransitionProblem[]`（`string[]`，非嵌套对象——符合 `REVIEW_SYSTEM.md:99` 的约定） |
| **解锁的统计** | 频率 Top-N；原因 × bottom4Rate。**比 `primaryMistake=TRANSITION` 细得多**——后者只说「过渡有问题」，前者说「过渡没做出来装备」 |
| **采集成本** | **1–3 次点击**（8 个 chip 多选，允许只选 1 个就提交） |
| **不做的代价** | `primaryMistake=TRANSITION` 是一个已经饱和的分类（见 §5.3）。它在 11 值词表里会和 `ECONOMY`、`ROLLING`、`LEVELING` 互相争夺同一批局面，无法再细化 |

### R4 · 装备/经济决策

| | |
| --- | --- |
| **问题** | 装备是按计划给到主 C，还是临时凑的？ |
| **所需数据** | 装备分配方式（单选枚举） |
| **来源** | 新字段。`Match.coreItemIds`（`types.ts:80`）**已存在且已被采集**——但它只回答「带了什么装备」，不回答「是计划好的还是拼凑的」 |
| **是否必须结构化** | **是。** |
| **建议字段** | `itemPlan?: "PLANNED" \| "IMPROVISE" \| "SCATTERED" \| "UNFINISHED"`（4 值） |
| **解锁的统计** | `itemPlan` × top4Rate。「临时拼凑的局是不是真的更差？」——这是可被数据**证伪**的假设 |
| **采集成本** | **1 次点击** |
| **不做的代价** | `primaryMistake=ITEM` 只能告诉你「这局装备出问题」，不能告诉你「按计划做装备的局是否真的更好」。前者是归因结论，后者是可验证的策略 |

**注意**：这里**不要**新增 `coreItemIds`——它已经在 `Match` 上（`types.ts:80`）且已被 `MatchForm:288-296` 采集。复盘页应该**预填展示**，不要求重选（`REVIEW_SYSTEM.md:145-146` 已指出这一点，这里确认）。

### R5 · 站位

| | |
| --- | --- |
| **问题** | 站位在多少局里真的是瓶颈？ |
| **所需数据** | 站位问题类型（单选枚举，可选「无」） |
| **来源** | 新字段 |
| **是否必须结构化** | **是。** |
| **建议字段** | `positioningIssue?: "NONE" \| "FRONTLINE" \| "BACKLINE" \| "CARRY_FOCUSED" \| "NO_REPOSITION"`（5 值，含 `NONE` 以便显式记录「站位没问题」——否则「没填」和「没问题」无法区分，会污染统计） |
| **解锁的统计** | 频率 + top4Rate 对照 |
| **采集成本** | **1 次点击**（默认预选 `NONE`，改动才要点） |
| **不做的代价** | `primaryMistake=POSITIONING` 同样是饱和分类（§5.3） |

### R6 · 海克斯选取理由 ★ 零新采集，纯改造

| | |
| --- | --- |
| **问题** | 哪个海克斯值得拿？拿到之后我打得更好吗？ |
| **所需数据** | ① 海克斯 id（**已有**）② 选取理由 |
| **来源** | ① `Match.augmentIds`（`types.ts:81`）**已存在**，`AugmentSelector` 已采集（`MatchForm.tsx:297-303`），`augment-service.ts` 有 592 条快照<br>② 理由是新的 |
| **是否必须结构化** | ① 不需要，已经结构化<br>② **是。** |
| **建议字段** | `augmentReasons?: AugmentReason[]` —— 与 `augmentIds` **同序**的数组（定长，不是 Set；`REVIEW_SYSTEM.md:118` 已论证）。取值域（7）：`COMP_FIT` / `ITEM_FIT` / `ECONOMY` / `TEMPO` / `PIVOT` / `FLEX` / `OTHER` |
| **解锁的统计** | ① 海克斯 × top4Rate（**现在完全没做，但数据已有！**）；② 理由 × top4Rate。「我为了凑阵容拿的海克斯是不是真的更差？」 |
| **采集成本** | **0–3 次点击**（每选一个海克斯多选一个理由，可以整行留空） |
| **不做的代价** | 海克斯的选择率与胜率关系无法回答。**这是全模型里唯一一个「已有结构化数据但完全没被统计」的维度**——592 个海克斯快照采回来了，只用来在选择器里显示 |

**R6 是本文最重要的一行。** 它的①部分**零新字段、零新采集、只差一个纯函数**。`augmentIds` 存在每局上，`match-service` 收集它，`AugmentSelector` 采集它，但没有一行代码统计它。这应该排在所有新字段之前做。

### R7 · 为什么输（仅败局追问）

| | |
| --- | --- |
| **问题** | 第 5–8 名的局，输在哪一步？ |
| **所需数据** | 败局原因（单选枚举） |
| **来源** | 新字段，且**只对 `placement >= 5` 的局追问** |
| **是否必须结构化** | **是。** |
| **建议字段** | `lossReason?: "ECONOMY_DRY" \| "DIDNT_FINISH" \| "LOST_FIGHT" \| "POSITIONED_WRONG" \| "WRONG_COMP" \| "BEAT_BY_X"`（6 值） |
| **解锁的统计** | 败局原因 × 第 5 名 vs 第 8 名的分布。「我是在 5–6 名稳定死还是在 8 名爆死？」——这两者的改进方式完全不同 |
| **采集成本** | **0 或 1 次点击**。只在败局出现，且**可跳过** |
| **不做的代价** | `bottom4` 只告诉你「输了」（`stats.ts:37`），`biggestMistake` 自由文本（`types.ts:131`）告诉你「输了什么」但不可聚合 |

---

## 4. 字段落在哪张表：Dexie 成本核算

这是下一阶段必须先做的决策，因为它决定了要不要动 schema。

### 4.1 关键事实：Dexie 只索引，不校验

```ts
this.version(3).stores({
  matches: "id, playedAt, placement, composition, reviewed, primaryMistake",  // db.ts:47
  decisions: "id, matchId, type",                                             // db.ts:48
  reviews: "id, &matchId, primaryMistake, updatedAt",                         // db.ts:50
  ...
})
```

Dexie 的 `stores({...})` 声明的是**索引**，不是对象形状。加一个**没有索引**的字段到 `Match` 或 `Review` 上，**不需要 bump version**——IndexedDB 存的是整个对象。

### 4.2 逐字段成本表

| 字段 | 落表 | 需要索引吗 | 需要 Dexie bump 吗 | 结论 |
| --- | --- | --- | --- | --- |
| `openingPlan` | `Match` 或 `Review` | 否（统计走全表过滤，量级是个人训练日志，几百到几千行） | **否** | 零 schema 成本 |
| `turningPointStage` | `Match` 或 `Review` | 否 | **否** | 零 schema 成本 |
| `transitionProblems` | `Match` 或 `Review` | 否（多选不适合做索引——要用 `multiEntry` 索引，复杂度不值） | **否** | 零 schema 成本 |
| `itemPlan` | `Match` 或 `Review` | 否 | **否** | 零 schema 成本 |
| `positioningIssue` | `Match` 或 `Review` | 否 | **否** | 零 schema 成本 |
| `augmentReasons` | `Match` 或 `Review` | 否 | **否** | 零 schema 成本 |
| `lossReason` | `Match` 或 `Review` | 否 | **否** | 零 schema 成本 |
| `durationStats` / `goldStats` 聚合 | — | — | **否** | 纯函数，不存 |

**结论：上表 7 个新字段，全部可以是零 schema 改动。** 只有当某个字段需要**按它排序或范围查询**（比如「只看待复盘的局」）才需要索引。

### 4.3 落 `Match` 还是落 `Review`？

判据：**这个字段是否描述「这局发生了什么」（对局属性）还是「我怎么想的」（复盘属性）。**

| 落 `Match` | 落 `Review` |
| --- | --- |
| `openingPlan`（开局路线是**你在选阵容时就决定的**，录入时就知道） | `positioningIssue`（站位是否问题，只有打完才知道） |
| `transitionProblems`（过渡失败与否，打完就知道） | `itemPlan`（装备是不是按计划，要复盘才判断） |
| `lossReason`（谁打死了你，对局结束时就知道了） | `augmentReasons`（为什么拿这个海克斯，是决策理由） |

**但这里有一个更强的约束，压过上面的分类**：

> `primaryMistake` 已经在 `Match` 上做了一份**镜像**（`review-service.ts:58`），并且有一个明确的不变量：**「统计只读一个字段」**（`REVIEW_SYSTEM.md:53`）。

如果新增字段一半落 `Match`、一半落 `Review`，就会有两个「统计该读哪张表」的问题。**建议：新增字段全部落 `Match`，`Review` 保持纯文本 + `primaryMistake` + `selfScore`。**

理由：`Match` 上的字段 `QuickAddDialog` 就能采集（20 秒路径，`UI_IMPROVEMENT_PLAN.md:66`），不需要进复盘页；而且 `Match` 是**所有统计的唯一入口**（`stats-service.ts` 的 `scopedMatches()` 全部从 `matchRepository` 读，`:30-31`）。

`Review` 保持为「文字复盘」这一层不变。这也让 `REVIEW_SYSTEM.md` §8.3 那个「模板化 Review 对象」的想法**可以整体推迟或放弃**——因为没有模板化需求了。

### 4.4 存储方案的三个选项（推荐第 3 个）

| 方案 | 做法 | 评价 |
| --- | --- | --- |
| A · 每字段一个列 | 加 7 个 `Match` 字段 | 干净、可索引；但 `Match` 已经有 24 个字段（`types.ts:49-96`），再加 7 个是 31 个 |
| B · 一个 JSON blob | `Match.structured?: Record<string, string \| string[]>` | 字段演进零迁移成本；但**放弃了一切类型检查**，且导出/导入（`export-service.ts`）要额外处理。`REVIEW_SYSTEM.md:99` 明确反对嵌套结构 |
| **C · 复用一个现有列** | `Match.notes`（`types.ts:92`）已经是自由文本，且 `queryMatches` 的 `SEARCHABLE` 已经包含它（`query.ts:98`）→ **搜索立刻生效**<br>**但不能聚合**（自由文本） | ❌ 这个方案不满足结构化要求，列在这里只是说明「为什么不用 notes」 |
| **推荐：变体 A，但收窄到 5 个字段** | 见 §5.2 | |

---

## 5. 采集预算：每个字段必须自证

### 5.1 硬预算规则

> **一个字段的采集成本 > 1 次点击，且解锁的图表少于 1 张，就砍掉。**

推导依据：复盘是在**打完一局疲劳状态**下写的。这个状态下每多一次点击，复盘完成率就下降一截。`REVIEW_SYSTEM.md:61` 已经诊断出正确的病因（「复盘 = 三段自由散文… 需要动笔的地方太多」），但它开的药方（7 段、20+ 字段）**增加了点击总量**。

### 5.2 逐字段预算核算

| 字段 | 点击数 | 解锁图表数 | 判定 |
| --- | --- | --- | --- |
| `openingPlan` | 1 | 1（开局路线 × 名次） | **保留** |
| `turningPointStage` | 1 | 1（阶段分布） | **保留** |
| `itemPlan` | 1 | 1（计划 vs 凑 × top4） | **保留** |
| `positioningIssue` | 1（默认预选 `NONE`） | 1（站位 × top4） | **保留**（预选让它的期望成本接近 0） |
| `augmentReasons` | 0–3 | **2**（海克斯×胜率 / 理由×胜率） | **保留**（可整行留空，期望成本 ~1） |
| `transitionProblems` | 1–3 | 1（失败原因 Top-N） | **保留**，但必须多选 + 可留空 |
| `lossReason` | 0–1（仅败局） | 1（败局原因分布） | **保留** |
| ~~`openingItem`（第一件装备）~~ | 1 | 0.5（装备类型 × 名次；9 个选项会被拆得很散，每个格子样本不足） | **砍掉**。`REVIEW_SYSTEM.md:107` 建议了它，但它服务的那张图会因为样本太散而不可读 |
| ~~`augmentNote` / `transitionNote` / `turningPointNote` / `itemNote`（4 个自由文本 note）~~ | 每个都要动笔 | 0（不可聚合） | **全部砍掉**。`REVIEW_SYSTEM.md` 在 4.1/4.2/4.3/4.5 各建议了一个 note 字段，**四个都是「补充说明」**，都不能聚合。已有的 `opening`/`midGame`/`lateGame` 自由文本就是它们的容器 |
| ~~`compCompletion`（成型程度）~~ | 1 | 0.5 | **砍掉**。与 `itemPlan` 高度重叠，且 `placement` 本身就是「成型度」的终极度量 |
| ~~`compMatchPlan`（是否按计划转型）~~ | 1 | 1 | **勉强保留**，但优先级低于 `itemPlan`——两者问的都是「有没有按计划走」。如果只做一个，做 `itemPlan` |
| ~~`openingQuality`（开局质量 GOOD/OK/BAD）~~ | 1 | 1 | **勉强保留**，但**与 `primaryMistake` 争夺同一批判断**：玩家判断「开局很差」的同时几乎必然会选一个 `primaryMistake`（很可能就是 `ECONOMY` 或 `ROLLING`）。留 7 个字段 |

### 5.3 「饱和分类」问题：`primaryMistake` 已经无处可去

`MISTAKE_TYPES` 的 11 个值（`types.ts:13-25`）在**单选**约束下（`ReviewForm.tsx:88-92` 是 `MistakePicker`，单选）会互相争夺同一批局面：

- 「经济崩了」→ `ECONOMY` 还是 `ROLLING`？
- 「搜牌搜太深」→ `ROLLING` 还是 `LEVELING`？
- 「过渡没做出来」→ `TRANSITION` 还是 `COMPOSITION`？
- 「被卡血」→ `TEMPO` 还是 `POSITIONING`？

**这是一个已存在的问题，不是新增字段造成的。** 但它决定了新字段的定位：

> R1–R5 的作用**不是替代 `primaryMistake`**，而是提供 `primaryMistake` 给不出的分辨率。`primaryMistake` 回答「这局最影响结果的是什么」，R1–R5 回答「**具体是哪个环节**」。

`REVIEW_SYSTEM.md:330-332` 已说出这个判断（「结论可以被美化，过程不会」），本文确认它，并补一条执行规则：**新增字段一律不得必填**（见 §5.4），因为 `primaryMistake` 已经承担了必填的份额（`review-service.ts:57` 的 `isReviewComplete` 依赖它）。

### 5.4 `isReviewComplete` 的连带后果（本文对 `REVIEW_SYSTEM.md` 的唯一修正）

`REVIEW_SYSTEM.md:212` 建议「新增 2 项必填：`openingPlan` + `openingQuality`」。

**本文反对这条，理由是可验证的：**

`isReviewComplete`（`review.ts:38-45`）是 4 个 `&&`，其中任何一个 falsy → `match.reviewed = false`（`review-service.ts:57`）→ **`reviewed` 是所有统计的可用性门槛**：

- `DashboardPage:144-148` 的「已复盘/未复盘」badge
- `StatisticsPage:124` 的「N 局已复盘」
- 未复盘积压入口（`DASHBOARD_PLAN.md` P0-2）

加 2 个必填 = **在已经需要 3 段手写 + 4 项必填的表单上再加 2 个点击**，门槛直接抬高。

**修正**：
- 现有 4 项必填**一字不改**（`REVIEW_SYSTEM.md:53` 的不变量、`review-service.ts:51-63` 的单一入口，全部保持）。
- R1–R7 **全部可选**，且**不进入 `isReviewComplete`**。
- 想要「引导填写」而不是「强制填写」，用 `MatchForm` 已有的模式：`selfScore` 就是可选的（`types.ts:136`，不在 `isReviewComplete` 里），UI 上用 hint 引导（`ReviewForm.tsx:125` 的 hint 文案）、`aria-pressed` 表达状态（`:132`）。**R1–R5 应该照抄 `selfScore` 的模式，不是照抄 `primaryMistake` 的模式。**

### 5.5 总采集成本

**提议的 5 个必选字段 + 2 个可选字段，在最坏情况下的点击数：**

```
openingPlan        1
turningPointStage  1
itemPlan           1
transitionProblems 1（只选 1 个就提交）
positioningIssue   0（默认预选 NONE）
────────────────────────────
小计（最坏）       4 次点击

augmentReasons     0–3（可整行留空）
lossReason         0–1（仅败局）
────────────────────────────
总计（最坏）       8 次点击
总计（典型）       5 次点击
```

**对比现状**：0 次点击（现在复盘是 4 段手写，典型 2–5 分钟）。

**结论：提议的总预算 = 8 次点击。** 判定：
- 8 次点击换 7 个可聚合维度 → **通过**。
- 但这是**增量**到一张已经很长的表单上。`UI_IMPROVEMENT_PLAN.md` / `QUICK_RECORD_UX.md` 已经在处理「复盘太慢」的问题，而 `REVIEW_SYSTEM.md:6` 的目标是「把写复盘变成完成复盘模板」。
- **所以 R1–R5 应该做成一个「模板」视图，而不是在现有 4 段手写上方再加 5 个字段**：进入复盘页默认看到的是 R1–R5 的 chip 组（8 次点击内完成），三段手写折叠成「补充说明」。这是 `REVIEW_SYSTEM.md:339`「不要做成 wizard，但提供紧凑视图」的落地方式。

**若必须再砍：先砍 `turningPointStage`**（1 次点击，1 张图，与 `openingPlan` 有重叠——都能定位到「前期决策」）。砍完是 3 必选 + 2 可选 = 最坏 6 次点击。

---

## 6. 反向约束：本文对下一阶段的硬性要求

下一阶段实现结构化复盘时，**必须**满足：

1. **`primaryMistake` 的回写不变量不得破坏。** `review-service.ts:51-63` 是「统计只读一个字段」的唯一保证点（`REVIEW_SYSTEM.md:53`）。新增字段走 `Match`，不新增第二个回写通道。
2. **新增字段一律不进 `isReviewComplete`。** 理由见 §5.4：`reviewed` 是统计可用性的门槛，不是完成度的度量。
3. **新增字段一律可选。** `MatchForm` 里 `finalLevel`/`finalHealth`/`totalGold` 都是可选（Panel B），这个先例是对的——可选字段的缺失率是可测量的，而强制字段的缺失率是 0（代价转移到别处）。
4. **每个枚举必须在 `src/domain/labels.ts` 有中文映射。** 这是项目唯一的中心化标签表（`MISTAKE_LABELS` / `DECISION_LABELS` / `HINDSIGHT_LABELS` 都在这，`labels.ts:11-71`），先例明确。
5. **自由文本字段不删除。** `REVIEW_SYSTEM.md:332` 的判断本文确认：`opening`/`midGame`/`lateGame` 保留为「补充」。但**它们不进任何统计**——这一点要在 UI 上说清楚（hint 文案），否则用户会以为写了就会被统计。
6. **覆盖率必须可见。** `totalGold`/`finalHealth`/`durationSeconds` 都是可选字段（§2 最后三行），它们的覆盖率未知。**任何基于可选字段的统计，必须同时显示样本量**（用 `DASHBOARD_PLAN.md` §6.4 的最小样本规则）。
7. **零 Dexie schema 改动**（本阶段）。若某个新字段确实需要索引，必须先说明为什么全表过滤不够——个人训练日志的量级（`PAGE_SIZE = 20`，`MatchesPage.tsx:16`；示例数据 16 局）下，全表过滤是正确选择。

### 负面清单（明确不做）

- ❌ **不做 20 字段模板。** 本文提出 **7 个字段**（5 必选 + 2 可选），最坏 8 次点击。`REVIEW_SYSTEM.md` §4 提出的是 7 段、约 20 字段、其中 4 个是纯 note。按 §5.1 的规则，4 个 note 全部被砍。
- ❌ **不把自由文本当数据。** `opening`/`midGame`/`lateGame`/`biggestMistake`/`bestDecision`/`nextGameFocus` 六个字段（`types.ts:126-133`）全部保留为文字，**全部不聚合**。唯一例外：`Match.notes` 参与搜索（`query.ts:98`）——**搜索不是统计**，这个区分要保持。
- ❌ **不新增只服务单个 anecdote 的字段。** §5.2 砍掉的 4 个 note + `openingItem` + `compCompletion` 都属于这一类：它们让某一个具体对局更好写，但产出的图表样本不足或不可读。**判据是「这张图在 30 局内能读出结论吗」**，不是「这个字段有用吗」。
- ❌ **不重建已有的结构化字段。** `augmentIds`（`types.ts:81`）、`coreItemIds`（`:80`）、`traitIds`（`:78`）、`Decision.hindsight`（`:118`）、`Decision.type`（`:29`）、`selfScore`（`:136`）、`primaryMistake`（`:91`）—— 全部已存在，全部应先聚合再谈新增。
- ❌ **不碰 `db.ts` 和 `SNAPSHOT_SCHEMA_VERSION`。** 本文 §4 已证明 7 个新字段全部可以是零 schema 改动。
- ❌ **不引入 OCR / Data Center / 自动抓取。** 那些在 `SCREENSHOT_IMPORT.md` / `DATA_CENTER.md` 里，与本文无关。

### 执行顺序建议

**第 0 步（零新字段，零 schema）**：聚合已有数据。按收益排序：
1. **`augmentIds` × 名次**（R6①）——数据已有 592 个海克斯快照的采集基础，零采集成本
2. **`Decision.hindsight` / `type` 统计**（§1.2）——3+12 值受控，UI 已有，全仓库零聚合
3. **`primaryMistake` 时间序列**（§2）——从截面计数升级到趋势
4. **`durationSeconds` / `totalGold` / `finalHealth` 与名次的相关性**（§2）——字段存了从未聚合
5. **`placement` 全 8 档分布图**（§2）

**第 1 步（本阶段之后）**：只加 R1（`openingPlan`，1 次点击，1 张图）。**验证复盘完成率是否真的下降**——这是继续加字段的前提。如果加了 `openingPlan` 后复盘率没降，再加 R2–R5；如果降了，先停下来。

**第 2 步**：R6② / R3 / R4 / R5 / R7。

---

## 7. 与 `REVIEW_SYSTEM.md` 的关系（补充 / 修正 / 不动）

| 主题 | `REVIEW_SYSTEM.md` 说了什么 | 本文的态度 |
| --- | --- | --- |
| 4 字段必填（`:209`） | 保持现状 | **不动**，并说明理由：`isReviewComplete` 是统计可用性门槛（§5.4） |
| 新增 2 项建议必填（`:212`） | `openingPlan` + `openingQuality` | **修正**：改为可选，且不进 `isReviewComplete`（§5.4） |
| 4 个 `*Note` 自由文本字段（`:108,116,127,135,143`） | 每段配一个补充说明 | **修正**：全部砍掉，理由是不能聚合且已有的三段自由文本就是容器（§5.2） |
| `augmentChoice`（`:114`） | 在 Review 上存 3 个海克斯 | **修正**：海克斯已在 `Match.augmentIds`（`types.ts:81`），不要在 Review 重复。Review 只存**理由**（R6②） |
| `coreItemIds`（`:142`） | 在 Review 上存装备 | **修正**：已在 `Match.coreItemIds`（`types.ts:80`）且 `MatchForm` 已采集。复盘页应预填展示，不要求重选 |
| 7 段模板（`:74`） | opening / augments / transition / turningPoint / items / finalComp / conclusion | **部分接受**：`conclusion` 已存在；`opening`/`items`/`transition`/`turningPoint` 的**结构化部分**接受（R1/R2/R3/R4），**7 个独立 Section 拒绝**——每多一个 Section 就多一次视觉跳转，与「让复盘更快」相反 |
| 完整度从布尔到百分比（`:220-236`） | 有价值 | **不动，但排序在后**。`isReviewComplete` 是 4 个 `&&`（`review.ts:38-45`），转百分比需要先有可选字段（否则权重全在 4 个必填上，百分比恒等于布尔值） |
| §9 统计分析可能性表（`:316-327`） | 10 行，全部指向新字段 | **接受方向，但重排优先级**：其中 5 行今天就能答（§2），不需要新字段。真正被阻塞的只有「开局类型表现」和「过渡失败原因」 |
| 「点选 80% + 补充 20%」（`:70`） | 目标比例 | **接受**，并给出可核算的数字：8 次点击 vs 现有的 3 段手写（§5.5） |
| 「不要做成 wizard」（`:340`） | 默认铺开 + 紧凑视图 | **接受**，落地为：默认显示 8 次点击的 chip 组，三段手写折叠（§5.5） |
| 8.3 存储演化 / `ReviewStructured` + 版本字段（`:290,:352`） | 在 Review 上建结构化对象 + 版本号 | **修正**：新字段落 `Match` 而非 `Review`（§4.3），因此**不需要 `ReviewStructured` 对象，也不需要版本字段**，`Review` 的存储方案可以整体推迟 |

---

## 附：本文引用的关键 file:line 清单

| 断言 | 依据 |
| --- | --- |
| `primaryMistake` 是 11 值受控词表 | `types.ts:13-25`（`MISTAKE_TYPES`）、`:91`、`:132` |
| `primaryMistake` 回写到 `Match` | `review-service.ts:57-61` |
| `reviewed` 只在四必填齐全时为 true | `review-service.ts:57` + `review.ts:38-45` |
| `Review` 的 8 个字段，6 个自由文本 | `types.ts:121-140` |
| 自由文本 = 6 个 | `opening`/`midGame`/`lateGame`/`bestDecision`/`biggestMistake`/`nextGameFocus`（`types.ts:126-131`） |
| `Decision.hindsight` 3 值受控 | `types.ts:118`（`DECISION_HINDSIGHTS`） |
| `Decision.type` 12 值受控 | `types.ts:29-42` |
| `augmentIds` / `coreItemIds` 已存在且已采集 | `types.ts:80-81`、`MatchForm.tsx:288-303` |
| `durationSeconds`/`totalGold`/`finalHealth` 存了从未聚合 | `grep` 在 `src/domain/stats/`、`stats-service.ts`、`weekly-service.ts` → 零命中 |
| Dexie 索引（不含任何统计维度） | `db.ts:46-72`，尤其 `matches:47`、`reviews:50` |
| `compositionUsage` 已索引 `usageCount`/`lastUsedAt` | `db.ts:62` |
| 统计的唯一入口是 `matchRepository` | `stats-service.ts:29-32`（`scopedMatches`） |
| 自由文本进搜索、不进统计 | `query.ts:92-102`（`SEARCHABLE` 含 `notes`/`traits`/`coreItems`/`augments`） |
| `labels.ts` 是唯一中心化标签表 | `labels.ts:11`（`MISTAKE_LABELS`）、`:71`（`MISTAKE_TYPE_LIST`） |
| 无 LLM 接口 | `review-summary.ts:26-30`（接口声明）、`:37-40`（`RuleBasedSummary` 是唯一实现） |
| 示例数据规模 16 局 / 15 决策 / 10 复盘 | `data/examples/demo-matches.json` |
---

## Step 6A Evidence · R1 采纳率与复盘完成率（2026-10-07）

R1（`openingPlan`）已按本文 §6 第 1 步上线。本节记录实测，**数据来自本机 demo 集（16 局，其中 1 局为本阶段实测写入），不是真实使用数据**。

### 测量口径（`domain/stats/analytics.ts`）

- `openingPlanCoverage`：已标记 / 总局数。开局路线面板副标题实时显示「已标记 N / M 局 · 覆盖率 P%」。
- `reviewCoverage`：`Match.reviewed` 与 `isReviewComplete` **分开计数**（§5.4 的不变量监控）。两者差值 > 0 即提示「存在导入或手改过的历史数据」。

### 实测结果

| 指标 | 值 | 说明 |
| --- | --- | --- |
| `openingPlan` 覆盖率 | 1 / 16 = 6% | demo 数据诞生于该字段存在之前，唯一标记来自本阶段实测写入 |
| 复盘覆盖率（`reviewed`） | 8 / 16 = 50% | |
| `isReviewComplete` 判定完整 | 8 局 | **gap = 0**：写路径是唯一写入方，不变量未被破坏 |
| 可靠的 before/after | **不存在** | 字段上线时间没有可靠时间戳，按 §4 要求不伪造 |

### 判定

**Hold。** 理由：

1. 6% 的覆盖率是**合成数据的结果**，既不能证明采纳良好，也不能证明 UX 有问题——它只是「旧数据没有这个字段」。
2. 复盘完成率在字段上线前后**无法可靠对比**（无时间边界），而 R1 上线后唯一一次真实写入的复盘是完整的（progress 80% → 100% 保存成功）。
3. 因此既不满足 Continue（无采纳证据），也不满足 Reconsider（无完成率下降证据）。

**解除 Hold 的条件**：真实使用积累到至少 20 局（两个 10 局窗口），届时 `openingPlanCoverage` 与 `reviewCoverage` 两个数字直接可比——若覆盖率 ≥ 50% 且完成率未低于上线前基线，进入 R2（`turningPointStage`）。

### 第 0 步聚合的验证结论（零新字段）

RDR §1.2 判断「`Decision.hindsight` 被完全忽略」在 Step 6A 得到验证并落地：**错误后视的局平均名次 4.4，正确后视的局 2.2**——这是现有数据里信号最强的一张表，且一行字段都没加。

---

## Step 6B Evidence · Timeline 与 Decision 数据（2026-10-07）

本文 §5.3 的判断「R1–R5 提供的是 `primaryMistake` 给不出的分辨率」在 Timeline 上得到一次零成本的验证：

### Timeline 消费的已有字段

```
Decision  → id · round · type · decision · hindsight · createdAt
Match     → placement · finalHealth · primaryMistake
```

**没有任何新字段**。Timeline 的事件只有两种真实来源：每条 `Decision` 一行（按 `round` 排序），以及结尾一条 `outcome`（名次 + 最终血量 + `primaryMistake`）。

### `Decision.round` 的真实形态（审计结论）

- 自由字符串，demo 15 条全部是 `stage-index`（`"2-1"`…`"7-2"`），无空值。
- 录入端 `DecisionPanel` 的 datalist 提供 `"3-2" / "4-1" / 最终`，所以自由文本路径真实存在。
- 读取端已结构化（`parseRound` / `compareRounds`，`domain/decision/round.ts`）：可解析升序，不可解析排后并保留原文；**存储端未动**，符合 §5「先结构化读取，不结构化存储」。

### Timeline 无法可靠展示的过程数据（未虚构）

| 想要的事件 | 缺的数据 | 未来依赖 |
| --- | --- | --- |
| 海克斯选取时刻 | `augmentIds` 无回合信息 | R6② 或 `augmentRound` 类字段 |
| 装备变化 | 无 | 结构化装备事件 |
| 经济 / 血量曲线 | 只有终值 | 屏截图导入（Data Center）或回合快照 |
| 转折点阶段 | R2 处于 Hold | 真实使用数据 |

### 对 R2–R7 的含义

Timeline 证明：**仅凭 `Decision.round + type + hindsight` 就能回答「这局是怎么一步步走到这个结果的」**。这支持本文 §1.2 的判断——`Decision.hindsight` 是被低估的资产。在 Hold 解除前，Timeline 是比新增字段更高性价比的方向：不需要 `ReviewStructured`，不需要 R2 的 `turningPointStage`，同回合多条决策天然相邻，阶段层级无需显式建模。
