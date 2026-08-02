// The token contract — what a theme must contain.
export {
  BRANDABLE_TOKENS,
  SCHEME_ONLY_TOKENS,
  FIXED_TOKENS,
  CONTRAST_PAIRS,
} from "./contract.ts";
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
export { resolveTheme, resolveThemePair, missingTokens } from "./resolve.ts";
export type { Scheme, ResolveOptions, ResolveResult, ResolvedPair, ContrastAdjustment } from "./resolve.ts";

// Non-brandable tokens.
export { FIXED_TOKEN_VALUES, SCHEME_TOKEN_VALUES, REDUCED_MOTION_OVERRIDES } from "./base.ts";

// Emitters.
export { toCss, toStyleObject } from "./emit/css.ts";
export type { CssOptions, ColorScheme } from "./emit/css.ts";

// Diorama's own theme.
export { THEME_ZERO } from "./themes/zero.ts";

// Colour utilities, exported because the brand-theme editor needs the same
// maths the resolver uses to preview an author's choices.
export {
  parseColor, toHex, formatColor, toOklch, rgbToOklch, oklchToRgb,
  shiftL, towardL, withAlpha, flatten, contrastRatio, readableInkOn,
  legibleOn, isDark, AA_TEXT, AA_LARGE,
} from "./color.ts";
export type { Rgb, Oklch } from "./color.ts";

// Still to come in this phase's tail: Tailwind `@theme inline` and TS-constant
// emitters, plus the Paper/Figma payloads.
