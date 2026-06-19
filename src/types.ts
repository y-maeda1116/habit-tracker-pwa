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
