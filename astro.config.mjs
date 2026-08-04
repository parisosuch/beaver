// @ts-check
import { defineConfig } from "astro/config";
import { createRunnableDevEnvironment } from "vite";

import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// PWA is wired through vite-plugin-pwa directly: @vite-pwa/astro does not
// support Astro 6+ (vite-pwa/astro#74).
/** @type {Partial<import("vite-plugin-pwa").VitePWAOptions>} */
const pwaOptions = {
  registerType: "autoUpdate",
  // Astro emits client assets here; the SW and manifest must sit alongside them.
  outDir: "dist/client",
  // Astro renders its own HTML, so there is no vite entry to inject into.
  // The manifest link and SW registration live in src/layouts/layout.astro.
  injectRegister: null,
  manifestFilename: "manifest.webmanifest",
  manifest: {
    name: "Beaver",
    short_name: "Beaver",
    description: "Real-time event tracking for your applications",
    theme_color: "#171717",
    background_color: "#ffffff",
    display: "standalone",
    start_url: "/",
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  },
  workbox: {
    // Match the old registerType: "autoUpdate" behaviour now that registration
    // is hand-written rather than coming from virtual:pwa-register.
    skipWaiting: true,
    clientsClaim: true,
    // Network first for navigation — always get fresh pages from server
    navigateFallback: null,
    globPatterns: ["**/*.{css,js,woff,woff2}"],
    runtimeCaching: [
      {
        urlPattern: /^\/api\/.*/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
  devOptions: {
    enabled: false,
  },
};

// Scope the plugin to the client build; Astro also runs an SSR build, and
// without this the web manifest is emitted into the server output too.
// Mutated in place rather than spread so the `api` object stays shared.
const pwaPlugins = VitePWA(pwaOptions);
for (const plugin of pwaPlugins) {
  plugin.applyToEnvironment = (environment) => environment.name === "client";
}

// vite-plugin-pwa skips service worker generation whenever `build.ssr` is set,
// which Astro always sets for `output: "server"`. Drive its public generateSW()
// from Astro's build hook instead — this is what @vite-pwa/astro did.
/** @returns {import("astro").AstroIntegration} */
const pwaServiceWorker = () => ({
  name: "beaver:pwa-service-worker",
  hooks: {
    "astro:build:done": async ({ logger }) => {
      const api = pwaPlugins.find((plugin) => plugin.name === "vite-plugin-pwa")?.api;
      if (!api || api.disabled) {
        logger.warn("vite-plugin-pwa API unavailable — no service worker generated");
        return;
      }
      await api.generateSW();
      logger.info("Service worker generated");
    },
  },
});

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  output: "server",
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [tailwindcss(), pwaPlugins],
    environments: {
      ssr: {
        dev: {
          createEnvironment: (name, config) => createRunnableDevEnvironment(name, config),
        },
      },
    },
  },
  integrations: [react(), pwaServiceWorker()],
  security: {
    checkOrigin: false,
  },
});
