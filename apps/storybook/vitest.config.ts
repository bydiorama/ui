import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

/**
 * Interaction tests run in a REAL browser (Playwright/Chromium), not jsdom.
 *
 * That is not incidental. The behaviours this suite exists to prove — implicit
 * activation of a <button> by Enter and Space, and which activation methods
 * apply `:active` — are user-agent behaviours that jsdom does not implement.
 * A jsdom run would report confident, wrong answers about exactly the thing
 * being asserted (CONVENTIONS §10).
 */
export default defineConfig({
  // Serves the registry's Aspekta woff2 at /AspektaVF.woff2 — same URL the
  // Storybook staticDirs serve — so the font-loading assertion is real.
  publicDir: join(root, "registry/fonts/aspekta"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/lib/cn": join(root, "registry/lib/cn/cn.ts"),
      "@/ui": join(root, "registry/ui"),
      "@bydiorama/tokens": join(root, "packages/tokens/src/index.ts"),
    },
  },
  test: {
    include: [join(root, "registry/**/*.browser.test.tsx")],
    setupFiles: [join(here, "vitest.setup.ts")],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
