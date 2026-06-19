export type ResolvedTheme = "dark" | "light";

export function resolveTheme(setting: "dark" | "light" | "system"): ResolvedTheme {
  if (setting !== "system") return setting;
  const prefersDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}
