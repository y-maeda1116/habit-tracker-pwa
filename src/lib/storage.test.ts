import { describe, it, expect, beforeEach } from "vitest";
import { loadJSON, saveJSON, STORAGE_KEYS } from "./storage.js";

describe("storage", () => {
  let mem: Record<string, string> = {};
  const fakeStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => {
      mem[k] = v;
    },
    removeItem: (k: string) => {
      delete mem[k];
    },
  } as Storage;

  beforeEach(() => {
    mem = {};
  });

  it("saveJSON して loadJSON で復元できる", () => {
    saveJSON(fakeStorage, STORAGE_KEYS.habits, [{ id: "1", title: "腹筋", createdAt: "x" }]);
    expect(loadJSON(fakeStorage, STORAGE_KEYS.habits, [])).toEqual([
      { id: "1", title: "腹筋", createdAt: "x" },
    ]);
  });

  it("未設定キーは defaultValue を返す", () => {
    expect(loadJSON(fakeStorage, STORAGE_KEYS.habits, [])).toEqual([]);
  });

  it("壊れた JSON は defaultValue を返す", () => {
    mem[STORAGE_KEYS.habits] = "{not json";
    expect(loadJSON(fakeStorage, STORAGE_KEYS.habits, [])).toEqual([]);
  });
});
