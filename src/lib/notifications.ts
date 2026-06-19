export type NotificationPermissionLike = "default" | "granted" | "denied";

export function shouldNotifyNow(now: Date, notifyHour: number): boolean {
  return now.getHours() >= notifyHour;
}

export function msUntilNextNotify(now: Date, notifyHour: number): number {
  const target = new Date(now);
  target.setHours(notifyHour, 0, 0, 0);
  let delay = target.getTime() - now.getTime();
  if (delay <= 0) {
    // 通知時刻を過ぎていれば翌日の同時刻まで待つ
    target.setDate(target.getDate() + 1);
    delay = target.getTime() - now.getTime();
  }
  return delay;
}

export interface NotifyDeps {
  requestPermission: () => Promise<NotificationPermissionLike>;
  permission: () => NotificationPermissionLike;
  showNotification: (title: string, body: string) => void;
  hasPendingHabits: () => boolean;
}

export function enableNotifications(deps: NotifyDeps): Promise<NotificationPermissionLike> {
  if (!("Notification" in globalThis)) {
    return Promise.resolve("denied" as NotificationPermissionLike);
  }
  return deps.requestPermission();
}

export function notifyIfPending(deps: NotifyDeps, now: Date, notifyHour: number): boolean {
  if (!shouldNotifyNow(now, notifyHour)) return false;
  if (!deps.hasPendingHabits()) return false;
  if (deps.permission() !== "granted") return false;
  deps.showNotification("習慣トラッカー", "今日未完了の習慣があります");
  return true;
}
