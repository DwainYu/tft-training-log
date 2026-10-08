/**
 * Data Center V1 — a static catalog of external TFT resources.
 *
 * Deliberately only navigation: no scraping, no runtime fetches, no iframe,
 * no per-site stats copied into this app. Every URL here was checked by hand
 * (HTTP 200, real landing page) before being listed; a site that cannot be
 * verified stays out of the catalog and lives in `DATA_CENTER.md` as a
 * candidate instead.
 */

export const RESOURCE_CATEGORIES = ["stats", "official", "reference"] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export interface ExternalResource {
  /** Stable identifier — never reused, referenced by tests. */
  id: string;
  title: string;
  /** One line: when would a player open this. No "realtime" claims. */
  description: string;
  category: ResourceCategory;
  url: string;
}

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  stats: "数据站",
  official: "官方与版本",
  reference: "资料与工具",
};

/** Display order of the sections on the page. */
export const RESOURCE_CATEGORY_ORDER: ResourceCategory[] = [
  "stats",
  "official",
  "reference",
];

export const EXTERNAL_RESOURCES: ExternalResource[] = [
  {
    id: "tactics-tools",
    title: "Tactics.tools",
    description: "查阵容、海克斯与装备的大数据统计（英文站）。",
    category: "stats",
    url: "https://tactics.tools/",
  },
  {
    id: "metatft",
    title: "MetaTFT",
    description: "查阵容组合与装备、海克斯数据（英文站）。",
    category: "stats",
    url: "https://www.metatft.com/",
  },
  {
    id: "opgg-tft",
    title: "OP.GG · TFT",
    description: "查阵容统计与棋子、装备数据（英文站）。",
    category: "stats",
    url: "https://op.gg/tft",
  },
  {
    id: "tft-official",
    title: "Teamfight Tactics 官方网站",
    description: "官方玩法介绍与活动公告。",
    category: "official",
    url: "https://teamfighttactics.leagueoflegends.com/",
  },
  {
    id: "riot-patch-notes",
    title: "官方补丁说明",
    description: "查版本改动：英雄、羁绊、装备与海克斯的调整都发在这里。",
    category: "official",
    url: "https://www.leagueoflegends.com/en-us/news/game-updates/",
  },
  {
    id: "lol-wiki-tft",
    title: "LoL Wiki · Teamfight Tactics",
    description: "查棋子、羁绊、装备的词条与合成路径（英文站）。",
    category: "reference",
    url: "https://wiki.leagueoflegends.com/en-us/Teamfight_Tactics",
  },
];

/** Sections for the page, in display order — including empty ones. */
export function resourceSections(): {
  category: ResourceCategory;
  label: string;
  resources: ExternalResource[];
}[] {
  return RESOURCE_CATEGORY_ORDER.map((category) => ({
    category,
    label: RESOURCE_CATEGORY_LABELS[category],
    resources: EXTERNAL_RESOURCES.filter((r) => r.category === category),
  }));
}
