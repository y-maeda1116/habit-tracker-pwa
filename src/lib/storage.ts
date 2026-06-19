export const STORAGE_KEYS = {
  habits: "habit-tracker:habits",
  records: "habit-tracker:records",
  settings: "habit-tracker:settings",
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
