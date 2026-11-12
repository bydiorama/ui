/**
 * Custom browser commands defined in apps/storybook/vitest.config.ts.
 * Test-only: nothing under registry/test/ is listed in the manifest, so
 * none of it ships.
 */
import "vitest/browser";

declare module "vitest/browser" {
  interface BrowserCommands {
    /** Emulate `forced-colors: active` (true) or clear it (false). */
    setForcedColors: (active: boolean) => Promise<void>;
  }
}
