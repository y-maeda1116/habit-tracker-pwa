import { describe, it, expect } from "vitest";
import { isIOS } from "./pwa-install.js";

describe("isIOS", () => {
  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)",
  ])("iOS 系 UA は true を返す: %s", (ua) => {
    expect(isIOS(ua)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "",
  ])("非 iOS 系 UA は false を返す: %s", (ua) => {
    expect(isIOS(ua)).toBe(false);
  });
});
