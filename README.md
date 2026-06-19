# 習慣トラッカー (habit-tracker-pwa)

自分専用のシンプルな習慣化 PWA。毎日継続したい習慣（腹筋10回など）を記録・管理し、iPhone のホーム画面に追加して使う。データは LocalStorage に保存し、サーバーは持たない。GitHub Pages で配信。

## 機能

- **今日のチェック**: 複数習慣の追加・削除、大きなチェックボタンで今日の達成をトグル、直近7日の達成ドット、連続達成日数（streak）
- **月間カレンダー**: 習慣ごとの月間達成履歴
- **設定**: 通知時刻（0-23）、テーマ（ダーク/ライト/システム）、通知許可
- **通知**: 起動時とフォアグラウンド時（指定時刻以降）に「今日未完了」を検知して Service Worker 経由で通知
- **PWA**: manifest + Service Worker（Workbox）で「ホーム画面に追加」対応、オフライン動作

### iOS 通知の制約について

iOS（Safari / ホーム画面追加済み PWA）はバックグラウンドの PWA をサスペンドするため、静的サイト（サーバーなし）では「アプリを開いていなくても毎日定時に通知」は実現できません。本アプリは **アプリ起動時** と **アプリを開いている最中に指定時刻を迎えたとき** に通知します。

## 技術スタック

| レイヤ | 技術 |
|---|---|
| ビルド / Dev | Vite |
| 言語 | TypeScript 7 beta（`@typescript/native-preview` / tsgo で型チェック） |
| PWA | vite-plugin-pwa（Workbox） |
| テスト | Vitest |
| データ | LocalStorage |
| 配信 | GitHub Pages（Actions） |

## 開発

```bash
npm install
npm run dev      # http://localhost:5173/habit-tracker-pwa/
```

## テスト・検証

```bash
npm test             # ユニットテスト（src/lib）
npm run typecheck    # tsgo による型チェック
npm run lint         # ESLint
npm run format:check # Prettier
npm run build        # 本番ビルド（dist/）
npm run preview      # ビルド結果のプレビュー
```

## PWA インストール手順（iPhone）

1. GitHub Pages の URL（`https://y-maeda1116.github.io/habit-tracker-pwa/`）を Safari で開く
2. 共有ボタン →「ホーム画面に追加」
3. 設定タブで「通知を有効化」を押して通知を許可する

## アイコン生成（デプロイ前に必要）

`public/icons/` に以下の PNG を配置する（現状はプレースホルダのみ）:

- `icon-192.png`（192x192）
- `icon-512.png`（512x512）
- `icon-maskable.png`（512x512、maskable）
- `apple-touch-icon.png`（180x180）
- `favicon.ico`

生成例（[sharp](https://sharp.pixelplumbing.com/) などで SVG → PNG 変換、または PWA アイコンジェネレータを使用）。

## デプロイ

`main` ブランチへの push で GitHub Actions（`.github/workflows/deploy-pages.yml`）がビルドして GitHub Pages にデプロイする。リポジトリ設定で Pages の Source を **GitHub Actions** に設定すること。

## ライセンス

MIT
