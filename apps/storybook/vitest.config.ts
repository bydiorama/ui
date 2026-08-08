import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

/**
 * A UI item that another distributed file imports — see the fuller note in
 * `.storybook/main.ts`. Two keys per item, longer first, because Vite matches
 * a string alias as a prefix.
 */
function uiItems(...names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.flatMap((name) => {
      const file = join(root, `registry/ui/${name}/${name}.tsx`);
      return [[`@/ui/${name}/${name}.tsx`, file], [`@/ui/${name}`, file]];
    }),
  );
}

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
   * added here — Tabs did exactly that. If you add a `@base-ui/*`
   * import anywhere, add it below in the same commit.
   */
  optimizeDeps: {
    include: [
      "react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime",
      "@base-ui/react/accordion",
      "@base-ui/react/popover",
      "@base-ui/react/dialog",
      "@base-ui/react/combobox",
      "@base-ui/react/menu",
      "@base-ui/react/context-menu",
      "@base-ui/react/select",
      "@base-ui/react/slider",
      "@base-ui/react/tabs",
      "griddy-icons",
      "clsx", "tailwind-merge",
    ],
  },
  resolve: {
    alias: {
      "@/lib/cn": join(root, "registry/lib/cn/cn.ts"),
      "@/lib/chrome-control": join(root, "registry/lib/chrome-control/chrome-control.ts"),
      "@/lib/compose-event-handlers": join(
        root,
        "registry/lib/compose-event-handlers/compose-event-handlers.ts",
      ),
      "@/lib/menu-surface": join(root, "registry/lib/menu-surface/menu-surface.ts"),
      "@/hooks/use-controllable-state": join(
        root,
        "registry/hooks/use-controllable-state/use-controllable-state.ts",
      ),
      ...uiItems("badge", "button", "calendar", "menu"),
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
         * and Linux, so vitest keeps a `-chromium-darwin` and a
         * `-chromium-linux` set and never compares one against the other.
         * Kept out of `test:browser` because it is slower and its baselines
         * are a reviewed artefact; CI runs it as its own job inside a pinned
         * Playwright container.
         */
        extends: true,
        test: {
          name: "visual",
          include: [join(root, "registry/**/*.visual.test.tsx")],
          setupFiles: [join(here, "vitest.setup.ts")],
          browser: {
            ...browser(),
            // The PAGE viewport, which is not the same thing as the test
            // viewport below. Vitest runs each test in an IFRAME sized to
            // `viewport`, inside a page that Playwright defaults to 1280x720 —
            // and when the iframe does not fit, it is SCALED DOWN to fit.
            //
            // An 800x900 iframe in a 720-tall page is 720/900 = 0.8, and for
            // its entire existence every baseline in this repo was written at
            // exactly 0.8: a 200x100 probe box captured as 160x80. Nothing
            // reported it, because a uniformly scaled baseline compares
            // cleanly against a uniformly scaled capture — the suite was
            // internally consistent and externally wrong.
            //
            // What it cost is the fine detail. At 0.8 a 1px border and a
            // 1.5px ring both resample into the same blur, so the distinction
            // ADR 0010 exists to defend was the first thing the gate lost —
            // while `allowedMismatchedPixels: 0` advertised total precision.
            //
            // Making the page bigger than the frame is what fixes it. Capping
            // the frame instead would have traded the downscale straight back
            // for the crop this project fixed a day earlier.
            provider: playwright({ contextOptions: { viewport: { width: 1400, height: 1200 } } }),
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
