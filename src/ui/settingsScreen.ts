import type { AppState } from "../types.js";
import type { NotificationPermissionLike } from "../lib/notifications.js";

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

const NOTIFY_STATUS_TEXT: Record<NotificationPermissionLike, string> = {
  default: "未設定",
  granted: "有効",
  denied: "拒否（ブラウザ設定から変更できます）",
  unsupported: "この環境では対応していません",
};

export function renderSettings(
  state: AppState,
  permission: NotificationPermissionLike,
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
  status.textContent = `通知: ${NOTIFY_STATUS_TEXT[permission]}`;
  notify.appendChild(status);
  // 未設定のときだけ権限要求ボタンを表示（拒否済み・非対応環境では再要求できないため）
  if (permission === "default") {
    const req = document.createElement("button");
    req.type = "button";
    req.textContent = "通知を有効化";
    req.addEventListener("click", () => handlers.onRequestNotify());
    notify.appendChild(req);
  }
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
