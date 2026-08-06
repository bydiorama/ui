import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

/** A fresh provider per project — vitest cannot share one factory instance. */
const browser = () => ({
  enabled: true as const,
  provider: playwright(),
  headless: true,
  instances: [{ browser: "chromium" as const }],
});

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

  /**
   * Pre-bundle everything BEFORE the run instead of discovering imports during
   * it. Without this, adding a story file made the first `test:browser` fail
   * those stories and the second pass — Vite found a new dependency mid-run,
   * re-optimised, and reloaded the page under the test ("Vite unexpectedly
   * reloaded a test"). Three separate components hit it. A suite whose first
   * run after an edit is untrustworthy trains people to re-run instead of to
   * read the failure, which is worse than the flake.
   *
   * THIS LIST MUST GROW. It is explicit, so the first component to import a
   * new behaviour-layer module reintroduces the flake until its subpath is
   * added here — Tabs did exactly that. If you add a `@base-ui-components/*`
   * import anywhere, add it below in the same commit.
   */
  optimizeDeps: {
    include: [
      "react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime",
      "@base-ui-components/react/popover",
      "@base-ui-components/react/dialog",
      "@base-ui-components/react/combobox",
      "@base-ui-components/react/slider",
      "@base-ui-components/react/tabs",
      "griddy-icons",
      "clsx", "tailwind-merge",
    ],
  },
  resolve: {
    alias: {
      "@/lib/cn": join(root, "registry/lib/cn/cn.ts"),
      "@/lib/chrome-control": join(root, "registry/lib/chrome-control/chrome-control.ts"),
      "@/hooks/use-controllable-state": join(
        root,
        "registry/hooks/use-controllable-state/use-controllable-state.ts",
      ),
      "@/ui": join(root, "registry/ui"),
      "@bydiorama/tokens": join(root, "packages/tokens/src/index.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "contract",
          include: [join(root, "registry/**/*.browser.test.tsx")],
          setupFiles: [join(here, "vitest.setup.ts")],
          browser: browser(),
        },
      },
      {
        /**
         * Visual regression. Separate from `contract` because its baselines
         * are platform-specific — font rasterisation differs between macOS
         * and Linux, so a committed macOS PNG cannot pass on a Linux runner.
         * Kept out of `test:browser` and out of CI until a containerised
         * runner exists; run it with `pnpm test:visual`.
         */
        extends: true,
        test: {
          name: "visual",
          include: [join(root, "registry/**/*.visual.test.tsx")],
          setupFiles: [join(here, "vitest.setup.ts")],
          browser: {
            ...browser(),
            // The viewport must be WIDER than the frame the matrix mounts
            // (560px + 24px padding either side). Vitest's default is 414px,
            // and `elementLocator().toMatchScreenshot()` captures only what is
            // visible — so every baseline in this repo was silently cropped at
            // ~450px for its entire existence, and nothing to the right of
            // that had ever been compared. Card Sorting's trailing Switch and
            // Input's trailing icons both sat in the blind spot.
            viewport: { width: 800, height: 900 },
            // Baselines are a deliberate, COMMITTED artefact. Failure captures
            // are debris and would land in the same folder, so they are turned
            // off here — the diff image in .vitest-attachments is enough, and
            // it keeps the baseline directory free of anything unreviewed.
            screenshotFailures: false,
          },
        },
      },
      {
        // Runs every story as a test with axe attached. addon-a11y's
        // `test: "error"` only bites here — a build merely compiles stories.
        extends: true,
        plugins: [storybookTest({ configDir: join(here, ".storybook") })],
        test: {
          name: "stories",
          setupFiles: [join(here, "vitest.setup.ts")],
          browser: browser(),
        },
      },
    ],
  },
});
