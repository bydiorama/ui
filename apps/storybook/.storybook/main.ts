import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * A UI item that another distributed file imports.
 *
 * Two keys per item, on purpose. A distributed file uses the CONSUMER's path
 * (`@/ui/badge` — the manifest's install target), while tests and stories use
 * this repo's folder path (`@/ui/badge/badge.tsx`). Vite matches a string
 * alias as a PREFIX, so the folder form has to come first or it resolves to
 * `.../badge.tsx/badge.tsx`. `check:dependencies` fails the build if a
 * distributed file imports a target with no entry here.
 */
function uiItems(...names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.flatMap((name) => {
      const file = join(root, `registry/ui/${name}/${name}.tsx`);
      return [[`@/ui/${name}/${name}.tsx`, file], [`@/ui/${name}`, file]];
    }),
  );
}

const config: StorybookConfig = {
  /**
   * Stories live next to the components they document, inside `registry/`.
   * They are safe there because the manifest — not the folder — decides what
   * ships, and `check:manifest` rejects any attempt to list a story as a
   * distributable file. Co-location keeps a story from drifting off its
   * component; the gate keeps it out of a consumer's app.
   */
  // RELATIVE, not absolute: Storybook resolves this against the config dir,
  // and addon-vitest re-resolves it the same way. An absolute path silently
  // became ".storybook/Users/..." and matched nothing, so the story test
  // project ran zero tests while reporting success.
  stories: ["../../../registry/**/*.stories.@(ts|tsx)"],

  // addon-vitest is what makes addon-a11y's `test: "error"` actually run.
  // Without it the a11y panel is advisory only and nothing fails — the
  // "installed but unused" failure this system exists to avoid.
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-vitest"],

  framework: { name: "@storybook/react-vite", options: {} },

  // Serve the registry's own woff2, so Storybook loads the same binary the
  // font item tells consumers to fetch.
  staticDirs: [join(root, "registry/fonts/aspekta")],

  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
    resolve: {
      ...viteConfig.resolve,
      alias: {
        ...viteConfig.resolve?.alias,
        // The same specifiers a consumer's app would use, so stories exercise
        // the real import graph rather than a Storybook-only one.
        "@/lib/cn": join(root, "registry/lib/cn/cn.ts"),
        "@/lib/chrome-control": join(root, "registry/lib/chrome-control/chrome-control.ts"),
        "@/lib/compose-event-handlers": join(
          root,
          "registry/lib/compose-event-handlers/compose-event-handlers.ts",
        ),
        "@/lib/menu-surface": join(root, "registry/lib/menu-surface/menu-surface.ts"),
        "@/lib/motion": join(root, "registry/lib/motion/motion.ts"),
        "@/hooks/use-controllable-state": join(
          root,
          "registry/hooks/use-controllable-state/use-controllable-state.ts",
        ),
        ...uiItems("aspect-ratio", "badge", "button", "calendar", "checkbox", "menu", "progress", "skeleton", "slider"),
        "@/ui": join(root, "registry/ui"),
        "@bydiorama/tokens": join(root, "packages/tokens/src/index.ts"),
      },
    },
  }),
};

export default config;
