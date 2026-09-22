import { beforeEach, describe, expect, it } from "vitest";
import {
  addGoal,
  allGoals,
  currentGoals,
  removeGoal,
  setGoalStatus,
  updateGoal,
} from "./training-service";

import { isGoalCurrent, validateTrainingGoalInput, type TrainingGoalInput } from "../domain/training/training-goal";
import { ValidationError } from "../lib/errors";
import { wallClockNow } from "../lib/wallclock";
import { resetDatabase } from "../test/db-helper";

beforeEach(resetDatabase);

const input = (over: Partial<TrainingGoalInput> = {}): TrainingGoalInput => ({
  title: "控制 D 牌预算",
  description: "4-1 后不要无计划地把金币全部 D 掉",
  startDate: "2026-02-02",
  endDate: "2026-02-15",
  relatedMistakes: ["ROLLING", "ECONOMY"],
  status: "active",
  ...over,
});

describe("training goal validation", () => {
  it("passes a normal goal", () => {
    expect(validateTrainingGoalInput(input())).toEqual([]);
  });

  it("requires a title and start date", () => {
    expect(validateTrainingGoalInput(input({ title: "  " }))).toContain("请填写目标名称");
    expect(validateTrainingGoalInput(input({ startDate: "" }))).toContain("请选择开始日期");
  });

  it("rejects end before start", () => {
    expect(validateTrainingGoalInput(input({ endDate: "2026-01-01" }))).toContain(
      "结束日期不能早于开始日期",
    );
  });
});

describe("training goal service", () => {
  it("creates and lists goals, newest first", async () => {
    await addGoal(input({ title: "旧目标", startDate: "2026-01-01" }));
    await addGoal(input({ title: "新目标", startDate: "2026-02-01" }));
    const goals = await allGoals();
    expect(goals.map((g) => g.title)).toEqual(["新目标", "旧目标"]);
  });

  it("reports validation errors to the caller", async () => {
    await expect(addGoal(input({ title: "" }))).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates a goal", async () => {
    const created = await addGoal(input());
    const updated = await updateGoal(created.id, input({ title: "控制经济", endDate: "2026-03-01" }));
    expect(updated.title).toBe("控制经济");
    expect((await allGoals())[0].endDate).toBe("2026-03-01");
  });

  it("moves status between active / completed / archived", async () => {
    const created = await addGoal(input());
    await setGoalStatus(created.id, "completed");
    expect((await allGoals())[0].status).toBe("completed");
    await setGoalStatus(created.id, "active");
    expect((await allGoals())[0].status).toBe("active");
  });

  it("deletes a goal", async () => {
    const created = await addGoal(input());
    await removeGoal(created.id);
    expect(await allGoals()).toHaveLength(0);
  });

  it("currentGoals only returns active goals that are not expired", async () => {
    const today = wallClockNow().slice(0, 10);
    const plusDays = (n: number) => {
      const d = new Date(`${today}T12:00`);
      d.setDate(d.getDate() + n);
      const p = (x: number) => x.toString().padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };
    await addGoal(input({ title: "active 未到期", startDate: today, endDate: plusDays(3) }));
    await addGoal(input({ title: "active 已过期", startDate: plusDays(-9), endDate: plusDays(-1) }));
    await addGoal(input({ title: "无截止", startDate: today, endDate: undefined }));
    await addGoal(input({ title: "completed", status: "completed", startDate: today, endDate: undefined }));

    const active = await currentGoals();
    expect(active.map((g) => g.title).sort()).toEqual(["active 未到期", "无截止"]);
    expect(active.every((g) => isGoalCurrent(g))).toBe(true);
  });
});
