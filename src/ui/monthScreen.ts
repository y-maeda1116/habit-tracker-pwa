import type { AppState } from "../types.js";
import { monthCells } from "../lib/calendar.js";

export interface MonthCtx {
  year: number;
  month: number;
  selectedId: string | null;
}

export interface MonthHandlers {
  onSelectHabit: (habitId: string) => void;
  onChangeMonth: (delta: number) => void;
}

export function renderMonth(state: AppState, ctx: MonthCtx, handlers: MonthHandlers): HTMLElement {
  const root = document.createElement("section");
  root.className = "screen screen-month";

  const selectRow = document.createElement("div");
  selectRow.className = "row";
  const select = document.createElement("select");
  for (const h of state.habits) {
    const opt = document.createElement("option");
    opt.value = h.id;
    opt.textContent = h.title;
    if (h.id === ctx.selectedId) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => handlers.onSelectHabit(select.value));
  selectRow.appendChild(select);
  root.appendChild(selectRow);

  const nav = document.createElement("div");
  nav.className = "row";
  const prev = document.createElement("button");
  prev.type = "button";
  prev.textContent = "◀";
  const label = document.createElement("span");
  label.textContent = `${ctx.year}年 ${ctx.month}月`;
  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "▶";
  prev.addEventListener("click", () => handlers.onChangeMonth(-1));
  next.addEventListener("click", () => handlers.onChangeMonth(1));
  nav.append(prev, label, next);
  root.appendChild(nav);

  const grid = document.createElement("div");
  grid.className = "cal-grid";
  for (const w of ["日", "月", "火", "水", "木", "金", "土"]) {
    const e = document.createElement("span");
    e.className = "cal-dow";
    e.textContent = w;
    grid.appendChild(e);
  }
  const habitId = ctx.selectedId ?? state.habits[0]?.id ?? "";
  const cells = monthCells(ctx.year, ctx.month, state.records, habitId);
  for (const c of cells) {
    const cell = document.createElement("span");
    cell.className = `cal-cell${c.inMonth ? "" : " is-out"}${c.done ? " is-done" : ""}`;
    cell.textContent = String(Number(c.iso.slice(8, 10)));
    grid.appendChild(cell);
  }
  root.appendChild(grid);

  return root;
}
