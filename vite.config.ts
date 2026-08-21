import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["app-mark.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Don't Sleep",
        short_name: "Don't Sleep",
        description: "An ambient fullscreen display that keeps a visible computer awake.",
        theme_color: "#090b12",
        background_color: "#090b12",
        display: "standalone",
        start_url: base,
        scope: base,
        orientation: "any",
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,webp,avif}"],
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`
      },
      devOptions: { enabled: true }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    coverage: { reporter: ["text", "html"] }
  }
});
