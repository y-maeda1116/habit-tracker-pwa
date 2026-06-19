import { describe, it, expect } from "vitest";
import { toISODate, todayISO, lastNDays, buildMonthGrid } from "./dates.js";

describe("toISODate", () => {
  it("ローカル日付を YYYY-MM-DD にする", () => {
    const d = new Date(2026, 5, 19); // 2026-06-19 ローカル
    expect(toISODate(d)).toBe("2026-06-19");
  });
});

describe("todayISO", () => {
  it("現在ローカル日付を返す", () => {
    const d = new Date(2026, 5, 19, 10, 0);
    expect(todayISO(d)).toBe("2026-06-19");
  });
});

describe("lastNDays", () => {
  it("今日を含む直近N日を昇順で返す", () => {
    const days = lastNDays(new Date(2026, 5, 19), 7);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-06-13");
    expect(days[6]).toBe("2026-06-19");
  });
});

describe("buildMonthGrid", () => {
  it("直前の日曜始まりで42マス、6/19が inMonth", () => {
    const cells = buildMonthGrid(2026, 6); // 2026年6月
    expect(cells).toHaveLength(42);
    expect(cells.find((c) => c.iso === "2026-06-19")?.inMonth).toBe(true);
  });
});
