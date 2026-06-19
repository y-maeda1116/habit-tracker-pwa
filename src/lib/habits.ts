import type { Habit, Records } from "../types.js";
import { addDays } from "./dates.js";

export type GenId = () => string;

export function addHabit(habits: Habit[], rawTitle: string, genId: GenId): Habit[] {
  const title = rawTitle.trim();
  if (title.length === 0) return habits;
  const habit: Habit = { id: genId(), title, createdAt: new Date().toISOString() };
  return [...habits, habit];
}

export function deleteHabit(
  habits: Habit[],
  records: Records,
  id: string
): { habits: Habit[]; records: Records } {
  const nextHabits = habits.filter((h) => h.id !== id);
  const nextRecords: Records = {};
  for (const [hid, days] of Object.entries(records)) {
    if (hid !== id) nextRecords[hid] = days;
  }
  return { habits: nextHabits, records: nextRecords };
}

export function isDone(records: Records, id: string, iso: string): boolean {
  return records[id]?.[iso] === true;
}

export function toggleRecord(records: Records, id: string, iso: string): Records {
  const current = records[id]?.[iso] === true;
  return { ...records, [id]: { ...records[id], [iso]: !current } };
}

export function getStreak(records: Records, id: string, todayIso: string): number {
  let streak = 0;
  let cursor = todayIso;
  while (records[id]?.[cursor] === true) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
