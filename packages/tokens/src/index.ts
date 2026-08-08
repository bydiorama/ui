// The token contract — what a theme must contain.
export {
  BRANDABLE_TOKENS,
  SCHEME_ONLY_TOKENS,
  FIXED_TOKENS,
  CONTRAST_PAIRS,
  NONTEXT_CONTRAST_PAIRS,
} from "./contract.ts";

// The curated palette (ADR 0008) and the authored type table (ADR 0009).
export { RAMPS, BRAND, NEUTRAL, BLUE, ORANGE, LAVENDER, GREEN, RED } from "./palette.ts";
export { TYPE_ROLES } from "./resolve.ts";
export type {
  BrandableToken,
  SchemeOnlyToken,
  FixedToken,
  TokenName,
  ResolvedTheme,
} from "./contract.ts";

// What an author supplies.
export { SEED_BOUNDS, SAFE_SEED_VALUE, clamp, validateSeed } from "./seed.ts";
export type {
  ThemeSeed,
  SeedColors,
  SeedTypography,
  SeedShape,
  SeedChrome,
  ShadowIntensity,
  NavStyle,
  SeedValidationIssue,
} from "./seed.ts";

// Seed → tokens.
// MEDIA_SCRIM_ALPHA is exported because ImageOverlay PAINTS it (`bg-media/72`)
// and its browser test asserts the painted value against this constant. The
// same decision written in two files is a decision that drifts.
export { resolveTheme, resolveThemePair, missingTokens, MEDIA_SCRIM_ALPHA } from "./resolve.ts";
export type { Scheme, ResolveOptions, ResolveResult, ResolvedPair, ContrastAdjustment } from "./resolve.ts";

// Non-brandable tokens.
export { FIXED_TOKEN_VALUES, SCHEME_TOKEN_VALUES, REDUCED_MOTION_OVERRIDES } from "./base.ts";

// Emitters.
export { toCss, toStyleObject } from "./emit/css.ts";
export type { CssOptions, ColorScheme } from "./emit/css.ts";

// Diorama's own theme: the seed plus the approved authored role map.
export { THEME_ZERO, ZERO_AUTHORED, resolveZeroPairOptions } from "./themes/zero.ts";

// Colour utilities, exported because the brand-theme editor needs the same
// maths the resolver uses to preview an author's choices.
export {
  parseColor, toHex, formatColor, toOklch, rgbToOklch, oklchToRgb,
  shiftL, towardL, withAlpha, flatten, contrastRatio, readableInkOn,
  legibleOn, isDark, AA_TEXT, AA_LARGE,
} from "./color.ts";
export type { Rgb, Oklch } from "./color.ts";

// Tailwind v4 `@theme inline` emitter.
export { toTailwindTheme } from "./emit/tailwind.ts";
export type { TailwindOptions } from "./emit/tailwind.ts";

// TypeScript-constants emitter — for contexts with no CSS variable
// resolution (email HTML, PDF/canvas, chart palettes).
export { toTsConstants } from "./emit/ts.ts";
export type { TsOptions, TsScheme } from "./emit/ts.ts";

// Still to come in this phase's tail: the Paper/Figma payload emitter.
