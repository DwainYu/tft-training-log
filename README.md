# TFT Training Log

> S18 云顶之巅 · 个人训练记录、对局复盘与训练统计系统（S18 Personal Training & Review System）

一个 local-first 的个人云顶之弈（Teamfight Tactics）训练工具，围绕「云顶之巅」
（国服排位训练机制，服务器 **12:00–22:00** 开放）的日常训练闭环设计：

```
对局 → 记录 → 复盘 → 统计 → 训练目标 → 下一局 → 循环
```

## 为什么做

- 云顶之巅的核心价值是**有效实战量**，但只打不总结，重复性错误（D 牌过深、
  经济打空、站位失误……）会被无限复制。
- 需要一个**低摩擦**的记录工具：打一局后 1–2 分钟内完成基本记录，
  失败的局花几分钟复盘，把问题沉淀成统计，再把统计变成下一阶段的训练目标。
- 针对中国大陆国服：**手动记录**是唯一可靠的一手数据源。本项目不依赖任何
  Riot API / 自动抓取 / 外挂式读取游戏数据。

> 这是一个**个人训练工具**。不是实时辅助工具，不是外挂，不读取游戏进程，
> 不做任何自动操作。

## 功能（MVP）

| 模块 | 说明 |
| --- | --- |
| Dashboard | 总场次 / 平均名次 / Top4 率 / 吃鸡 / Win Rate / 连续训练天数 / 最近 10 场趋势 / 最近对局 / 当前训练目标 / 高频问题 |
| Quick Add | 核心 UX：名次（1–8 快捷键）→ 阵容 → 强化 → 装备 → 最大问题 → 下一局重点 → 保存。支持「保存并再记一局」「保存并详细复盘」 |
| Matches | 完整对局列表：搜索、筛选（名次区间 / 复盘状态 / 阵容 / 错误类型 / 日期）、排序、分页 |
| Add / Edit Match | 三段式完整表单：基础信息（含训练时段 warning）、对局状态、阵容/装备/强化 |
| Match Detail | 基础信息 / 阵容装备强化 / 关键决策 / 复盘结论 / 相关训练目标 / 元数据；编辑、删除、开始复盘 |
| Decision Log | 关键决策：回合、类型（经济/升级/D牌/转阵/装备/强化/站位/锁血/连胜/连败/…）、当时状态、决定、原因、结果、回看 |
| Review | 四部分复盘：开局 / 中期 / 后期 / 复盘结论（Primary Mistake + 最大问题 + 做得最好 + 下局练习，四项必填） |
| Statistics | 整体统计、最近 10/20 场趋势折线、错误类型柱状图、阵容统计、时间段统计（12–14 / 14–16 / 16–18 / 18–20 / 20–22 / 时段外）——只展示数据，不自动下结论 |
| Weekly Review | 本周场次/名次/Top4/吃鸡/Bottom4/最常见错误/最常玩阵容/当前目标，由 `RuleBasedSummary` 生成；预留 `LLMSummary` / `AgentCoach` 接口 |
| Training Goals | 训练目标：名称/说明/起止日期/相关错误类型/状态（active/completed/archived） |
| Data | JSON 全量导出 / JSON 合并导入 / CSV 导出 / 存储概况 / 清空数据 |

## 使用方式

```bash
npm install        # 依赖
npm run dev        # 开发：http://localhost:5183
npm run build      # 类型检查 + 生产构建（dist/）
npm test           # 单元测试（100 个用例）
npm run typecheck  # tsc --noEmit
```

日常使用流程：

1. 打完一局 → 侧边栏「快速记录一局」→ 按 `1–8` 选名次 → 填阵容/问题 → 保存。
2. 失败的局 → 对局详情「开始复盘」→ 四部分复盘，必填结论四项。
3. 每周 → 「周复盘」页看汇总 → 把高频错误变成「训练目标」。
4. 换电脑 / 怕丢数据 → 「数据」页 Export JSON 备份；回来再 Import JSON。

> 注：时间字段按**北京时间**填写（国服单时区）。对局时间不在 12:00–22:00
> 时会显示 warning，但不阻止保存。

## 技术栈

- **TypeScript + React 19 + Vite** —— 单页应用
- **Tailwind CSS v4** —— dark / clean / data-oriented 风格
- **Dexie（IndexedDB）** —— local-first 存储，无后端、无账号
- **Recharts** —— 趋势折线与错误分布柱状图
- **Vitest + Testing Library** —— 纯函数统计 + 服务层 + 关键 UI 的测试

## 数据模型

存储于 IndexedDB（Dexie），四张表：

```ts
type Match = {
  id: string
  playedAt: string          // 本地墙钟 "YYYY-MM-DDTHH:mm"，单时区国服
  startedAt?: string
  endedAt?: string
  durationSeconds?: number
  placement: number         // 1–8
  finalLevel?: number
  finalHealth?: number
  totalGold?: number
  composition?: string      // MVP 阶段允许纯文本
  traits?: string[]
  coreUnits?: string[]
  coreItems?: string[]
  augments?: string[]
  reviewed: boolean
  primaryMistake?: MistakeType
  notes?: string
  createdAt: string
  updatedAt: string
}

type Decision = {
  id: string; matchId: string
  round: string             // "3-2" / "4-1" / "决赛圈"
  type: DecisionType        // ECONOMY/LEVELING/ROLLING/COMPOSITION/ITEM/AUGMENT/
                            // POSITIONING/STABILIZE/WIN_STREAK/LOSE_STREAK/TRANSITION/OTHER
  situation?: string
  decision: string
  reasoning?: string
  result?: string
  hindsight?: "correct" | "wrong" | "mixed"
  hindsightNote?: string
  createdAt: string
}

type Review = {
  id: string; matchId: string          // 一对一
  opening?: string; midGame?: string; lateGame?: string
  bestDecision?: string; biggestMistake?: string
  primaryMistake?: MistakeType
  nextGameFocus?: string
  selfScore?: number                   // 1–5
  createdAt: string; updatedAt: string
}

type TrainingGoal = {
  id: string
  title: string; description?: string
  startDate: string; endDate?: string
  relatedMistakes?: MistakeType[]
  status: "active" | "completed" | "archived"
}

type MistakeType =
  | "ECONOMY" | "LEVELING" | "ROLLING" | "COMPOSITION" | "ITEM"
  | "AUGMENT" | "POSITIONING" | "SCOUTING" | "TEMPO" | "TRANSITION" | "OTHER"
```

设计约定：

- `match.primaryMistake` 是统计唯一真源（Quick Add 直接写 match；Review 保存时同步进 match）。
- `match.reviewed` 只在复盘结论四项齐备时为 true；Quick Add 写入的“下一局重点”
  会以 seed review 形式落在 `reviews` 表，但不会把该局标记为已复盘。
- 统计逻辑全部在 `src/domain/stats` 纯函数中，带单元测试（8,4,3,1 → 平均 4，Top4 75%，胜率 25%）。

## 数据来源策略

第一阶段只有 `ManualAdapter`（手动记录），定义在
`src/data/adapters/`。接口 `DataSourceAdapter` 已经就位，未来可以扩展：

```
DataSourceAdapter
├── ManualAdapter    ← 已实现
├── LCUAdapter       ← 国服客户端数据采集（Phase 3）
├── ScreenshotAdapter ← 截图/关键回合（Phase 5）
└── RiotAdapter      ← 官方 API（若可用）
```

不假设国服存在可直接调用的 Riot Match API。

## 未来 Agent 接口

`src/services/agent-tools.ts` 暴露了教练 Agent 未来需要的全部只读工具
（JSON 可序列化返回、无副作用）：

`get_recent_matches() / get_match(id) / get_recent_reviews() / get_common_mistakes() /
get_composition_stats() / get_training_goals() / get_weekly_summary()`

周复盘同样通过 `ReviewSummaryProvider` 接口（当前实现 `RuleBasedSummary`）生成，
后续可替换为 `LLMSummary` / `AgentCoach` 而不改动页面。

## Roadmap

见 [ROADMAP.md](./ROADMAP.md)。

## 当前限制

- 时间是手动填写的北京时间墙钟字符串（`YYYY-MM-DDTHH:mm`），不处理时区/夏令时。
- 阵容/装备/强化符文是自由文本（MVP 约定），暂无 S18 结构化静态数据。
- 周复盘小结是规则引擎（无 LLM）；Agent Coach、MCP、截图分析均在后续阶段。
- 数据只在本机浏览器（IndexedDB）——换浏览器 / 清缓存前请先 Export JSON。
