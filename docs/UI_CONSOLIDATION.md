# UI_CONSOLIDATION · 界面收敛与设计系统现状

> 配套：[UI_IMPROVEMENT_PLAN](./UI_IMPROVEMENT_PLAN.md)（组件级清单）· [PRODUCT_ROADMAP](./PRODUCT_ROADMAP.md)（阶段排序）· [QUICK_RECORD_UX](./QUICK_RECORD_UX.md)（快速录入）
> 基线：`main` @ `7347d3f` + 工作区未提交改动（Phase 3A / 2T）。本文是**只做判断、不含代码改动**的分析文档。
> 本文与 `UI_IMPROVEMENT_PLAN.md` 的分工：那份说"每个组件应该长什么样"，这份说"哪些零件已经存在、不应该重建、哪些重复是故意保留的"。

---

## 报告勘误

两份前置报告（Report A / Report B）写于本次分析之前，工作区代码在其后发生了变动。以下逐条列出**经我重新读源码核对后确认不再成立或数字已变**的结论，本文一律采用核对后的数字。

| 报告结论 | 实际 | 处理 |
| --- | --- | --- |
| A §3.1：Item↔Trait `132/153` 行字节相同（86.3%）；Augment 与每个共享 ~104 行 | `ItemSelector.tsx` 155 行、`TraitSelector.tsx` 158 行、`AugmentSelector.tsx` 173 行。Item↔Trait **134 行相同（86.5% / 84.8%）**；Augment 与 Item、与 Trait 各 **125 行相同（72.3%）** | 数字已更新，结论方向不变 |
| A §2.2 / §8：`AugmentSelector` **没有** legacy 通道，旧海克斯名在编辑时会被静默丢弃（`match-form-model.ts:142-144` → `:181-183`） | **已修复。** `AugmentSelector.tsx:37-38` 接收 `legacy` / `onLegacyChange`，`:106-119` 渲染 muted chip；`match-form-model.ts:104-109` 新增 `splitAugments`，`:165` 读、`:204` 写；`match-form-model.test.ts:109-113,125-130` 断言 `"不存在的海克斯"` 被保留 | **删除该 P0**，不再是数据丢失风险 |
| A §10.6：Esc 在 QuickAdd 内会连带关掉整个弹窗、丢弃草稿 | **已修复。** `Modal.tsx:29` 改为 `if (e.key === "Escape" && !e.defaultPrevented) onClose()`；四个选择器全部消费该键：`CompositionSelector.tsx:76-77`、`AugmentSelector.tsx:79-80`、`ItemSelector.tsx:66-67`、`TraitSelector.tsx:68-69`；回归测试 `QuickAddDialog.test.tsx:133` | **删除该 P0**。但同一处代码暴露了本文 P0-3（遮罩点击仍然丢草稿） |
| A §10.3：无 `onLegacyChange` 时 legacy chip 变成"死按钮"，且"QuickAdd 从不传 `onLegacyChange`，所以生产可达" | 前半仍成立（`Selector.tsx:140` 的 `if (onRemove)` 分支 / `:159` 的 fallback `<button onClick={onClick}>`，`onClick` 为 `undefined`）。后半**不成立**：QuickAdd 根本没传 `legacy`，默认 `[]`，根本不渲染 legacy chip。`src/` 内唯一传 `legacy` 的地方是 `MatchForm.tsx:270,293`，那里同时传了 `onLegacyChange` | 降级为**潜在**缺陷（P1），当前生产不可达 |
| B §8：305 个测试 | `grep -rhoE '^\s*(it\|test)\('` = **312**，`README.md:114,165` 的 "305 tests" 现已过期 | 用 312 |
| B §9：162 处 `border` | 裸 `border` 类 **43** 处，另有 `border-0` 4 处；162 是把 `border-b` / `border-line` / `border-t` 一并算进去的 | 用 43 |
| B §4c：`text-[11px]` 分布 DataPage 8 / Selector.tsx 7 | DataPage **7**、Selector.tsx **3**（合计仍是 50 处 / 23 文件） | 分布数字修正 |
| B §3 / §8：`index.css` 83 行 | 82 行 | 无实质影响 |
| B §6：`panel` utility 使用 8 次 | **7 处**：`Panel.tsx:10`、`StatCard.tsx:25`、`Spinner.tsx:6`、`Toast.tsx:38`、`GoalComponents.tsx:230`、`MatchForm.tsx:90`、`MatchFormPage.tsx:52` | 数字修正 |

前置报告中**经核对成立**、本文直接采用的关键事实：A §4（`ui/` 9 个文件、Level-1 原语已存在、grep `aria-activedescendant` / `role="listbox"` / `role="option"` 全项目 0 命中）、A §7（recent/frequent/preset 机制、`复制上一局`、`保存并再记一局`）、B §3（15 个颜色 token、无语义层、`teal-400` 是死 token）、B §4b（`style={{}}` 全项目 0 处）、B §5（`Inter` / `JetBrains Mono` 声明但从未加载）、B §7（无 i18n、710 行 CJK）。

---

## 1. 当前 UI 系统（家底）

### 1.1 `src/components/ui/` 全量清单（9 个文件，无子目录，共 630 行）

| 文件 | 行 | 导出 |
| --- | --- | --- |
| `Badge.tsx` | 45 | `Badge`（tone: neutral/gold/good/bad/info/muted）、`EmptyState` |
| `Button.tsx` | 52 | `Button`、`LinkButton`（variant: primary/secondary/ghost/danger；size: sm/md） |
| `Field.tsx` | 99 | `Field`、`Input`、`Textarea`、`Select`、`Checkbox`、`Label` + 共享 `CONTROL` 类串（`:8-9`） |
| `Modal.tsx` | 83 | `Modal`（portal、`md`/`lg`、Esc 关闭 + body 滚动锁） |
| `Pagination.tsx` | 39 | `Pagination` |
| `Panel.tsx` | 51 | `Panel`、`PanelHeader`、`PageHeader` |
| `Selector.tsx` | 201 | `SelectorPanel`(14-31)、`SelectorSectionTitle`(33-35)、`SelectorEmpty`(37-39)、`SelectorSearchInput`(45-99)、`SelectorChip`(105-163)、`SelectorOptionRow`(166-201) |
| `Spinner.tsx` | 11 | `Spinner` |
| `Toast.tsx` | 49 | `useToast`、`ToastProvider` |

**没有的东西**（全部 grep 确认）：无组件库、无 headless-ui / react-aria / radix（`package.json:22-29` 只有 `dexie` `dexie-react-hooks` `lucide-react` `react` `react-dom` `react-router-dom` `recharts`）、无 i18n 库、无 Tooltip 原语、无 Table 原语、无 Form 原语。

### 1.2 Token 层

唯一真源是 `src/index.css`（82 行）的 Tailwind v4 CSS-first `@theme`（`:3-26`）：**15 个颜色 token**，全部是原始色阶（`base-950…600`、`line`、`ink-50…600`、`gold-300/400/500`、`teal-400`）+ 2 个字体栈（`:23-25`）。另有 2 个 `@utility`：`panel`（`:73-77`，`border-radius: 14px` + `color-mix(base-850 88%, transparent)`）和 `num`（`:79-82`，等宽 + `tabular-nums`，23 处使用）。

`@theme` 里**没有任何** `--spacing-*` / `--radius-*` / `--shadow-*` / `--text-*`。没有 `tailwind.config.*`、没有 `theme.ts`、没有 `tokens.ts`。

### 1.3 响应式的真实形态

`src/` 里 **`@media` 查询 0 条**。全部响应式来自 Tailwind 默认断点前缀，实际使用量：`sm:` 34 处、`lg:` 27 处、`xl:` 4 处、`md:` **0** 处（`Button.tsx:17` 的 `"md: ..."` 是 size 键名，不是断点）、`2xl:` 0 处。唯一的 JS 断点是 `src/lib/use-media-query.ts:32` 的 `DESKTOP_QUERY = "(min-width: 768px)"`，只被 `MatchList.tsx:7,21` 一个消费者使用。

---

## 2. Selector 重复情况（真实数字）

四个业务选择器，加上共享原语文件：

| 文件 | 行 | 形态 |
| --- | --- | --- |
| `components/ui/Selector.tsx` | 201 | 纯展示原语，无泛型、无数据、无状态 |
| `components/matches/CompositionSelector.tsx` | 221 | 标量单值 + 3 分区 + 自由文本 |
| `components/matches/AugmentSelector.tsx` | 173 | **有序**列表，硬上限 3 |
| `components/matches/ItemSelector.tsx` | 155 | 无序集合 + legacy 文本通道 |
| `components/matches/TraitSelector.tsx` | 158 | 无序集合 + legacy 文本通道 |

### 2.1 整体重复率

| 配对 | 相同行 | 占比 |
| --- | --- | --- |
| `ItemSelector` ↔ `TraitSelector` | **134 / 155** | **86.5%**（占 Trait 84.8%） |
| `AugmentSelector` ↔ `ItemSelector` | 125 / 173 | 72.3%（占 Item 80.6%） |
| `AugmentSelector` ↔ `TraitSelector` | 125 / 173 | 72.3%（占 Trait 79.1%） |
| `CompositionSelector` | — | 与三者**结构上无关** |

### 2.2 逐关注点对照（含行号）

| 关注点 | Augment | Item | Trait | 是否字节相同 |
| --- | --- | --- | --- | --- |
| `open` / `query` / `boxRef` / `useOutsideClick` | 49-52 | 43-46 | 45-48 | **三份全同**（4 行） |
| `remove(id)` | 69-71 | 58-60 | 60-62 | **三份全同**（3 行） |
| `add(id)` | 63-67 | 52-56 | 54-58 | Item ≡ Trait；Augment 差一个 token（`:64` 的 `full \|\|`） |
| `onKeyDown`（Esc + Enter） | 73-88 | 62-75 | 64-77 | Item ≡ Trait；Augment 差 `!full &&`（`:86`）+ 2 行注释 |
| `selected` / `chosen` / `results` memo | 54-61 | 48-50 | 50-52 | 各差 1-2 行（service 函数名 / `full` / `hasSelection`） |
| `SelectorSearchInput` 调用块 | 124-137 | 111-124 | 112-125 | 各差 1 行（`placeholder`；Augment 的还是 `:127` 的三元式） |
| chip 容器（表头 + chips + legacy） | 92-122 | 81-109 | 83-110 | **差 3+ 行**：表头文案（`已选择（n/max）` vs `当前选择`）、`index={i+1}`（仅 Augment）、`meta={option.categoryLabel}`（仅 Item） |
| panel + empty + 行渲染 | 145-170 | 126-152 | 127-155 | **差 3 行**：空态文案、分区标题文案、`badge` 表达式（Item 是 `categoryLabel`，Trait 是 `traitBreakpointLabel(...)` 三行三元） |
| `full` 上限闸门 | 60 | — | — | 仅 Augment |
| legacy 通道 | 106-119 | 93-106 | 94-107 | 三份结构同（现在 Augment 也有了） |

`CompositionSelector` 的对照（说明它为什么不在同一张表里）：

| 关注点 | 行 | 实现 |
| --- | --- | --- |
| `open` 状态 | 50 | 与三者同形 |
| query 状态 | — | **不存在本地 state**，query 由受控 prop 派生：`normalizeCompositionKey(value)`（`:57`） |
| chosen Set | — | **不存在**，改用 `hasExact`（`:60`）+ `selectedKey` 比较 |
| add | 62-65 | `select(option)` → `onChange(option.key); setOpen(false)` |
| keep-typed | 67-70 | `keepTyped()`，三者都没有的第五种提交动作 |
| Enter 语义 | 82-87 | **归一化而非选中行**：命中精确项则 `select(exact)`，否则仅 `setOpen(false)` |
| 结果行渲染 | — | **不用 `SelectorOptionRow`**，用本地 `Chips`（196-218）渲染 `SelectorChip` |
| 分区 | 138-159 | 最近使用 / 常用阵容 / 预置标签 三段 |

结论：它不是"另一个 list selector"，它是**单值 combobox + 三段排序建议**。任何以 `value: string[]` 为前提的抽象都无法表达它。

---

## 3. 建议抽取的基础件（Level 1）：已经做完了

**Level-1 展示原语已经存在，不应该重建。** `src/components/ui/Selector.tsx` 已经导出全部 6 个：

- `SelectorPanel`（14-31，`max-h-56 overflow-y-auto` 的滚动容器）
- `SelectorSectionTitle`（33-35）
- `SelectorEmpty`（37-39）
- `SelectorSearchInput`（45-99，`focus` 打开面板，键盘策略显式交还调用方）
- `SelectorChip`（105-163，`index` / `meta` / `muted` / `selected` / `onClick` / `onRemove`）
- `SelectorOptionRow`（166-201，`badge` / `summary` / `highlighted`）

文件头注释（`:5-11`）已经把边界写清楚了：*"They are deliberately dumb: no generics, no data access, no state."* 这条边界应当保持。

四个业务选择器里，三个已经完全走原语；`CompositionSelector` 只差两处。因此 Level 1 的结论是 **DONE**，剩下的是两个具体缺口：

**缺口 1 · `CompositionSelector` 绕过 `SelectorEmpty`。** `:125` 手写 `<p className="px-1 py-2 text-[11px] text-ink-600">没有找到「{query}」</p>`，`:191` 手写 `<p className="px-1 text-[11px] text-ink-600">{empty}</p>`。两处的 class 串与 `SelectorEmpty`（`Selector.tsx:38`）**逐字相同**。任何对空态样式的改动都会漏掉这个文件。这是维护陷阱，不是视觉问题 —— `SelectorEmpty` 在 `src/` 里被另外三个选择器用了 3 次。

**缺口 2 · 承诺了 combobox 却没有 list 可引用。** `SelectorSearchInput` 在 `Selector.tsx:83-86` 设了 `role="combobox"` + `aria-expanded` + `aria-autocomplete="list"` + `aria-controls={controlsId}`，`controlsId` 指向 `SelectorPanel` 的 `id`（如 `ItemSelector.tsx:127` 的 `${id}-options`）。但全项目 grep `aria-activedescendant` / `role="listbox"` / `role="option"` / `aria-selected` = **0 命中**。也就是说：辅助技术被告知"这是一个展开的 combobox，有一个受控的列表"，然后找不到列表、找不到活动项。叠加另一个事实 —— `highlighted={i === 0}` 是硬编码的（`AugmentSelector.tsx:163`、`ItemSelector.tsx:145`、`TraitSelector.tsx:148`），三个文件里的高亮环永远钉在第一行、不能移动，而 Enter 又永远取 `results[0]`（`:86` / `:73` / `:75`）。三者互相自洽，但这个自洽是巧合而非设计：**Augment 的注释 `:83` 写着"the ring shows which one"，暗示着并不存在的键盘导航。**

---

## 4. 不建议抽取的业务逻辑（Level 3，本阶段禁止）

`UniversalSelector<T>` / `TFTSelector<T>` / `SelectorEngine` / `SelectorStrategy` 在这个仓库里是错的抽象。理由不是"泛型不好"，而是**四个选择器的业务差异是数据模型层面的，不是配置层面的**：

| 维度 | Composition | Augment | Item | Trait |
| --- | --- | --- | --- | --- |
| 值类型 | `string`（标量） | `string[]`（有序） | `string[]`（无序） | `string[]`（无序） |
| 提交动作数 | 1（选中 / 保留输入 / 清空，`:62-70`、`:105-108`） | 1（add） | 1（add） | 1（add） |
| 硬上限 | — | **3**（`:18` `MAX_AUGMENTS`，`:60` `full`） | 无 | 无 |
| 上限闸门 | — | `full` 同时挡住 `add`（`:64`）**和** Enter（`:86`），并渲染独立提示（`:139-143`） | — | — |
| 顺序有语义 | — | **是**（第一/第二/第三，chip 带 `index`） | 否（注释 `:21-22`：数据模型里没有"第一件装备"） | 否 |
| legacy 文本通道 | — | 有（`:106-119`） | 有（`:93-106`） | 有（`:94-107`） |
| 结果上限 | 全部 | **30**（`augment-service.ts:21`） | **30**（`item-service.ts:23`） | **40**（`trait-service.ts:23`） |
| 排序分区 | **3 段**（最近 / 常用 / 预置，`:138-159`） | 无 | 无 | 无 |
| 行内元信息 | `meta={`${usageCount} 次`}`（`:211`） | `index` 序号 | `badge` = 装备分类 | `badge` = 羁绊档位（`breakpoints` → `traitBreakpointLabel`，`:144-146`，**独占三行表达式**） |
| Enter 语义 | 归一化 / 采纳输入 | 取 `results[0]`（有 `full` 闸门） | 取 `results[0]` | 取 `results[0]` |
| 数据来源 | Dexie 实时查询（`:49` `useLiveQuery`）+ 纯函数模块 | 静态快照 | 静态快照 | 静态快照 |

关键点：**`badge` 这一列无法参数化。** Item 传一个字符串字段，Trait 传一个三行条件表达式，Augment 不传，Composition 传的是使用次数。一个 `renderBadge?: (o: T) => string | undefined` 的配置项只是把这两行挪进一个回调，抽象层没有消除任何差异，只是给它换了个名字。

同样，`full` 无法作为布尔配置项优雅地传下去：Augment 的 `full` 不是一个可选的额外限制，它是**三处联动**（`:64` add 闸门、`:86` Enter 闸门、`:139-143` 满载提示）。要参数化就得传 `isFull` + `fullNotice` 两个 prop，再在 hook 里写 `canAdd = !isFull`、`firstResultId = isFull ? undefined : results[0].id`。这是在用配置重写业务，而不是消除重复。

`CompositionSelector` 更是完全在另一个维度上：它没有 query state、没有 chosen Set、没有 `SelectorOptionRow`、Enter 语义不同、还有第四种提交动作 `keepTyped`。把它塞进任何 `value: T[]` 的通用签名里，只会让那个签名长出一个 `mode: "single" | "multi"` 分支——那已经不是抽取，是把四份代码搬进一个文件。

**Level 3 明确不做。**

---

## 5. Level 2 判断：`useMultiSelect` / `useSelectorState`

这是本文的核心判断题，两边都摊开讲。

### 5.1 支持抽取的证据：确实存在逐字相同的块

跨三个选择器 MD5 一致的块只有两块：

```
open/query/boxRef/useOutsideClick   Augment 49-52 · Item 43-46 · Trait 45-48   （4 行，三份全同）
remove(id)                          Augment 69-71 · Item 58-60 · Trait 60-62   （3 行，三份全同）
```

其余都只是"差一行"。`add(id)` 差 `full ||` 一个 token；`onKeyDown` 差 `!full &&` 一个 token加 2 行注释；`searchInput` 只差 `placeholder`；memo 只差 service 函数名。

### 5.2 反对抽取的证据：差异集中在 JSX 与业务表达上

- **chip 容器差 3+ 行**（Augment 92-122 / Item 81-109 / Trait 83-110）：表头文案三选一、`index={i+1}` 只有 Augment 要、`meta={option.categoryLabel}` 只有 Item 要。
- **panel 块差 3 行**（Augment 145-170 / Item 126-152 / Trait 127-155）：空态文案三条、section title 三条、`badge` 表达式两种写法。
- 差异位置恰好是**每个选择器最该自己拥有**的部分：业务上限怎么提示、排序分区怎么排、这一列显示什么元信息。这些正是 `Selector.tsx:5-11` 注释里说的 "business rules (ranking, dupe policy, ordering)"。

也就是说：**相同的是薄薄的机械外壳，不同的是有信息量的部分。**

### 5.3 一个真实的、不是 LOC 的理由

上面两条加起来算纯 LOC 收益只有约 10 行，不值当。但有一个更硬的理由：

Esc 消费的修复需要在**四个文件里各写一遍** `e.stopPropagation(); e.preventDefault();`（`CompositionSelector.tsx:76-77`、`AugmentSelector.tsx:79-80`、`ItemSelector.tsx:66-67`、`TraitSelector.tsx:68-69`），并且必须和 `Modal.tsx:29` 的 `!e.defaultPrevented` 配对才成立。这是一个**隐式不变量，跨 5 个文件，只有一个测试覆盖**（`QuickAddDialog.test.tsx:133`）。任何一处漏写，症状是"按 Esc 丢整份草稿"——不会报错，只会静默丢数据。把它收进一个 hook，就把不变量变成单点。

这才是抽取的正当理由：**不是省行数，是把一个跨文件的隐式契约变成单点。**

### 5.4 结论：一个窄 hook 是合理的，一个通用引擎不是

**建议抽取，签名严格限定为 4 个入参、0 个 JSX、0 个文案、0 个数据源：**

```
useListPickerState({
  value: string[],                                  // 受控值
  onChange: (ids: string[]) => void,                // 受控更新
  canAdd: () => boolean,                            // Augment 传 () => !full；Item/Trait 传 () => true
  firstResultId: () => string | undefined,          // Augment 传 () => full ? undefined : results[0]?.id
})
  → { open, setOpen, query, setQuery, boxRef, chosen, add, remove, onKeyDown }
```

hook 体约 22 行，替换每个文件里 `open`+`query`+`boxRef`+`useOutsideClick`+`chosen`+`add`+`remove`+`onKeyDown` 共约 28 行。三处调用点各约 6 行。净减约 40 行，配置项 4 个且全部是**值**而非回调集合。

**它必须被禁止长成的东西**（一旦出现就该打回）：

- ❌ 不接受 `options` / `search` / `results` —— 数据源留在调用方（`searchItems` / `searchTraits` / `searchAugments` 各自的服务层归属不能被抹平）
- ❌ 不接受 `labels` / `emptyText` / `sectionTitle` / `countLabel` —— 文案留在 JSX 里
- ❌ 不接受 `renderRow` / `renderBadge` / `renderChip` —— 一旦出现 `renderXxx`，这个 hook 就变成了 §4 里被禁止的策略引擎，只是换了名字
- ❌ 不接受 `legacy` / `onLegacyChange` —— 三份 legacy chip 代码已经同形，但它是**数据保全逻辑**（`match-form-model.ts:104-109` 的 `splitByIds` 才是真正的守卫），应该和 `splitByIds` 一起留在业务侧
- ❌ 不返回任何 JSX

判据很简单：**hook 只允许接管"机械状态"，一旦开始接管"渲染决策"就说明走过头了。** 若某个 PR 让 `useListPickerState` 长出第 5 个配置项，它就应当被拆回三个独立文件。

按此结论，`AugmentSelector` 的 `full` 提示（`:139-143`）和 `CompositionSelector` 的整个三段结构（`:138-159`）都留在原地不动。

---

## 6. QuickAdd UX 评估

### 6.1 三个真实用户状态

**状态 A · 新用户（无历史）。** `last` 为 `undefined` → `QuickAddDialog.tsx:192` 的 `last &&` 使「复制上一局」按钮**根本不渲染**。用户看到 7 个全部展开的字段：名次（8 个 `h-11`=44px 按钮，合规）、阵容搜索框、强化符文搜索框、核心装备搜索框、11 个问题 pill、训练重点输入框、对局时间 `datetime-local`。

- 绝对最少操作：**2 次**（按 1–8 → 点「保存」`:160-163`）。唯一必填是名次（`:88-90` 校验 `"请先选择名次"`）。
- 现实快路径：**3–4 次操作 ≈ 20 秒**（按 1–8 → 点阵容 → 选/输 → 保存）。与 `MatchForm.tsx:350` 的「只要 20 秒」和 `QuickAddDialog.tsx:156` 的「一分钟内完成」自述一致，也满足 `QUICK_RECORD_UX.md:268` 的 ≤60 秒硬约束。
- 实际摩擦：**3 个空搜索框并排出现**，每个点开都是 `SelectorEmpty` 的「没有更多可选择的X」。新用户还不知道该选什么，却先要面对 3 个看起来都空的面板。点开「阵容」还会看到 3 个分区里 2 个是空态（`:141` 「暂无最近使用」、`:148` 「暂无常用阵容」），只有「预置标签」有内容。
- 一个正面事实：`Modal.tsx:74-78` 的 footer 在滚动 body **之外**，所以「保存」永远可见，不需要滚到底。

**状态 B · 有历史的用户。** 「复制上一局」出现（`:141-149` `reuseLast`，从 `recentMatches(1)` 拷贝 `composition` / `augmentIds` / `coreItemIds`）；「保存并再记一局」（`:118-129`）保留 5 个字段（`composition`、`augmentIds`、`coreItemIds`、`primaryMistake`、`nextGameFocus`），清空名次和时间。这两个机制的设计是对的。

- 现实快路径：1 次「复制上一局」+ 1 次名次 + 1 次保存 = **3 次操作**，比手选更快。
- 实际摩擦：**对返回用户价值最高的一个动作，被渲染成了最不起眼的一个元素。** `:191-201` 把它塞进 `阵容` 字段的 `hint` 位置，是一个 `text-[11px]` 的金色小按钮，和「快捷键 1 – 8」这类静态提示文字共享同一行、同一字号。它在视觉层级上读起来像一句说明，而不是一个可以按的按钮。

**状态 C · 编辑一条旧记录。** 走 `/matches/:id/edit` → `MatchForm`，16 个可见字段、3 个面板全展开。legacy 内容以 muted chip 呈现（`TraitSelector.tsx:94-107`、`ItemSelector.tsx:93-106`、`AugmentSelector.tsx:106-119`），`meta="旧记录"`、`removeLabel={`移除旧记录文本${text}`}`，可删可保留。

- 现实操作：**16 次**（含名次与时间的确认），量级比 QuickAdd 高一个数量级。
- 实际摩擦：（a）点错名次会**静默清空唯一阻塞保存的字段** —— `MatchForm.tsx:101` 的 `p === draft.placement ? undefined : p` 是 toggle-off，而保存按钮 `:334` 的 `disabled={busy || !draft.placement}` 会一起变灰，没有任何提示；（b）「取消」`:336-339` 直接 `navigate(-1)`，草稿丢失无确认；（c）无 `beforeunload` 守卫（grep 0 命中），刷新即丢。

### 6.2 逐字段判断

| 字段 | 现状 | 建议 | 理由 |
| --- | --- | --- | --- |
| 最终名次 | 在（`:184-186`），8 个 44px 按钮 + 1–8 快捷键 | **保持第一个、保持默认展开** | 唯一必填，44px 已合规，快捷键是全应用最短路径 |
| 阵容 | 在（`:188-208`），默认展开 | **保持默认展开，但把「复制上一局」提级** | 返回用户的最高价值动作现在藏在 hint 里 |
| 强化符文 | **在**（`:211-217`），默认展开 | **默认折叠** | 选满 3 个 = 3 轮「focus → 输入 → 点选」= 9 次点击，直接违反 `QUICK_RECORD_UX.md:269`「每个字段 ≤ 3 次交互」；且有上限有顺序，属于"有代价的完整信息" |
| 核心装备 | **在**（`:218-224`），默认展开 | **默认折叠** | 无序无上限、可留空、1 件就要 3 次交互；`保存并再记一局` 会保留它，第二次录时补录成本低 |
| 本局最大问题 | 在（`:227-229`），pill 行 | **保持展开** | 11 个 pill，1 次点击；且它是下游统计与复盘的锚点 |
| 下一局训练重点 | 在（`:231-238`），空 Input | **默认折叠** | 起始为空，无提示价值，属于"补充说明" |
| 对局时间 | 在（`:240-260`），已预填 `wallClockNow()` | **默认折叠** | 已预填、只在超出训练时段才告警（`:252-255`），是低频修改项 |

折叠不能靠删除 —— 所有字段都还会被保存，只是默认不展开、且一旦有值就把 chip 行显示出来（三个列表选择器的 `hasSelection` 已经具备这个形状：`ItemSelector.tsx:77`、`TraitSelector.tsx:79`、`AugmentSelector.tsx:61`）。所以实现路径是给它们包一个 disclosure，而不是改数据流。

### 6.3 Augment / Item 在、Trait 不在：这个不对称怎么处理

先把不对称摆明：`QuickAddDialog.tsx:211` 有 `AugmentSelector`、`:218` 有 `ItemSelector`、**没有** `TraitSelector`（`import` 段 `:17-25` 里没有它）。而 `MatchForm` 三个都有（`:266` / `:289` / `:298`）。这不是"忘了做"，是"只做了两个"的中间状态，文档里也从未记录这个取舍。

**两条路：**

*补上 Trait。* 支持理由是真实的：`MatchForm.tsx:264` 的 hint 明确说「本局最终阵容实际拥有的羁绊；阵容名是另外一回事」，说明项目自己认为羁绊是独立概念；`CompositionSelector` 的「预置标签」分区（`:152-159`）给的**就是 Set 18 的羁绊名**（`composition-usage-service.ts` 的 `presetCompositions()` 来自 18 个羁绊名），也就是说用户已经在 QuickAdd 里选羁绊名了 —— 只是选在了「阵容」这个字段里，带着一个不相干的标签。

*保持现状。* 反对理由同样成立：羁绊可以从用户已经输入的阵容推导；它是最长的 chip 列表（`TRAIT_RESULT_LIMIT = 40`，且总数只有 36，等于全量展开）；补上去会让弹窗变成 4 个搜索框。

**建议：保持 Trait 在 QuickAdd 之外，并把这个取舍写成明规则，而不是让它停在中间状态。** 三条配套：

1. 理由写进代码注释：进入快速路径的字段是「名次 + 阵容 + 问题」—— 这三个是产品真正做分析的字段（`primaryMistake` 直接驱动 `MistakeBarChart` 和周复盘）。羁绊是描述性的、可后补的。
2. `CompositionSelector` 的 `PRESET_NOTE`（`:28`）已经在告诉用户这些是羁绊名，把这句话在「预置标签」分区里更显眼（`:154` 已经渲染了 `note`），避免"选了法师当阵容又选法师当羁绊"的静默撞车。
3. 从 QuickAdd 到「补羁绊」保持 1 次点击：`保存并详细复盘`（`:167-170`）和 `MatchFormPage.tsx:34-36` 的「改用快速记录」是现成的双向入口，不新增导航。

**预填策略**：现状是「复制上一局」需要**点击**。建议改成 —— 打开弹窗时若 `last` 存在，**直接预填 `composition`**，同时显示一枚可见的「沿用上一局 · 清除」chip 让用户能一键撤销。理由是 `README.md:38-40`「a log you do not fill in is worth nothing」：预填把"不填"的默认结果从"空"变成"上一局"，而空阵容在统计里等于这一局没有阵容信息。但**不要**预填名次和时间 —— 那两项目前靠快捷键和 `保存并再记一局` 处理（`:120-127` 已经清掉它们），预填名次会和 1–8 快捷键抢同一个字段。

### 6.4 20–60 秒预算怎么花

`QUICK_RECORD_UX.md:268` 定的是 ≤60 秒，`MatchForm.tsx:350` 对外承诺 20 秒。折叠 Augment/Item/时间/训练重点之后，最快路径是 2 次操作（约 5 秒），完整路径是 名次(1) + 阵容(1-2) + 问题(1) + 保存(1) = **4–5 次操作，约 20 秒**，与自述一致。展开的四个可选字段从"默认都要面对"变成"按需进入"，预算才真正花在分析口径上。

---

## 7. MatchForm UX

- **3 个面板永远全展开**（`:95` / `:190` / `:246`，`Panel.tsx:23` 的 header 没有折叠能力）。16 个可见字段（`grep -c 'label="'` = 16）在第一次点击之前就全部呈现。
- **标了 2 个 `required`**（`:98` 名次、`:106` 日期），但**只有名次阻塞保存**（`:334`）。日期视觉上带星号（`Field.tsx:31-33`）、实际不校验 —— 这是装饰性必填，属于会误导用户的假约束。
- **名次 toggle-off 会静默清空必填字段**（`:101`）。同一个 toggle-off 模式在 `MistakeSelect.tsx:47`（`onChange(selected ? "" : t)`）和 `ReviewForm.tsx:133`（`selfScore`）上重复出现，三处都是"再点一次 = 清空"。
- **核心棋子还是原生 `Input` + `<datalist>`**（`:274-287`，65 个 S18 棋子名来自 `:38` 的 `S18_CHAMPION_NAMES`），而同一网格里的羁绊（`:266`）、装备（`:289`）、海克斯（`:298`）都已经换成了 Selector。四个"选东西"的字段里还剩一个没统一，且是唯一不支持搜索的。
- **保存按钮禁用但无解释**：`:334` `disabled={busy || !draft.placement}`。禁用态本身有 `disabled:opacity-45`（`Button.tsx:22`），但没告诉用户缺什么。
- **`:348-351` 的 nudge 文案**指向 QuickAdd（"想更快？侧边栏的「快速记录一局」只要 20 秒"），仅在 `!draft.placement` 时出现。方向正确（这是应该在 MatchForm 而不是在 QuickAdd 做的引导），但它只覆盖"没选名次"这一种卡点，没有覆盖"字段太多不知道填哪些"。

---

## 8. UX 危害（P0，按真实用户伤害排序）

**P0-1 · `SelectorChip` 的删除按钮是 20×20 px。** `Selector.tsx:148` `className="flex size-5 items-center justify-center rounded hover:bg-gold-500/20"`。iOS 建议 44px、Android 24px，20px 两条线都不到。它嵌在 `min-h-8`（32px，`:130`）的 chip 里，相邻 chip 间距 `gap-1.5`（6px），外层是 `flex flex-wrap`。这是全应用**被点击次数最多的破坏性控件**，也是最小的那个。

**P0-2 · 删除即时生效且不可撤销。** `remove(id)`（`AugmentSelector.tsx:69-71`、`ItemSelector.tsx:58-60`、`TraitSelector.tsx:60-62`）直接调 `onChange`。无确认、无 undo、无 toast。误触 chip 上的 × 就永久丢掉一个已选项，唯一的挽回路径是关掉弹窗重开。**注意与既有约束的冲突**：`QUICK_RECORD_UX.md:274` 明确「禁止在快速路径里加二次确认弹窗」。所以正确解法不是 confirm，是 **toast + undo**（`ui/Toast.tsx` 的 `useToast` 已存在，`:49`），既不违反快速路径原则，又让删除可逆。

**P0-3 · 点遮罩丢整份草稿。** `Modal.tsx:44-47` 的遮罩 `div` 上有 `onClick={onClose}`（`:46`），无任何确认。Esc 路径已经被 `!e.defaultPrevented`（`:29`）修好了，**遮罩点击路径没有**。用户在 QuickAdd 里输了 3 个海克斯、点了弹窗边缘 → 全没了。同一处还有第二个问题：`Modal` 无 focus trap，`aria-modal="true"`（`:51`）但底层控件仍可 Tab 到。这两条是本次分析新发现的，两份前置报告都没提。

**P0-4 · `SelectorPanel` 是文档流元素，打开时会推开下方内容。** `Selector.tsx:23-31` 是一个普通 `div`，没有 `absolute` / `fixed`（整个文件只有 `:75` 和 `:93` 两处 `absolute`，都在搜索框内部）。后果：在 `MatchForm.tsx:260` 的 `sm:grid-cols-2` 网格里，点开「羁绊」面板会撑高该行，把「核心装备」「强化符文」两个字段**向下推走** —— 用户正要点的目标在指尖下移动。QuickAdd 里则构成三层嵌套滚动：`SelectorPanel` 的 `max-h-56 overflow-y-auto`（`Selector.tsx:26`）→ Modal body 的 `overflow-y-auto`（`Modal.tsx:73`）→ `max-h-[92dvh]`（`Modal.tsx:54`）。短屏下面板会被 Modal body 裁掉。

**P0-5 · legacy chip 无 `onLegacyChange` 时变成死按钮。** `Selector.tsx:140` `if (onRemove)` 为假时落到 `:158-162` 的 `<button type="button" onClick={onClick}>`；当 `onClick` 与 `onRemove` 都是 `undefined` 时，得到一个**可聚焦但点了没反应**的按钮，外表却和可删除的 chip 一模一样。触发需要 `legacy` 非空且 `onLegacyChange` 缺失。**当前生产不可达**（QuickAdd 不传 `legacy`；`MatchForm.tsx:270,293` 两个都传；`AugmentSelector.tsx:113-118` 同构），所以按潜在缺陷处理，但只要有人新增一个只传 `legacy` 的调用点就会立刻变成真问题。

**P0-6 · `MatchForm` / `ReviewForm` 没有草稿守卫。** 全项目 `beforeunload` grep = 0 命中。两份表单都把完整草稿放在组件 state 里（`MatchForm.tsx:48-50`、`ReviewForm.tsx:35`），16 个字段的表单一次刷新就没了；`MatchForm.tsx:336-339` 的「取消」和 `MatchFormPage.tsx` 的「放弃修改并返回详情」也都是静默丢弃。

**P0-7 · `DashboardPage` 内联表没有小屏 fallback。** `DashboardPage.tsx:108-161` 一张 7 列 `w-full` 表外面包 `overflow-x-auto`，**没有** `useMediaQuery` 分支。对比 `MatchList.tsx:22` 已经在做正确的事：`if (!desktop) return <MatchCards .../>`（`MatchCards` 定义在 `:91`）。同一份"最近对局"数据在 `/matches` 有卡片版、在 Dashboard 只能横向滚动。同类问题还有 `StatTable.tsx:23` 的 `min-w-[480px]`。

**P0-8 · `MistakeBarChart` 的 `min-width={520}` 是笔误。** `MistakeBarChart.tsx:38` `<ResponsiveContainer width="100%" height="100%" min-width={520}>`。Recharts 的 `ResponsiveContainer` 不接受连字符的 `min-width` prop，这个写法不生效；作者想表达的是外层 `overflow-x-auto`（`:37`）里的最小宽度。`UI_IMPROVEMENT_PLAN.md:118` 已记录，本文复核仍然成立。

---

## 9. 响应式

### 9.1 现状

`src/` 里 `@media` **0 条**。断点前缀使用量：`sm:` 34、`lg:` 27、`xl:` 4、`md:` 0、`2xl:` 0。唯一的 JS 断点 `DESKTOP_QUERY = "(min-width: 768px)"`（`use-media-query.ts:32`），唯一消费者 `MatchList.tsx:7,21`。

**已知的空适配带：`AppShell` 只在 `lg` 上分叉。** `AppShell.tsx:59` `lg:grid lg:grid-cols-[236px_1fr]`、`:60` `hidden lg:flex` 的侧栏、`:82` `lg:hidden` 的顶部 bar、`:95` 与 `:101` 的 `lg:hidden` 区块 —— 全部只挂在 `lg`（1024px）。**768–1023px 这一整段拿到的是手机版无侧栏布局，而宽度其实够放 236px 侧栏。** `UI_IMPROVEMENT_PLAN.md:31-33` 已记录此问题，本文复核成立：这是当前唯一一个"宽度够用但布局不承认"的区间。

第二段被忽略的区间是 1024–1279px：`lg:` 到 `xl:` 之间侧栏已经是 236px，但内容区 `lg:grid-cols-3`（`DashboardPage.tsx:72`）和 `lg:col-span-2` 已经生效、`xl:grid-cols-6`（`DashboardPage.tsx:59`）还没生效，StatCard 停在 3 列。

### 9.2 三档语义

沿用 `UI_IMPROVEMENT_PLAN.md:290` 已定的语义名（compact / standard / wide），这里给出每档**必须保证**的具体项。

**小屏 compact（< 768px）**

| 对象 | 必须保证 |
| --- | --- |
| Dashboard 表 | 必须有卡片 fallback（复用 `MatchList.tsx:91` 的 `MatchCards` 形态），**不允许**只靠 `overflow-x-auto`（现状违反，见 P0-7） |
| 图表 | `ResponsiveContainer` 高度固定（现状 `MistakeBarChart.tsx:37` `h-64` 可用）；`min-w-[480px]` 的 `StatTable`（`:23`）必须换布局而非横滚 |
| 选择器面板 | `max-h-56`（`Selector.tsx:26`）在 640px 宽下约占 1/3 屏高，可接受；但必须保证面板**不被 Modal body 裁掉**（现状违反，见 P0-4） |
| 对局卡片 | `MatchCards`（`MatchList.tsx:91-120`）已是正确形态：整卡可点、chip 行紧凑 |
| 表格 | 单元格 padding 收到 `px-3 py-2`（现状 `px-3 py-2.5` 12 处 / `py-2` 37 处，同类表行高不一致） |
| tooltip / 浮层 | 图表 tooltip 当前是 `tooltipStyle` 里的固定 `borderRadius: 10` / `fontSize: 12`（`MistakeBarChart.tsx:18-19`），窄屏下会溢出图表容器 |
| 筛选器 | 折叠为一行可横滑的 chip 组；`MatchFilters.tsx` 181 行需按此验证 |
| 关键操作 | 破坏性控件点击目标 ≥44px（现状 `Selector.tsx:148` 20px 违反，见 P0-1） |

**中屏 standard（768–1279px）**

| 对象 | 必须保证 |
| --- | --- |
| 整体框架 | **必须出侧栏**（现状 `AppShell.tsx:59` 只在 `lg` 分叉，768–1023 空档违反） |
| Dashboard 表 | 7 列放得下，可保持 table |
| 图表 | 可 2 列并排 |
| 选择器面板 | `MatchForm.tsx:260` 的 `sm:grid-cols-2` 在这一档生效 —— 这正是 P0-4 的现场，必须保证面板展开时不推移邻居 |
| 对局列表 | 保持 table |
| tooltip | 可用固定 tooltip |
| 筛选器 | 与 `PageHeader.action` 同行 |

**桌面 wide（≥1280px）**

| 对象 | 必须保证 |
| --- | --- |
| 整体框架 | 侧栏 236px + `max-w-[1180px]` 内容区（`AppShell.tsx:59,111`） |
| Dashboard | 6 个 StatCard 单行（`DashboardPage.tsx:59` `xl:grid-cols-6`）+ 3 列主区（`:72`） |
| 图表 | `min-width` 笔误必须已修（P0-8） |
| 选择器面板 | 面板展开不得推移任何内容（P0-4 在桌面档同样成立，只是位移距离不同） |
| 筛选器 / tooltip | 维持现状即可 |

---

## 10. Design token

### 10.1 颜色：15 个 token，零语义层

`src/index.css:3-26` 的 15 个 `--color-*` **全部是原始色阶**，没有任何角色命名 —— 没有 `--color-surface` / `--color-text-primary` / `--color-border` / `--color-danger`。半语义的只有 `--color-line`（`:10`，当边框用）和 `panel` / `num` 两个 utility。

**后果一 · 状态色不可主题化。** 成功/危险/信息三色根本不在 `@theme` 里，直接借 Tailwind 内置调色板：

- `Button.tsx:12`（danger）`border-red-500/35 bg-red-500/10 text-red-300`
- `Badge.tsx:15`（good）`emerald-500/30 / 10 / 300`
- `Badge.tsx:16`（bad）`red-500/30 / 10 / 300`
- `Badge.tsx:17`（info）`sky-500/30 / 10 / 300`

改一次"危险色"要改三个文件，而且它们和 `--color-gold-*` 没有任何关系。

**后果二 · `--color-teal-400` 是死 token。** `index.css:21` 定义了 `#38bdf8`，全项目 grep 只有这一行命中。讽刺的是 `PlacementTrendChart.tsx:15` 把同样的值手写成 `const BLUE = "#38bdf8"` —— 重复的不是"没有引用"，是"该引用的地方手写了"。

**后果三 · 图表常量是 token 值的逐字复制。** 14 处 hex 全在两个图表文件里（`PlacementTrendChart.tsx` 8 处、`MistakeBarChart.tsx` 6 处），`src/index.css` 之外 0 处新颜色：

| 位置 | 值 | 复制的 token |
| --- | --- | --- |
| `PlacementTrendChart.tsx:12` / `MistakeBarChart.tsx:11` | `#1e2635` | `--color-base-700` |
| `PlacementTrendChart.tsx:13` / `MistakeBarChart.tsx:12` | `#8b97ab` | `--color-ink-400` |
| `PlacementTrendChart.tsx:14` | `#e8b64a` | `--color-gold-400` |
| `PlacementTrendChart.tsx:15` | `#38bdf8` | `--color-teal-400`（唯一未被引用的 token） |
| `MistakeBarChart.tsx:13` | `#d19a2b` | `--color-gold-500` |
| 两文件 `:18` / `:16` | `#10151f` | `--color-base-850` |
| 两文件 `:19` / `:17` | `#232c3d` | `--color-line` |
| 两文件 `:22` / `:20` | `#f2f5fa` | `--color-ink-50` |

外加 `borderRadius: 10` / `fontSize: 12` 在 `MistakeBarChart.tsx:18-19` 和 `PlacementTrendChart.tsx:20-21` 各写一遍。

### 10.2 硬编码样式：真实情况（这一段要澄清，不夸大）

- **`style={{}}` 全项目 0 处。** grep `style={{` 与 `style=` 均 0 命中。唯一的命令式 DOM 样式写入是 `Modal.tsx:32-33,37` 的 `document.body.style.overflow`（滚动锁，必要）。**这块是真的干净，不要把它列进问题清单。**
- **间距 / 圆角 / 阴影的任意 px：0 处。** `rounded-[Npx]` 0 处，`p-[Npx]` / `gap-[Npx]` / `m-[Npx]` 等 0 处。
- **`text-[11px]` 硬编码 50 次，跨 23 个文件** —— 这是事实上的 caption 尺寸，但没有 `--text-caption` token。分布：`DataPage.tsx` 7、`MatchDetailPage.tsx` 5、`Selector.tsx` / `QuickAddDialog.tsx` / `MatchList.tsx` / `CompositionSelector.tsx` / `GoalComponents.tsx` 各 3，其余 16 个文件各 1–2。
- 全部 59 处任意 px 里，55 处是字号（`11px`×50、`10px`×4、`13px`×1），其余 4 处是 `max-w-[1180px]`（`AppShell.tsx:111`）、`max-w-[124px]`（`:43`）、`min-w-[480px]`（`StatTable.tsx:23`）、`backdrop-blur-[2px]`（`Modal.tsx:45`）。

### 10.3 排版：最大的单点问题是字体没加载

`index.css:23-25` 声明了 `--font-sans: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, ...` 和 `--font-mono: "JetBrains Mono", ...`，`font-sans` 在 `body`（`:41`）上应用一次、没有组件重复设置（做对了）。**但 `Inter` 和 `JetBrains Mono` 从未被加载**：全项目 `@font-face` / `fonts.googleapis` / `.woff2` grep = **0 命中**。

后果：栈里的第一个字体在绝大多数机器上不存在，Latin 字形直接落到 `PingFang SC`（一款 CJK 字体）→ `Microsoft YaHei` → `system-ui`。**这是全仓库最严重的排版问题** —— 不是字号或行高，而是中英文根本不在同一个字体家族里，跨平台字宽不一致。注意 `--font-mono` 的实际解析结果是 `ui-monospace, SFMono-Regular, Menlo`，也就是每个平台各自的默认等宽字体（`num` utility 23 处使用，影响面广）。

### 10.4 CJK 排版：三个具体问题

**问题一 · `uppercase` + `tracking-*` 用在中文上。** 13 处 `uppercase` 中有 3 处内容是中文：

- `AppShell.tsx:38` `<span className="shrink-0 uppercase tracking-wide">当前训练</span>`
- `TrainingGoalsPage.tsx:90` `<div className="text-[11px] uppercase tracking-wide text-ink-600">当前训练目标</div>`
- `AppShell.tsx:125` `<div className="text-[10px] uppercase tracking-[0.16em] text-ink-600">S18 · 训练日志</div>`

`uppercase` 对汉字是空操作，但 `letter-spacing` 不是 —— `tracking-wide`（0.025em）会在每个汉字之间插入间隙，`tracking-[0.16em]` 间隙更明显。所以同一个 `text-[11px] uppercase tracking-wide` 配方在 `Date` / `Placement` 上是对的，在中文上会往字里塞空格。其余 10 处 `uppercase` 是纯 Latin 表头 / 标签，是正确的。

**问题二 · 同一个 11px 有时带 `leading-*` 有时不带。** `Field.tsx:38`（hint）和 `:98`（`Label`）用 `text-[11px] leading-relaxed`，做得好；但 `StatCard.tsx:26,29`、`StatTable.tsx:25`、`MatchList.tsx:26`、`DashboardPage.tsx:110`、`AppShell.tsx:36,73` 是裸 `text-[11px]`。全项目 `leading-*` 只有 20 处（`relaxed` 16 / `tight` 2 / `none` 2），**没有一处 `leading-normal` 或 `leading-snug`**。CJK 字形是全 em 方块、没有升降部留白，11px 无行高补偿时在紧凑表头里会互相贴住（`MatchList.tsx:26`、`DashboardPage.tsx:110`、`StatTable.tsx:25` 三处紧邻的表头）。

**问题三 · 中英混排在同一行。** `MistakeBarChart.tsx:32`「还没有标记过 Primary Mistake。」、`ReviewForm.tsx:87` label `Primary Mistake`、`MatchForm.tsx:309`「最大问题（Primary Mistake）」。在 Inter 未加载的前提下，"Primary Mistake" 与周围汉字来自不同字体，基线和字重都对不齐。这是 §10.3 的下游后果，不是独立问题。

### 10.5 圆角 / 边框 / 阴影：无 token，且已经漂了

| 维度 | 现状 | 漂移证据 |
| --- | --- | --- |
| 圆角 | 0 个 `--radius-*`。实际 5 种：裸 `rounded` 6 处、`rounded-md` 8 处、`rounded-lg` 32 处、`rounded-2xl` 1 处、`rounded-t-2xl` 1 处，加上 `panel` 的 14px（`index.css:76`）和滚动条的 8px（`:66`） | 同为"卡片"语义：`panel` 是 14px（`index.css:76`），而 `MatchDetailPage.tsx:219` 与 `DataPage.tsx` 的手写面是 `rounded-lg`（8px）。`ui/Badge.tsx:22` 用 `rounded-md`，`ui/Selector.tsx:130` 的 chip 用 `rounded-lg` —— 同一个 `ui/` 目录里两个原语不同圆角 |
| 边框 | 宽度**事实上恒为 1px**（裸 `border` 43 处 + `border-0` 4 处，**没有 `border-2`**）；颜色恒为 `border-line`。`panel` 用 `color-mix(... 88%, transparent)`，手写面用平铺 `bg-base-900/60` 或 `/80` | 表面 alpha 不统一：`bg-base-900/60` ×3、`/80` ×6、`/70` ×1、`/40` ×1（`MatchForm.tsx:90`） |
| 阴影 | **全项目 2 处**：`Modal.tsx:54` `shadow-2xl`、`Toast.tsx:38` `shadow-xl`。0 个 `--shadow-*` | 深度感全靠边框 + 背景色差伪造；弹层级差只有 2 个量级可用 |
| section header padding | — | `Panel.tsx:23` `px-4 py-3` vs `Modal.tsx:59` `px-4 py-3.5`：两个带下边框的容器标题，垂直差 2px |
| 表格单元格 padding | — | `px-3 py-2` 37 处 vs `px-3 py-2.5` 12 处。`StatTable.tsx:37` 与 `MatchList.tsx:28-41` 是同类数据表，行高不同 |
| Input padding | `Field.tsx:8-9` 的 `CONTROL` 常量定义了 `px-3 py-2`，但被复制了 5 次 | `GoalComponents.tsx:54,65,76,85` 逐字复制 `px-3 py-2`（连 focus ring 一起），`:120` 同一控件却是 `px-2.5 py-1.5` |

---

## 11. i18n 现实

### 11.1 先纠正框架：项目根本没有 i18n

不是"i18n 不一致"，是**完全没有 i18n**：

- `package.json:22-29` 依赖里没有 i18n 库；`node_modules` 里 grep `i18n|intl|lingui|formatjs` = 0。
- 没有 locale JSON/YAML、没有语言 context、没有 `t()` / `useTranslation` / `<FormattedMessage>`（0 命中）、没有 `navigator.language` 检测、没有语言切换 UI。
- `<html lang="zh-CN">`（`index.html:2`），`README.md:19` 声明 Chinese-first。

**因此 UI 文案 100% 是硬编码内联字面量**：非测试文件 60 个、含 CJK 的行 **710 行**（`.tsx` 31 个文件 558 行，`.ts` 29 个文件 152 行）。唯一集中的标签表是 `src/domain/labels.ts`（约 38 个 key）。

**本阶段不引入 i18n 库。** 理由：单语言项目引入 i18n 框架只会增加一层间接而不减少任何工作量 —— 真正的成本在"文案该写在哪里"，而这个问题不需要框架就能解决。

### 11.2 真正的问题是同一屏内中英混排

- `DashboardPage.tsx:112-118`：表头 7 列里，`Date` 是英文，`名次` / `阵容` / `等级` / `时长` / `复盘` / `最大问题` 是中文 —— **同一行 7 个表头里 6 个中文 1 个英文**。
- `AppShell.tsx:20-25` 的 `NAV`：`Dashboard` 是英文，`对局` / `统计` / `训练目标` / `周复盘` / `数据` 是中文 —— 同一条导航两种语言。
- `MatchList.tsx:28-34` 反过来：7 个表头**全是英文**（`Date` / `Placement` / `Comp` / `Level` / `Duration` / `Reviewed` / `Primary Mistake`）。所以同一个"对局列表"在 `/matches` 是全英文表头、在 Dashboard 是中英混排。
- `data/` 侧的混合示例：`DataPage.tsx:278` `title="训练 Sessions"`、`MatchForm.tsx:96` `"A · 基础信息"`、`ReviewForm.tsx:87` `label="Primary Mistake"`。

### 11.3 一个真正的坏味道：共享原语里烧死了中文 a11y 默认值

`Selector.tsx:146`：

```
aria-label={removeLabel ?? `移除${label}`}
```

这是**唯一一个 `src/components/ui/` 文件里的 CJK 字面量**（该文件 CJK 行数 = 1，就是这一行）。它把一条面向用户、面向屏幕阅读器的文案硬编码在共享原语的默认值里，既不能被组件外部覆盖（除非每次都传 `removeLabel`），也不可能被本地化。项目其他地方的 a11y 属性至少有 `Modal.tsx:67` `aria-label="关闭"` 这样可读的独立写法；这一处是模板拼接的默认值，隐蔽得多。

### 11.4 本阶段沿用仓库里已经定好的文案规则

`UI_IMPROVEMENT_PLAN.md:300` 已经写下规则，本文直接采用，不重新发明：

> **术语可英文（Top4 / Session / Placement），功能词一律中文**

按这条规则，上面几处的收敛方向是确定的：`DashboardPage.tsx:112` 的 `Date` 和 `AppShell.tsx:20` 的 `Dashboard` 属于**功能词**（表头 / 导航项），应中文化；`MatchForm.tsx:309` 的 `Primary Mistake` 属于**术语**，可保留英文。唯一需要新增动作的是 `Selector.tsx:146` 的 `移除${label}` 默认值 —— 至少要让它成为显式可传入的必填项，而不是一个烧在原语里的默认值。

---

## 12. UI Consolidation Checklist

七组，每项给出**当前确切数字 / file:line** 与**目标值**。

### 12.1 颜色 color

| # | 现状（证据） | 目标 |
| --- | --- | --- |
| C1 | `@theme` 颜色 token **15 个**，全部原始色阶（`index.css:4-21`） | 保留 15 个原始色阶，**新增**语义层：`--color-surface` / `--color-surface-raised` / `--color-text-primary` / `--color-text-secondary` / `--color-text-muted` / `--color-border` / `--color-danger` / `--color-success` / `--color-info` 共 9 个 |
| C2 | 状态色来自 Tailwind 内置：`Button.tsx:12`、`Badge.tsx:15,16,17` 共 **4 处、3 个色系** | 全部改引用语义 token，源码中 `red-500` / `emerald-500` / `sky-500` 出现次数 **4 → 0** |
| C3 | `--color-teal-400` 定义于 `index.css:21`，全项目引用 **0 次** | 要么被 C1 的 `--color-info` 收编（`sky-500` → 项目自有），要么删除 |
| C4 | 图表硬编码 hex **14 处**（`PlacementTrendChart.tsx` 8 + `MistakeBarChart.tsx` 6），全部是已有 token 的逐字复制 | 图表常量**改为引用 CSS 变量**；`src/**/*.tsx` 中 6 位 hex **14 → 0** |
| C5 | `tooltipStyle` 的 `borderRadius: 10` / `fontSize: 12` 重复两遍（`MistakeBarChart.tsx:18-19`、`PlacementTrendChart.tsx:20-21`） | 提到一处共享常量 |

### 12.2 间距 spacing

| # | 现状 | 目标 |
| --- | --- | --- |
| S1 | 0 个 `--spacing-*` token；0 处 `p-[Npx]` 类任意值 | **保持 0 处任意值**（这是现状优点，不要为了"统一"引入任意值）；只需新增 3–4 个密度 token（`--density-control` / `--density-row` / `--density-section`）供 §12.2 收敛用 |
| S2 | Input padding 被复制 5 次（`Field.tsx:9` 定义于 `CONTROL`，`GoalComponents.tsx:54,65,76,85` 逐字复制，`:120` 又是 `px-2.5 py-1.5`） | 全部改为复用 `CONTROL`；`GoalComponents.tsx` 中重复串 **5 → 0** |
| S3 | section header `px-4 py-3`（`Panel.tsx:23`）vs `px-4 py-3.5`（`Modal.tsx:59`） | 统一为 `py-3`，二选一 |

### 12.3 圆角 radius

| # | 现状 | 目标 |
| --- | --- | --- |
| R1 | 0 个 `--radius-*`；实际 5 种 + 2 处工具类自带（裸 `rounded` 6 / `rounded-md` 8 / `rounded-lg` 32 / `rounded-2xl` 1 / `rounded-t-2xl` 1 / `panel` 14px / 滚动条 8px） | 定义 4 个：`--radius-control`（8px）、`--radius-chip`（8px）、`--radius-surface`（14px）、`--radius-modal`（16px） |
| R2 | `panel` = 14px（`index.css:76`）vs 手写面 `rounded-lg` = 8px（`MatchDetailPage.tsx:219`、`DataPage.tsx:291,514`、`GoalComponents.tsx` 6 处、`AddMatchButton.tsx:38`、`AugmentSelector.tsx:140`、`AppShell.tsx:87`、`Field.tsx:9`） | 同语义表面统一到 `--radius-surface` |
| R3 | `ui/Badge.tsx:22` 用 `rounded-md`（6px）而 `ui/Selector.tsx:130` chip 用 `rounded-lg`（8px） | `ui/` 内部原语圆角种类 **2 → 1**（chip 与 badge 同用 `--radius-chip`） |

### 12.4 边框 border

| # | 现状 | 目标 |
| --- | --- | --- |
| B1 | 宽度事实上恒 1px（裸 `border` 43 处，`border-2` 0 处） | **保持**；只加 `--border-width-default: 1px` 一个 token 供文档化，不做机械替换 |
| B2 | 表面 alpha 混乱：`/40` ×1（`MatchForm.tsx:90`）、`/60` ×3、`/70` ×1、`/80` ×6，加 `panel` 的 `color-mix(... 88%)` | 表面层级收敛为 3 档并 token 化（raised / overlay / sunken） |
| B3 | 表格单元格 `px-3 py-2`（37 处）vs `px-3 py-2.5`（12 处） | 同类表统一；`StatTable.tsx:37` 与 `MatchList.tsx` 行高对齐 |

### 12.5 阴影 shadow

| # | 现状 | 目标 |
| --- | --- | --- |
| D1 | 全项目 **2 处**（`Modal.tsx:54` `shadow-2xl`、`Toast.tsx:38` `shadow-xl`），0 个 `--shadow-*` | 定义 2 个：`--shadow-overlay`（弹层）、`--shadow-floating`（toast/下拉）；代码中 `shadow-*` 保持 2 处但改为 token |

### 12.6 排版 typography

| # | 现状 | 目标 |
| --- | --- | --- |
| T1 | **`Inter` / `JetBrains Mono` 声明未加载**（`index.css:23-25`；`@font-face` / webfont / `.woff2` 全项目 0 命中） | **最高优先级**：要么真正加载，要么把 `--font-sans` 首项改为系统栈。Latin 与 CJK 必须落在同一家族 |
| T2 | `text-[11px]` **50 处 / 23 文件**，无 `--text-caption` | 定义 `--text-caption` 并替换全部 50 处 → 硬编码 **50 → 0** |
| T3 | `text-[10px]` 4 处（`AppShell.tsx:125`、`Selector.tsx:134,136,193`）、`text-[13px]` 1 处（`Selector.tsx:150`） | 随 T2 一并 token 化（`--text-micro` / `--text-glyph`）→ 硬编码 **5 → 0** |
| T4 | `uppercase` 13 处中 **3 处内容是中文**（`AppShell.tsx:38,125`、`TrainingGoalsPage.tsx:90`） | 中文内容移除 `uppercase` 与 `tracking-*` → 中英混用 `uppercase+tracking` **3 → 0** |
| T5 | 11px 有时带 `leading-*`（`Field.tsx:38,98`）有时不带（`StatCard.tsx:26,29`、`StatTable.tsx:25`、`MatchList.tsx:26`、`DashboardPage.tsx:110`、`AppShell.tsx:36,73`） | caption 类一律带同一 `leading-*`；`leading-*` 总量 20 处 → 定义 2 个 `--leading-*` token |
| T6 | 生效字号 9 个值（10/11/12/13/14/16/18/24px），`text-xs` 70 + `text-sm` 51 构成主体 | 收敛为 6 档（10/11/12/14/16/24），删掉 13px 这个只出现 1 次的值 |
| T7 | `rounded` / 字号之外的 `tracking-[0.16em]`（`AppShell.tsx:125`）、`tracking-[0.12em]`（`StatCard.tsx:26`） | 两个 tracking token 化 |

### 12.7 文案 copy

| # | 现状 | 目标 |
| --- | --- | --- |
| P1 | `Selector.tsx:146` `移除${label}` —— `ui/` 里唯一 CJK 字面量，模板拼接的 `aria-label` 默认值 | 改为必填 prop 或提到调用方传入；`ui/` 目录 CJK 字面量 **1 → 0** |
| P2 | `DashboardPage.tsx:112` `Date` 与 6 个中文表头同列 | 按 `UI_IMPROVEMENT_PLAN.md:300` 规则中文化 |
| P3 | `AppShell.tsx:20` `Dashboard` 与 5 个中文 nav 项同列 | 中文化 |
| P4 | `MatchList.tsx:28-34` 7 个全英文表头 vs Dashboard 中英混排 | 按同一规则统一（术语保留英文、功能词中文） |
| P5 | 710 行 CJK 硬编码 / 60 文件 | **本阶段不降这个数字**。只要求新增文案不引入新的散落点；`src/domain/labels.ts` 的集中模式保持 |

---

## 13. 优先级

排序依据是**真实用户伤害**，不是美观程度。

### P0

| # | 做什么 | 为什么（证据） | file:line | 规模 | 行为? |
| --- | --- | --- | --- | --- | --- |
| P0-1 | 删除按钮点击目标 20px → ≥44px | 全应用点击最多的破坏性控件，两条平台最低线都不到；误删后无找回 | `Selector.tsx:144-153`（`:148` `size-5`） | S | 行为（命中区） |
| P0-2 | 删除改为 toast + undo | `remove` 直接 `onChange`，无确认无撤销；而 `QUICK_RECORD_UX.md:274` 禁止快速路径二次确认，所以 undo 是唯一同时满足两条约束的解 | `AugmentSelector.tsx:69-71`、`ItemSelector.tsx:58-60`、`TraitSelector.tsx:60-62` + `ui/Toast.tsx` | M | 行为 |
| P0-3 | 遮罩点击不再静默关闭带草稿的弹窗 | `Modal.tsx:45` 遮罩 `onClick={onClose}` 无确认，QuickAdd 里输 3 个海克斯后点边缘全丢。Esc 路径已修（`:29`），遮罩路径未修。同时补 focus trap | `Modal.tsx:44-47`、`:51` | S | 行为 |
| P0-4 | `SelectorPanel` 改为覆盖式（overlay）而非文档流 | `Selector.tsx:23-31` 无 `absolute`，在 `MatchForm.tsx:260` 的 2 列网格里展开面板会推开正要点的那两个字段；QuickAdd 里三层嵌套滚动 | `Selector.tsx:23-31`、`MatchForm.tsx:260`、`Modal.tsx:54,73` | M | 行为 |
| P0-5 | Dashboard 最近对局表补小屏卡片 fallback | 同类数据 `/matches` 已有卡片版，Dashboard 只有 `overflow-x-auto`；且 `StatTable.tsx:23` `min-w-[480px]` 同理 | `DashboardPage.tsx:108-161`、`MatchList.tsx:22,91`、`StatTable.tsx:23` | M | 行为 |
| P0-6 | `MatchForm` / `ReviewForm` 加草稿守卫 | 全项目 `beforeunload` 0 命中；16 字段表单一次刷新全丢；「取消」`MatchForm.tsx:336-339` 也是静默丢弃 | `MatchForm.tsx:48-50,336-339`、`ReviewForm.tsx:35` | S | 行为 |
| P0-7 | 加载 `Inter` / `JetBrains Mono`，或改用系统栈 | 声明了但从未加载（`@font-face`/webfont/`.woff2` 全 0），Latin 字形落到 CJK 字体；`num` utility 23 处使用等宽栈同样落空 | `index.css:23-25` | M | 行为（视觉） |
| P0-8 | 修 `min-width={520}` 笔误 | Recharts `ResponsiveContainer` 不认这个 prop，作者意图（最小宽度）未生效 | `MistakeBarChart.tsx:38` | S | 行为 |
| P0-9 | 补 `role="listbox"` / `role="option"` / `aria-activedescendant` | `Selector.tsx:83-86` 已声明 combobox + `aria-expanded` + `aria-controls`，但全项目 listbox/option/activedescendant **0 命中** —— 辅助技术被承诺了一个不存在的列表。且 `highlighted={i === 0}` 硬编码，高亮环永远钉在第一行 | `Selector.tsx:83-86`、三个 `highlighted=` 位置 | M | 行为（a11y） |

### P1

| # | 做什么 | 为什么（证据） | file:line | 规模 | 行为? |
| --- | --- | --- | --- | --- | --- |
| P1-1 | 抽 `useListPickerState`（窄 hook，4 个入参） | `open/query/boxRef/useOutsideClick`（4 行）+ `remove(id)`（3 行）三份全同；真正价值是把 Esc 消费这个跨 5 文件、仅 1 测试覆盖的隐式不变量收成单点。配置必须 ≤4 项、不得含 JSX | 新文件 + `AugmentSelector.tsx:49-88`、`ItemSelector.tsx:43-75`、`TraitSelector.tsx:45-77` | M | 重构 |
| P1-2 | QuickAdd 默认折叠海克斯 / 装备 / 时间 / 训练重点 | 选满 3 个海克斯 = 9 次点击，违反 `QUICK_RECORD_UX.md:269`「每字段 ≤3 次交互」；折叠后快路径 4–5 次操作 ≈20 秒，与 `MatchForm.tsx:350` 自述一致 | `QuickAddDialog.tsx:211-225,231-238,240-260` | M | 行为（信息层级） |
| P1-3 | 「复制上一局」从 hint 提级为可见操作 | 返回用户价值最高的动作，现在是一个 `text-[11px]` 的 hint 内按钮，视觉层级读起来像说明文字 | `QuickAddDialog.tsx:141-149,191-201` | S | 行为（可发现性） |
| P1-4 | `AppShell` 补中屏侧栏 | 只在 `lg`(1024) 分叉，768–1023 有足够宽度却拿手机版布局；`UI_IMPROVEMENT_PLAN.md:31-33` 已记录 | `AppShell.tsx:59,60,82,95,101` | M | 行为 |
| P1-5 | `CompositionSelector` 改用 `SelectorEmpty` | `:125` / `:191` 手写的 class 串与 `Selector.tsx:38` 逐字相同，空态改版必漏 | `CompositionSelector.tsx:125,191` | S | 装饰 |
| P1-6 | 修名次 toggle-off 静默清空必填 | `p === draft.placement ? undefined : p` 双击即清空唯一阻塞保存的字段，按钮同时变灰无提示 | `MatchForm.tsx:101,334`（同型：`MistakeSelect.tsx:47`、`ReviewForm.tsx:133`） | S | 行为 |
| P1-7 | 统一中英混排表头 / nav | `DashboardPage.tsx:112` 一行 7 列里 1 英文 6 中文；`AppShell.tsx:20` 同nav 混排；`MatchList.tsx:28-34` 全英文 | 按 `UI_IMPROVEMENT_PLAN.md:300` 既定规则 | S | 装饰 |
| P1-8 | `Selector.tsx:146` 的 `移除${label}` 默认值提出来 | `ui/` 里唯一 CJK 字面量，面向屏幕阅读器且不可外部覆盖 | `Selector.tsx:146` | S | 无障碍 |
| P1-9 | 修 legacy chip 的死按钮分支 | `if (onRemove)` 落空 + `onClick` 为 `undefined` → 可聚焦的死按钮。**当前生产不可达**（QuickAdd 不传 `legacy`；`MatchForm.tsx:270,293` 两个都传），按潜在缺陷处理 | `Selector.tsx:140,158-162` | S | 行为 |
| P1-10 | 图表常量改引 CSS 变量 | 14 处 hex 全是已有 token 的逐字复制；`teal-400` 定义了 0 引用，同时被手写成 `BLUE` | `PlacementTrendChart.tsx:12-15,18,19,22`、`MistakeBarChart.tsx:11-13,16,17,20` | M | 装饰 |
| P1-11 | 状态色收进语义层 | 4 处、3 个色系借 Tailwind 内置，改一次危险色要动 3 个文件 | `Button.tsx:12`、`Badge.tsx:15,16,17` + `index.css:3-26` | M | 装饰 |
| P1-12 | 核心棋子接入 Selector | 四个"选东西"字段里唯一还是裸 `Input` + `<datalist>`，不支持搜索 | `MatchForm.tsx:274-287` | M | 行为 |

### P2

| # | 做什么 | 为什么 | file:line | 规模 | 行为? |
| --- | --- | --- | --- | --- | --- |
| P2-1 | `text-[11px]` → `--text-caption` token | 50 处 / 23 文件的事实尺寸无常量；`text-[10px]` 4 处 + `text-[13px]` 1 处一并处理 | 见 §12.6 T2/T3 | M | 装饰 |
| P2-2 | 修 3 处中文上的 `uppercase tracking` | `uppercase` 对汉字空操作，`tracking` 会往字里塞间隙；另 10 处纯 Latin 是正确的，不能一起改 | `AppShell.tsx:38,125`、`TrainingGoalsPage.tsx:90` | S | 装饰 |
| P2-3 | 圆角收敛到 4 个 token | 5 种 + 2 处工具类自带；`panel` 14px vs 手写面 8px；`ui/Badge.tsx:22` 与 `ui/Selector.tsx:130` 同目录不同圆角 | `index.css:76,66` + 见 §12.3 | M | 装饰 |
| P2-4 | Input padding 复用 `CONTROL` | `GoalComponents.tsx` 逐字复制 5 次，其中一次还是不同密度 | `GoalComponents.tsx:54,65,76,85,120` | S | 装饰 |
| P2-5 | 表面 alpha / 表头 padding / 表格 padding 归一 | `/40`~`/80` 五档 alpha；`Panel.tsx:23` vs `Modal.tsx:59` 差 2px；`py-2` 37 处 vs `py-2.5` 12 处 | 见 §12.2 S3、§12.4 B2/B3 | M | 装饰 |
| P2-6 | 删掉或收编 `--color-teal-400` | 定义了但 0 引用，而同值被手写进 `PlacementTrendChart.tsx:15` | `index.css:21` | S | 装饰 |
| P2-7 | 修「日期」假必填 | `:106` 标了 `required` 但保存只看 `draft.placement`（`:334`），星号是装饰性约束 | `MatchForm.tsx:106,334` | S | 行为（文案） |
| P2-8 | MatchForm 面板折叠 + nudge 覆盖"字段太多" | 3 面板永展开、16 字段；`:348-351` 的 nudge 只覆盖"没选名次"一种卡点 | `MatchForm.tsx:95,190,246,348-351` | M | 行为（信息层级） |

---

## 14. 边界：已完成 / 本阶段建议 / 明确不做

**已完成（Level 1，不必重建）**

- `src/components/ui/` 9 个文件 630 行，含 6 个 Selector 原语（`SelectorPanel` / `SelectorSectionTitle` / `SelectorEmpty` / `SelectorSearchInput` / `SelectorChip` / `SelectorOptionRow`）。
- `useOutsideClick`（`src/lib/use-outside-click.ts`）已被 4 个选择器共用。
- Esc 不再连带关闭弹窗（`Modal.tsx:29` + 四个选择器消费 + `QuickAddDialog.test.tsx:133`）。
- 海克斯 legacy 文本通道已补齐（`AugmentSelector.tsx:106-119` + `match-form-model.ts:104-109,204` + 测试断言）。
- `num` 等宽数字 utility 23 处一致使用；`style={{}}` 全项目 0 处；间距/圆角任意 px 0 处。
- 最近 / 常用 / 预置三段建议（`CompositionSelector.tsx:138-159` + `suggestions.ts`）、`复制上一局`、`保存并再记一局` 均已实现。

**本阶段建议**

- 窄 hook `useListPickerState`（4 个入参，0 个 JSX），仅接管机械状态。见 §5.4 的禁止清单。
- 9 条 P0 + 12 条 P1 + 8 条 P2，按 §13 顺序执行。
- 7 组 token / 排版 / 文案收敛（§12），每项都带当前数字与目标值。
- 三档响应式语义（§9.2）与 `AppShell` 中屏侧栏。

**明确不做**

- ❌ `UniversalSelector<T>` / `TFTSelector<T>` / `SelectorEngine` / `SelectorStrategy`（§4）
- ❌ 任何新的第三方依赖、UI 组件框架、headless-ui / react-aria / radix
- ❌ i18n 库（§11.1）
- ❌ Dexie schema / 迁移改动
- ❌ OCR、Data Center、结构化复盘模板实现
- ❌ `CompositionSelector` 的三段结构改造、`full` 闸门的语义变更
- ❌ 移动 `style={{}}` 硬编码风格问题（它不存在）
