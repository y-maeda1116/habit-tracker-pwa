# habit-tracker-pwa 設計ドキュメント

**Date:** 2026-06-19
**Author:** Claude
**Issue:** [y-maeda1116/habit-tracker-pwa#1](https://github.com/y-maeda1116/habit-tracker-pwa/issues/1)

## 概要

毎日継続したい習慣（例: 腹筋10回）を記録・管理する、自分専用のシンプルな習慣化 PWA。GitHub Pages にデプロイし、iPhone のホーム画面に追加して使う。データは LocalStorage に保存し、サーバーは持たない。

## 要件（issue #1 より）

- **習慣のチェック（メイン画面）**: 今日の日付と習慣タイトル、大きなチェック操作、直近1週間の達成履歴、LocalStorage 保存。
- **PWA 化**: `manifest`・Service Worker・「ホーム画面に追加」対応。
- **通知**: 通知許可要求。毎日決まった時刻（既定 21 時）に「今日のチェックが未完了」ならローカル通知。**iOS の技術的制約**（後述）により、起動時とフォアグラウンド時に通知する範囲で実装。
- **UI/UX**: モバイルファースト、シンプル・清潔感、ダークモード対応、チェック時の達成感ある演出。

## iOS 通知の技術的制約と方針

iOS（Safari / ホーム画面追加済み PWA）はバックグラウンドの PWA をサスペンドするため、静的サイト（サーバーなし）では「アプリを開いていなくても毎日 21 時に通知」を実現できない。真の定時通知には Web Push 用のサーバー（VAPID + cron）が必要で、これは本 issue の「サーバーレス（LocalStorage）」要件と矛盾する。

よって通知は以下の範囲で実装する（issue の注記「可能な限りバックグラウンド動作を試みる」に沿う）:

1. **起動時通知**: アプリ起動直後、現在時刻が設定時刻以降 かつ 今日未完了の習慣があれば Service Worker 経由で通知。
2. **フォアグラウンド通知**: アプリを開いている最中に設定時刻を迎えたら、未完了習慣があれば通知。
3. 通知は Service Worker（`registration.showNotification`）経由で出す（iOS 16.4+ かつ PWA インストール済みが前提）。

## 技術スタック

| レイヤ | 技術 | 備考 |
|---|---|---|
| ビルド / Dev | **Vite** | `index.html` をルートに配置。`tsup`/`tsx` は除去 |
| 言語 | **TypeScript 7 beta** (`@typescript/native-preview`) | ユーザー指定。**新構文は使わず** esbuild 互換の TS5.x 相当で記述 |
| 型チェック | **tsgo**（独立実行） | Vite(esbuild) は型を見ないため `npm run typecheck` で分離担保 |
| PWA | **vite-plugin-pwa** | Workbox で manifest + Service Worker を自動生成。iOS 用メタタグ・アイコンは手動で補強 |
| データ | LocalStorage | サーバーレス |
| テスト | **Vitest**（Vite 統合） | 純粋ロジック中心、カバレッジ 80% 以上 |
| 配信 | **GitHub Pages**（Actions） | `base: "/habit-tracker-pwa/"` |

### 除去対象（Node ツール構成の残骸）

- `src/config/index.ts`（Discord/DeepL プレースホルダ）
- `src/index.ts`（SIGINT 処理）
- `dotenv` 依存
- `tsup`・`tsx`（Vite に置換）
- `README.md`・`package.json` の Node ツール向け記述（PWA 向けに書き直し）

## データモデル（LocalStorage）

3 キーに分割して保持する。

### `habit-tracker:habits` → `Habit[]`

```ts
interface Habit {
  id: string;        // crypto.randomUUID()
  title: string;     // 習慣名
  createdAt: string; // ISO 文字列
}
```

### `habit-tracker:records` → `Record<HabitId, Record<DateISO, boolean>>`

- `DateISO` は `"YYYY-MM-DD"`（**実行環境のローカル日付**で生成。タイムゾーン問題を避けるため UTC ではなくローカル）。
- 例: `{ "uuid-1": { "2026-06-19": true } }`

### `habit-tracker:settings` → `Settings`

```ts
interface Settings {
  notifyHour: number;        // 0-23、既定 21
  theme: "dark" | "light" | "system"; // 既定 "dark"
}
```

## モジュール構成

小さく分割し、純粋ロジックをテスト可能にする。

```
src/
  main.ts                  # エントリ。初期化・依存の組み立て・タブ切替
  types.ts                 # Habit / Settings / 状態の型
  lib/
    dates.ts               # toISODate(date), today(), lastNDays(n), buildMonthGrid()
    storage.ts             # ストレージ抽象。localStorage を引数で注入可能（テスト容易）
    habits.ts              # addHabit / deleteHabit / toggleToday / getStreak / isDoneToday
    calendar.ts            # 月間達成マトリクス生成
    notifications.ts       # 許可要求 / 起動時チェック / フォアグラウンド時刻通知のスケジュール
  ui/
    render.ts              # 各画面の DOM 構築（renderToday / renderMonth / renderSettings）
    theme.ts               # ダークモード切替
index.html                 # Vite エントリ。ルートに配置
public/
  icons/                   # PWA 用アイコン（192/512/maskable + apple-touch-icon 180）
```

Service Worker は `vite-plugin-pwa` が生成（`generateSW`）。必要なら `injectManifest` に切り替え。

## UI 画面

タブ切替の簡易 SPA（ルータなし）。3 画面。

1. **今日（メイン）**
   - ヘッダ: 今日の日付
   - 習慣リスト: 各カード = タイトル + **大きなチェックボタン（今日の達成トグル）** + 直近 7 日のドット列 + 連続達成日数（streak）
   - 習慣追加: タイトル入力 + 追加ボタン
2. **月間**
   - 習慣選択 → 選択月のカレンダー（達成日にマーク、前月/翌月移動）
3. **設定**
   - 通知時刻（0-23）
   - テーマ切替
   - 習慣の削除
   - 通知許可状態の表示と許可要求ボタン

チェック時にはアニメーション（CSS トランジション/キーフレーム）で達成感を演出。配色は落ち着いたダーク基調。

## 通知動作の詳細

1. **初回許可**: 設定画面で「通知を有効にする」ボタン押下、またはメイン画面初回表示時に `Notification.requestPermission()` を要求（SW 登録済み前提）。
2. **起動時チェック**（`checkAndNotifyOnLaunch`）: `now.getHours() >= settings.notifyHour` かつ未完了習慣があれば `registration.showNotification("未完了の習慣があります", { ... })`。
3. **フォアグラウンド時刻通知**（`scheduleForegroundNotify`）: `now < notifyHour` なら `setTimeout` で当日の `notifyHour` まで待ち、到達時に未完了なら通知。
4. 通知ロジックの時刻計算は純粋関数化してユニットテスト可能にする。

## テスト戦略

- **ユニット（Vitest）**: `dates.ts`・`habits.ts`（CRUD / streak / toggle）・`calendar.ts`・`storage.ts`（注入したモックストレージ）・`notifications.ts` の時刻判定ロジック。
- **カバレッジ**: 80% 以上（純粋ロジック中心で達成容易）。
- DOM 描画・実 Service Worker 通知は手動確認とし、E2E は導入しない（YAGNI）。

## CI / デプロイ

### CI（既存 `ci.yml` を更新）

install → `vite build` → `tsgo` 型チェック → lint → prettier check → vitest。3 OS マトリクスは維持（Pages デプロイ以外は検証のみ）。`package.json` スクリプトを Vite 向けに更新。

### デプロイ（新規ワークフロー `deploy-pages.yml`）

main push 時:

1. checkout → setup Node 20
2. `npm ci` → `npm run build`
3. `actions/configure-pages` → `actions/upload-pages-artifact`（`dist/`）→ `actions/deploy-pages`

`base: "/habit-tracker-pwa/"` を `vite.config.ts` に設定し、サブパス配信に対応。Service Worker のスコープ・manifest のパスもこれに追従させる。

## 成功基準

- [ ] メイン画面で複数習慣の追加・今日のチェックトグル・直近 7 日表示が動く（LocalStorage で永続化）
- [ ] 月間カレンダーで達成履歴が確認できる
- [ ] 設定画面で通知時刻・テーマ・習慣削除ができる
- [ ] 起動時＋フォアグラウンドで未完了通知が出る（通知許可・PWA インストール前提）
- [ ] manifest・Service Worker が登録され「ホーム画面に追加」が可能
- [ ] ダークモードが既定で動く
- [ ] `npm run build`・`typecheck`・`lint`・`test` が緑
- [ ] GitHub Actions で GitHub Pages にデプロイされる
- [ ] 純粋ロジックのユニットテストが 80% 以上をカバー
