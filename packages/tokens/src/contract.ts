/**
 * The token contract.
 *
 * This file answers one question precisely: **what must a resolved theme
 * contain?** It exists because the previous generation of brand theming in
 * service-portal re-bound only seven semantic tokens, so any component using
 * one of the other ~90 silently kept Diorama's colours inside a client's
 * branded portal. The fix is not "remember to derive more tokens" — it is
 * making the set enumerable, so a resolver that misses one fails to type-check
 * instead of failing in a client's browser months later.
 *
 * Each token is classified by how it behaves under theming:
 *
 * - `brandable`   the resolver MUST produce a value for every theme. Missing
 *                 one is a build error.
 * - `schemeOnly`  varies between light and dark, but not between brands.
 * - `fixed`       structural. Identical in every theme and every scheme, so it
 *                 is emitted once at `:root` and never per-theme.
 *
 * Phase 1 builds the resolver against this contract. Adding a token here
 * without teaching the resolver to derive it is intended to break the build.
 */

/** Colour, shape and type roles every theme must supply. */
export const BRANDABLE_TOKENS = [
  // Text
  "--ui-text-primary",
  "--ui-text-secondary",
  "--ui-text-muted",
  "--ui-text-disabled",
  "--ui-text-placeholder",
  "--ui-text-inverse",
  "--ui-text-link",
  "--ui-text-link-hover",
  "--ui-text-on-accent",
  "--ui-text-on-emphasis",
  "--ui-text-on-muted",
  "--ui-text-on-danger-solid",

  // Surfaces
  "--ui-bg-base",
  "--ui-bg-surface",
  "--ui-bg-elevated",
  "--ui-bg-sunken",
  "--ui-bg-muted",
  "--ui-bg-overlay",
  "--ui-bg-hover",
  "--ui-bg-active",
  "--ui-bg-accent",
  "--ui-bg-accent-subtle",
  "--ui-bg-emphasis",
  "--ui-bg-emphasis-hover",
  "--ui-bg-emphasis-active",
  "--ui-bg-danger-solid",

  // Borders and focus
  "--ui-border-subtle",
  "--ui-border-default",
  "--ui-border-strong",
  "--ui-border-focus",
  "--ui-focus-ring-color",
  "--ui-focus-ring",

  // Intents — meaning-bearing, re-toned per theme for legibility
  "--ui-intent-success-fg",
  "--ui-intent-success-bg",
  "--ui-intent-warning-fg",
  "--ui-intent-warning-bg",
  "--ui-intent-danger-fg",
  "--ui-intent-danger-bg",
  "--ui-intent-info-fg",
  "--ui-intent-info-bg",

  // Categorical data — distinguishable-by-design, NOT derived from the accent
  "--ui-data-informational-fg",
  "--ui-data-informational-bg",
  "--ui-data-informational-solid",
  "--ui-data-commercial-fg",
  "--ui-data-commercial-bg",
  "--ui-data-commercial-solid",
  "--ui-data-transactional-fg",
  "--ui-data-transactional-bg",
  "--ui-data-transactional-solid",
  "--ui-data-navigational-fg",
  "--ui-data-navigational-bg",
  "--ui-data-navigational-solid",

  // Shape
  "--ui-radius-sm",
  "--ui-radius-md",
  "--ui-radius-lg",
  "--ui-radius-xl",
  "--ui-radius-2xl",
  "--ui-radius-full",
  "--ui-border-width",
  "--ui-shadow-sm",
  "--ui-shadow-md",
  "--ui-shadow-lg",
  "--ui-shadow-xl",

  // Typography — faces plus the roles a theme's base size and ratio drive.
  // These are brandable so a themed surface stops needing its own parallel
  // type scale, which is what forced portal components to bypass the library.
  "--ui-font-body",
  "--ui-font-display",
  "--ui-font-mono",
  "--ui-text-display-lg",
  "--ui-text-display-md",
  "--ui-text-title-lg",
  "--ui-text-title-md",
  "--ui-text-title-sm",
  "--ui-text-body-lg",
  "--ui-text-body-md",
  "--ui-text-body-sm",
  "--ui-text-label-md",
  "--ui-text-label-sm",
  "--ui-text-caption",
  "--ui-text-code-sm",

  // Chrome — the layout surfaces a themed portal legitimately re-skins
  "--ui-nav-bg",
  "--ui-nav-ink",
  "--ui-nav-ink-muted",
  "--ui-nav-border",
  "--ui-nav-active-bg",
  "--ui-nav-active-ink",
  "--ui-nav-width",
  "--ui-nav-rail-width",
  "--ui-content-width",
  "--ui-section-gap",
  "--ui-logo-height",
] as const;

/** Varies with light/dark, but never with the brand. */
export const SCHEME_ONLY_TOKENS = [
  "--ui-scrim",
  "--ui-selection-bg",
  "--ui-selection-fg",
] as const;

/** Structural constants. One value, every theme, every scheme. */
export const FIXED_TOKENS = [
  // Spacing intents
  "--ui-space-stack-xs", "--ui-space-stack-sm", "--ui-space-stack-md",
  "--ui-space-stack-lg", "--ui-space-stack-xl", "--ui-space-stack-2xl",
  "--ui-space-inline-xs", "--ui-space-inline-sm", "--ui-space-inline-md", "--ui-space-inline-lg",
  "--ui-space-inset-xs", "--ui-space-inset-sm", "--ui-space-inset-md",
  "--ui-space-inset-lg", "--ui-space-inset-xl",

  // Motion. Durations collapse under prefers-reduced-motion at this layer, so
  // every CSS-driven animation in the system complies without per-component work.
  "--ui-duration-fast", "--ui-duration-base", "--ui-duration-slow", "--ui-duration-enter",
  "--ui-ease-default", "--ui-ease-in", "--ui-ease-out", "--ui-ease-spring",
  "--ui-motion-micro", "--ui-motion-standard", "--ui-motion-deliberate", "--ui-motion-choreographed",

  // Measure
  "--ui-measure-prose", "--ui-measure-narrative", "--ui-measure-dense",

  // Stacking
  "--ui-z-below", "--ui-z-base", "--ui-z-dropdown", "--ui-z-sticky",
  "--ui-z-overlay", "--ui-z-modal", "--ui-z-toast", "--ui-z-tooltip",
] as const;

export type BrandableToken = (typeof BRANDABLE_TOKENS)[number];
export type SchemeOnlyToken = (typeof SCHEME_ONLY_TOKENS)[number];
export type FixedToken = (typeof FIXED_TOKENS)[number];
export type TokenName = BrandableToken | SchemeOnlyToken | FixedToken;

/**
 * What `resolveTheme()` returns in Phase 1. Total over the brandable set: a
 * resolver that forgets a token does not compile.
 */
export type ResolvedTheme = Record<BrandableToken, string>;

/**
 * Foreground/background pairs that must clear WCAG AA. The resolver audits
 * these after derivation and reports any it had to adjust, so a brand author
 * is told "we nudged your link colour for legibility" rather than silently
 * shipping either a contrast failure or a colour they did not choose.
 */
export const CONTRAST_PAIRS: ReadonlyArray<readonly [BrandableToken, BrandableToken]> = [
  ["--ui-text-primary", "--ui-bg-base"],
  ["--ui-text-primary", "--ui-bg-surface"],
  ["--ui-text-secondary", "--ui-bg-surface"],
  ["--ui-text-muted", "--ui-bg-surface"],
  ["--ui-text-on-muted", "--ui-bg-muted"],
  ["--ui-text-on-emphasis", "--ui-bg-emphasis"],
  ["--ui-text-on-emphasis", "--ui-bg-emphasis-hover"],
  ["--ui-text-on-emphasis", "--ui-bg-emphasis-active"],
  ["--ui-text-on-accent", "--ui-bg-accent"],
  ["--ui-text-link", "--ui-bg-base"],
  ["--ui-text-on-danger-solid", "--ui-bg-danger-solid"],
  ["--ui-intent-success-fg", "--ui-intent-success-bg"],
  ["--ui-intent-warning-fg", "--ui-intent-warning-bg"],
  ["--ui-intent-danger-fg", "--ui-intent-danger-bg"],
  ["--ui-intent-info-fg", "--ui-intent-info-bg"],
  ["--ui-nav-ink", "--ui-nav-bg"],
  ["--ui-nav-active-ink", "--ui-nav-active-bg"],
] as const;
