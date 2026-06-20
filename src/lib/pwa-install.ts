/**
 * PWA インストール関連の純粋ロジック・型定義。
 * 副作用（DOM イベントの購読、prompt() の呼び出し）は含まない。
 */

/**
 * `beforeinstallprompt` イベントの最小インターフェース。
 * ブラウザ側の完全な型定義がないため、本アプリで使うメンバに絞って定義する。
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * ユーザーエージェント文字列から iOS（iPhone/iPad/iPod）かを判定する。
 * iOS Safari は `beforeinstallprompt` に非対応のため、案内文言の表示判定に用いる。
 * 引数で userAgent を受け取る純粋関数（navigator に直接依存しない）ことでテスト容易性を確保。
 */
export function isIOS(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}
