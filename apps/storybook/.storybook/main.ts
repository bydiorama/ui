import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const config: StorybookConfig = {
  /**
   * Stories live next to the components they document, inside `registry/`.
   * They are safe there because the manifest — not the folder — decides what
   * ships, and `check:manifest` rejects any attempt to list a story as a
   * distributable file. Co-location keeps a story from drifting off its
   * component; the gate keeps it out of a consumer's app.
   */
  stories: [join(root, "registry/**/*.stories.@(ts|tsx)")],

  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],

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
        "@/ui": join(root, "registry/ui"),
        "@bydiorama/tokens": join(root, "packages/tokens/src/index.ts"),
      },
    },
  }),
};

export default config;
