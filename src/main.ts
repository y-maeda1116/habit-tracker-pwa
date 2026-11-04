import "./styles.css";
import type { AppState, Records } from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";
import { STORAGE_KEYS, loadJSON, saveJSON, browserStorage } from "./lib/storage.js";
import { todayISO } from "./lib/dates.js";
import { addHabit, deleteHabit, toggleRecord } from "./lib/habits.js";
import { applyTheme, resolveTheme } from "./ui/theme.js";
import { renderToday, type TodayHandlers } from "./ui/todayScreen.js";
import { renderMonth, type MonthCtx, type MonthHandlers } from "./ui/monthScreen.js";
import { renderSettings, type InstallUiState, type SettingsHandlers } from "./ui/settingsScreen.js";
import {
  notifyIfPending,
  enableNotifications,
  msUntilNextNotify,
  currentPermission,
} from "./lib/notifications.js";
import { isIOS, type BeforeInstallPromptEvent } from "./lib/pwa-install.js";

type Tab = "today" | "month" | "settings";

// --- モジュールレベルのアプリ状態 ---
// イベントハンドラを再描画のたびに再生成しないため、状態はモジュールスコープに置く
let state: AppState;
let tab: Tab = "today";
let monthCtx: MonthCtx;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installAvailable = false;
let installed = false;
const ios = typeof navigator !== "undefined" && isIOS(navigator.userAgent);

function loadState(): AppState {
  const storage = browserStorage();
  return {
    habits: loadJSON(storage, STORAGE_KEYS.habits, []),
    records: loadJSON(storage, STORAGE_KEYS.records, {}),
    settings: loadJSON(storage, STORAGE_KEYS.settings, DEFAULT_SETTINGS),
  };
}

function persist(state: AppState): void {
  const storage = browserStorage();
  saveJSON(storage, STORAGE_KEYS.habits, state.habits);
  saveJSON(storage, STORAGE_KEYS.records, state.records);
  saveJSON(storage, STORAGE_KEYS.settings, state.settings);
}

const todayHandlers: TodayHandlers = {
  onToggle: (id) => {
    state = { ...state, records: toggleRecord(state.records, id, todayISO()) };
    persist(state);
    rerender();
  },
  onAdd: (title) => {
    state = {
      ...state,
      habits: addHabit(state.habits, title, () => crypto.randomUUID()),
    };
    persist(state);
    rerender();
  },
  onDelete: (id) => {
    const r = deleteHabit(state.habits, state.records, id);
    state = { ...state, ...r };
    persist(state);
    rerender();
  },
};

const monthHandlers: MonthHandlers = {
  onSelectHabit: (id) => {
    monthCtx = { ...monthCtx, selectedId: id };
    rerender();
  },
  onChangeMonth: (delta) => {
    let m = monthCtx.month + delta;
    let y = monthCtx.year;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    monthCtx = { ...monthCtx, year: y, month: m };
    rerender();
  },
};

const settingsHandlers: SettingsHandlers = {
  onChangeHour: (hour) => {
    state = { ...state, settings: { ...state.settings, notifyHour: hour } };
    persist(state);
  },
  onChangeTheme: (theme) => {
    state = { ...state, settings: { ...state.settings, theme } };
    persist(state);
    rerender();
  },
  onRequestNotify: () => {
    void enableNotifications({
      requestPermission: () => Notification.requestPermission(),
      permission: () => currentPermission(),
      showNotification: () => undefined,
      hasPendingHabits: () => false,
    }).then(() => rerender());
  },
  onInstall: () => {
    const promptEvent = deferredPrompt;
    if (!promptEvent) return;
    void promptEvent.prompt().then(async () => {
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        installed = true;
        installAvailable = false;
      }
      deferredPrompt = null;
      rerender();
    });
  },
};

function switchTab(t: Tab): void {
  tab = t;
  rerender();
}

function rerender(): void {
  applyTheme(resolveTheme(state.settings.theme));
  const app = document.getElementById("app")!;
  app.replaceChildren();

  const nav = document.createElement("nav");
  nav.className = "tabs";
  const tabs: Tab[] = ["today", "month", "settings"];
  for (const t of tabs) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `tab${t === tab ? " is-active" : ""}`;
    b.textContent = t === "today" ? "今日" : t === "month" ? "月間" : "設定";
    b.addEventListener("click", () => switchTab(t));
    nav.appendChild(b);
  }
  app.appendChild(nav);

  if (tab === "today") {
    app.appendChild(renderToday(state, todayHandlers));
  } else if (tab === "month") {
    app.appendChild(renderMonth(state, monthCtx, monthHandlers));
  } else {
    const installUi: InstallUiState = { isIOS: ios, installAvailable, installed };
    app.appendChild(renderSettings(state, currentPermission(), installUi, settingsHandlers));
  }
}

function setupInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installAvailable = true;
    installed = false;
    rerender();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    installAvailable = false;
    deferredPrompt = null;
    rerender();
  });
}

function hasPendingHabitsToday(): boolean {
  const records = loadJSON<Records>(browserStorage(), STORAGE_KEYS.records, {});
  const todayKey = todayISO();
  return Object.values(records).some((d) => d[todayKey] !== true);
}

function setupNotifications(notifyHour: number): void {
  const regPromise = navigator.serviceWorker?.getRegistration();
  if (!regPromise) return;
  void regPromise.then((reg) => {
    if (!reg) return;
    const deps = {
      requestPermission: () => Notification.requestPermission(),
      permission: () => currentPermission(),
      showNotification: (title: string, body: string) => {
        reg.showNotification(title, { body });
      },
      hasPendingHabits: () => hasPendingHabitsToday(),
    };
    const now = new Date();
    notifyIfPending(deps, now, notifyHour);

    const delay = msUntilNextNotify(now, notifyHour);
    if (delay > 0) {
      globalThis.setTimeout(() => notifyIfPending(deps, new Date(), notifyHour), delay);
    }
  });
}

export function main(): void {
  state = loadState();
  const now0 = new Date();
  monthCtx = {
    year: now0.getFullYear(),
    month: now0.getMonth() + 1,
    selectedId: state.habits[0]?.id ?? null,
  };

  rerender();
  setupInstallPrompt();
  void setupNotifications(state.settings.notifyHour);
}

main();
