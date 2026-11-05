import type { AppState, Habit } from "../types.js";
import { lastNDays, todayISO } from "../lib/dates.js";
import { isDone, getStreak } from "../lib/habits.js";

export interface TodayHandlers {
  onToggle: (habitId: string) => void;
  onAdd: (title: string) => void;
  onDelete: (habitId: string) => void;
}

export function renderToday(state: AppState, handlers: TodayHandlers): HTMLElement {
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
  handlers: TodayHandlers
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
