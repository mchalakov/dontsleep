import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["app-mark.svg", "icons/icon-192.png", "icons/icon-512.png", "starter/**/*"],
      manifest: {
        name: "Don't Sleep",
        short_name: "Don't Sleep",
        description: "An ambient fullscreen slideshow that keeps a visible computer awake.",
        theme_color: "#090b12",
        background_color: "#090b12",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "any",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,webp,avif}"],
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html"
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
