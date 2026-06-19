# habit-tracker-pwa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 複数習慣の毎日のチェック、月間カレンダー、ダークモード、起動時/フォアグラウンド通知を行うブラウザ PWA。Vite + TypeScript 7 + vite-plugin-pwa で実装し GitHub Pages にデプロイする。

**Architecture:** Vite でバンドルする SPA（タブ切替、ルータなし）。純粋ロジック（日付・ストレージ・習慣・カレンダー・通知判定）は `src/lib/` に分離して Vitest で TDD。UI は `src/ui/` が DOM を構築し `src/main.ts` が統合。データは LocalStorage に 3 キーで保持。

**Tech Stack:** Vite, TypeScript 7 beta (`@typescript/native-preview` / tsgo 型チェック), vite-plugin-pwa (Workbox), Vitest, LocalStorage, GitHub Pages (Actions).

**Spec:** `docs/superpowers/specs/2026-06-19-habit-tracker-pwa-design.md`

---

## File Structure

```
habit-tracker-pwa/
├── index.html                 # Vite エントリ（ルート）
├── vite.config.ts             # Vite + vite-plugin-pwa 設定（新規）
├── package.json               # スクリプト・依存を更新
├── tsconfig.json              # ブラウザ向けに更新
├── vitest.config.ts           # 削除（vite.config.ts の test に統合）
├── eslint.config.js           # そのまま（warn 中心で通過）
├── src/
│   ├── main.ts                # 初期化・タブ切替・DI 統合（新規）
│   ├── types.ts               # Habit / Settings / 状態の型（新規）
│   ├── styles.css             # ダークモード中心のスタイル（新規）
│   ├── lib/
│   │   ├── dates.ts           # 日付純粋関数（新規）
│   │   ├── dates.test.ts
│   │   ├── storage.ts         # LocalStorage 抽象（新規）
│   │   ├── storage.test.ts
│   │   ├── habits.ts          # 習慣 CRUD・トグル・streak（新規）
│   │   ├── habits.test.ts
│   │   ├── calendar.ts        # 月間マトリクス生成（新規）
│   │   ├── calendar.test.ts
│   │   ├── notifications.ts   # 通知許可・時刻判定・発火（新規）
│   │   └── notifications.test.ts
│   └── ui/
│       ├── render.ts          # DOM 構築（新規）
│       └── theme.ts           # テーマ切替（新規）
├── public/icons/              # PWA アイコン（新規）
└── .github/workflows/
    ├── ci.yml                 # Vite 向けに更新
    └── deploy-pages.yml       # GitHub Pages デプロイ（新規）
```

**削除:** `src/config/`, `src/index.ts`, `src/index.test.ts`, `tsup.config.ts`, `.env.example`, `dotenv`/`tsup`/`tsx` 依存。

---

## Task 1: Vite 移行のセットアップ

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `vite.config.ts`（新規）
- Modify: `index.html`（新規）
- Delete: `src/config/index.ts`, `src/index.ts`, `src/index.test.ts`, `tsup.config.ts`, `.env.example`, `vitest.config.ts`

- [ ] **Step 1: package.json を更新**

`package.json` を以下に差し替え（`scripts`・`devDependencies` を変更、`dependencies` の dotenv/zod は未使用なので削除）:

```json
{
  "name": "habit-tracker-pwa",
  "version": "0.1.0",
  "description": "自分専用の習慣化PWA（LocalStorage・GitHub Pages）",
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsgo",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write \"src/**/*.{ts,css}\" index.html",
    "format:check": "prettier --check \"src/**/*.{ts,css}\" index.html",
    "prepare": "husky"
  },
  "lint-staged": {
    "src/**/*.ts": ["eslint --fix", "prettier --write"]
  },
  "devDependencies": {
    "@eslint/js": "^9.20.0",
    "@types/node": "^22.12.7",
    "@typescript/native-preview": "^7.0.0-beta",
    "@vitest/coverage-v8": "^4.1.2",
    "eslint": "^10.1.0",
    "eslint-plugin-security": "^4.0.0",
    "husky": "^9.1.7",
    "lint-staged": "^16.4.0",
    "prettier": "^3.8.1",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.59.1",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json をブラウザ向けに更新**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "useDefineForClassFields": true,
    "noEmit": true
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

（`Bundler` 解決・`lib: DOM` 追加・`module: ESNext`。tsgo もこの設定を読む）

- [ ] **Step 3: vite.config.ts を作成**

```ts
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/habit-tracker-pwa/",
  build: { outDir: "dist" },
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts", "node_modules/"]
    }
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon.ico"],
      manifest: {
        name: "習慣トラッカー",
        short_name: "習慣",
        start_url: "/habit-tracker-pwa/",
        scope: "/habit-tracker-pwa/",
        display: "standalone",
        background_color: "#0f1115",
        theme_color: "#0f1115",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
```

> 注: Vite は vitest を統合するため、`vitest.config.ts` ではなく `vite.config.ts` に `test` を集約する。vitest の型は `vite` の defineConfig を拡張する形で解決される（Step 5 で vitest.config.ts を削除）。

- [ ] **Step 4: index.html を作成（ルート）**

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>習慣トラッカー</title>
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="apple-touch-icon" href="/habit-tracker-pwa/icons/apple-touch-icon.png" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: vitest.config.ts を削除**

```bash
rm vitest.config.ts
```

（Step 3 の `vite.config.ts` の `test` ブロックに集約済み）

- [ ] **Step 6: Node 残骸を削除**

```bash
rm -f src/config/index.ts src/index.ts src/index.test.ts tsup.config.ts .env.example
rmdir src/config 2>/dev/null || true
```

- [ ] **Step 7: 依存を再インストール**

```bash
npm install
```

想定: vite / vite-plugin-pwa / vitest が入り、dotenv / tsup / tsx が消える。

- [ ] **Step 8: 仮の main.ts を置いてビルドが通るか確認**

```bash
echo 'export {};' > src/main.ts
npm run build
```

想定: `dist/` が生成される。

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "chore: migrate toolchain from Node template to Vite PWA"
```

---

## Task 2: types.ts と dates.ts（TDD）

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/dates.ts`
- Create: `src/lib/dates.test.ts`

- [ ] **Step 1: types.ts を作成**

```ts
export interface Habit {
  id: string;
  title: string;
  createdAt: string; // ISO
}

export type Records = Record<string, Record<string, boolean>>;

export interface Settings {
  notifyHour: number; // 0-23
  theme: "dark" | "light" | "system";
}

export interface AppState {
  habits: Habit[];
  records: Records;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { notifyHour: 21, theme: "dark" };
```

- [ ] **Step 2: dates.test.ts に失敗テストを書く**

```ts
import { describe, it, expect } from "vitest";
import { toISODate, todayISO, lastNDays, buildMonthGrid } from "./dates.js";

describe("toISODate", () => {
  it("ローカル日付を YYYY-MM-DD にする", () => {
    const d = new Date(2026, 5, 19); // 2026-06-19 ローカル
    expect(toISODate(d)).toBe("2026-06-19");
  });
});

describe("todayISO", () => {
  it("現在ローカル日付を返す", () => {
    const d = new Date(2026, 5, 19, 10, 0);
    expect(todayISO(d)).toBe("2026-06-19");
  });
});

describe("lastNDays", () => {
  it("今日を含む直近N日を昇順で返す", () => {
    const days = lastNDays(new Date(2026, 5, 19), 7);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-06-13");
    expect(days[6]).toBe("2026-06-19");
  });
});

describe("buildMonthGrid", () => {
  it("直前の日曜始まりで42マス、6/19が inMonth", () => {
    const cells = buildMonthGrid(2026, 6); // 2026年6月
    expect(cells).toHaveLength(42);
    expect(cells.find((c) => c.iso === "2026-06-19")?.inMonth).toBe(true);
  });
});
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
npm test -- src/lib/dates.test.ts
```

想定: FAIL（モジュール未実装）

- [ ] **Step 4: dates.ts を実装**

```ts
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
```

- [ ] **Step 5: テストが通ることを確認**

```bash
npm test -- src/lib/dates.test.ts
```

想定: PASS

- [ ] **Step 6: コミット**

```bash
git add src/types.ts src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat: add date utilities with tests"
```

---

## Task 3: storage.ts（TDD）

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`

- [ ] **Step 1: 失敗テストを書く（localStorage をモック）**

```ts
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
    }
  } as Storage;

  beforeEach(() => {
    mem = {};
  });

  it("saveJSON して loadJSON で復元できる", () => {
    saveJSON(fakeStorage, STORAGE_KEYS.habits, [{ id: "1", title: "腹筋", createdAt: "x" }]);
    expect(loadJSON(fakeStorage, STORAGE_KEYS.habits, [])).toEqual([
      { id: "1", title: "腹筋", createdAt: "x" }
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
```

- [ ] **Step 2: テスト失敗を確認**

```bash
npm test -- src/lib/storage.test.ts
```

想定: FAIL

- [ ] **Step 3: storage.ts を実装**

```ts
export const STORAGE_KEYS = {
  habits: "habit-tracker:habits",
  records: "habit-tracker:records",
  settings: "habit-tracker:settings"
} as const;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadJSON<T>(storage: StorageLike, key: string, defaultValue: T): T {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function saveJSON<T>(storage: StorageLike, key: string, value: T): void {
  storage.setItem(key, JSON.stringify(value));
}

export function browserStorage(): StorageLike {
  return globalThis.localStorage;
}
```

- [ ] **Step 4: テスト通過を確認**

```bash
npm test -- src/lib/storage.test.ts
```

想定: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: add storage abstraction with tests"
```

---

## Task 4: habits.ts（TDD）

**Files:**
- Create: `src/lib/habits.ts`
- Create: `src/lib/habits.test.ts`

- [ ] **Step 1: 失敗テスト**

```ts
import { describe, it, expect } from "vitest";
import { addHabit, deleteHabit, toggleRecord, isDone, getStreak } from "./habits.js";

describe("addHabit", () => {
  it("新しい習慣を末尾に追加する", () => {
    const habits = addHabit([], "腹筋10回", () => "id1");
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe("腹筋10回");
  });

  it("空文字のタイトルは追加しない", () => {
    expect(addHabit([], "  ", () => "id1")).toHaveLength(0);
  });
});

describe("deleteHabit", () => {
  it("習慣と対応する記録を削除する", () => {
    const habits = [{ id: "1", title: "a", createdAt: "x" }];
    const records = { "1": { "2026-06-19": true } };
    const result = deleteHabit(habits, records, "1");
    expect(result.habits).toEqual([]);
    expect(result.records).toEqual({});
  });
});

describe("toggleRecord", () => {
  it("未達成→達成、達成→未達成を切替える", () => {
    expect(toggleRecord({}, "1", "2026-06-19")).toEqual({ "1": { "2026-06-19": true } });
    expect(toggleRecord({ "1": { "2026-06-19": true } }, "1", "2026-06-19")).toEqual({
      "1": { "2026-06-19": false }
    });
  });
});

describe("isDone / getStreak", () => {
  const records = { "1": { "2026-06-18": true, "2026-06-19": true } };
  it("isDone: 指定日が true か", () => {
    expect(isDone(records, "1", "2026-06-19")).toBe(true);
    expect(isDone(records, "1", "2026-06-17")).toBe(false);
  });
  it("getStreak: 今日から連続した達成日数", () => {
    expect(getStreak(records, "1", "2026-06-19")).toBe(2);
  });
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
npm test -- src/lib/habits.test.ts
```

想定: FAIL

- [ ] **Step 3: habits.ts を実装**

```ts
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
```

- [ ] **Step 4: テスト通過を確認**

```bash
npm test -- src/lib/habits.test.ts
```

想定: PASS。`eslint-plugin-security` の `detect-object-injection` が `records[id]` で warn するが exit 0。

- [ ] **Step 5: コミット**

```bash
git add src/lib/habits.ts src/lib/habits.test.ts
git commit -m "feat: add habit domain logic with tests"
```

---

## Task 5: calendar.ts（TDD）

**Files:**
- Create: `src/lib/calendar.ts`
- Create: `src/lib/calendar.test.ts`

- [ ] **Step 1: 失敗テスト**

```ts
import { describe, it, expect } from "vitest";
import { monthCells } from "./calendar.js";

describe("monthCells", () => {
  it("達成状況を付与した月グリッドを返す", () => {
    const cells = monthCells(2026, 6, { "1": { "2026-06-19": true } }, "1");
    const done = cells.filter((c) => c.done);
    expect(done.map((c) => c.iso)).toEqual(["2026-06-19"]);
  });
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
npm test -- src/lib/calendar.test.ts
```

想定: FAIL

- [ ] **Step 3: calendar.ts を実装**

```ts
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
    done: isDone(records, habitId, c.iso)
  }));
}
```

- [ ] **Step 4: テスト通過を確認**

```bash
npm test -- src/lib/calendar.test.ts
```

想定: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/calendar.ts src/lib/calendar.test.ts
git commit -m "feat: add calendar grid logic with tests"
```

---

## Task 6: notifications.ts（TDD、純粋ロジック）

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `src/lib/notifications.test.ts`

純粋ロジック（「今が通知時刻を過ぎているか」「通知時刻までの遅延 ms」）のみユニットテスト。実際の SW 発火は main.ts から呼び、手動確認。

- [ ] **Step 1: 失敗テスト**

```ts
import { describe, it, expect } from "vitest";
import { shouldNotifyNow, msUntilNextNotify, notifyIfPending } from "./notifications.js";

describe("shouldNotifyNow", () => {
  it("現在時刻が通知時刻以降なら true", () => {
    expect(shouldNotifyNow(new Date(2026, 5, 19, 21, 0), 21)).toBe(true);
    expect(shouldNotifyNow(new Date(2026, 5, 19, 22, 30), 21)).toBe(true);
  });
  it("通知時刻前なら false", () => {
    expect(shouldNotifyNow(new Date(2026, 5, 19, 20, 59), 21)).toBe(false);
  });
});

describe("msUntilNextNotify", () => {
  it("当日の通知時刻までのミリ秒を返す（時刻前）", () => {
    const now = new Date(2026, 5, 19, 20, 0, 0);
    const target = new Date(2026, 5, 19, 21, 0, 0);
    expect(msUntilNextNotify(now, 21)).toBe(target.getTime() - now.getTime());
  });
  it("時刻を過ぎていれば 0 以下", () => {
    const now = new Date(2026, 5, 19, 22, 0, 0);
    expect(msUntilNextNotify(now, 21)).toBeLessThanOrEqual(0);
  });
});

describe("notifyIfPending", () => {
  it("時刻前なら通知しない", () => {
    let called = false;
    notifyIfPending(
      { requestPermission: async () => "granted", showNotification: () => (called = true), hasPendingHabits: () => true },
      new Date(2026, 5, 19, 20, 0),
      21
    );
    expect(called).toBe(false);
  });
  it("時刻以降かつ未完了なら通知する", () => {
    let called = false;
    notifyIfPending(
      { requestPermission: async () => "granted", showNotification: () => (called = true), hasPendingHabits: () => true },
      new Date(2026, 5, 19, 22, 0),
      21
    );
    expect(called).toBe(true);
  });
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
npm test -- src/lib/notifications.test.ts
```

想定: FAIL

- [ ] **Step 3: notifications.ts を実装**

```ts
export type NotificationPermissionLike = "default" | "granted" | "denied";

export function shouldNotifyNow(now: Date, notifyHour: number): boolean {
  return now.getHours() >= notifyHour;
}

export function msUntilNextNotify(now: Date, notifyHour: number): number {
  const target = new Date(now);
  target.setHours(notifyHour, 0, 0, 0);
  return target.getTime() - now.getTime();
}

export interface NotifyDeps {
  requestPermission: () => Promise<NotificationPermissionLike>;
  showNotification: (title: string, body: string) => void;
  hasPendingHabits: () => boolean;
}

export function enableNotifications(deps: NotifyDeps): Promise<NotificationPermissionLike> {
  if (!("Notification" in globalThis)) return Promise.resolve("denied" as NotificationPermissionLike);
  return deps.requestPermission();
}

export function notifyIfPending(deps: NotifyDeps, now: Date, notifyHour: number): boolean {
  if (!shouldNotifyNow(now, notifyHour)) return false;
  if (!deps.hasPendingHabits()) return false;
  deps.showNotification("習慣トラッカー", "今日未完了の習慣があります");
  return true;
}
```

- [ ] **Step 4: テスト通過を確認**

```bash
npm test -- src/lib/notifications.test.ts
```

想定: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat: add notification timing logic with tests"
```

---

## Task 7: theme.ts

**Files:**
- Create: `src/ui/theme.ts`

- [ ] **Step 1: theme.ts を実装**

```ts
export type ResolvedTheme = "dark" | "light";

export function resolveTheme(setting: "dark" | "light" | "system"): ResolvedTheme {
  if (setting !== "system") return setting;
  const prefersDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}
```

- [ ] **Step 2: typecheck・lint を確認**

```bash
npm run typecheck && npm run lint
```

想定: PASS

- [ ] **Step 3: コミット**

```bash
git add src/ui/theme.ts
git commit -m "feat: add theme resolver"
```

---

## Task 8: render.ts — メイン画面（今日）

**Files:**
- Create: `src/ui/render.ts`

- [ ] **Step 1: render.ts にメイン画面描画を実装**

```ts
import type { AppState, Habit } from "../types.js";
import { lastNDays, todayISO } from "../lib/dates.js";
import { isDone, getStreak } from "../lib/habits.js";

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
    weekday: "long"
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
```

- [ ] **Step 2: typecheck・lint を確認**

```bash
npm run typecheck && npm run lint
```

想定: PASS

- [ ] **Step 3: コミット**

```bash
git add src/ui/render.ts
git commit -m "feat: render main (today) screen"
```

---

## Task 9: render.ts — 月間・設定画面

**Files:**
- Modify: `src/ui/render.ts`

- [ ] **Step 1: render.ts に月間・設定画面を追記**

ファイル末尾に追加（import も先頭に `monthCells` を追記）:

```ts
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

export interface SettingsHandlers {
  onChangeHour: (hour: number) => void;
  onChangeTheme: (theme: "dark" | "light" | "system") => void;
  onRequestNotify: () => void;
}

export function renderSettings(
  state: AppState,
  permission: NotificationPermission | "unsupported",
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

  return root;
}
```

- [ ] **Step 2: typecheck・lint を確認**

```bash
npm run typecheck && npm run lint
```

想定: PASS

- [ ] **Step 3: コミット**

```bash
git add src/ui/render.ts
git commit -m "feat: render month and settings screens"
```

---

## Task 10: main.ts 統合・タブ切替・通知

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: main.ts を実装（状態・永続化・描画・通知の統合）**

```ts
import "./styles.css";
import type { AppState } from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";
import { STORAGE_KEYS, loadJSON, saveJSON, browserStorage } from "./lib/storage.js";
import { todayISO } from "./lib/dates.js";
import { addHabit, deleteHabit, toggleRecord } from "./lib/habits.js";
import { applyTheme, resolveTheme } from "./ui/theme.js";
import { renderToday, renderMonth, renderSettings } from "./ui/render.js";
import { notifyIfPending, enableNotifications, msUntilNextNotify } from "./lib/notifications.js";

type Tab = "today" | "month" | "settings";

function loadState(): AppState {
  const storage = browserStorage();
  return {
    habits: loadJSON(storage, STORAGE_KEYS.habits, []),
    records: loadJSON(storage, STORAGE_KEYS.records, {}),
    settings: loadJSON(storage, STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  };
}

function persist(state: AppState): void {
  const storage = browserStorage();
  saveJSON(storage, STORAGE_KEYS.habits, state.habits);
  saveJSON(storage, STORAGE_KEYS.records, state.records);
  saveJSON(storage, STORAGE_KEYS.settings, state.settings);
}

export function main(): void {
  let state = loadState();
  let tab: Tab = "today";
  const now0 = new Date();
  let monthCtx = {
    year: now0.getFullYear(),
    month: now0.getMonth() + 1,
    selectedId: state.habits[0]?.id ?? null
  };

  const app = document.getElementById("app");
  if (!app) return;

  function rerender(): void {
    applyTheme(resolveTheme(state.settings.theme));
    app.replaceChildren();

    const nav = document.createElement("nav");
    nav.className = "tabs";
    const tabs: Tab[] = ["today", "month", "settings"];
    for (const t of tabs) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `tab${t === tab ? " is-active" : ""}`;
      b.textContent = t === "today" ? "今日" : t === "month" ? "月間" : "設定";
      b.addEventListener("click", () => {
        tab = t;
        rerender();
      });
      nav.appendChild(b);
    }
    app.appendChild(nav);

    if (tab === "today") {
      app.appendChild(
        renderToday(state, {
          onToggle: (id) => {
            state = { ...state, records: toggleRecord(state.records, id, todayISO()) };
            persist(state);
            rerender();
          },
          onAdd: (title) => {
            state = {
              ...state,
              habits: addHabit(state.habits, title, () => crypto.randomUUID())
            };
            persist(state);
            rerender();
          },
          onDelete: (id) => {
            const r = deleteHabit(state.habits, state.records, id);
            state = { ...state, ...r };
            persist(state);
            rerender();
          }
        })
      );
    } else if (tab === "month") {
      app.appendChild(
        renderMonth(state, monthCtx, {
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
          }
        })
      );
    } else {
      app.appendChild(
        renderSettings(state, Notification?.permission ?? "unsupported", {
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
              showNotification: () => undefined,
              hasPendingHabits: () => false
            }).then(() => rerender());
          }
        })
      );
    }
  }

  rerender();
  void setupNotifications(state.settings.notifyHour);
}

function hasPendingHabitsToday(): boolean {
  const records = loadJSON(browserStorage(), STORAGE_KEYS.records, {});
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
      showNotification: (title: string, body: string) => {
        reg.showNotification(title, { body });
      },
      hasPendingHabits: () => hasPendingHabitsToday()
    };
    const now = new Date();
    notifyIfPending(deps, now, notifyHour);

    const delay = msUntilNextNotify(now, notifyHour);
    if (delay > 0) {
      globalThis.setTimeout(() => notifyIfPending(deps, new Date(), notifyHour), delay);
    }
  });
}

main();
```

- [ ] **Step 2: 型チェック・lint・ビルド**

```bash
npm run typecheck && npm run lint && npm run build
```

想定: PASS、`dist/` 生成。

- [ ] **Step 3: コミット**

```bash
git add src/main.ts
git commit -m "feat: wire up state, persistence, tabs, and notifications"
```

---

## Task 11: スタイル（ダークモード）

**Files:**
- Create: `src/styles.css`

- [ ] **Step 1: styles.css を作成**

```css
:root {
  --bg: #0f1115;
  --surface: #1a1d24;
  --text: #e7e9ee;
  --muted: #9aa0aa;
  --accent: #6ea8fe;
  --done: #5fd07a;
  --danger: #ff6b6b;
}
[data-theme="light"] {
  --bg: #f6f7f9;
  --surface: #ffffff;
  --text: #1a1d24;
  --muted: #5a606a;
  --accent: #2b6cb0;
  --done: #2f855a;
  --danger: #c53030;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
}
#app { max-width: 480px; margin: 0 auto; padding: 16px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { flex: 1; padding: 8px; border: none; background: var(--surface); color: var(--text); border-radius: 8px; }
.tab.is-active { background: var(--accent); color: #fff; }
.habit-list { list-style: none; padding: 0; margin: 0 0 16px; display: grid; gap: 12px; }
.habit-card { background: var(--surface); border-radius: 12px; padding: 12px; }
.habit-title-row { display: flex; align-items: center; gap: 8px; }
.habit-title-row > span:first-child { flex: 1; font-size: 16px; }
.streak { color: var(--muted); font-size: 13px; }
.icon-btn { background: none; border: none; color: var(--danger); cursor: pointer; font-size: 16px; }
.check-btn {
  width: 100%; height: 64px; margin-top: 10px; border: 2px dashed var(--muted);
  background: transparent; color: var(--text); border-radius: 12px; font-size: 28px; cursor: pointer;
  transition: transform 0.15s, background 0.2s, border-color 0.2s;
}
.check-btn.is-done { background: var(--done); border-style: solid; color: #062; animation: pop 0.25s; }
@keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
.week-dots { display: flex; gap: 4px; margin-top: 10px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--muted); opacity: 0.4; }
.dot.is-done { background: var(--done); opacity: 1; }
.add-form { display: flex; gap: 8px; }
.add-form input { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--muted); background: var(--surface); color: var(--text); }
.add-form button { padding: 10px 16px; border: none; background: var(--accent); color: #fff; border-radius: 8px; }
.row { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
.cal-dow { color: var(--muted); font-size: 12px; }
.cal-cell { padding: 8px 0; border-radius: 6px; background: var(--surface); }
.cal-cell.is-out { opacity: 0.3; }
.cal-cell.is-done { background: var(--done); color: #062; }
```

- [ ] **Step 2: typecheck・lint・build**

```bash
npm run typecheck && npm run lint && npm run build
```

想定: PASS

- [ ] **Step 3: コミット**

```bash
git add src/styles.css
git commit -m "feat: add dark-mode styles"
```

---

## Task 12: PWA アイオン

**Files:**
- Create: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable.png`, `apple-touch-icon.png`, `favicon.ico`

- [ ] **Step 1: アイコン用ディレクトリを確保**

当面はビルドに必須でないため、プレースホルダで確保:

```bash
mkdir -p public/icons
touch public/icons/.gitkeep
```

> 実画像（192/512/maskable PNG, 180 apple-touch-icon, favicon.ico）はデプロイ確認前に別途配置。生成方法: SVG を書いてブラウザ変換、または `sharp`/オンラインジェネレータ使用。

- [ ] **Step 2: ビルド確認**

```bash
npm run build
```

想定: アイコン未配置でも `dist/` 生成・manifest は生成される。

- [ ] **Step 3: コミット**

```bash
git add public/icons
git commit -m "chore: add pwa icon placeholder directory"
```

---

## Task 13: CI 更新と Pages デプロイ

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: ci.yml を Vite 向けに更新（Windows は不要なので macos/ubuntu に集約）**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-and-test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
        node-version: [20]
    runs-on: ${{ matrix.os }}
    steps:
      - name: Checkout
        uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd # v5
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
        with:
          node-version: ${{ matrix.node-version }}
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Lint
        run: npm run lint
      - name: Format check
        run: npm run format:check
      - name: Test
        run: npm test
      - name: Type check
        run: npm run typecheck
```

- [ ] **Step 2: deploy-pages.yml を作成**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd # v5
      - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: コミット**

```bash
git add .github/workflows/ci.yml .github/workflows/deploy-pages.yml
git commit -m "ci: switch to vite build and add github pages deploy"
```

---

## Task 14: README 更新と最終検証

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README を PWA 向けに全面書き換え**

Node ツール用の記述（Discord/DeepL/Discord token 等）を削除し、概要・開発手順・PWA インストール手順・技術スタックを記載。

- [ ] **Step 2: 全チェック実行**

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build
```

想定: 全て緑。テストカバレッジ確認:

```bash
npm test -- --coverage
```

想定: `src/lib/**/*.ts` が 80% 以上。

- [ ] **Step 3: 手動での起動確認**

```bash
npm run dev
```

ブラウザで http://localhost:5173/habit-tracker-pwa/ を開き、習慣追加・チェックトグル・月間表示・設定変更・ダークモードを確認。

- [ ] **Step 4: コミット**

```bash
git add README.md
git commit -m "docs: rewrite README for habit tracker PWA"
```

---

## Self-Review メモ（実装時に再確認）

- **Spec カバレッジ**: チェック機能(Task 4/8/10)、PWA(Task 1/11/12)、通知(Task 6/10)、UI/ダークモード(Task 7/8/9/11)、CI/デプロイ(Task 1/13) すべて対応。
- **型一貫性**: `Habit.id`, `Records`, `Settings.notifyHour/theme`, `Handlers.onToggle/onAdd/onDelete` は全タスクで同一。`MonthCtx` を Task 9/10 で共有。
- **安全**: DOM 再描画は `replaceChildren()` のみ（innerHTML 不使用）。`eslint-plugin-security` の warn は exit 0 で CI 通過。
- **注意**: `moduleResolution: Bundler` で import 拡張子 `.js` は Vite/tsgo 両方で解決可能（実装時に要確認）。
