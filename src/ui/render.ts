import type { AppState, Habit } from "../types.js";
import { lastNDays, todayISO } from "../lib/dates.js";
import { isDone, getStreak } from "../lib/habits.js";
import { monthCells } from "../lib/calendar.js";

export interface Handlers {
  onToggle: (habitId: string) => void;
  onAdd: (title: string) => void;
  onDelete: (habitId: string) => void;
}

export function renderToday(state: AppState, handlers: Handlers): HTMLElement {
  const today = todayISO();
  const week = lastNDays(new Date(), 7);

  const root = document.createElement("section");
  root.className = "screen screen-today";

  const header = document.createElement("h1");
  header.textContent = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  root.appendChild(header);

  const list = document.createElement("ul");
  list.className = "habit-list";
  for (const habit of state.habits) {
    list.appendChild(renderHabitCard(habit, state, today, week, handlers));
  }
  root.appendChild(list);

  const form = document.createElement("form");
  form.className = "add-form";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "新しい習慣（例: 腹筋10回）";
  input.maxLength = 40;
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "追加";
  form.append(input, button);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim().length === 0) return;
    handlers.onAdd(input.value);
    input.value = "";
  });
  root.appendChild(form);

  return root;
}

function renderHabitCard(
  habit: Habit,
  state: AppState,
  today: string,
  week: string[],
  handlers: Handlers
): HTMLElement {
  const card = document.createElement("li");
  card.className = "habit-card";

  const titleRow = document.createElement("div");
  titleRow.className = "habit-title-row";
  const title = document.createElement("span");
  title.textContent = habit.title;
  const streak = document.createElement("span");
  streak.className = "streak";
  streak.textContent = `🔥${getStreak(state.records, habit.id, today)}日`;
  const del = document.createElement("button");
  del.type = "button";
  del.className = "icon-btn";
  del.textContent = "✕";
  del.addEventListener("click", () => handlers.onDelete(habit.id));
  titleRow.append(title, streak, del);

  const done = isDone(state.records, habit.id, today);
  const checkBtn = document.createElement("button");
  checkBtn.type = "button";
  checkBtn.className = `check-btn${done ? " is-done" : ""}`;
  checkBtn.textContent = done ? "✓" : "";
  checkBtn.setAttribute("aria-label", done ? "達成を取り消す" : "達成する");
  checkBtn.addEventListener("click", () => handlers.onToggle(habit.id));

  const dots = document.createElement("div");
  dots.className = "week-dots";
  for (const iso of week) {
    const dot = document.createElement("span");
    dot.className = `dot${isDone(state.records, habit.id, iso) ? " is-done" : ""}`;
    dots.appendChild(dot);
  }

  card.append(titleRow, checkBtn, dots);
  return card;
}

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

export interface InstallUiState {
  isIOS: boolean;
  installAvailable: boolean; // beforeinstallprompt 発火済みでプロンプト表示可能
  installed: boolean; // appinstalled 発火済み（既にインストール）
}

export interface SettingsHandlers {
  onChangeHour: (hour: number) => void;
  onChangeTheme: (theme: "dark" | "light" | "system") => void;
  onRequestNotify: () => void;
  onInstall: () => void;
}

export function renderSettings(
  state: AppState,
  permission: NotificationPermission | "unsupported",
  install: InstallUiState,
  handlers: SettingsHandlers
): HTMLElement {
  const root = document.createElement("section");
  root.className = "screen screen-settings";

  const hour = document.createElement("label");
  hour.textContent = "通知時刻 ";
  const hourInput = document.createElement("input");
  hourInput.type = "number";
  hourInput.min = "0";
  hourInput.max = "23";
  hourInput.value = String(state.settings.notifyHour);
  hourInput.addEventListener("change", () => {
    const v = Number(hourInput.value);
    if (Number.isInteger(v) && v >= 0 && v <= 23) handlers.onChangeHour(v);
  });
  hour.append(hourInput);
  root.appendChild(hour);

  const theme = document.createElement("label");
  theme.textContent = "テーマ ";
  const themeSelect = document.createElement("select");
  for (const t of ["dark", "light", "system"] as const) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t === "dark" ? "ダーク" : t === "light" ? "ライト" : "システム";
    if (t === state.settings.theme) opt.selected = true;
    themeSelect.appendChild(opt);
  }
  themeSelect.addEventListener("change", () =>
    handlers.onChangeTheme(themeSelect.value as "dark" | "light" | "system")
  );
  theme.append(themeSelect);
  root.appendChild(theme);

  const notify = document.createElement("div");
  notify.className = "row";
  const status = document.createElement("span");
  status.textContent = `通知: ${permission}`;
  const req = document.createElement("button");
  req.type = "button";
  req.textContent = "通知を有効化";
  req.addEventListener("click", () => handlers.onRequestNotify());
  notify.append(status, req);
  root.appendChild(notify);

  // --- アプリインストール ---
  // 既にインストール済みなら何も表示しない。
  // iOS は beforeinstallprompt 非対応のため案内のみ。
  // それ以外は beforeinstallprompt 発火時のみボタンを表示。
  if (!install.installed) {
    if (install.isIOS) {
      const hint = document.createElement("div");
      hint.className = "install-hint";
      hint.textContent =
        "iOSはアプリのインストールに対応していません。Safariの共有ボタン →「ホーム画面に追加」から追加できます。";
      root.appendChild(hint);
    } else if (install.installAvailable) {
      const installBtn = document.createElement("button");
      installBtn.type = "button";
      installBtn.className = "install-btn";
      installBtn.textContent = "アプリをインストール";
      installBtn.addEventListener("click", () => handlers.onInstall());
      root.appendChild(installBtn);
    }
  }

  return root;
}
