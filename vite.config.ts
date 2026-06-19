import { defineConfig } from "vitest/config";
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
          {
            src: "icons/icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ]
});
