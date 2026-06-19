import { describe, it, expect } from "vitest";
import { monthCells } from "./calendar.js";

describe("monthCells", () => {
  it("達成状況を付与した月グリッドを返す", () => {
    const cells = monthCells(2026, 6, { "1": { "2026-06-19": true } }, "1");
    const done = cells.filter((c) => c.done);
    expect(done.map((c) => c.iso)).toEqual(["2026-06-19"]);
  });
});
