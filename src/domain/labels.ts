import {
  DECISION_HINDSIGHTS,
  DECISION_TYPES,
  MISTAKE_TYPES,
  type DecisionHindsight,
  type DecisionType,
  type GoalStatus,
  type MistakeType,
} from "./types";

export const MISTAKE_LABELS: Record<MistakeType, string> = {
  ECONOMY: "经济",
  LEVELING: "升级",
  ROLLING: "D牌",
  COMPOSITION: "阵容",
  ITEM: "装备",
  AUGMENT: "强化符文",
  POSITIONING: "站位",
  SCOUTING: "观察/侦查",
  TEMPO: "节奏",
  TRANSITION: "转型",
  OTHER: "其他",
};

export const DECISION_LABELS: Record<DecisionType, string> = {
  ECONOMY: "经济",
  LEVELING: "升级",
  ROLLING: "D牌",
  COMPOSITION: "阵容",
  ITEM: "装备",
  AUGMENT: "强化符文",
  POSITIONING: "站位",
  STABILIZE: "锁血",
  WIN_STREAK: "连胜",
  LOSE_STREAK: "连败",
  TRANSITION: "转阵",
  OTHER: "其他",
};

export const HINDSIGHT_LABELS: Record<DecisionHindsight, string> = {
  correct: "正确",
  wrong: "错误",
  mixed: "一般",
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "进行中",
  completed: "已完成",
  archived: "已归档",
};

export const PLACEMENT_LABELS: Record<number, string> = {
  1: "第 1 名 · 吃鸡",
  2: "第 2 名",
  3: "第 3 名",
  4: "第 4 名",
  5: "第 5 名",
  6: "第 6 名",
  7: "第 7 名",
  8: "第 8 名",
};

export const mistakeLabel = (t?: MistakeType | string | null): string =>
  t ? (MISTAKE_LABELS[t as MistakeType] ?? t) : "未分类";

export const decisionLabel = (t: DecisionType): string => DECISION_LABELS[t] ?? t;
export const hindsightLabel = (t?: DecisionHindsight): string =>
  t ? HINDSIGHT_LABELS[t] : "未评价";
export const goalStatusLabel = (t: GoalStatus): string => GOAL_STATUS_LABELS[t] ?? t;

export const MISTAKE_TYPE_LIST: MistakeType[] = [...MISTAKE_TYPES];
export const DECISION_TYPE_LIST: DecisionType[] = [...DECISION_TYPES];
export const HINDSIGHT_LIST: DecisionHindsight[] = [...DECISION_HINDSIGHTS];
