import { describe, it, expect } from "vitest";
import { shouldNotifyNow, msUntilNextNotify, notifyIfPending } from "./notifications.js";

describe("shouldNotifyNow", () => {
  it("現在時刻が通知時刻以降なら true", () => {
    expect(shouldNotifyNow(new Date(2026, 5, 19, 21, 0), 21)).toBe(true);
    expect(shouldNotifyNow(new Date(2026, 5, 19, 22, 30), 21)).toBe(true);
  });
  it("通知時刻前なら false", () => {
    expect(shouldNotifyNow(new Date(2026, 5, 19, 20, 59), 21)).toBe(false);
  });
});

describe("msUntilNextNotify", () => {
  it("当日の通知時刻までのミリ秒を返す（時刻前）", () => {
    const now = new Date(2026, 5, 19, 20, 0, 0);
    const target = new Date(2026, 5, 19, 21, 0, 0);
    expect(msUntilNextNotify(now, 21)).toBe(target.getTime() - now.getTime());
  });
  it("時刻を過ぎていれば 0 以下", () => {
    const now = new Date(2026, 5, 19, 22, 0, 0);
    expect(msUntilNextNotify(now, 21)).toBeLessThanOrEqual(0);
  });
});

describe("notifyIfPending", () => {
  it("時刻前なら通知しない", () => {
    let called = false;
    notifyIfPending(
      {
        requestPermission: async () => "granted",
        showNotification: () => (called = true),
        hasPendingHabits: () => true,
      },
      new Date(2026, 5, 19, 20, 0),
      21
    );
    expect(called).toBe(false);
  });
  it("時刻以降かつ未完了なら通知する", () => {
    let called = false;
    notifyIfPending(
      {
        requestPermission: async () => "granted",
        showNotification: () => (called = true),
        hasPendingHabits: () => true,
      },
      new Date(2026, 5, 19, 22, 0),
      21
    );
    expect(called).toBe(true);
  });
});
