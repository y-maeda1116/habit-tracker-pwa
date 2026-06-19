export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function lastNDays(now: Date, n: number): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(toISODate(d));
  }
  return result;
}

export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

export interface DayCell {
  iso: string;
  inMonth: boolean;
}

export function buildMonthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month - 1, 1); // month は「月番号そのもの」（6 = 6月）
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ iso: toISODate(d), inMonth: d.getMonth() === first.getMonth() });
  }
  return cells;
}
