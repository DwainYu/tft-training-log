# UI_IMPROVEMENT_PLAN · 组件级优化清单

> ## 已被取代（部分）
>
> **本文不再是 UI / 组件 / token / 文案层面的真源。** 归属拆分如下：
>
> | 主题 | 现在的真源 | 本文对应处置 |
> | --- | --- | --- |
> | UI 系统现状、Selector 重复度、token / 排版 / 文案 / 响应式、组件级优先级 | [UI_CONSOLIDATION](./UI_CONSOLIDATION.md) | 原 §11 系统性问题表、原 §12 执行顺序**已删除**；§4 / §10 只保留指针 |
> | Dashboard / 图表 / KPI / drill-down / 空状态阈值 | [DASHBOARD_PLAN](./DASHBOARD_PLAN.md) | 原 §2 Dashboard **整节已删除**；§4 Chart 收为指针 |
> | 复盘字段与Dashboard 数据需求 | [REVIEW_DATA_REQUIREMENTS](./REVIEW_DATA_REQUIREMENTS.md) · [REVIEW_SYSTEM](./REVIEW_SYSTEM.md) | §7 / §8 只保留指针 |
>
> **本文仍然独有、因此保留的内容**：§1 AppShell 断点、§3 MatchCard / MatchList 组件抽取、§5 Filter 的防抖与折叠、§6 Form、§7 Quick Add、§8 Review UI、§9 Timeline / 阶段展示、§10 响应式三档语义。
>
> ### 随本次修订一并修正的失效断言
>
> **⚠ 入站引用失效**：`UI_CONSOLIDATION.md` 与 `DASHBOARD_PLAN.md` 按行号引用本文。
> 本次修订删除了 §2 整节、把 §4 / §11 / §12 收为指针，行号已大幅变动，对照如下：
>
> | 入站引用 | 原内容 | 本文现位置 |
> | --- | --- | --- |
> | `DASHBOARD_PLAN.md:373` → `UI_IMPROVEMENT_PLAN.md:35` | 侧栏底部文案与 Data 页重复 | `:82`（原文仍在） |
> | `DASHBOARD_PLAN.md:201` → `:58-63` | Dashboard 内联表缺卡片 fallback + 表头语言不一致 | `:94-100`（§2 已转为指针，表头问题在其中被点名） |
> | `DASHBOARD_PLAN.md:18` → `:71` | `?reviewed=unreviewed` 深链「已存在」 | **已纠正为「解析存在、生成方不存在」**，见文首勘误表第 1 行 |
> | `DASHBOARD_PLAN.md:414,429` → `:127-128` | `chart-theme.ts` 方向 | `:143-145`（§4 已转为指针，落位已改为 `src/components/stats/`） |
> | `DASHBOARD_PLAN.md:459` → `:116-117` | 图表颜色硬编码 | `:149` |
> | `UI_CONSOLIDATION.md:308`（P0-8）→ `:118` | `min-width={520}` 笔误 | `:150`，且**结论已加强**：改成 `minWidth` 也无效 |
> | `UI_CONSOLIDATION.md:318`（§9.1）→ `:31-33` | AppShell 只在 `lg` 分叉的空适配带 | `:78-79` |
> | `UI_CONSOLIDATION.md:324`（§9.2）→ `:290` | 三条语义断点 compact / standard / wide | `:340-341` |
> | `UI_CONSOLIDATION.md:468`（§11.4）→ `:300` | 文案规则「术语可英文、功能词一律中文」 | `:369`（**本文不再是该规则的出处**） |
>
> 三处入站引用的内容本身在本次修订中被移除了（`:71` 的深链断言、`:58-63` 的表头问题、`:127-128` 的 chart-theme 落位），
> 对应事实已写进上表并在对应新文档里有完整版本。
> | 原断言 | 实际（已复核） |
> | --- | --- |
> | §2:71 `?reviewed=unreviewed` 深链「已存在于 `MatchesPage.tsx:26`」 | **解析侧存在，生成侧不存在。** `MatchesPage.tsx:25` 的注释「is the link from the Dashboard todo card」指向一个不存在的卡片；全仓库唯一命中是测试 `src/pages/match-pages.test.tsx:97`。见 `DASHBOARD_PLAN.md` 勘误 #6 |
> | §11「没有统一的『选择器』组件 → 建 `components/ui/Selector`」 | **已完成，不再是待办。** `src/components/ui/Selector.tsx`（201 行）导出 6 个原语：`SelectorPanel`(`:14`) / `SelectorSectionTitle`(`:33`) / `SelectorEmpty`(`:37`) / `SelectorSearchInput`(`:45`) / `SelectorChip`(`:105`) / `SelectorOptionRow`(`:166`) |
> | §6:180 阵容 / 羁绊 / 装备 / 海克斯「全是文本 + `<datalist>`」 | **已接线。** `MatchForm.tsx` 阵容 `:253`、羁绊 `:266`、装备 `:289`、海克斯 `:298` 四个都是 Selector；**只剩核心棋子仍是 `<datalist>`**（`:274-287`）。QuickAdd 侧：阵容 `:203`、海克斯 `:212`、装备 `:219`（无羁绊） |
> | §7:203 阵容 chips「只在历史数据非空时渲染」（`QuickAddDialog.tsx:179`） | **该条件已不存在。** `QuickAddDialog.tsx:203` 无条件渲染 `CompositionSelector`，最近 / 常用 / 预置三段见 `CompositionSelector.tsx:138-159` |
> | §7:190「复制上一局」位置 | 现 `QuickAddDialog.tsx:141`（`reuseLast`）/ `:195`（按钮）。它仍在 `last &&` 条件内 → **新用户看不到**，见 `UI_CONSOLIDATION.md` §6.1 状态 A |
> | §4:119 `min-width={520}` 笔误，暗示「`minWidth` 才是对的」 | 笔误成立（`MistakeBarChart.tsx:38`），但**改成 `minWidth` 同样得不到下限** —— `minWidth` 不参与 `calculateChartDimensions`。见 `DASHBOARD_PLAN.md` 勘误 #3、#4 |
>
> 配套：[PRODUCT_ROADMAP](./PRODUCT_ROADMAP.md) · [快速录入](./QUICK_RECORD_UX.md) · [复盘系统](./REVIEW_SYSTEM.md)
> 基线：`main` @ `7347d3f`（2026-10-04）+ 工作区 Phase 2T/3A 未提交改动。本文只做 UI/UX 层面的判断，**不规定具体 CSS 实现**，
> 除非涉及到已经存在的设计 token（`src/index.css` 的 `@theme`）。

## 现有基础（先说清楚家底）

> 本表已由 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §1（全量清单，含逐文件行数与导出）
> 取代。以下保留本文后续各节实际引用到的部分，并补上原表漏掉的一项。

已经有一套不算小的基础设施，优化应该站在它上面而不是推倒：

| 已有 | 位置 | 状态 |
| --- | --- | --- |
| Design token | `src/index.css` `@theme`：`base-*`（背景层级）、`ink-*`（文字层级）、`gold-*`、`line`、`num`（等宽数字）、`panel` | 可用，但**不完整**（15 个颜色 token 全是原始色阶，零语义层——`UI_CONSOLIDATION.md` §10.1） |
| UI 原语 | `src/components/ui/`（**9 个文件 / 630 行**）：`Button` `Panel`（含 `PanelHeader` `PageHeader`）`Badge`（含 `EmptyState`）`Field`（含 `Input` `Select` `Textarea` `Checkbox` `Label`）`Modal` `Toast` `Spinner` `Pagination` **`Selector`（6 个原语，201 行）** | 覆盖度不错。**原表漏记 `Selector.tsx`** —— 它已在 `src/components/ui/` 中，`SelectorPanel:14` / `SelectorSectionTitle:33` / `SelectorEmpty:37` / `SelectorSearchInput:45` / `SelectorChip:105` / `SelectorOptionRow:166` |
| 响应式基础 | Tailwind v4 断点 + `src/lib/use-media-query.ts`（`DESKTOP_QUERY = min-width:768px`） | 只用在 `MatchList` |
| 图表 | `src/components/stats/PlacementTrendChart.tsx`、`MistakeBarChart.tsx`（都是 Recharts） | 只有两张图 |

**结论**：不需要 Design System 从零建，需要的是**补齐缺失件 + 消灭重复**。**仍然成立。**

优先级定义：**P0** 当前体验明显有问题，应优先处理 · **P1** 下一阶段核心体验 ·
**P2** 中期增强 · **P3** 未来探索。
>注：本文的优先级编号与 `UI_CONSOLIDATION.md` §13 / `DASHBOARD_PLAN.md` §10 **是两套独立编号**，
> 引用时必须带文档名，不要裸写「P0-3」。

---

## 1. AppShell（整体布局 / 导航）

**当前**
`src/components/layout/AppShell.tsx:59` — `lg:grid lg:grid-cols-[236px_1fr]`，左侧固定 sidebar；
`< lg` 折叠成顶部 bar + 汉堡菜单；加了全局 Session 切换器 `SessionSwitcher`。
主区 max-width 1180px。

**问题**
- 断点只有 `lg` 一档。768–1023px（竖屏平板 / 分屏）拿到的是**手机版 sidebar-less 布局**，
  但宽度其实够放侧栏；这是一个空的适配带。
- `NAV` 的 `label` 中英混排：`Dashboard` / `对局` / `统计`。虽然 TFT 玩家习惯英文术语，
  但同一个 nav 里混两种语言是纯粹的视觉噪音。
- 侧栏底部文案与 Data 页重复说明同一件事（本机存储）。

**优化目标**：三种宽度都像同一个人设计的；导航语言一致。
**方向**：加中间断点档（`lg` 收窄 sidebar / `xl` 展开）；统一导航文案；重复说明收敛到一处。
**优先级**：P2 · **改数据模型：否** · **新增组件：否**
> 本节三项已被 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) 接管并升级：空适配带 → 该文 §9.1 + P1-4
> （`AppShell.tsx:59,60,82,95,101` 只挂在 `lg`，768–1023 有足够宽度却拿手机版布局）；
> nav 中英混排 → §11.2 + P1-7；侧栏底部文案与 Data 页重复 → `DASHBOARD_PLAN.md` §8（删训练时段提示卡，
> 理由是「Dashboard 不该解释自己的产品」）。

---

## 2. Dashboard

> **本节已移交 [DASHBOARD_PLAN.md](./DASHBOARD_PLAN.md)。** 该文 §3 用「同分子冗余」的精确形式判定
> `Win Rate` 应删、`Top4 率` 与 `平均名次` 不冗余，§4 逐图给出一图一问的改造项，§6 给出最小样本阈值表，
> §8 给出页面结构与线框，§10 给出 P0/P1/P2 优先级表。本文原内容全部被覆盖，不再保留。
>
> 唯一在本文保留的Dashboard 事实：**最近对局表缺小屏卡片 fallback**（`DashboardPage.tsx:108-161` 只有
> `overflow-x-auto`，而 `MatchList.tsx:22,91` 已有 `MatchCards`）。该条同时是 `UI_CONSOLIDATION.md`
> P0-5 与 `DASHBOARD_PLAN.md` P1-2，处置以那两处为准。

---

## 3. Match Card / MatchList

**当前**
`src/components/matches/MatchList.tsx`：`(min-width:768px)` 走桌面 table，否则 `MatchCards`。
桌面 8 列：日期 / 名次 / 阵容 / 等级 / 时长 / 复盘 / 最大问题 / 操作。
`MatchCards` 是紧凑卡：名次 Badge + 时间 + 复盘状态 → 阵容行 → 最大问题 Badge。
另有 `DashboardPage` 里的内联表与 `ReviewPage` 侧栏的 `SideFact`，是第三、第四种「对局卡片」。

**问题**
- **同一个实体有 3+ 种渲染**（MatchList table / MatchCards / Dashboard 内联表 / Review 侧栏 SideFact），
  视觉与字段不一致，改一处要改多处。
- 阵容列 `max-w-[22ch] truncate`：中英混排阵容名（如 `Fortune Reaver`）经常被截断且没有 title 提示。
- 「操作」列只有「详情」，最常见的下一步其实是**复盘**（未复盘时）。
- `ReviewedFlag` / `<Badge>` 两套方式表达同一个状态。
- 移动端 card 版本只能看到最大问题，看不到其他结论信息，也无法直接触发复盘。

**优化目标**：一个 `<MatchRow>` / `<MatchCard>` 组件覆盖列表、Dashboard、复盘入口。
**方向**
- 抽 `components/matches/MatchRow.tsx`（桌面行）+ 让 `MatchCards` 与其共享「字段可见性表」，
  避免三份实现漂移。
- 主行动按钮跟着状态走：未复盘 →「去复盘」；已复盘 →「看复盘」。
- 截断处统一加 `title`，或改用「两级信息」：主信息不截断，次要信息省略。
- 移动端优先展示：名次 / 阵容 / 时间 / 复盘状态；次要字段（等级、时长）折叠。

**优先级**：P0（一致性）/ P1（组件抽取） · **改数据模型：否** · **新增组件：是**（`MatchRow` 抽出合并）

> **本节是本文目前最不可替代的一节，`MatchRow` / `MatchCard` 抽取方案未被任何新文档接管。**
> 新文档只覆盖了其中一项：[DASHBOARD_PLAN.md](./DASHBOARD_PLAN.md) §5.1 已确认
> `MatchList` 是纯展示组件（`MatchList.tsx:20-22`，只接 `Match[]`，唯一调用点 `MatchesPage.tsx:100`），
> 因此 Dashboard 内联表的替换**不需要改 `MatchList` 一行**（该文 P1-2，净 −50 行）。
> 本节其余各项（3+ 种对局渲染、截断无 `title`、操作列缺「去复盘」、移动端卡片信息不足）仍只在此处。

---

## 4. Chart（图表）

> **本节的判断与执行顺序已移交 [DASHBOARD_PLAN.md](./DASHBOARD_PLAN.md) §4与 §9，**
> 优先级见该文 §10（P1-3 `chart-theme.ts` + `ChartEmpty`、P1-4 X 轴改序号、P1-6 删死 prop、
> P1-7 `interval={0}` 响应式、P1-8 a11y、P2-3 触摸 tooltip）。
> 本文只保留**仍然成立的两条硬编码事实**作为证据存档，处置方案不在此重复：
>
> | 事实 | 证据 | 归属 |
> | --- | --- | --- |
> | 图表颜色是 `index.css` token 的逐字复制，两文件各自声明 `GRID/TICK/GOLD/BLUE/AMBER`，共**14 个 hex** | `PlacementTrendChart.tsx:12-15,18,19,22,104`（8 处）、`MistakeBarChart.tsx:11-13,16,17,20`（6 处） | `DASHBOARD_PLAN.md` §9（已给出 `chart-theme.ts` 的完整导出清单，并指出 `gold-400` vs `gold-500` 的语义漂移）；同时是 `UI_CONSOLIDATION.md` C4 / P1-10 |
> | `min-width={520}` 是死prop | `MistakeBarChart.tsx:38`。Recharts 把未识别 prop 展开到 div，`_excluded` 不含 `min-width`；且 `minWidth` 虽在类型里但**不参与** `calculateChartDimensions` | `DASHBOARD_PLAN.md` 勘误 #3、#4 + §10 P1-6；`UI_CONSOLIDATION.md` P0-8 |
>
> 本文原方向的两处已被细化或修正：`chart-theme.ts` 的落位从 `components/charts/` 改为
> `src/components/stats/chart-theme.ts`（`DASHBOARD_PLAN.md` §9「位置」）；「点柱子 → `/matches?mistake=X`」
> **不是零成本** —— `MatchesPage` 不解析 `mistake` 参数，需要先做URL 驱动改造（同文 §5.3 / P1-1）。
> 「新增图表（开局类型 / 过渡失败 / 阵容 × 名次散点）」在本期明确不做，等`REVIEW_DATA_REQUIREMENTS.md` 的字段落地。

---

## 5. Filter（筛选器）

**当前**
`src/components/matches/MatchFilters.tsx`：搜索 + 名次区间 + 复盘状态 + 阵容 + 错误类型 +
开始/结束日期 + 排序/升降序 → `MatchQuery`（`src/domain/match/query.ts`，纯函数）。
`MatchesPage.tsx:37` 通过 `useLiveQuery(..., [JSON.stringify(effectiveQuery)])` 驱动。

**问题**
- **没有防抖**：搜索框每次按键都重建 query key → 重新 `queryMatches(全部 matches)`。
  几百局还行，几千局开始有感觉。
- **没有规模**：7 个控件平铺，`lg:grid-cols-4` 下仍然占一整屏高度；真正高频的就是「未复盘」。
- 筛选器每次进页面都重置（状态在组件里），缺少「上次的口径」。
- 筛选控件会继续堆叠：Session 维度现在靠页面顶部的另一个 Select 控制
  （`MatchesPage.tsx:59-71`），未来还要加「版本 / 补丁」维度。

**优化目标**：高频筛选零思考；低频筛选不挡路。
**方向**
- 加一行 Quick chips（今天 / 近 7 天 / 未复盘 / 吃鸡 / Bottom4），直接 patch query。
- 搜索输入加 ~200ms 防抖（`useMediaQuery` 已经是 hook 形态，照此加一个 `useDebouncedValue` 即可）。
- 控件默认折叠为「筛选（N）」，`dirty` 判定逻辑已在 `MatchFilters.tsx:38`，只需加个 collapsed 状态。
- Session / 范围 Select 收进同一个筛选条，别再单独挂一行。

**优先级**：P1 · **改数据模型：否** · **新增组件：否**

> 筛选状态的持久化与 URL 往返已由 [DASHBOARD_PLAN.md](./DASHBOARD_PLAN.md) §5.3 接管
> （结论：**URL 驱动，不引入 filter context**；全仓库无 `localStorage` / `sessionStorage`）。
> 本文独有的只剩**防抖**与**Quick chips** 两项。（Quick chips 可放 `MatchFilters` 内）

---

## 6. Form（对局表单）

**当前**
`src/components/matches/MatchForm.tsx`（create / edit 共用）+ `match-form-model.ts`（draft ⇄ payload）。
三个 Panel：A 基础信息 / B 对局状态 / C 阵容·装备·强化。
日期用「日期 + 开始/结束时间」而不是 datetime-local（注释里说明了理由：玩家是按「今天中午那把」记的）。
时长可自动推算。

**已经做对的（不要改）**
- 训练时段外只是警告不阻断（`MatchForm.tsx:152`）。
- 结果状态 Badge 按名次自动判定（吃鸡 / Top4 / Bottom4）。
- 时长从开始/结束自动推算。

**问题**
- ~~阵容 / 羁绊 / 棋子 / 装备 / 海克斯**全是文本 + `<datalist>`**（`MatchForm.tsx:250-305`）~~
  **已完成 4/5。** `MatchForm.tsx` 阵容 `:253`、羁绊 `:266`、装备 `:289`、海克斯 `:298`
  均已改为对应 Selector（`CompositionSelector` / `TraitSelector` / `ItemSelector` / `AugmentSelector`），
  legacy 文本以 muted chip 保留（`MatchForm.tsx:270,293` 传 `legacy` + `onLegacyChange`）。
  **唯一仍未统一的是核心棋子**：`:274-287` 还是裸 `Input` + `<datalist>`（65 个 S18 棋子名来自 `:38`
  的 `S18_CHAMPION_NAMES`），且它是四个「选东西」字段里唯一不支持搜索的。
  该项已在 `UI_CONSOLIDATION.md` P1-12 立项，此处不重复排期。
- `C` 面板一屏塞 5 个字段，其中 4 个是自由文本，心理负担集中在最后。**部分缓解**：4 个已改为点选，
  但 3 个面板仍一次性展开（`:95` / `:190` / `:246`，`Panel.tsx:23` 的 header 无折叠能力），
  16 个可见字段在第一次点击之前全部呈现。
- 三个 Panel 一次性展开；「快速填」「详细填」是**两个入口**（QuickAdd vs MatchForm）而不是同一表单的两种密度。

**优化目标**：详细表单 = 快速表单 + 可选细节，而不是另一套东西。
**方向**
- ~~先把 Picker 接上（海克斯 / 装备 / 羁绊 / 阵容）~~ **已完成**，见上。
- Panel 允许折叠并记住状态；把最必填的（名次 / 阵容）置顶。**仍待办** → `UI_CONSOLIDATION.md` P2-8。
- 与 QuickAddDialog 共用同一批「字段组件」，避免两处 UI 漂移。**部分达成**：两者已共用
  `ui/Selector.tsx` 的 6 个原语；但业务选择器是 4 个独立文件，重复率 72%–86.5%
  （`UI_CONSOLIDATION.md` §2.1），该文 P1-1 主张只抽一个 4 入参窄 hook、不做通用引擎。

**优先级**：P0 已完成；剩P2（折叠与密度） · **改数据模型：否** · **新增组件：已完成（`ui/Selector.tsx`）**

---

## 7. Quick Add（快速录入浮层）

**当前**
`src/components/matches/QuickAddDialog.tsx`：`Modal` size `lg`，字段顺序
名次（`PlacementPicker`，支持 1–8 键）→ 阵容（`CompositionSelector`，`:203`）→ 海克斯（`AugmentSelector`，`:212`）
/ 核心装备（`ItemSelector`，`:219`）→ 最大问题 → 下局重点 → 时间。
底部三个按钮：保存 / 保存并再记一局 / 保存并详细复盘。

**问题**
- ~~阵容区的 chips **只在历史数据非空时渲染**（`QuickAddDialog.tsx:179` 的 `compositions.length > 0 ? … : undefined`）~~
  **已修复。** 该条件表达式已不存在，`CompositionSelector` 在 `:203` 无条件渲染；
  最近 / 常用 / 预置三段见 `CompositionSelector.tsx:138-159`，排序由
  `domain/composition/suggestions.ts:47` 的 `pickCompositionSuggestions` 纯函数决定，
  冷启动时预置段保证首屏有内容。`UI_CONSOLIDATION.md` §6.1 记录了修复后仍存在的残留摩擦：
  新用户点开「阵容」会看到 3 个分区里 2 个是空态（`:141` / `:148`）。
- ~~chips 是 `knownCompositions()` 的前 6 个 —— 该函数按**总出现次数**排序且**跨 Session**~~
  **已修复。** 三段排序改由 `CompositionUsage` 表（`db.ts:62` 已索引 `usageCount` / `lastUsedAt`）驱动，
  Recent 按 `lastUsedAt`、Frequent 按 `usageCount` 且 `usageCount >= 2` 门槛
  （`suggestions.ts:45` `FREQUENT_MIN_COUNT`）。`knownCompositions()` 本身仍存在
  （`match-service.ts:146`）但**只剩 `MatchesPage` 的筛选下拉在用**（`MatchesPage.tsx:39`），不再是推荐来源。
- 「复制上一局」（`reuseLast`，`QuickAddDialog.tsx:141`）仍藏在阵容字段的 `hint` 位置（`:195`），
  且仍在 `last &&` 条件内 → **新用户看不到它**。这一条**仍然成立**，
  已由 `UI_CONSOLIDATION.md` P1-3 立项（从 hint 提级为可见操作）。
- ~~海克斯 / 核心装备是逗号分隔文本（"A / B / C"）~~ **已修复**：两者都已改为 Selector
  （`AugmentSelector` 硬上限 3 槽位、`ItemSelector` 无序集合），带搜索与 legacy 文本通道。

**优化目标**：首屏就有可点的东西；用得越多点得越快。
**方向**：见 [QUICK_RECORD_UX.md](./QUICK_RECORD_UX.md)（该文本身也已被 `UI_CONSOLIDATION.md` §6 接管字段级分析）
与 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §6.2 / §6.3 / §6.4（逐字段默认展开判断、QuickAdd 无 Trait 的取舍、20–60 秒预算）。
**优先级**：本文原P0 前提已失效（Picker 已接线、使用情况表已建）。当前待办只剩 P1-2（默认折叠）与 P1-3（提级复制上一局），见 `UI_CONSOLIDATION.md` §13。 · **改数据模型：已完成（Dexie v3 `compositionUsage`）** · **新增组件：已完成**

---

## 8. Review UI（复盘界面）

**当前**
`src/components/reviews/ReviewForm.tsx`：三个大 `Textarea`（opening 4 行 / midGame 5 行 / lateGame 4 行）
+ 结论 Panel（`MistakePicker` + 三个必填 textarea + `selfScore` 1–5 按钮组）。
`ReviewPage.tsx:89` 布局 `lg:grid-cols-[1fr_300px]`，右侧 aside 显示对局速览 + 决策提示。
完整度判定 `isReviewComplete`（`domain/review/review.ts:38`）是**布尔**，四个字段全填才过。

**问题（最大的产品问题，不只是 UI）**
- 「按提示逐条写」的 hint + 三个空白大框 = 需要动笔的地方太多，复盘完成率低。
- 三个 section 一次性铺开，页面很长；< lg 时右侧 aside 掉到下面，对局信息就看不到了。
- 没有保存过程稿：切走/刷新即丢。
- 结论区的 UI 是好的（`MistakePicker`、`selfScore` 按钮组），应该把这种**点选模式**推到前面三段。

**优化目标**：把「写复盘」变成「点完模板」。
**方向**：字段层以 [REVIEW_SYSTEM.md](./REVIEW_SYSTEM.md)（模板长什么样）+
[REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md)（Dashboard 需要什么数据、每个字段的点击预算）为准；
本文原「三段改成模板 + 完整度变百分比」的方案已被后者修正为**默认显示点选 chip 组、三段手写折叠成「补充说明」**
（`REVIEW_DATA_REQUIREMENTS.md` §5.5），且明确反对新增 2 项必填（其 §5.4）。
纯 UI 层（aside 小屏折叠、草稿守卫）见 `UI_CONSOLIDATION.md` P0-6 与 §9.2。
- 三段改成带步骤的模板化区块（Selector / Checkbox / Radio 为主，少量补充文字）。
- 完整度从布尔变百分比 + 分段指示（哪些已填、哪些可跳过）。**注意**：`REVIEW_DATA_REQUIREMENTS.md` §7 判定
  「不动，但排序在后」—— 转百分比需要先有可选字段，否则权重全在 4 个必填上，百分比恒等于布尔值。
- aside 在小屏改为可折叠的「本局信息」，始终可见关键信息（名次 / 阵容 / 海克斯）。
- 草稿：至少做 `beforeunload` 提示或本地草稿暂存。**仍成立**：全项目 `beforeunload` grep = 0 命中。

**优先级**：P0 · **改数据模型：是**（Review.structured，纯加法） · **新增组件：是**（模板渲染器 + 各类小选择器）

---

## 9. Timeline / 阶段展示

**当前**
**没有 Timeline 组件**。`src/components/decisions/DecisionPanel.tsx`（318 行）是以 list 形式
展示决策，每条含 `round`（自由文本字符串，如 `3-2`、`4-1`、`最终`）、type、situation、
decision、reasoning、result、hindsight。

**问题**
- `round` 是自由文本，**无法排序也无法按阶段过滤**，更没法拼成 Timeline。
- 决策、复盘、对局状态三者的时间轴是分开呈现的（`DecisionPanel` 在详情页，
  Review 是独立页面），缺少「这一局从头到尾发生了什么」的纵览。
- `Review` 的开局/中期/后期三段其实已经有隐含的阶段概念，但没有结构化阶段字段。

**优化目标**：一局能被按阶段回顾：开局 → 第一次海克斯 → 过渡 → 转折 → 后期 → 结果。
**方向**
- 先把 `Decision.round` 结构化（e.g. `{ stage: 3, round: 2 }` 或保留字符串 + 解析函数，
  建议做成 `domain/decision/` 里的纯函数 `parseRound()`），**保留原字符串兼容旧记录**。
- 新增 `components/timeline/MatchTimeline.tsx`：在 MatchDetail 顶部做横向/纵向阶段条，
  把 decisions + 复盘关键节点（中期转折）串起来。
- 依赖 `Review.structured.中期转折`，否则时间轴上没有内容可放。
  **依赖已变**：RDR 判不需要 `ReviewStructured`（字段落 `Match`），且 `turningPointStage` 未被采纳 ——
  Timeline 的素材来源需与 [REVIEW_DATA_REQUIREMENTS.md](./REVIEW_DATA_REQUIREMENTS.md) 重新对齐后再定。

**优先级**：P2 · **改数据模型：是（小）** · **新增组件：是**

> **交叉链接 · 依赖已变**：`Decision.round` 的结构化在 `REVIEW_DATA_REQUIREMENTS.md` 中
> **没有单独字段**（该文 R2只提`turningPointStage`，用字符串 `"2-1"/"3-2"` 而非 `{stage, round}` 结构体，
> 见其 §3 R2 与负面清单）。因此本文「先拆 `Decision.round`」的前置**不再是任何新字段的前置**——
> 它降级为 Timeline 自身的独立需求。若将来 `REVIEW_DATA_REQUIREMENTS.md` §7 的「7 个独立 Section 拒绝」
> 被接受（默认点选 chip 组 + 三段手写折叠），时间轴素材来源会与该文 §5.5 的结论重合，需一并设计。

---

## 10. Responsive UI（响应式）

**当前**
- `AppShell`：仅 `lg` 一档断点。
- `MatchList`：`useMediaQuery(DESKTOP_QUERY)` 在 JS 里切换 table / cards（“shipping one layout per breakpoint”，注释已说明动机）。
- `MatchForm` / `MatchDetailPage` / `DataPage`：`grid sm:grid-cols-N`、详情页 `lg:grid-cols-3`。
- `DashboardPage`：只有 `overflow-x-auto` 包 table，**没有 breakpoint 切换**。
- `StatisticsPage`：`xl:grid-cols-2` 放两张统计表，`StatCard` 用 `grid-cols-2 sm:3 xl:6`。

**问题**
- 移动端/小屏体验**不均衡**：同样是对局列表，`/matches` 有 card 版本，Dashboard 的内联表没有。
- 1024–1279px 这一段基本没被照顾（`lg` 直接切布局，`xl` 只用在个别 grid 上）。
- `ReviewPage` 的 `lg:grid-cols-[1fr_300px]`：低于 lg 时「本局信息」aside 落到最下面，
  复盘时最需要参照的东西不在视野内。
- `Modal`（`size="lg"`）在小屏高度没约束：QuickAdd 在手机上是长表单 + 三个底部按钮，
  footer 按钮很可能被挤出视口。

**优化目标**：所有页面在同一套断点语义下响应式，而不是每个页面各自想办法。
**方向**
- 定义三条语义断点并在文档里固定下来：`compact`（<768，手机，一切都走 stacked + sticky 关键操作）
  / `standard`（768–1279，可用 2 列，无侧栏）/ `wide`（≥1280，侧栏 + 3 列）。
  **这三条语义名已被 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §9.2 沿用**，
  该文把每一档细化为「必须保证」的对象级清单（8 个对象 × 3 档）。
  **注意两文断点数字不一致**：`DASHBOARD_PLAN.md` §7 用的是 `<640` / `640–1023` / `≥1024`，
  且它指出本文 §10「`Modal` 在 compact 下加高度约束」这条**已被现状满足**——
  `Modal.tsx:54` 已有 `max-h-[92dvh]`、`max-h-[85dvh]` 的约束不再需要新增；
  `UI_CONSOLIDATION.md` §6.1 记录的正面事实是 footer 在滚动 body 之外（`Modal.tsx:74-78`），保存键永远可见。
- `Modal` 在 compact 下：`max-h-[85dvh]` + 内容滚动 + footer sticky。**部分已满足**（同上）。
- 统一策略：**关键信息永不折叠**（名次/阵容/时间），次要信息在小屏折叠或省略。
- 触碰目标 ≥ 44px（`PlacementPicker` 的名次按钮、`selfScore` 1–5 按钮组尤其）。
  **仍然成立且已升级为 P0**：`UI_CONSOLIDATION.md` P0-1 记录 `SelectorChip` 的删除按钮只有
  20×20px（`Selector.tsx:148` `size-5`），是全应用被点击次数最多的破坏性控件。

**优先级**：P1 · **改数据模型：否** · **新增组件：否**

---

## 11. 系统性问题（不属于任何单一组件）

> **本节已整节移交 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md)。** 该文 §12 Checklist（7 组：
> 颜色 / 间距 / 圆角 / 边框 / 阴影 / 排版 / 文案）逐项给出当前确切数字与目标值，§13 给出
> P0（9 条）/ P1（12 条）/ P2（8 条）优先级表，排序依据是真实用户伤害。本文原表已被完全覆盖。
>
> 原表 7 行的归属与一处失效断言：
>
> | 原行 | 归属 / 修正 |
> | --- | --- |
> | Design token 有重复的真源 | `UI_CONSOLIDATION.md` §10.1 + C1–C5、P1-10。**本文原表说「P0」，该文定为 P1-10** —— 因为它不改变用户看到的信息，只改变主题化能力 |
> | 中英混排的 UI 文案 | `UI_CONSOLIDATION.md` §11.2 + P2–P4、P1-7。**本文写下的规则「术语可英文（Top4 / Session / Placement），功能词一律中文」已被该文 §11.4 直接采用为既定规则，本文不再是该规则的出处** |
> | 同一实体多种渲染 | `UI_CONSOLIDATION.md` P0-5 只覆盖 Dashboard 内联表一处；`MatchRow` / `MatchCard` 抽取的完整方案**仍只在本文件 §3**，未移出 |
> | 筛选 / 范围控件位置不统一 | `DASHBOARD_PLAN.md` §5.3（URL 驱动）+ §9.2 中屏「筛选器与 `PageHeader.action` 同行」；「统一放 `PageHeader.action`」这条结论仍只在本文件 |
> | emoji / icon 语义 | 该文未收录。**仍然有效但无需行动**：`lucide-react` 已是唯一图标来源 |
> | loading / empty 表现不一 | 两处已分别落地：`EmptyState` 位置问题见 `UI_CONSOLIDATION.md` §1.1（仍在 `Badge.tsx`）；图表「加载中 vs 无数据」的假空状态见 `DASHBOARD_PLAN.md` §6.1 + P0-1 |
> | ~~没有统一的「选择器」组件 → 建 `components/ui/Selector`~~ | **已完成，删除该待办。** `src/components/ui/Selector.tsx` 201 行、6 个原语（`SelectorPanel:14` / `SelectorSectionTitle:33` / `SelectorEmpty:37` / `SelectorSearchInput:45` / `SelectorChip:105` / `SelectorOptionRow:166`）。`UI_CONSOLIDATION.md` §3 判定 Level 1 **DONE**；进一步结论是该文 §4 / §5.4 —— 不做 `UniversalSelector<T>`，只值得抽一个 4 入参的窄 hook `useListPickerState`（P1-1） |

---

## 12. 推荐执行顺序

> **本节已整节移交。** 全局执行顺序以 [UI_CONSOLIDATION.md](./UI_CONSOLIDATION.md) §13（P0 → P1 → P2）
> 与 [DASHBOARD_PLAN.md](./DASHBOARD_PLAN.md) §10 为准，两者的依赖关系已在 `DASHBOARD_PLAN.md` §10
> 「依赖关系」中写明（如 P0-6 依赖 P1-1、P0-4 依赖 P0-3）。
>
> 本文原顺序里的 6 项**已完成或已改写**，保留记录以免重做：
>
> | 原序号 | 事项 | 现状 |
> | --- | --- | --- |
> | 1 | `components/ui/Selector`（作为后续 P0 的底座） | **已完成**，201 行 6 原语 |
> | 2 | Dashboard 信息化 | 改写为 `DASHBOARD_PLAN.md` §3.5（KPI 8 → 5）+ P0-2（未复盘入口）/ P0-4（趋势图） |
> | 3 | Chart token 收敛 + `min-width` 笔误 + 趋势图进 Dashboard | 改写为 `DASHBOARD_PLAN.md` §9 + P1-3 / P1-6 / P0-4 |
> | 4 | QuickAdd 阵容三层选择 | **已完成**（`CompositionSelector` 三段 + `CompositionUsage` 表 + Dexie v3） |
> | 5 | MatchForm Picker 接线（海克斯 → 装备 → 羁绊） | **已完成 3/4**（含阵容）。剩核心棋子，见本文 §6 与 `UI_CONSOLIDATION.md` P1-12 |
> | 6 | ReviewForm 模板化 | **未做，且方案已被修正** —— 见 `REVIEW_DATA_REQUIREMENTS.md` §5.5、§7 |
> | 7 | MatchRow / MatchCard 抽取合并 | **仍待办**，方案只在本文件 §3 |
> | 8 | Filter 防抖 + Quick chips | 仍待办。**注意**：`DASHBOARD_PLAN.md` P1-1（URL 驱动）是它的前置|
> | 9 | Responsive 三档断点治理 | 语义名（compact / standard / wide）被 `UI_CONSOLIDATION.md` §9.2 沿用并细化到逐对象保证项；`AppShell` 中屏侧栏为该文 P1-4 |
> | 10 | Timeline（依赖 `Decision.round` 结构化） | 仍待办。方案只在本文件 §9；依赖的 Review 结构化字段被 `REVIEW_DATA_REQUIREMENTS.md` §7 明确推迟 |

原本「每一步都是可独立发布」的原则仍成立，但排序不再以本文为准。
