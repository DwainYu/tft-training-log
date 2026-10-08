# DATA_CENTER · 数据中心

> 配套：[PRODUCT_ROADMAP](./PRODUCT_ROADMAP.md) · [UI 优化](./UI_IMPROVEMENT_PLAN.md) · [截图录入](./SCREENSHOT_IMPORT.md)
> 基线：`main` @ `7347d3f`。
> 一句话定位：**V1 是「外部数据资源聚合 + 内部快照浏览」，不是爬虫系统。**

---

## 1. 页面定位

### 1.1 它负责闭环的哪一步

「记录 → 复盘 → 分析」闭环里，Data Center 服务的是**分析的上下文**：

> 看完自己的数据之后，需要一个地方回答「这跟我打的这个版本有关系吗？」「这个海克斯到底干什么？」

所以它不是一个数据生产系统，而是一个**参照系**：

- 站内：把已经打进包里的 Set 18 快照变成可浏览、可检索的页面。
- 站外：把值得去的 TFT 数据站变成有说明、有分类的入口。
- 未来：允许外部数据落地为内部数据 —— **但要过一道标准化闸门**。

### 1.2 边界（写清楚，防止做大）

| 是 | 不是 |
| --- | --- |
| 已内置静态数据的浏览 / 检索 | 运行时抓取、定时同步 |
| 外部站点的导航 + 一句说明 | 把外部内容嵌进页面（iframe） |
| 记录与外部实体的关联（走已存在的 `*_Ids`） | 建立独立的外部数据 schema 并让 domain 依赖它 |
| 版本信息展示 + 自己记录的分布 | 完整的 tier list / meta 分析系统 |

---

## 2. 现有基础（基本已经齐了）

| 已有 | 位置 |
| --- | --- |
| Set 18 静态快照：`65 棋子 / 36 羁绊 / 186 装备 / 592 海克斯` | `data/tft/set18/*.json` |
| Manifest：`set / version 18.3 / locale zh-CN / dataVersion s18-18.3-ddragon-16.19 / 来源 sha256 / retrievedAt 2026-09-24` | `data/tft/set18/manifest.json` |
| 类型定义 `ChampionData / TraitData / ItemData / AugmentData / TftDataManifest / TftDataSnapshot` | `src/data/tft/types.ts` |
| 只读 Repository：`championRepository / traitRepository / itemRepository / augmentRepository`，**已带 search 方法** | `src/data/tft/repositories.ts` |
| Set registry（目前只注册 set 18） | `src/data/tft/registry.ts` |
| 导入期校验（坏 JSON 在 CI 就失败） | `src/data/tft/validation.ts` |
| 复现脚本（锁定源 URL + 记录 sha256） | `scripts/build-set18-data.mjs`（`npm run data:build`） |
| 已有落勾兑字段：`Match.traitIds / coreUnitIds / coreItemIds / augmentIds` | `src/domain/types.ts:77-81` |
| Data 页已有一小块「Set 18 静态数据」概要面板 | `src/pages/DataPage.tsx:328-345` |

**结论：V1 缺的不是数据能力，是一个页面 + 几个 UI 组件。**

已知的数据注意事项（来自 `data/tft/set18/README.md` 的 notes，会影响 UI 展示）：

- 海克斯**没有可靠的 tier 字段**（源数据里没编码）→ UI 不要假装能排序 tier。
- 描述里保留游戏模板占位符（`@Gold@`、`@AttackSpeed@` …）→ 需要一个 `formatTftDescription()` 再显示。
- `icon` 是 CommunityDragon 的 `.tex` 路径，**不是可用图片** → 现阶段 UI 用文字 + 分类色块，不要指望图标。
- 描述缺失的元素必须从 UI 上「诚实缺失」，不要瞎补。

---

## 3. 页面结构（V1）

新增路由 `/data-center`（`App.tsx` 的 Routes 里加一条，`AppShell` 的 `NAV` 加一项）。

```
/data-center
├── ① 版本概览（顶部）
│     · 当前内置：Set 18 · Set 18: Enchanted Wilds · patch 18.3
│     · dataVersion / 抓取日期 / 来源
│     · 我的记录用的是哪个版本 —— 分布条（前提：见「版本维度」）
│
├── ② 我的数据 vs 静态数据（最能体现价值的一块）
│     · 我用过的海克斯（Top N）→ 场数 / Top4 率
│     · 我用过的核心装备 → 场数 / Top4 率
│     · 我常用的羁绊
│     · 点一项 → 跳 /statistics 或 /matches?… 的筛选结果
│
├── ③ 静态数据浏览（tab）
│     · 棋子 65 / 羁绊 36 / 装备 186 / 海克斯 592
│     · 统一工具栏：搜索 + 分类筛选 + 排序
│     · 卡片 grid（不要表：文件太多，表不适用）
│     · 详情：侧滑 Panel 或 Modal
│
└── ④ 外部资源
      · 分组卡片：官方 / 数据站 / 社区工具 / 中文社区
      · 每张卡：名称 + 一句「什么时候用」+ 外链 + 是否需梯子（诚实的备注）
```

### 3.1 为什么 ② 放在这么靠前

单纯把外部静态数据搬上页面，价值约等于「打开一个 wiki」。
真正只有本项目能做的是 ②：**你的历史战绩 × 静态实体的交叉**。
它复用现有 `compositionChart()` 的思路，只是把分组键从 `composition` 换成 `augmentIds` 等。
这也是唯一一块「别处做不到」的内容 —— V1 至少要包含它，否则这个页面可以不建。

---

## 4. V1 / V2 / V3

### V1 — 外部资源聚合 + 内部快照浏览（P2）

- 静态数据浏览（四个 tab + 搜索 + 详情）
- 外部资源导航（卡片 + 说明）
- 版本概览（读 manifest）
- **「我的数据 vs 静态数据」基础版**（海克斯 / 装备 / 羁绊 Top N）
- 数据源：**全部本地内置**，不做网络请求
- 数据模型改动：**无**（纯消费现有 repository）

### V2 — 部分数据落地与对照增强（P2+）

- 静态实体详情页里显示**自己的战绩**：这个海克斯我选过 7 次，Top4 率 57%
- 从详情页反向跳到相关对局列表（需要给 `Match` 的列表筛选加 augment / item 维度）
- 引入**版本维度**：每条记录标 `set` + `dataVersion`，支持「只看某个 patch」
- 「静态实体 ↔ 我的记录」的关联**复用 `Match` / `Review` 上已有的 `*_Ids` 字段**，
  **不新建关联表**（已有 `augmentIds` / `coreItemIds` / `traitIds` / `coreUnitIds` 足够）
- 数据模型改动：**是（Dexie v3，`matches` 索引补 set/version；给 IXiend+ 加 index）**

### V3 — 数据接入与统一（P3，不要急）

只有在明确需要「听赐 internalized 数据」时才做：

```
外部数据源（Data Dragon / Patch notes / 第三方 API / 手动整理）
      ↓ 获取（离线 generator，或用户手动导入）
      ↓ 标准化（映射到已有 ChampionData / TraitData / ItemData / AugmentData 形状）
      ↓ TFT Training Log 内部数据（形态不变）
```

核心约束见 §6。

---

## 5. 外部数据：哪些该内部化，哪些只该是链接

| 数据 | 决策 | 理由 |
| --- | --- | --- |
| **棋子清单**（名字 / 费用 / 羁绊） | ✅ 内部化 | 稳定、体积小、录入必须用到（selector 的数据源） |
| **羁绊**（含触发阈值） | ✅ 内部化 | 同上，而且是阵容定义的基础 |
| **装备**（含合成路径） | ✅ 内部化 | 同上；186 条可接受 |
| **海克斯**（名字 / 描述） | ✅ 内部化（已有 592 条） | selector 的数据源；体积仍然可接受 |
| **版本 / 补丁号** | ✅ 内部化（manifest + 记录标注） | 没有版本维度，跨版本统计全是错的 |
| **Tier list / 版本强势排名** | ⛔ 只做外链 | 变动快、观点性强、维护成本高，且违背「统计不替你下结论」的定位 |
| **实时胜率 / 大数据统计** | ⛔ 只做外链 | 需要持续抓取，且和本项目的「你自己的数据」是两件事 |
| **阵容攻略 / 教学内容** | ⛔ 只做外链 | 内容型，不该本仓库维护 |
| **图标 / 立绘资源** | ⛔ 暂不做 | `.tex` 不是可用图片；真要显示需要一套 asset pipeline，收益不匹配成本 |

判定规则（以后新增数据都按这三条过一遍）：

1. **录入或统计是否需要它作为「身份」？** 需要 → 内部化。
2. **它每个月都会变并且会影响结论吗？** 会 → 至少做版本标记，不一定要正文内部化。
3. **外部已有权威来源并且更新比我们勤？** 是 → 只做链接。

---

## 6. 如何避免数据模型失控

这是 DATA_CENTER 唯一真正的技术风险，必须提前定规则：

### 6.1 内部数据与外部数据**形状必须相同**

外部数据进来之前，先映射成已有的 `ChampionData / TraitData / ItemData / AugmentData`。
`domain/` 永远只认识这几个类型 —— **不允许出现 `ExternalChampion` 这种平行类型**。

### 6.2 「获取」是离线动作，不是运行时依赖

现有的 `scripts/build-set18-data.mjs` 就是这个模式的正确示范：

- 脚本按 pinned URL 抓取 → 转换为内部形状 → 写入 `data/tft/set<X>/` + manifest（含 sha256）
- 应用运行时**只读本地 JSON**，不联网
- 换 patch = 跑一次脚本 + review diff，**不是线上自动更新**

以后任何新数据源都套这个模式。运行时抓取 = 引入不稳定 + 违反离线优先。

### 6.3 每个 set / 版本是一个独立快照，不做原地更新

`registry.ts` 已经是「多个 set」的结构。演进到多个版本时：
`set18@18.3`、`set18@18.4` 各自一份 manifest，**旧版本快照不删**（旧记录还引用它）。
这一点决定了 `Match.set` / `Match.patchVersion` **必须在 V2 落地**，
否则换版本后旧记录的含义会漂移。

### 6.4 引用完整性单向：Match → 静态数据

`Match.augmentIds` 之类只是** id 引用**，可以容忍「引用的实体在当前快照里不存在」
（写入期校验由 `src/data/tft/match-links.ts` 负责，浏览期做优雅降级即可）。

### 6.5 Quarantine rule（新增数据的落地流程）

任何新增数据集必须在 `data/tft/` 下先定义形状 → 由 `validation.ts` 在导入期校验 →
CI 因此会在数据坏掉时直接失败。这条规则当前只覆盖 set18（`src/data/tft/tft-data.test.ts`），
新增数据源时保持同一流程。

---

## 7. 路由 / 命名 / 与现有页面的关系

| 现有 | 去向 |
| --- | --- |
| `DataPage`（`/data`：导入导出 / Sessions / 存储 / 危险区） | **保留不动**。它是「我的数据管理」 |
| 其中的「Set 18 静态数据」概要面板（`DataPage.tsx:328`） | 保留，但加一个「查看详情 →」跳到 `/data-center`；避免两处维护同一份内容 |
| `/data-center`（新） | 「外部世界 + 静态数据 + 我的对照」 |

**不要**把导入导出塞进 Data Center —— 「我的数据进出」和「查参考数据」是两种心智模型。
同理，**不要**再建第三个「数据」页面。

---

## 8. 落地检查清单

- [ ] `src/pages/DataCenterPage.tsx` + 路由 + nav 项
- [ ] `src/data/tft/description.ts`：清洗 `@Gold@` 这类占位符（`formatTftDescription()`）
- [ ] `src/components/data/TftEntityGrid.tsx` + `TftEntityDetail.tsx`：通用浏览/详情（四 tab 共用）
- [ ] `src/components/data/ExternalResourceCard.tsx` + `resources.ts`（外链常量表，带用途说明）
- [ ] `src/services/data-center-service.ts`：把「我的战绩 × 静态实体」的聚合做成纯函数 + 一个 service
  （聚合逻辑本身应放 `domain/stats/`，照现有 `CompositionStat` 的写法）
- [ ] 抽取共享 design token / chart 组件（如果 V1 里画了图）
- [ ] DataPage 面板加跳转；保持单一真源

---

## 9. 什么时候该暂停这个项目

出现下面任一情况，说明 Data Center 正在失控，应停下来：

- 开始实现「自动更新 / 定时任务」；
- 开始需要后端或代理才能取到数据；
- 静态快照里开始出现「报价 / 实时胜率」这类会随时间失效的字段；
- 出现了第三种「数据」页面；
- 更简单的判据：**这个页面超过一半的内容，是别人那儿也有的。**

---

## V1 Implementation（2026-10-07 实装）

本节记录**实际落地**的 V1。与 §3 的页面结构相比，范围刻意收窄到「外部资源导航」——
静态数据浏览（③）与「我的数据 × 静态实体」（②）未包含在本阶段，仍属后续工作。

### 交付物

| 文件 | 内容 |
| --- | --- |
| `src/data/external-resources.ts` | 静态 catalog（`ExternalResource` + 分类 + `resourceSections()`），无网络请求 |
| `src/pages/DataCenterPage.tsx` | 路由 `/data-center`：声明区 + 按分类分组的卡片 grid |
| `src/App.tsx` / `AppShell.tsx` | 路由 + 侧边栏/移动端菜单新增「资料中心」（Globe 图标，位于 统计 之后） |

### 当前资源（6 个，全部人工核验 HTTP 200）

| 名称 | 分类 | URL | 用途 |
| --- | --- | --- | --- |
| Tactics.tools | 数据站 | https://tactics.tools/ | 阵容、海克斯与装备的大数据统计（英文站） |
| MetaTFT | 数据站 | https://www.metatft.com/ | 阵容组合与装备、海克斯数据（英文站） |
| OP.GG · TFT | 数据站 | https://op.gg/tft | 阵容统计与棋子、装备数据（英文站） |
| TFT 官方网站 | 官方与版本 | https://teamfighttactics.leagueoflegends.com/ | 官方玩法介绍与活动公告 |
| 官方补丁说明 | 官方与版本 | https://www.leagueoflegends.com/en-us/news/game-updates/ | 版本改动（英雄/羁绊/装备/海克斯调整） |
| LoL Wiki · TFT | 资料与工具 | https://wiki.leagueoflegends.com/en-us/Teamfight_Tactics | 棋子、羁绊、装备词条与合成路径（英文站） |

### 为什么是这三个分类

卡片是「站点」而不是「主题」——一个数据站同时覆盖阵容/海克斯/装备，按主题拆会把同一站点拆成三张卡。
所以分类按**使用场景**划：查大数据（stats）、查版本与官方信息（official）、查词条与合成（reference）。

### 被拒绝的候选（不要悄悄加回来）

| 候选 | 结果 | 原因 |
| --- | --- | --- |
| lolchess.gg | HTTP 404 | 站点已不可达 |
| mobalytics.gg/tft | HTTP 403 | 无法确认可访问（疑似反爬），列为本阶段后的候选 |
| tftactics.gg | HTTP 200 | 无法确认内容维护状态，仅 200 不足以上架 |

### 链接安全

- 全部 `target="_blank"` + `rel="noopener noreferrer"`（页面测试逐卡断言）。
- URL 只来自这份静态 catalog，不接受用户输入；测试断言全部 `https://`，排除 `javascript:` / `data:`。
- 无 iframe / fetch / proxy——卡片就是一个 `<a>`。

### 文案红线

描述只用「查阵容…」「查版本改动…」这类中性表达；测试禁止出现「实时 / 最新排名 / 当前热门 / 实时胜率」——
本项目没有运行时取数，页面不许假装有。

### 为什么 V1 只做链接

1. 本项目定位是「你自己的数据」，外部数据是参照系；抓取会把维护成本和失效风险带进仓库。
2. 离线优先：运行时联网请求违反存储承诺。
3. `DATA_CENTER.md` §6 的闸门（离线 generator → 标准化 → 内部形状）是 V3 的事，且要过 `validation.ts`。

### 不在当前范围（对 §3 的差量）

- ③ 静态数据浏览（四 tab + 搜索 + 详情 Modal）——数据能力已齐（repository 带 search），缺的只是 UI，另起阶段。
- ② 我的战绩 × 静态实体交叉——聚合思路已在 Step 6A 落地为 `analytics.ts`（`augmentStats` 等），差的是把 id 解析成实体名后的展示页。
- ① 版本概览分布条——依赖版本维度（`Match.set` / `patchVersion`），属 §6.3 的 V2 数据模型改动。
