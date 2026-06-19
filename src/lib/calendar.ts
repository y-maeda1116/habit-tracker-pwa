import type { Records } from "../types.js";
import { buildMonthGrid } from "./dates.js";
import { isDone } from "./habits.js";

export interface CalendarCell {
  iso: string;
  inMonth: boolean;
  done: boolean;
}

export function monthCells(
  year: number,
  month: number,
  records: Records,
  habitId: string
): CalendarCell[] {
  return buildMonthGrid(year, month).map((c) => ({
    iso: c.iso,
    inMonth: c.inMonth,
    done: isDone(records, habitId, c.iso),
  }));
}
