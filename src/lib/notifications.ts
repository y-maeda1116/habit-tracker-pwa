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
  if (!("Notification" in globalThis)) {
    return Promise.resolve("denied" as NotificationPermissionLike);
  }
  return deps.requestPermission();
}

export function notifyIfPending(deps: NotifyDeps, now: Date, notifyHour: number): boolean {
  if (!shouldNotifyNow(now, notifyHour)) return false;
  if (!deps.hasPendingHabits()) return false;
  deps.showNotification("習慣トラッカー", "今日未完了の習慣があります");
  return true;
}
