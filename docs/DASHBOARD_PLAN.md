# DASHBOARD_PLAN · 仪表盘重构

> 配套：[REVIEW_DATA_REQUIREMENTS](./REVIEW_DATA_REQUIREMENTS.md) · [UI 优化](./UI_IMPROVEMENT_PLAN.md) · [产品路线](./PRODUCT_ROADMAP.md)
> 基线：工作区（`main` @ `7347d3f` + Phase 2T/3A 未提交改动）。
> 本文只做规划，不含代码改动。**不改数据模型**：`db.ts` 保持 Dexie v3（`db.ts:57`），`SNAPSHOT_SCHEMA_VERSION` 保持 2（`types.ts:228`）。

---

## 勘误（对既有报告与既有文档的修正）

| # | 流传的说法 | 实际 | 依据 |
| --- | --- | --- | --- |
| 1 | 「`/matches?mistake=X` 的 URL 管线已经能用了，只是没人生成它」 | **不成立。** `MatchesPage` 只在挂载时读一个参数 `reviewed`（`MatchesPage.tsx:26`）。`mistake` 完全没有被解析，`MatchQuery.mistake` 只能由 `MatchFilters` 的下拉写入（`MatchFilters.tsx:113`）。drill-down 需要**新增 URL 解析**，不是零成本 | `MatchesPage.tsx:21-27`、`query.ts:16` |
| 2 | 「`DashboardPage` 有 8 个 tile」 | 8 个 `StatCard` 属实（`DashboardPage.tsx:60-69` + `:167-176`），但它们**不是 6+2 的两行同构布局**：第一行 6 个是 session 全量，第二行 2 个是「最近 10 场」窗口量。混在一张网格里会让读者以为两组同口径 | `DashboardPage.tsx:59`（`xl:grid-cols-6`） |
| 3 | 「`min-width={520}` 是笔误，`minWidth` 才是对的；改成 `minWidth` 就能得到 520px 下限」 | 前半对、后半**错**。recharts 3.10.1 的 `Props` 确实声明 `minWidth?: string \| number`（`node_modules/recharts/types/component/ResponsiveContainer.d.ts:26`），且运行时把 `minWidth` 写进外层 div 的 `style`（`ResponsiveContainer.js:155-159`）。但 `calculateChartDimensions` 只吃 `width / height / aspect / maxHeight`（`responsiveContainerUtils.js:20-27`），**`minWidth` 从不参与尺寸计算**；宽度永远来自对父元素的 `ResizeObserver`（`ResponsiveContainer.js:105-131`）。所以改成 `minWidth={520}` 只会给外壳加一条 CSS，仍然不是下限。真正要 520px 必须给中间 wrapper 一个数值 `width` 或 CSS `min-width` | 见上列4 处 |
| 4 | 「`min-width={520}` 落到 DOM 上、零布局效果、TS 不报错是因为 `Props extends React.HTMLAttributes`」 | 前半对、**理由错**。它落到 DOM 是因为 `ResponsiveContainer` 把未识别的 prop 通过 `...others` 展开到 div（`ResponsiveContainer.js:159`）。TS 不报错不是类型宽（`Props` 里根本没有 `min-width`），而是 JSX 对含连字符的属性名不做类型检查。结论不变：**这是死 prop** | `ResponsiveContainer.js:15`（`_excluded` 列表不含 `min-width`）、`:159` |
| 5 | 「`MistakeBarChart` 有 7 个硬编码 hex」 | **6 个**（`:11,12,13,16,17,20`）。`PlacementTrendChart` 是 **8 个**（`:12,13,14,15,18,19,22,104`）。合计 14 个，全部是既有 token 的逐字节拷贝 | `grep -on '#[0-9a-f]\{6\}'` |
| 6 | 「`?reviewed=unreviewed` 深链已存在于 `MatchesPage.tsx:26`」（`UI_IMPROVEMENT_PLAN.md:71`） | 解析侧确实存在，但**全仓库没有任何地方生成这个链接**（唯一命中是 `match-pages.test.tsx:97`）。`MatchesPage.tsx:25` 的注释「is the link from the Dashboard todo card」指向一个不存在的卡片 | `grep -rn 'reviewed=unreviewed' src/` |
| 7 | 「`weekStats` 忽略 `sessionId`」 | 属实且更严重：它连参数都不接收（`weekly-service.ts:28` 只收 `anchor`），并且把 `overallStats` / `mistakeCounts` / `compositionStats` 三个纯函数**内联重写**了一遍（`:36-66`）。同时 `avgPlacement` 在 `:75` 四舍五入到 1 位，而 `domain` 版 `avgPlacement()` 保留 2 位（`match.ts:173`） | `weekly-service.ts:28,36-66,75` |

---

## 1. Dashboard 的产品职责

**唯一职责**：打开后约 30 秒内回答一个问题——**「我最近练得怎么样，在变好还是变差，下一步该练什么」**。

三段式，缺一不可：

1. **状态**（我处于什么水平）→ 平均名次 / Top4 率
2. **方向**（在变好还是变差）→ 近 10 场的相对变化，**这是当前完全缺失的一段**
3. **下一步**（该做什么）→ 当前目标 + 未复盘积压 + 高频问题

现状只覆盖了第 1 段，而且是靠 8 个数字卡片覆盖的。第 2 段完全没有：Dashboard 上没有任何图表，也没有任何「相比上个月 / 上周」的量。

### Dashboard 明确**不是**什么

- **不是数字墙**。当前 8 个 tile 里有 4 个编码的是同一位 placement 多重集（见 §3），信息量约等于 3 个。
- **不是 `/statistics` 的入口页**。`StatisticsPage` 有 9 个 tile + 2 图 + 2 表（`:124-148`、`:159-174`、`:175`、`:185`、`:192-201`），是全量分析页；Dashboard 只做「最近状态」这一屏。
- **不是录入页**。录入入口已经有两个（`AddMatchButton` + `/matches/new`），Dashboard 不该重复 QuickAdd 的字段。
- **不是复盘页**。复盘的完整上下文（对局速览、决策时间线）需要 `/matches/:id/review` 的整页布局（`ReviewPage.tsx` 右侧 aside）。
- **不承担「全部训练」视角**。Dashboard 全部统计硬绑 `activeSessionId`（`DashboardPage.tsx:28-36`），且注释明确「all sessions 留在 Matches / Statistics」（`:26-27`）。这是对的，不要改。

---

## 2. 用户核心问题

从**现有数据模型**反推，不是通用模板。标注 ✅ = 今天就能答；⚠️ = 需要新数据（详见 `REVIEW_DATA_REQUIREMENTS.md`）。

| # | 问题 | 现在能答吗 | 依据 / 阻塞点 |
| --- | --- | --- | --- |
| Q1 | 我最近是在变好还是变差？ | ✅ | `recentWindowStats` 已能算任意窗口（`stats.ts:59-69`），`PlacementTrendChart` 已能画（`PlacementTrendChart.tsx:34`）。**纯粹是没放到 Dashboard 上**。要答「变好/变差」需要两个窗口的对比，现在只给一个窗口的绝对值 |
| Q2 | 我这个训练的整体水平如何？和全部训练比呢？ | ⚠️ 部分 | 全部训练的水平已有（`allOverall()` 支持 `sessionId=undefined`，`stats-service.ts:34`），但**没有任何界面做 session 与全量的并排对比**。要做需要「多 session 序列」而不是单点 |
| Q3 | 我的失败集中在哪种错误上？改了没有？ | ✅ 部分 | `primaryMistake` 是 11 值闭集（`types.ts:13-25`），已经支撑柱状图（`MistakeBarChart.tsx`）。缺的是**时间维度**：这个错误占比是在降还是在升，现在只能看到当前截面。`decision-service.ts:46` 有 `hindsightStats` 之类的入口但 Dashboard 没用 |
| Q4 | 我在哪个时段打得更稳？ | ⚠️ 受限 | 只有 2 小时粒度的 5 个桶（`wallclock.ts:180-186`）。能答「哪个时段平均名次更好」，不能答「几点更容易吃鸡」（样本被摊薄）。无 weekday 聚合、无 hour-of-day |
| Q5 | 我哪些阵容值得继续玩，哪些该放弃？ | ✅ | `compositionStats` 已有 games / avgPlacement / top4Rate（`stats.ts:123-141`），`CompositionUsage` 已有频次与最近使用（`types.ts:174-179`）。缺的是**最小样本保护**（见 §6） |
| Q6 | 我的开局策略（连胜 / 连败 / 走经济）哪个更有效？ | ❌ **阻塞** | `opening` 是自由文本（`types.ts:126`），不可聚合。这是全模型最想要的统计，但今天一个数字都算不出来 → 见 `REVIEW_DATA_REQUIREMENTS.md` §3 R1 |
| Q7 | 我为什么输？ | ⚠️ 部分 | `bottom4` 数量已有（`stats.ts:37`）。但「为什么」在 `biggestMistake` 自由文本里（`types.ts:131`），不可聚合。`Decision.hindsight`（`correct`/`wrong`/`mixed`，`types.ts:118`）是**已存在的结构化字段，全仓库零聚合** —— 这是第二大被低估的资产 |

**结论**：Q1 / Q5 今天就能答且没答；Q6 / Q7 需要新数据；Q3 只差时间维度。

---

## 3. KPI 重设计

原则：**每个指标必须提供不同的信息**。判据是——如果两个指标能互相推导，删一个。

### 3.1 当前 8 个 tile 的公式与冗余判定

| tile | 位置 | 公式 | 数据来源 | 判定 |
| --- | --- | --- | --- | --- |
| 总场次 | `:60` | `games` = 匹配行数 | `stats.ts:34` | **保留**（分母，一切率的前提） |
| 平均名次 | `:61` | `Σplacement / games`，2 位后展示 1 位 | `stats.ts:41` | **保留**（连续量，唯一） |
| Top4 率 | `:62` | `count(placement ≤ 4) / games` | `stats.ts:36,42` | **保留**（阈值量） |
| 吃鸡 | `:63` | `count(placement === 1)` | `stats.ts:35,45` | **保留**（见下） |
| Win Rate | `:64` | `wins / games` | `stats.ts:43` | ❌ **删除**：与「吃鸡」同分子（都是 `placement===1` 的计数），只是除了个 `games`。且两者同在第一行、同为 `tone="gold"`（`:63`、`:64`），视觉上还在强调同一个事实 |
| 连续训练 | `:65-69` | `trainingStreak` | `stats.ts:191-202` | **保留**（唯一的日历维度） |
| 最近 10 场 · 平均名次 | `:167-171` | 同「平均名次」，窗口 10 | `stats.ts:66` | ⚠️ **改造**：绝对值无用，缺对比 |
| 最近 10 场 · Top4 率 | `:172-176` | 同「Top4 率」，窗口 10 | `stats.ts:67` | ❌ **删除**：与第一行的 Top4 率同度量不同窗口，且 StatisticsPage `:169-173` 已有同形状的「最近 20 场 · Top4 率」 |

### 3.2 三个冗余的精确形式

1. **`吃鸡` 与 `Win Rate` 严格冗余**。`wins = count(placement===1)`（`stats.ts:35`），`winRate = wins/games`（`stats.ts:43`）。同一行并排渲染同一分子，是最贵的一种冗余：它把 1 个独立量伪装成 2 个。
2. **`Top4 率` 是 `Bottom4 率` 的补集**。`top4 = count(p≤4)`、`bottom4 = count(p>4)`，两者由构造互斥且穷尽（`stats.ts:36-37`），故 `bottom4Rate ≡ 1 − top4Rate`。`StatisticsPage:138-143` 单独给 Bottom4 一格是纯冗余。**Dashboard 现在没放 Bottom4，这是对的**，不要加。
3. **`平均名次` 与 `Top4 率` 不冗余，但接近**。同一 placement 多重集的均值与「≤4 的占比」。数学上不互相推导（均值 4.0 可以来自 4/4/4/4/4/4/4/4，也可以来自 8/8/8/8/8/8/8/8… 不，后者均值 8；但可以是 1,7,1,7… → 均值 4.0、Top4 率 50%；或 4,4,4,4 → 均值 4.0、Top4 率 100%）。**结论：两个都留，但不要在 Dashboard 同时展示均值和 Top4 率的全量与窗口版本**——那才是真正的冗余（4 个数挤在 2 行里表达 2 个量）。

### 3.3 `吃鸡` 与 `Win Rate` 是否都该存在？

**只保留 `吃鸡`（计数），删除 `Win Rate`。** 理由：

- 同一个分子只能有一个主展示位。计数是原始事实（"我吃了几把"），比率是派生的（"吃鸡占多少"）。
- 在样本小的时候（这是个人训练日志的真实场景），**比率的分辨率是致命的**：`wins/games`，10 局 1 吃鸡 = 10%。同一局用「1」表示更诚实。
- 比率可以在**有分母的地方**出现：Top4 率 tile 的 `sub` 已有 `4 / games` 模式（`StatisticsPage:130`），吃鸡也可以用 `吃鸡 2 / 18 局` 的 sub 形式。

**结论**：`吃鸡` 保留为计数，`Win Rate` 删除，吃鸡的比率信息并入 sub 文案。

### 3.4 `平均名次` 与 `Top4 率` 是否太近？

**不近，但不该同时给出两个窗口的版本。** 保留策略：

- **Dashboard 只放「近 10 场」窗口的平均名次**（不放大 session 全量），因为 Dashboard 的职责是「最近状态」。
- **session 全量的平均名次与 Top4 率留在 `/statistics`**（`StatisticsPage:124-148` 已有）。
- 这样两个页面各自口径一致，且 Dashboard 的每个 tile 都回答一个「最近」的问题。

### 3.5 最小 KPI 集（5 个）

| tile | 值 | sub | 回答 | 为什么不可从别的 tile 推导 |
| --- | --- | --- | --- | --- |
| **近 10 场平均名次** | `formatNumber(avg, 1)` | `较前 10 场 ↑0.3 / ↓0.4 / 持平 / —` | Q1 我最近在变好还是变差 | 需要**两个窗口**才能算趋势。任何一个单窗口 tile 都给不出方向。这是 Dashboard 唯一必须自有的量 |
| **Top4 率（近 10 场）** | `formatRateValue(top4Rate)` | `4 / 10 局` | 我最近稳定进前四吗 | 阈值量 ≠ 均值（§3.2 第 3 点）。且 sub 的 `4 / 10` 提供了分母，不需要单独的「总场次」tile 来当分母 |
| **连续训练** | `N 天` | `有对局的连续天数` | 我在坚持吗 | **唯一的时间连续量**。与任何 placement 量正交——可以连续 20 天但平均名次 5.5 |
| **吃鸡** | `N` | `近 10 场 / 本训练共 N` | 峰值表现 | `placement===1` 的极端事件，不被均值或 Top4 率表达（1 既进 Top4 又拉低均值，它被均值「平均掉」了） |
| **场次** | `N` | `近 10 场 / 本训练共 N` | 样本量够不够 | **元指标**。上面所有率的分母。删掉它，用户无法判断 10 局 40% 和 200 局 40% 的差别 |

**5 个 tile，5 个独立量。** 对比现状：8 个 tile → 3 个独立量。

从 8 → 5 的动作：
- 删 `Win Rate`（`DashboardPage.tsx:64`）
- 删 `最近 10 场 · Top4 率`（`:172-176`）→ 并入 Top4 率 tile 的主位
- 删 `平均名次`（全量，`:61`）→ 换成 `近 10 场平均名次` + 变化量
- `最近 10 场 · 平均名次`（`:167-171`）→ 升格为第一格
- `总场次`（`:60`）→ 保留，但降为 sub（它本来就是分母，不是发现）
- `吃鸡`（`:63`）→ 保留
- `连续训练`（`:65-69`）→ 保留

**变化量从哪来**：`recentWindowStats` 已能算任意窗口（`stats.ts:59-69`），只需调两次——`recentWindow(10, sessionId)` 与 `recentWindow(20, sessionId)` 取后 10 局做差。**不需要新数据、不需要新表、不需要改 schema。** 注意：窗口不足时（`games < 20`）第二个窗口为空，此时 sub 必须显示「样本不足」而不是 `0.0`——现有 `formatNumber(null)` 会返回 `—`（`utils.ts:41-43`），天然可用。

---

## 4. 一图一问

规则：**说不出这个图回答的问题，就删掉，不要美化。**

### 4.1 `PlacementTrendChart` —— 保留（改造）

- **它回答的问题**：最近 20 局的名次是在变好还是变差？
- **现有数据能回答吗**：**能**。`placementTrendSeries`（`stats.ts:72-80`）已产出 `{index, label, placement, top4, id}`，`StatisticsPage:175` 已渲染。
- **判定：保留，改造。** 它是 Dashboard 缺失的第 2 段（方向）的唯一现成载体。
- 需要的改造：
  1. **提到 Dashboard**，窗口从 20 缩到 10（Dashboard 讲「最近」，StatisticsPage 保留 20 作为对照）。
  2. **X 轴由日期改为序号**。现在 `dataKey="index"` + `tickFormatter` 读 `data[v-1].label`（`PlacementTrendChart.tsx:52-53`），而 `label` 是 `playedAt.slice(5,10)`（`stats.ts:76`）。同一天打两局 → 两个相同的 `MM-DD`。改成序号后 tooltip 里再显示日期。
  3. **最小样本保护**（见 §6）。
  4. **点击数据点 → `/matches/:id`**。`TrendPoint.id` 已经从 `stats.ts:79` 一路带到了组件（`:30`），只是从没被用过。recharts 的 `dot` 渲染函数已经是自定义的（`:91-103`），加 `onClick` 即可。
  5. **a11y**：recharts 3.10.1 的 `accessibilityLayer` 默认 `true`（`rootPropsSlice.js:14`），会给图表 SVG 加 `role="application"` + `tabIndex={0}`（`RootSurface.js:47-64`）。当前**没有 `aria-label`**，也没有 `<title>`/`<desc>`（`:58-59` 的 `title`/`desc` 参数两个图都没传）。Top4 与非 Top4 的区分**只靠点的填充色**（`:99`）——对一个 `role="application"` 容器内的纯色编码，屏幕阅读器拿不到任何信息。

### 4.2 `MistakeBarChart` —— 保留（改造）

- **它回答的问题**：我的失败集中在哪几类错误上？
- **现有数据能回答吗**：**能，而且是全模型性价比最高的一张图**。`primaryMistake` 是 11 值闭集（`types.ts:13-25`），每局最多 1 个值，`mistakeCounts`（`stats.ts:89-103`）纯函数聚合，已支撑这张图。
- **判定：保留，改造。**
- 需要的改造：
  1. **点击柱子 → `/matches?mistake=X`**。**注意这不是零成本**（勘误 #1）：`MatchesPage` 不解析 `mistake` 参数，需要先把 URL→state 补上（见 §5.3）。
  2. **`interval={0}` 必须改**（`:46`）。它强制 12 个中文标签（11 类 + 「未分类」，`stats-service.ts:62`）在 `fontSize: 12`（`:43`）下全部渲染且**不旋转**，在 <640px 必然重叠。
  3. **死 prop `min-width={520}`**（`:38`）删除或改为真实下限方案（勘误 #3、#4）。
  4. **空状态守卫可以简化**：`:28` 的 `data.every(d => d.count === 0)` 是死条件——`mistakeCounts` 只会产出 count ≥ 1 的条目（`:96` 只会 `+1`），所以 `.every(...)` 恒为 false。
  5. **最小样本保护**（见 §6）。这张图尤其需要：`mistakeChart` 会把「未分类」也算成一个条目（`stats-service.ts:59` 的过滤条件 `c.type !== UNCLASSIFIED || c.count > 0` 对 `UNCLASSIFIED` 恒真），所以 1 局未复盘的记录会产生一根「未分类 × 1」的柱子——**一根 100% 的柱子**。

### 4.3 `StatTable` · 阵容统计 —— 保留（加最小样本保护）

- **它回答的问题**：哪些阵容我玩得住，哪些该放弃？
- **现有数据能回答吗**：**能**。`compositionStats`（`stats.ts:123-141`）已有 games / avgPlacement / top4Rate / lastPlayed。
- **判定：保留。** 这是 Q5 的唯一现成答案。
- 改造点：**`compositionStats:136` 的 `top4Rate` 没有任何分母保护**——`ms.filter(...).length / ms.length`，虽然 `ms.length ≥ 1`（分组只在 `push` 后创建，`:124-131`），所以不会除零，但会产生「1 局 100% Top4 率」这种读起来比实际更强的数字。对比 `overallStats:42` 在 0 局时返回 `null`——**同一个代码库里两种做法**。需要在 UI 层加 N 下限，而不是改 `stats.ts`（保持纯函数）。
- 另：`normalizeCompositionKey` 已归一化（`:126`），「福牛」与「福牛法师」是不同 key——这是设计决策，不是 bug，但要在表头提示用户，否则「阵容」行数会莫名膨胀。

### 4.4 `StatTable` · 时段统计 —— 改造（降级为次要信息）

- **它回答的问题**：我在哪个时段打得更稳？
- **现有数据能回答吗**：**部分**。5 个 2 小时桶 + 1 个「训练时段外」（`wallclock.ts:180-188`）。能答「哪个桶平均名次更好」，答不了「几点更容易吃鸡」。
- **判定：改造，但降级。** 理由：
  - `timeSlotStats:164` 过滤掉空桶（`.filter(key => groups.has(key))`），所以**同一张表在不同数据集下行数不同、行位置会平移**。这不是显示问题，是**语义问题**：用户没法把两张表的第 2 行当作同一个时段来比较。
  - 空桶被丢掉恰恰是最该显示的信息（「你 20:00-22:00 一局没打」）。
  - **改造方向**：保留全部 6 行（含 0 局），0 局行显示 `—` 而非隐藏。这比加图表便宜得多，且修掉了一个真 bug。
- 无 weekday 聚合、无 hour-of-day、无热力图——这些都需要新聚合函数（不需要新数据，`playedAt` 已足够），但优先级低于修上面这个 bug。

### 4.5 4 个对象的判定汇总

| 对象 | 问题 | 现有数据够吗 | 判定 |
| --- | --- | --- | --- |
| `PlacementTrendChart` | 最近在变好还是变差 | 够 | **保留 + 改造** + 提到 Dashboard |
| `MistakeBarChart` | 失败集中在哪 | 够 | **保留 + 改造** |
| `StatTable` 阵容 | 哪些阵容该继续玩 | 够 | **保留 + 加样本下限** |
| `StatTable` 时段 | 哪个时段更稳 | 部分 | **改造**（补全空桶，从隐藏改为显式 0） |

**没有对象建议删除。** 现状的 4 个对象各自都在回答一个真实问题；问题在于 Dashboard 一个都没展示，且 2 个有实现缺陷。

---

## 5. 图表交互与 drill-down

### 5.1 已经存在的东西（复用，不重建）

| 资产 | 位置 | 状态 |
| --- | --- | --- |
| `TrendPoint.id` | `stats.ts:79` → `PlacementTrendChart.tsx:30` | 算出来了，携带到组件了，**从未被使用** |
| `/matches/:id` 路由 | `App.tsx:27` | 可用 |
| `/matches?mistake=` 的过滤能力 | `query.ts:16,54-58` | 纯函数已实现并有测试 |
| `MatchList` 纯展示组件 | `MatchList.tsx:20` | **只接 `Match[]`，无任何数据依赖** |

**`MatchList` 是纯函数组件**（`MatchList.tsx:20-22`：`{ matches }: { matches: Match[] }`），唯一的调用点是 `MatchesPage.tsx:100`，并且它自带小屏卡片 fallback（`MatchList.tsx:22` → `MatchCards`，`:91`）。

> **这是整个计划里最便宜的一笔**：drill-down 不需要改 `MatchList` 一行，只需要决定「传哪个数组进去」。Dashboard 现在自己画了一张 7 列表格（`DashboardPage.tsx:108-162`，7 个 `<th>` 在 `:112-118`），而 `MatchList` 有一张同类的 8 列表格 + 小屏 fallback —— 直接替换即可，同时消灭 `UI_IMPROVEMENT_PLAN.md:58-63` 指出的表头语言不一致。

### 5.2 URL 方案

统一到**一个** scheme，全部走 `HashRouter`（`App.tsx:18`）已有的 query 段：

| 来源 | URL | 落地行为 |
| --- | --- | --- |
| 趋势图数据点 | `/matches/:id` | 直接跳详情。`id` 已在 `TrendPoint` 里（`stats.ts:79`） |
| 错误柱状图柱子 | `/matches?mistake=ECONOMY` | 打开列表并预置错误筛选 |
| 阵容表行 | `/matches?composition=<key>` | 打开列表并预置阵容筛选。注意用 `normalizeCompositionKey` 后的 key（`query.ts:50` 两侧都会归一化，所以原始文本也能命中） |
| 未复盘积压入口 | `/matches?reviewed=unreviewed` | **已经能解析**（`MatchesPage.tsx:26`），只是没人生成（勘误 #6）。Dashboard 加一个入口即可 |

**不放 session scope 进 URL。** Dashboard 的所有统计都绑 `activeSessionId`（`DashboardPage.tsx:28-36`），而 `MatchesPage` 的默认 scope 就是 `session`（`:28,33`）。从 Dashboard 点进来的链接，默认就落在同一个 session 上——不需要额外参数。只有当 StatisticsPage（「全部训练」scope）发 drill-down 时才需要 `?scope=all`，届时再加。

### 5.3 MatchesPage 状态提升：选 URL，不选 context

**结论：URL 驱动，不引入 filter context。**

理由：

1. **7 个筛选维度已经能完整表达成 URL**（`query.ts:11-25`：`search` / `placement` / `reviewed` / `composition` / `mistake` / `from` / `to` / `sortField` / `sortDir` / `sessionId` / `limit`）。这是纯函数的输入输出（`queryMatches`，`query.ts:33`），一个 URL round-trip 不丢信息。
2. **现在已经在这么做了，只做了 1/7**。`MatchesPage.tsx:26` 已经解析 `reviewed`。把它扩到全部维度是**同一个模式重复 7 次**，而不是引入新机制。
3. **context 会带来两个新问题，而 URL 不会**：filter 状态在 `/matches` 之外无法表达（图表页需要它）；context 状态刷新即失，而用户会期望「我刚才点的那个筛选还在」。
4. 全仓库**没有任何 `localStorage` / `sessionStorage`**（`grep -rn "localStorage\|sessionStorage" src/` → 0 命中）。引入持久化 = 引入一个当前不存在的状态层，在纯规划阶段不加。

具体改动（MatchesPage 内，不新建文件）：
- 把 `useState<MatchQuery>`（`:23-27`）换成从 `useSearchParams` 派生的 `query`（`const [params, setParams] = useSearchParams()`），`MatchQuery` → URL 的双向映射写在 `query.ts` 里作为纯函数 `queryToParams` / `paramsToQuery`（可单测，和 `queryMatches` 同级）。
- `MatchFilters` 的 `onChange(patch)`（`:79`）改成写 URL 而不是 `setQuery`。`MatchFilters` 已经是纯受控组件（`MatchFilters.tsx:27-37`），**不需要改它**。
- `scope`（`:28`）单独用一个 `scope` 参数，或保持非 URL（推荐保持非 URL：它是页头控制，不是筛选）。

**注意一个现存行为**：`:21` 的 `const [params] = useSearchParams()` 是**挂载时读一次**。改成 URL 驱动后，`params` 会随导航变化，需要 `useEffect` 或直接受控派生——这是本次改动的主要风险点，也是它必须先做的原因（drill-down 依赖它）。

### 5.4 每张图的交互规格

**`PlacementTrendChart`**
- hover：tooltip 显示「第 N 局 · MM-DD · 第 X 名」+ Top4 标记。现有 tooltip 已显示 label 和名次（`:70-74`），补 `index` 和日期即可。
- click：数据点 → `/matches/:id`。实现位置在自定义 `dot` 渲染函数（`:91-103`），给 `<circle>` 加 `onClick` + `role="button"` + `tabIndex={0}` + `<title>`。**单点也要可点**。
- 键盘：`role="application"` 容器已有 `tabIndex=0`（`RootSurface.js:52`），但没有焦点管理。最小方案：`dot` 渲染时给前 5 个点加 `tabIndex`，Enter 触发同 click。
- 无 filter（这张图只有 20 个点，筛它没意义）。

**`MistakeBarChart`**
- hover：保留（`:54-58`），补充「占比 N%」。
- click：柱子 → `/matches?mistake=<key>`。`key` 已在 `MistakeChartEntry` 里（`stats-service.ts:52`），直接可用。
- 「未分类」柱子（key = `"UNCLASSIFIED"`，`stats.ts:87`）→ 特殊处理：跳 `/matches?reviewed=unreviewed` 而不是 `mistake=UNCLASSIFIED`，因为 `queryMatches` 对 `mistake` 的语义是**精确匹配**（`query.ts:57`），而「未分类」的语义是「没有 `primaryMistake`」（`:55-56` 的 `q.mistake === "none"` 分支）。**这两条路要走不同的分支**，`MatchFilters` 已经提供了「未分类」选项（`MatchFilters.tsx:116`）→ 对应 `mistake=none`。

**两张表的行**
- 阵容行 → `/matches?composition=<key>`
- 时段行 → 目前**不可 drill-down**：`timeSlotStat` 的 `key`（`stats.ts:150`）是 `12-14` 这类字符串，`MatchQuery` 没有小时区间筛选（`query.ts:11-25`）。要支持得新增 `hours` 维度 → 属于筛选能力扩展，本期不做。行 hover 态 + `title` 提示即可。

---

## 6. 空状态与最小样本阈值

### 6.1 现状：空状态是假的

两个图表的「空」有三种含义，但代码只区分了一种：

```
PlacementTrendChart:42   if (data.length === 0) → "暂无数据"
MistakeBarChart:28      if (data.length === 0 || ...) → "还没有标记过…"
页面层                 StatisticsPage:43  if (overall === undefined) return <Spinner/>
```

`StatisticsPage` 对每个查询都写 `?? []`（`:175`、`:185`、`:194`、`:200`）。所以**慢查询期间渲染的是「空」不是「加载中」**：页面级 `Spinner` 只等 `overall`（`:43`），`trendSeries` / `mistakes` / `compositions` / `slots` 任何一个还在飞，页面就已经把 `[]` 传进图表 → 用户看到「暂无数据」闪一下，然后变成图。**这是当前仪表盘最诚实性上的一个缺陷**（`UI_IMPROVEMENT_PLAN.md` 未记录）。

**规则：区分三种状态。**
- `undefined` = 加载中 → 渲染骨架/占位，**不渲染「暂无数据」**
- `[]` + `games === 0` = 真空 → 渲染「记录第一局后这里会显示…」
- 有数据但 `N < 阈值` = 样本不足 → 渲染「已记录 N 局，记到 M 局后这里才有意义」

### 6.2 0 局：绝不渲染空图表外壳

现状的 `PlacementTrendChart:42-44` 返回一个 `<p>暂无数据</p>` —— 没有图表外壳，所以这一点其实已经做对了一半（没有渲染空的坐标轴）。但**文案是错的**：0 局时说「暂无数据」，把「你还没开始记录」说成了「数据不在」。应该按 §6.4 的模板给出下一步动作。

**0 局时 Dashboard 整屏应该做什么**：`DashboardPage:41` 已经有 `noData` 判断，且 `:80-106` 已经渲染了带「记录第一局」+「载入示例数据」两个动作的 `EmptyState`。**这块是对的，不要动。** 要改的是：`noData` 为真时，**不要渲染 KPI 网格**（`:59-70` 的 8 个 tile 会显示 6 个 `0` 和 4 个 `—`）。0 局时显示 8 个零是没有信息量的。

### 6.3 小样本：1–2 局不能产生「你的最佳阵容」

这是**当前代码里真实存在的漏洞**，而且两处实现不一致：

| 位置 | 0 数据时的行为 |
| --- | --- |
| `overallStats:42-44` | `games ? … : null` → **有 null 守卫**，UI 显示 `—`（`formatRateValue`，`StatCard.tsx:33-34`） |
| `compositionStats:136` | `… / ms.length`，**无守卫** → 1 局也给 100% |
| `timeSlotStats:177` | 同上，**无守卫** |

即「1 局 → `你的最佳阵容：法师爆发，1 局，Top4 率 100%，平均第 1 名`」。这句话每一部分都是真的，合起来是误导。

**最小样本保护必须加，但加在 UI 层而不是 `stats.ts`**——`stats.ts` 是纯函数，测试覆盖 10 例（`stats.test.ts`），改它的返回值会波及所有调用方。规则写在渲染层。

### 6.4 阈值表（具体数字）

| 组件 | 最小 N | N < 阈值时显示 | 理由 |
| --- | --- | --- | --- |
| **placement 趋势图** | **5** | 「已记录 N 局。趋势线需要 5 局才画得出来。」 | 3 个点的折线不表达趋势，只表达噪声。而 1 个点会画出一条**零长度路径**（`type="monotone"` 在单点下退化为一个孤立的圆点），用户看到「一个点 + 一条虚线平均值线」，无从解释 |
| **趋势图的变化量 sub** | **10** | 「样本不足，10 局后显示变化」 | 变化量需要两个窗口（近 10 vs 前 10），至少 20 局才有两个完整窗口。**未满时不要显示 `0.0` / `持平`——那是把「没数据」说成「没变化」** |
| **错误柱状图** | **5** | 「已标记 N 局 Primary Mistake，累计 5 局后开始显示分布。」 | 同上。另：`mistakeChart` 会产出 `未分类` 条目（`stats-service.ts:59`），1 局未标记 = 一根 100% 的「未分类」柱 |
| **阵容统计表** | **3** | 该行显示 `样本不足（1 局）`，且**按场次降序排在最后**（现在按 `games` 降序，`:139`，1 局的阵容本来就垫底，但 `lastPlayed` 排在最右容易被忽略） | 3 局能看出方向，1 局不能。2 局 Top4 率只可能是 0% / 50% / 100% |
| **时段统计表** | **3** | 0 局桶显示 `—`（不再隐藏，修复 §4.4）；1–2 局桶显示数字但不加粗 | 桶内 1–2 局的方差极大，标记出来即可，不必隐藏 |

### 6.5 文案模板（0 局）

不要写「暂无数据」。写清楚**记了什么之后这里会出现什么**：

```
placement 趋势：
  现在还没有对局记录。
  记录 5 局之后，这里会显示最近的名次走势和每局的变化方向。

错误分布：
  现在还没有对局记录。
  复盘时给每局选一个 Primary Mistake，记满 5 局后这里会显示错误的分布。

阵容统计：
  还没有填过阵容。
  记录对局时选一个阵容，同一个阵容记满 3 局后这里会给出它的平均名次和 Top4 率。
```

已有可复用的文案资产：`MistakeBarChart:31` 的「还没有标记过 Primary Mistake。每局复盘选一个，这里才会开始积累。」这句写得对，保留。`PlacementTrendChart:43` 的「暂无数据」替换掉。

---

## 7. 移动端

三档定义，与项目现有断点对齐：

- **小屏 < 640px**（Tailwind 默认 `sm` 以下）
- **中屏 640–1023px**（`sm` – `lg`）
- **桌面 ≥ 1024px**（`lg` 以上，`AppShell.tsx:59` 在此处切两栏）

项目已有的响应式基座：`useMediaQuery`（`use-media-query.ts`）+ `DESKTOP_QUERY = "(min-width: 768px)"`（`:32`）。**目前只有 `MatchList` 在用**（`MatchList.tsx:21`）。这是唯一一处「按断点切两套 DOM」，其余全靠 Tailwind 类。

| 项 | 小屏 <640 | 中屏 640–1023 | 桌面 ≥1024 |
| --- | --- | --- | --- |
| **KPI 网格** | 1 列 × 5 行（现在是 `grid-cols-2`，`:59`）。5 个 tile 在 375px 下 2 列 = 每格 ~170px，装不下 `近 10 场平均名次` 这个 label（`StatCard:26` 是 `text-[11px] uppercase tracking-[0.12em]`，中文 label 会折行）。**改 1 列** | 2 列（第 3 行 1 格） | 5 列一行（现在是 `xl:grid-cols-6` 放 5 个 tile，空一格；改 `lg:grid-cols-5`） |
| **趋势图** | 高度 `h-64` → `h-48`（`PlacementTrendChart:47`）；X 轴序号抽稀（`interval` 或 `minTickGap` 调大，当前 `:57` 是 `minTickGap={24}`） | `h-56`，X 轴全显示 | `h-64`，X 轴全显示 |
| **错误柱状图** | **不要横向滚动**。现在 `min-width={520}`（`:38`）是死 prop，`overflow-x-auto`（`:37`）也因此无效。改为**纵向布局**（`layout="vertical"`：类目在 Y 轴、条形在 X 轴），中文标签横排不会重叠、不需要滚动、不需要旋转。`interval={0}`（`:46`）去掉，改用 recharts 的 `interval="preserveStartEnd"` | 纵向布局，或保留柱状但 `angle={-30}` | 保持柱状 + `interval={0}`（12 个中文标签在 ≥1024px 放得下） |
| **Dashboard 内联表** | **换成 `MatchList`**（自带 `MatchCards` fallback，`MatchList.tsx:22,91`）。现在 `overflow-x-auto` + 7 列（`:108-118`）在 375px 下要横向滚 | `MatchList` 走 `DESKTOP_QUERY` 判定，768px 以下已经是卡片 | `MatchList` 桌面表格 |
| **tooltip（触摸）** | **recharts tooltip 是 hover 驱动的，触摸上等于没有。** 三个替代方案按优先级：(a) 触摸时用 `onClick` 直接触发 drill-down，不依赖 tooltip；(b) 图表下方补一个 `StatTable` 承载同样的数字（可横滚，且这是唯一在触摸上可靠的信息载体）；(c) 若必须 tooltip，用 `Tooltip trigger="click"`（recharts 支持） | 同小屏 | hover 生效，tooltip 正常 |
| **筛选器** | `MatchFilters` 的 4 列网格（`:49` `sm:grid-cols-2 lg:grid-cols-4`）在 <640 已是单列，但 **8 个控件全部展开**（`:49-166`），在小屏占满首屏。改：折叠为一个「筛选」按钮 + 展开面板，或用现成的 `Modal`（`Modal.tsx`，已支持 Esc + body 锁 + 小屏 `items-end` 底部弹入，`:39`） | 保持展开 | 保持展开 |
| **图表空状态** | 不用 `h-64` 撑一个 `py-10` 文案（`PlacementTrendChart:43`），浪费一屏。文案直接放在该位置 | 同 | 同 |

---

## 8. 推荐页面结构

### 三层视觉层次

**第一视觉层 · 「我最近怎么样」—— 一个问题，一个答案**

只有趋势图。位置：KPI 网格**之上**，而不是之下。

理由：现在 KPI 在最上方、图（如果在的话）在下面。KPI 是 5 个静态数字，趋势图是唯一表达「变化」的元素。用户打开 Dashboard 的第一件事是判断方向，不是读 5 个数字。把图放在数字**上方**，第一眼就回答了「在变好还是变差」；数字退为图的注脚（平均在哪、Top4 多少）。

**第二视觉层 · 「我的水平」—— 5 个 KPI**

趋势图下方，单行 5 格。每个 tile 的 sub 携带分母或对比（§3.5）。

**第三视觉层 · 「接下来做什么」+ 明细**

- 当前训练目标（`:181-222`）
- **未复盘积压入口**（新增）：`未复盘 N 局` → `/matches?reviewed=unreviewed`。**这个链接的解析已经存在**（`MatchesPage.tsx:26`），只是没人生成（勘误 #6）。`overall.reviewedGames` 已经在手上（`stats.ts:38`）。这是全计划里改动量最小、价值最高的一条——它把「复盘」从一个隐藏功能变成 Dashboard 上的一个待办。
- 高频问题（`:224-237`）
- 最近对局：**改用 `MatchList`**（`:108-162` 整段替换）

### 移出 Dashboard 的东西

| 移出 | 去哪 | 为什么 |
| --- | --- | --- |
| 最近对局内联表（`:108-162`，55 行） | 换 `MatchList` | 同类表格已有组件，且带小屏 fallback。55 行手写表格 vs 1 行组件调用 |
| 高频问题面板（`:224-237`） | `/statistics` 的错误统计区，或合并进 KPI | 3 个 badge 的信息量不足以占一个独立 panel；且与 `MistakeBarChart` 重复 |
| 训练时段提示卡（`:239-245`） | 删 | 「12:00–22:00」「数据保存在本机」是全局信息，`AppShell` 侧栏底部已经说过一次（`UI_IMPROVEMENT_PLAN.md:35`）。**Dashboard 不该解释自己的产品** |
| 平均名次 / Top4 率的**全量**版本 | `/statistics`（已有） | Dashboard 只讲「最近」 |

### 线框

```
┌────────────────────────────────────────────────────────────┐
│ 训练状态   日常训练 · 持续进行          [+快速记录] [新增对局] │  PageHeader（不动）
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 最近趋势                              蓝点为 Top4        │ │  ← 第一视觉层
│ │  ●───●───●───●───●   平均 4.3                          │ │    提到 Dashboard
│ │ 1                                              7  8 名   │ │    窗口 20→10
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ 近10场均名次  Top4率(近10)  连续训练  吃鸡     场次          │  ← 第二视觉层
│    4.1          40%          6 天       2      28        │    5 格（原来 8 格）
│  较前10 ↓0.3   4 / 10 局    有对局连续天  近10场/共28     │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐ ┌──────────────────────┐ │
│ │ 最近对局                       │ │ 未复盘 6 局  →       │ │  ← 第三视觉层
│ │ （MatchList，自带小屏卡片）    │ │ 当前训练目标         │ │    新增「未复盘」
│ │                              │ │ 高频问题             │ │
│ │                              │ └──────────────────────┘ │
│ └──────────────────────────────┘                            │
└────────────────────────────────────────────────────────────┘
```

### 用户最先该看到的是什么

**趋势图。** 不是任何单个数字。

论证：
1. Dashboard 的职责是「最近怎么样」——「怎么样」的核心是**变化**，不是**水平**。水平是一张图上的那条虚线（`PlacementTrendChart:77-83` 的 `ReferenceLine` 已经画了），变化是那条折线。用户能从折线上一眼读出水平（看它相对虚线的位置），反过来不行。
2. 5 个 KPI 里没有一个能表达方向。`近10场均名次 4.1` 这个数字，用户无法判断 4.1 是从 3.5 涨上来的还是从 4.8 掉下来的。**这是当前 Dashboard 最大的信息缺口**——它把一个需要两个数字才能回答的问题（变好还是变差）压缩成了一个没有参照系的绝对值。
3. 它是现成的。`trend(20, sessionId)` 已经在 `StatisticsPage:175` 跑着，数据管道零新增。

---

## 9. chart-theme 方案

现状（`UI_IMPROVEMENT_PLAN.md:127-128` 已提出方向，此处细化到可执行）：

```
PlacementTrendChart.tsx:12-15   GRID TICK GOLD BLUE  +  :17-23 tooltipStyle + :104 1 个 hex
MistakeBarChart.tsx:11-13      GRID TICK AMBER        +  :15-21 tooltipStyle
```

**14 个 hex，0 个新色**，全部是 `src/index.css` `@theme`（`:3-26`）里已有 token 的逐字节拷贝：`#1e2635`=`base-700`、`#8b97ab`=`ink-400`、`#e8b64a`=`gold-400`、`#38bdf8`=`teal-400`、`#d19a2b`=`gold-500`、`#10151f`=`base-850`、`#232c3d`=`line`、`#f2f5fa`=`ink-50`。

**并且存在语义漂移**：trend 用 `GOLD`（`gold-400`）表示「highlight / 折线 / 强调」，bar 用 `AMBER`（`gold-500`）表示同一个角色。同一语义，两个值。`GOLD` 还被同时用于折线（`:89`）和平均线（`:79`），而 `BLUE`（`:99`）专用于「Top4 点的填充」——**四色里三色是装饰，唯一有语义的是那个没有名字的蓝色**。

### 位置

`src/components/stats/chart-theme.ts`

理由：两个消费者都在 `src/components/stats/`（`UI_IMPROVEMENT_PLAN.md:127` 建议的 `components/charts/` 目录目前只有 2 个文件，不值得为此建目录；且 `src/components/` 下现有 8 个子目录都是按业务域分的，`charts/` 会对称，`stats/` 更贴合现状。**这是一个判断，不是硬约束。**）

### 导出清单

```ts
// 1. 调色板 —— 从 CSS 自定义属性取值，不是硬编码 hex
export const CHART = {
  grid:     "var(--color-base-700)",
  tick:     "var(--color-ink-400)",
  axis:     "var(--color-line)",
  surface:  "var(--color-base-850)",
  ink:      "var(--color-ink-50)",
  gold:     "var(--color-gold-400)",
  amber:    "var(--color-gold-500)",
  accent:   "var(--color-teal-400)",
} as const;

// 2. 语义别名 —— 图表作者应该用这一层，不是 CHART
export const CHART_SEMANTIC = {
  /** 序列主色（折线 / 柱子） */
  series:    CHART.gold,
  /** 参考线 / 均值线：必须与 series 可区分 */
  reference: CHART.amber,
  /** Top4 高亮 */
  highlight: CHART.accent,
  /** 负向 / Bottom4（若图表需要） */
  negative:  "#f87171",   // Tailwind 内置 red-400，项目未定义 token
} as const;
```

**为什么用 `var(--color-*)` 而不是 hex 常量**：Tailwind v4 的 `@theme`（`index.css:3-26`）已经把 token 编译成 CSS 自定义属性，recharts 3.x 把 `stroke` / `fill` 作为 SVG 呈现属性下发，而 `var()` 在 SVG 呈现属性里是合法的。这条路径让「改主题时图表跟着变」，而 hex 常量做不到——这正是 `UI_IMPROVEMENT_PLAN.md:116-117` 指出的问题。

**风险与退路**：`var()` 在 SVG presentation attribute 里依赖浏览器实现。若实测发现 tooltip 的 `contentStyle`（内联 style，非 attribute）也能用 `var()` 则无问题；若某个属性不认，退回 hex 常量但**集中在 chart-theme.ts 一处**，并在文件头注明对应的 token 名。这一条必须在实现时实测确定，不能假设。

```ts
// 3. 共用样式对象
export const AXIS_TICK = { fill: CHART.tick, fontSize: 11 } as const;
export const AXIS_LINE = { stroke: CHART.grid } as const;
export const TOOLTIP_STYLE = {
  backgroundColor: CHART.surface,
  border: `1px solid ${CHART.axis}`,
  borderRadius: 10,
  fontSize: 12,
  color: CHART.ink,
} as const;
export const CHART_HEIGHT_CLASS = "h-64";   // 两图都硬编码 h-64

// 4. 最小样本阈值（§6.4）—— 放在这里，因为它是「图表契约」的一部分
export const MIN_SAMPLES = {
  trend: 5,
  mistake: 5,
  compositionRow: 3,
  timeSlotRow: 3,
} as const;
```

### 共用空状态组件

```ts
// src/components/stats/ChartEmpty.tsx
export function ChartEmpty({
  min,          // 来自 MIN_SAMPLES
  actual,       // 当前实际样本量
  unit,         // "局"
  what,         // "最近的名次走势和每局的变化方向"
}: { … })       // 渲染 §6.5 的三态文案
```

替换掉 `PlacementTrendChart:43` 的 `暂无数据` 和 `MistakeBarChart:30-32` 的手写 `<p>`，并把 §6.1 的 `undefined` / `[]` / `<N` 三态判断收进这个组件——**这样两个图不可能再出现空状态文案不一致**。

### 两张图如何消费

| 改动 | PlacementTrendChart | MistakeBarChart |
| --- | --- | --- |
| 删本地常量 | `:12-15`（4 个） | `:11-13`（3 个） |
| 删本地 `tooltipStyle` | `:17-23` | `:15-21` |
| `activeDot.stroke` 的 `#10151f` | `:104` → `CHART.surface` | — |
| `Line.stroke` / `Bar.fill` | `:89` `GOLD` → `CHART_SEMANTIC.series` | `:59` `AMBER` → `CHART_SEMANTIC.series` |
| `ReferenceLine.stroke` | `:79` `GOLD` → `CHART_SEMANTIC.reference`（**修掉与折线同色**） | — |
| dot fill | `:99` `BLUE` → `CHART_SEMANTIC.highlight` | — |
| `tick` / `axisLine` | `:54,55,63` → `AXIS_TICK` / `AXIS_LINE` | `:43,44,50,52` 同 |
| `contentStyle` | `:69` → `TOOLTIP_STYLE` | `:55` 同 |
| 空状态 | `:42-44` → `<ChartEmpty …/>` | `:28-34` → `<ChartEmpty …/>` |
| 高度 | `:47` → `CHART_HEIGHT_CLASS` | `:37` 同 |

净结果：**14 个 hex → 0**，**2 份重复的 `tooltipStyle` → 1 份**，**2 份手写空状态 → 1 个组件**。

---

## 10. 优先级

「行为」= 改变用户看到的信息或可操作性；「外观」= 只改变呈现方式。

| # | 事项 | 证据 | 文件:行 | 规模 | 类型 |
| --- | --- | --- | --- | --- | --- |
| **P0-1** | 区分「加载中」与「无数据」，消除假空状态 | 页面 `?? []` 传给图表 | `StatisticsPage.tsx:175,185,194,200` + `:43` | 4 处条件 + 三态组件 | 行为 |
| **P0-2** | 加未复盘入口 `/matches?reviewed=unreviewed` | 解析已存在（`MatchesPage.tsx:26`），**零生成方**（全仓库仅测试命中） | `DashboardPage.tsx` 新增一行 | ~8 行 | 行为 |
| **P0-3** | KPI 8 → 5，删 `Win Rate` 与 `最近10场·Top4率` | 同分子冗余（`stats.ts:35,43`）；窗口重复（`StatisticsPage:169`） | `DashboardPage.tsx:60-69,167-176` | 净 −3 个 tile | 行为 |
| **P0-4** | 趋势图提到 Dashboard（方向优先于水平） | Dashboard 零图表（`grep recharts` → 仅 stats/ 两文件）；折线已在跑 | `DashboardPage.tsx` + `stats-service.ts:43` | ~15 行 | 行为 |
| **P0-5** | 加最小样本阈值（5/5/3/3） | `compositionStats:136` 无守卫 → 「1 局 100%」 | 渲染层（不改 `stats.ts`） | 1 个组件 + 4 处调用 | 行为 |
| **P0-6** | 错误柱状图点击 → `/matches?mistake=X` | `id` 已备好（`stats-service.ts:52`）；**URL 解析不存在**（勘误 #1） | `MistakeBarChart.tsx:59` + `MatchesPage.tsx:23-27` | ~20 行 | 行为 |
| **P0-7** | 趋势图数据点点击 → `/matches/:id` | `TrendPoint.id` 从 `stats.ts:79` 一路带到 `PlacementTrendChart.tsx:30`，**从未使用** | `PlacementTrendChart.tsx:91-103` | ~10 行 | 行为 |
| **P0-8** | 修正文案：`暂无数据` → 「记 N 局后会显示…」 | `PlacementTrendChart:43` 把「没开始」说成「没有」 | 1 处 | 3 行 | 行为 |
| **P1-1** | MatchesPage 筛选从 `useState` 改成 URL 驱动 | 7 维度已在 `MatchQuery`（`query.ts:11-25`）纯函数化；`:26` 已做 1/7 | `MatchesPage.tsx:21-29` + `query.ts` 加 2 个纯函数 | ~40 行 | 行为（是 P0-6 的前置） |
| **P1-2** | 内联表换 `MatchList` | `MatchList` 纯组件（`:20`）+ 小屏 fallback（`:22`）；内联表 55 行 | `DashboardPage.tsx:108-162` | 净 −50 行 | 行为（拿到小屏 fallback） |
| **P1-3** | `chart-theme.ts` + `ChartEmpty` | 14 个 hex 全是 token 拷贝；2 份重复 style；语义漂移（gold-400 vs gold-500） | 新文件 + 两个图表 | 新增 ~60 / 删除 ~20 | 外观（但消除一类 bug） |
| **P1-4** | 趋势图 X 轴改序号 | `label` 是 `MM-DD`（`stats.ts:76`），同日多局重号（`PlacementTrendChart:52-53`） | `stats.ts:74-80` + `:52-53` | ~10 行 | 行为（可读性） |
| **P1-5** | 时段表补全 0 局桶 | `timeSlotStats:164` 过滤空桶 → 行位置随数据平移，无法跨表比较 | `stats.ts:163-166` 或渲染层 | ~5 行 | 行为（修 bug） |
| **P1-6** | 删死 prop `min-width={520}` | 落到 DOM 无效果（勘误 #3、#4）；`overflow-x-auto`（`:37`）同失效 | `MistakeBarChart.tsx:37-38` | 2 行 | 外观 |
| **P1-7** | 柱状图 X 轴 `interval={0}` → 响应式 | 12 个中文标签 fontSize 12 不旋转，<640px 必重叠 | `MistakeBarChart.tsx:43,46` | ~5 行 | 外观（但不可读=行为） |
| **P1-8** | 图表 a11y：`aria-label` + `<title>` + 点可聚焦 | `accessibilityLayer` 默认 true（`rootPropsSlice.js:14`）→ SVG 有 `role="application" tabIndex={0}`（`RootSurface.js:52,64`）但**无名称**；Top4 只靠填充色（`:99`） | 两个图表 | ~15 行 | 行为 |
| **P2-1** | 删训练时段提示卡 | 全局信息，侧栏已述 | `DashboardPage.tsx:239-245` | −7 行 | 外观 |
| **P2-2** | KPI 网格断点（1/2/5 列） | 现在 `2/3/6`（`:59`）对 5 个 tile 不匹配 | `DashboardPage.tsx:59` | 1 行 | 外观 |
| **P2-3** | 触摸设备 tooltip 方案（`trigger="click"` 或配 `StatTable`） | recharts tooltip hover 驱动，触摸无效 | 两个图表 | ~20 行 | 行为 |
| **P2-4** | 趋势图变化量 sub（近 10 vs 前 10） | `recentWindowStats` 已支持任意窗口（`stats.ts:59-69`）；**样本不足时不能显示「持平」** | `DashboardPage.tsx` | ~10 行 | 行为 |
| **P2-5** | `总场次` 降为 sub 文案 | 它是分母不是发现 | `DashboardPage.tsx:60` | ~2 行 | 外观 |

### 依赖关系

- **P0-6 依赖 P1-1**（`?mistake=` 的 URL 解析是 P1-1 的一部分；P0-6 只做柱子 onClick，落地页要能解析才算闭环）。若要严格按优先级交付，P0-6 与 P1-1 应合并为一次改动。
- P0-4 依赖 P0-3（KPI 减法先做完，位置才好定）。
- P1-2 依赖 P0-3（表头语言不一致的修法是把 5 格 KPI 定下来之后一起看）。
- P0-5 与 P1-3 共享 `ChartEmpty` 的三态逻辑，建议同时落地。

### 本期不做（明确排除）

以下都不在本计划内，且理由不是「来不及」：

- **新增图表**（开局类型分布、过渡失败原因、阵容 × 名次散点）——这些**全部依赖新的结构化复盘数据**，见 `REVIEW_DATA_REQUIREMENTS.md`。在没有数据前画图是画空气。
- **换图表库**。recharts 3.10.1 是唯一可视化依赖，保持。
- **改数据模型**。Dexie v3（`db.ts:57`）与 `SNAPSHOT_SCHEMA_VERSION=2`（`types.ts:228`）不动。本计划的所有结论都能在现有 schema 下实现——包括 drill-down 需要的 `TrendPoint.id`，它三年前就在 `stats.ts:79` 了。
- **`Decision.hindsight` 聚合**（`types.ts:118`，3 值闭集，全仓库零聚合）。这是一个**独立于复盘模板的、已存在的**结构化资产，值得单独一期，但不属于「Dashboard 重构」——它属于复盘系统。记录在此以免遗漏。
---

## Step 6A Evidence（2026-10-07 实测）

> 数据来源：本机 demo 数据集（16 局 / 15 条决策 / 9 份复盘，其中 1 份为本阶段实测写入）。
> **这是合成数据，不是真实用户使用数据**——下表数字用于验证统计口径与 UI，不用于判断真实采纳率。

### 已落地的零新字段聚合（`domain/stats/analytics.ts`）

| 聚合 | 数据 | 结果（demo 实测） | 值得展示？ |
| --- | --- | --- | --- |
| `openingPlanCoverage` | `Match.openingPlan` | 已标记 1 / 16 局，覆盖率 6% | ✅（开局路线面板副标题） |
| `reviewCoverage` | `Match.reviewed` + `isReviewComplete` | 复盘覆盖率 50%（8/16），规则判定完整 8 局，**gap = 0** | ✅（Overall 面板脚注） |
| `decisionTypeStats` | `Decision.type` × placement | 经济 3 局 avg 4.0 / D牌 3 局 avg 3.7，其余 6 类 1–2 局全部「样本不足」 | ✅ |
| `decisionHindsightStats` | `Decision.hindsight` × placement | **错误 7 局 avg 4.4（Top4 57%）vs 正确 5 局 avg 2.2（Top4 80%）** | ✅（本阶段最有训练价值的一张表） |
| `augmentStats` | `Match.augmentIds` × placement | demo 数据无 `augmentIds` → 空态 | ⚠️ 管道就绪，demo 无数据可显示 |
| `mistakeWindowCounts` | `primaryMistake` × `playedAt` | 16 局 < 20 局门槛 → 显示门槛提示而非对比表 | ✅（门槛即产品行为） |
| `bucketStats` ×3 | `finalHealth` / `durationSeconds` / `totalGold` | 血量：低(0–29) 5 局 avg 5.2 vs 中(30–59) 11 局 avg 2.8；时长 25–35min 14 局；金币 demo 全部落在 30+ | ✅（血量分桶最有信号） |

### 值得展示 / 不值得展示

- **值得**：`decisionHindsightStats`（正确 2.2 vs 错误 4.4，是第一个把「判断质量」和「名次」连起来的数字）；`openingPlanCoverage`（下一步决策的依据）；`finalHealth` 分桶。
- **不值得（当前）**：`augmentStats`——管道已写好并有测试，但历史数据里没有 `augmentIds`，表永远是空态；等真实对局开始携带 id 后再评价。
- **不值得（结构性）**：`totalGold` 分桶——demo 数据 16/16 全落在同一桶，区分度为零；保留聚合与测试，UI 不单列。

### 未来依赖（仅记录）

- 决策 / 符文行没有 drill-down：需要 `MatchQuery` 新增 `decision=` / `augment=` 维度，本阶段明确不做。
- 跨 patch 对比：`Match` 无 patch 字段。
- Session-aware 聚合：现有 `sessionId` 过滤已够用，`compositionUsage` 表不需要加列。

### 阈值

全部复用 `MIN_SAMPLES`（`chart-theme.ts`）：行级 3（`decisionRow` / `augmentRow` / `numericRow`），错误结构对比需要 2×10 局全满（`mistakeComparison: 20`）。

---

## Step 6B Evidence · Timeline / Decision Visualization（2026-10-07）

### Timeline 实际消费的已有字段（无任何新增）

```
Decision  → id · round · type · decision · hindsight · createdAt
Match     → placement · finalHealth · primaryMistake
```

### round parser 行为（`domain/decision/round.ts`）

- `parseRound` 只认 `^(\d+)-(\d+)$`（trim 后）：`"2-1"`→`{2,1}`，`"10-1"`→`{10,1}`。
- `compareRounds`：stage 优先、index 次序；**可解析的排前，不可解析的排后**，两个都不可解析返回 0（保持插入顺序）。
- `decisionRoundOrder`（decision.ts，decision-service 排序在用）重构为复用 `parseRound`，语义不变：`stage*100+index`，不可解析 → `MAX_SAFE_INTEGER`。
- demo 数据审计：15 条 decision 的 round 全部是 `stage-index` 格式，无空值、无自由文本；`DecisionPanel` 的 datalist 提供 `3-2 / 4-1 / 最终`，因此自由文本路径真实存在并有测试覆盖。

### Timeline View Model（`domain/decision/timeline.ts`）

- 事件只有两种：`decision`（一 decision 一行）与 `outcome`（结尾一条）。
- 排序：`sortKey`（可解析 round）升序 → `createdAt` 决胜；`sortKey=null` 排最后；outcome 恒为最后。
- **不虚构过程数据**：血量/金币只在 outcome 出现，绝不作为「4-1：血量 28」这类过程态；`primaryMistake` 只在 outcome 行，不伪装成某条 Decision。
- 无 round→stage 的分组结构：同回合多条 decision 天然相邻，不发明「阶段」层级。
- 纯函数：有测试冻结输入验证不改动。

### 可靠展示 / 无法可靠展示

- 可靠：决策顺序、类型标签、后视标记（✓ 正确 / ✕ 错误 / ○ 一般）、回合原文、结局（名次 + 最终血量 + 主要问题）。
- 不可靠（未展示）：海克斯选取时刻（`augmentIds` 无回合信息）、装备变化、经济曲线、血量曲线、转折点阶段（R2 被Hold）。
- 空 state：无决策时显示「这局还没有记录决策。」+ 结局行，面板与其余内容共存（渐进增强）。

### UI

`DecisionTimeline`（`components/decisions/DecisionTimeline.tsx`）插入 Match Detail 的「基础信息」与「阵容/装备」之间：Summary → Outcome(badge) → **Timeline** → Decision 详情 → Review。无新增图标系统，hindsight 标记用 lucide 的 Check/X/Circle。

### 遗留观察

- demo-m01 时间线顺序 2-1 → 4-2 → 结果，与 demo JSON 一致 ✅
- 已知环境渲染问题（非本项目 bug）：本机 WSL Chrome 把 SVG 轴文本「8」栅格化成「3」形（DOM/a11y 文本均为 U+0038），趋势图 Y 轴受影响；已在 Step 6A 报告，待真实机器确认。
