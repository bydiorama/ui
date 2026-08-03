/**
 * Tokens that do not vary by brand.
 *
 * Structural rhythm, motion and stacking are system decisions, not brand
 * decisions — a client picking their colours should not be able to make dialogs
 * render behind toasts. These are emitted once at `:root`; only the
 * scheme-varying handful below gets a `light-dark()` pair.
 */

import type { FixedToken, SchemeOnlyToken } from "./contract.ts";

/** Typed as a total record, so a token added to the contract without a value
 *  here fails to compile — the same guarantee the resolver gives. */
export const FIXED_TOKEN_VALUES: Record<FixedToken, string> = {
  // Vertical rhythm between blocks.
  "--ui-space-stack-xs": "0.25rem",
  "--ui-space-stack-sm": "0.5rem",
  "--ui-space-stack-md": "1rem",
  "--ui-space-stack-lg": "1.5rem",
  "--ui-space-stack-xl": "2.5rem",
  "--ui-space-stack-2xl": "4rem",

  // Gaps between items on a line.
  "--ui-space-inline-xs": "0.25rem",
  "--ui-space-inline-sm": "0.5rem",
  "--ui-space-inline-md": "0.75rem",
  "--ui-space-inline-lg": "1rem",

  // Padding inside a container.
  "--ui-space-inset-xs": "0.5rem",
  "--ui-space-inset-sm": "0.75rem",
  "--ui-space-inset-md": "1rem",
  "--ui-space-inset-lg": "1.5rem",
  "--ui-space-inset-xl": "2rem",

  "--ui-duration-fast": "120ms",
  "--ui-duration-base": "200ms",
  "--ui-duration-slow": "320ms",
  "--ui-duration-enter": "400ms",

  "--ui-ease-default": "cubic-bezier(0.2, 0, 0, 1)",
  "--ui-ease-in": "cubic-bezier(0.4, 0, 1, 1)",
  "--ui-ease-out": "cubic-bezier(0, 0, 0.2, 1)",
  "--ui-ease-spring": "cubic-bezier(0.22, 1, 0.36, 1)",

  // Intent-level motion: pair a duration with the easing that suits it, so a
  // component names the *kind* of movement rather than picking numbers.
  "--ui-motion-micro": "var(--ui-duration-fast) var(--ui-ease-out)",
  "--ui-motion-standard": "var(--ui-duration-base) var(--ui-ease-default)",
  "--ui-motion-deliberate": "var(--ui-duration-slow) var(--ui-ease-default)",
  "--ui-motion-choreographed": "var(--ui-duration-enter) var(--ui-ease-spring)",

  // Press feedback. 0.96 exactly: measurably below 0.95 reads as exaggerated,
  // above 0.97 is imperceptible. Components expose a `staticTap` opt-out for
  // contexts where even this is noise. (Adapted from jakubkrehel/skills,
  // better-ui §9, MIT — see CREDITS.md.)
  "--ui-press-scale": "0.96",
  // Delay between semantic chunks of a staged entrance. Staged entrances are
  // for infrequent moments (first load, success, empty states) — never for
  // routine, high-frequency interactions.
  "--ui-stagger-step": "100ms",

  // WCAG 2.5.8 AA floor and the recommended touch target for primary controls.
  // The visible element may be smaller — the hit area is what must be big,
  // extended via pseudo-element on the wrapping label/button.
  "--ui-hit-area-min": "24px",
  "--ui-hit-area-touch": "44px",

  "--ui-measure-prose": "70ch",
  "--ui-measure-narrative": "60ch",
  "--ui-measure-dense": "90ch",

  "--ui-z-below": "-1",
  "--ui-z-base": "0",
  "--ui-z-dropdown": "1000",
  "--ui-z-sticky": "1100",
  "--ui-z-overlay": "1200",
  "--ui-z-modal": "1300",
  "--ui-z-toast": "1400",
  "--ui-z-tooltip": "1500",
};

/** Varies with light/dark, never with the brand. */
export const SCHEME_TOKEN_VALUES: Record<SchemeOnlyToken, { light: string; dark: string }> = {
  "--ui-scrim": { light: "rgba(16, 16, 20, 0.45)", dark: "rgba(0, 0, 0, 0.65)" },
  "--ui-selection-bg": { light: "rgba(16, 16, 20, 0.12)", dark: "rgba(255, 255, 255, 0.22)" },
  "--ui-selection-fg": { light: "#101014", dark: "#ffffff" },
};

/**
 * Durations collapse under reduced motion.
 *
 * Done here, once, rather than per component: every CSS-driven transition in
 * the system reads these tokens, so honouring the preference at the token layer
 * makes the whole library compliant without a single component knowing about
 * it. Only the JS motion tier needs its own check (ADR 0005).
 */
export const REDUCED_MOTION_OVERRIDES: Partial<Record<FixedToken, string>> = {
  "--ui-duration-fast": "1ms",
  "--ui-duration-base": "1ms",
  "--ui-duration-slow": "1ms",
  "--ui-duration-enter": "1ms",
};
