import { describe, it, expect } from "vitest";
import { addHabit, deleteHabit, toggleRecord, isDone, getStreak } from "./habits.js";

describe("addHabit", () => {
  it("新しい習慣を末尾に追加する", () => {
    const habits = addHabit([], "腹筋10回", () => "id1");
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe("腹筋10回");
  });

  it("空文字のタイトルは追加しない", () => {
    expect(addHabit([], "  ", () => "id1")).toHaveLength(0);
  });
});

describe("deleteHabit", () => {
  it("習慣と対応する記録を削除する", () => {
    const habits = [{ id: "1", title: "a", createdAt: "x" }];
    const records = { "1": { "2026-06-19": true } };
    const result = deleteHabit(habits, records, "1");
    expect(result.habits).toEqual([]);
    expect(result.records).toEqual({});
  });
});

describe("toggleRecord", () => {
  it("未達成→達成、達成→未達成を切替える", () => {
    expect(toggleRecord({}, "1", "2026-06-19")).toEqual({ "1": { "2026-06-19": true } });
    expect(toggleRecord({ "1": { "2026-06-19": true } }, "1", "2026-06-19")).toEqual({
      "1": { "2026-06-19": false },
    });
  });
});

describe("isDone / getStreak", () => {
  const records = { "1": { "2026-06-18": true, "2026-06-19": true } };
  it("isDone: 指定日が true か", () => {
    expect(isDone(records, "1", "2026-06-19")).toBe(true);
    expect(isDone(records, "1", "2026-06-17")).toBe(false);
  });
  it("getStreak: 今日から連続した達成日数", () => {
    expect(getStreak(records, "1", "2026-06-19")).toBe(2);
  });
});
