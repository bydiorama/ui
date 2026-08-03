/**
 * The theme resolver: seed → every brandable token.
 *
 * `resolveTheme` returns `ResolvedTheme`, which is `Record<BrandableToken,
 * string>`. That type is the whole design (ADR 0006): adding a token to the
 * contract without teaching this file to derive it does not compile, so the
 * "some tokens are branded, some silently are not" failure that produced two
 * parallel component vocabularies cannot recur.
 *
 * Several derivations here are ported deliberately rather than reinvented —
 * they encode failures that were expensive to find the first time. Each is
 * commented where it happens.
 */

import {
  BRANDABLE_TOKENS, CONTRAST_PAIRS,
  type BrandableToken, type ResolvedTheme,
} from "./contract.ts";
import {
  AA_TEXT, contrastRatio, flatten, isDark, legibleOn, oklchToRgb, formatColor,
  readableInkOn, shiftL, toOklch, towardL, withAlpha,
} from "./color.ts";
import {
  SEED_BOUNDS, clamp, validateSeed,
  type SeedColors, type SeedValidationIssue, type ThemeSeed,
} from "./seed.ts";

/** The two inks every "which ink reads here" decision chooses between. */
const INKS = ["#101014", "#ffffff"] as const;

/**
 * PROVISIONAL — replaced when Diorama's palette is finalised.
 *
 * Meaning-bearing hues. Fixed rather than accent-derived so "danger" is red in
 * every theme; only their tone moves, to stay legible on the theme's page.
 */
const INTENT_HUES = {
  success: "#2d6a4f",
  warning: "#92400e",
  danger: "#991b1b",
  info: "#1e3a5f",
} as const;

/**
 * PROVISIONAL — replaced when Diorama's palette is finalised.
 *
 * Categorical data hues. Curated, NOT derived from the accent (ADR 0006(a)):
 * a ramp generated from one accent goes muddy for red or orange brands, and
 * categories a reader cannot tell apart have failed at the only job they have.
 * Chosen for separation in hue, and re-toned per background for legibility.
 */
const DATA_HUES = {
  informational: "#2563eb",
  commercial: "#b45309",
  transactional: "#15803d",
  navigational: "#7c3aed",
} as const;

const SHADOW_SCALE = {
  none: 0,
  subtle: 0.6,
  standard: 1,
  strong: 1.6,
} as const;

export type Scheme = "light" | "dark";

export interface ResolveOptions {
  /** Which scheme to resolve. Defaults to whichever the seed's own page is. */
  scheme?: Scheme;
}

/** A pair the contrast audit had to move, so the UI can say so out loud. */
export interface ContrastAdjustment {
  token: BrandableToken;
  against: BrandableToken;
  from: string;
  to: string;
  ratioBefore: number;
  ratioAfter: number;
}

export interface ResolveResult {
  theme: ResolvedTheme;
  /** Empty when the author's colours all cleared AA unaided. */
  adjustments: ContrastAdjustment[];
  /** Non-recoverable seed problems. A seed with issues still resolves — using
   *  fallbacks — so a bad value degrades rather than blanking a page. */
  issues: SeedValidationIssue[];
}

// ── Scheme derivation ───────────────────────────────────────────────────

/**
 * Build the counterpart scheme when an author has not supplied one.
 *
 * Structural roles are re-derived from the accent's hue at low chroma rather
 * than inverted: inverting a palette produces washed-out mud, whereas a neutral
 * ramp carrying a hint of the brand's hue reads as the same brand with the
 * lights off. Author-supplied colours (ADR 0006(b)) always beat this.
 */
function deriveCounterpart(colors: SeedColors, target: Scheme): SeedColors {
  const accent = toOklch(colors.accent);
  const hue = accent?.h ?? 0;
  const tint = Math.min(accent?.C ?? 0, 0.02);

  const neutral = (L: number, C = tint) => formatColor(oklchToRgb({ L, C, h: hue, a: 1 }));

  if (target === "dark") {
    return {
      bg: neutral(0.16),
      surface: neutral(0.21),
      muted: neutral(0.26),
      textPrimary: neutral(0.95, Math.min(tint, 0.008)),
      textMuted: neutral(0.72, Math.min(tint, 0.008)),
      border: withAlpha("#ffffff", 0.14),
      // An accent legible on the page it will actually sit on.
      accent: legibleOn(colors.accent, neutral(0.16), 3),
    };
  }

  return {
    bg: neutral(0.99, Math.min(tint, 0.004)),
    surface: neutral(1, 0),
    muted: neutral(0.96, Math.min(tint, 0.006)),
    textPrimary: neutral(0.2, Math.min(tint, 0.01)),
    textMuted: neutral(0.5, Math.min(tint, 0.008)),
    border: withAlpha("#000000", 0.12),
    accent: legibleOn(colors.accent, neutral(0.99), 3),
  };
}

/** The colour set to resolve from, honouring authored schemes first. */
function colorsFor(seed: ThemeSeed, scheme: Scheme): SeedColors {
  const primary = seed.colors;
  const primaryScheme: Scheme = isDark(primary.bg) ? "dark" : "light";

  if (scheme === primaryScheme) return primary;
  if (seed.dark && scheme === "dark") return seed.dark;
  if (seed.dark && scheme === "light" && isDark(seed.dark.bg)) return primary;
  return deriveCounterpart(primary, scheme);
}

// ── Typography ──────────────────────────────────────────────────────────

const TYPE_STEPS = {
  "--ui-text-display-lg": 6,
  "--ui-text-display-md": 5,
  "--ui-text-title-lg": 4,
  "--ui-text-title-md": 3,
  "--ui-text-title-sm": 2,
  "--ui-text-body-lg": 1,
  "--ui-text-body-md": 0,
  "--ui-text-body-sm": -1,
  "--ui-text-label-md": -0.5,
  "--ui-text-label-sm": -1.5,
  "--ui-text-caption": -2,
  "--ui-text-code-sm": -0.5,
} as const;

/** Roles that scale with the viewport. Body and below stay fixed, because
 *  fluid body text makes line length unpredictable. */
const FLUID_ROLES = new Set<string>([
  "--ui-text-display-lg", "--ui-text-display-md",
  "--ui-text-title-lg", "--ui-text-title-md", "--ui-text-title-sm",
]);

const round = (n: number, places = 3) => Number(n.toFixed(places));

/** Linear interpolation between 375px and 1440px viewports, expressed so the
 *  browser does the work: `clamp(min, intercept + slope·vw, max)`. */
function fluid(minRem: number, maxRem: number): string {
  const MIN_VW = 23.4375; // 375px
  const MAX_VW = 90; // 1440px
  const slope = (maxRem - minRem) / (MAX_VW - MIN_VW);
  const intercept = minRem - slope * MIN_VW;
  return `clamp(${round(minRem)}rem, ${round(intercept)}rem + ${round(slope * 100, 2)}vw, ${round(maxRem)}rem)`;
}

function typeScale(seed: ThemeSeed): Record<keyof typeof TYPE_STEPS, string> {
  const baseSize = clamp(
    seed.typography?.baseSize ?? SEED_BOUNDS.baseSize.default,
    SEED_BOUNDS.baseSize.min,
    SEED_BOUNDS.baseSize.max,
  );
  const ratio = clamp(
    seed.typography?.ratio ?? SEED_BOUNDS.ratio.default,
    SEED_BOUNDS.ratio.min,
    SEED_BOUNDS.ratio.max,
  );

  const baseRem = baseSize / 16;
  const step = (n: number) => baseRem * ratio ** n;

  const out = {} as Record<keyof typeof TYPE_STEPS, string>;
  for (const [token, n] of Object.entries(TYPE_STEPS) as [keyof typeof TYPE_STEPS, number][]) {
    const max = step(n);
    out[token] = FLUID_ROLES.has(token) ? fluid(max * 0.72, max) : `${round(max)}rem`;
  }
  return out;
}

// ── The derivation ──────────────────────────────────────────────────────

function derive(seed: ThemeSeed, colors: SeedColors): ResolvedTheme {
  const dark = isDark(colors.bg);
  // Which way "raised" and "recessed" point — decided on the BACKGROUND,
  // because that is what a reader means by a dark page.
  const up = dark ? 1 : -1;
  const accent = colors.accent;

  // The strongest filled action (primary button, checked box, tooltip).
  //
  // Its hover and active states step AWAY FROM THEIR OWN INK, not toward the
  // reader. Keying on the page's scheme breaks whenever fill and page disagree:
  // a mid-tone accent on a light page takes dark ink, and darkening the fill on
  // :active walks it toward that ink until the pressed label falls under AA.
  // Deriving direction from the ink keeps contrast monotonic across all three
  // states, so one ink serves them all — which it must, because a label that
  // changes colour on press is worse than either failure.
  const emphasisInk = readableInkOn(accent, INKS);
  const awayFromInk = emphasisInk === INKS[0] ? 1 : -1;

  // A link is text, so it has to clear AA against the page — which a brand's
  // raw accent frequently does not.
  const link = legibleOn(accent, colors.bg);

  // Hairlines as alpha over the brand's ink: they darken on a light page and
  // lighten on a dark one with no second palette. `border` itself is commonly
  // stored as rgba, so it cannot seed these — the ink can.
  const inkBorder = (alpha: number) =>
    toOklch(colors.textPrimary) ? withAlpha(colors.textPrimary, alpha) : colors.border;

  const shape = seed.shape ?? {};
  const px = (n: number) => (n === 0 ? "0" : `${Math.round(n)}px`);
  const radius = {
    sm: clamp(shape.radiusPx?.sm ?? SEED_BOUNDS.radiusPx.sm.default, SEED_BOUNDS.radiusPx.sm.min, SEED_BOUNDS.radiusPx.sm.max),
    md: clamp(shape.radiusPx?.md ?? SEED_BOUNDS.radiusPx.md.default, SEED_BOUNDS.radiusPx.md.min, SEED_BOUNDS.radiusPx.md.max),
    lg: clamp(shape.radiusPx?.lg ?? SEED_BOUNDS.radiusPx.lg.default, SEED_BOUNDS.radiusPx.lg.min, SEED_BOUNDS.radiusPx.lg.max),
    pill: clamp(shape.radiusPx?.pill ?? SEED_BOUNDS.radiusPx.pill.default, SEED_BOUNDS.radiusPx.pill.min, SEED_BOUNDS.radiusPx.pill.max),
  };

  const intensity = SHADOW_SCALE[shape.shadow ?? "standard"];
  const shadow = (y: number, blur: number, alpha: number) =>
    intensity === 0
      ? "none"
      : `0 ${round(y * intensity, 2)}px ${round(blur * intensity, 2)}px ${withAlpha(colors.textPrimary, round(alpha * intensity, 3))}`;

  const type = typeScale(seed);

  // Chrome. A rail is the one surface that may legitimately break from the
  // page — a brand block down the left is a recognised identity move — so the
  // styles span "same as the page" to "solid accent", and each derives its ink
  // from the surface it actually lands on.
  const navStyle = seed.chrome?.navStyle ?? "page";
  const navBg =
    navStyle === "accent" ? accent
    : navStyle === "tinted" ? shiftL(colors.bg, dark ? 0.04 : -0.03)
    : colors.bg;
  const navInk = navStyle === "accent" ? emphasisInk : colors.textPrimary;

  const dangerSolid = legibleOn(INTENT_HUES.danger, colors.bg, 3);

  const theme: ResolvedTheme = {
    // Text
    "--ui-text-primary": colors.textPrimary,
    "--ui-text-secondary": towardL(colors.textPrimary, colors.textMuted, 0.5),
    "--ui-text-muted": colors.textMuted,
    "--ui-text-disabled": towardL(colors.textMuted, colors.bg, 0.45),
    "--ui-text-placeholder": towardL(colors.textMuted, colors.bg, 0.3),
    "--ui-text-inverse": readableInkOn(colors.textPrimary, INKS),
    "--ui-text-link": link,
    "--ui-text-link-hover": shiftL(link, up * 0.08),
    "--ui-text-on-accent": readableInkOn(accent, INKS),
    "--ui-text-on-emphasis": emphasisInk,
    // A brand may set the muted block dark or light independently of the page,
    // so text-primary alone would be dark-on-dark.
    "--ui-text-on-muted": readableInkOn(colors.muted, INKS),
    "--ui-text-on-danger-solid": readableInkOn(dangerSolid, INKS),

    // Surfaces. Elevated is never DARKER than what it floats over — that is
    // what "raised" reads as in both schemes. A brand whose surface is already
    // white gets elevated == surface, and the separation falls to the border
    // and shadow, which is how a modal on a white page has always read.
    "--ui-bg-base": colors.bg,
    "--ui-bg-surface": colors.surface,
    "--ui-bg-elevated": shiftL(colors.surface, dark ? 0.06 : 0.02),
    "--ui-bg-sunken": shiftL(colors.surface, dark ? -0.03 : -0.04),
    "--ui-bg-muted": colors.muted,
    "--ui-bg-overlay": withAlpha(dark ? "#000000" : colors.textPrimary, 0.55),
    "--ui-bg-hover": shiftL(colors.surface, up * 0.05),
    "--ui-bg-active": shiftL(colors.surface, up * 0.1),
    "--ui-bg-accent": accent,
    "--ui-bg-accent-subtle": withAlpha(accent, 0.12),
    "--ui-bg-emphasis": accent,
    "--ui-bg-emphasis-hover": shiftL(accent, awayFromInk * 0.06),
    "--ui-bg-emphasis-active": shiftL(accent, awayFromInk * 0.11),
    "--ui-bg-danger-solid": dangerSolid,

    // Borders and focus
    "--ui-border-subtle": colors.border,
    "--ui-border-default": inkBorder(0.14),
    "--ui-border-strong": inkBorder(0.3),
    // Focus has to be SEEN, so it uses the legible accent, not the raw one.
    "--ui-border-focus": link,
    "--ui-focus-ring-color": link,
    // Spelled out rather than composed from other vars: whether a nested
    // var() re-resolves against a themed scope is exactly the kind of
    // substitution-timing detail no one should have to be right about.
    "--ui-focus-ring": `0 0 0 2px ${colors.bg}, 0 0 0 4px ${link}`,

    // Intents
    "--ui-intent-success-fg": legibleOn(INTENT_HUES.success, colors.bg),
    "--ui-intent-success-bg": withAlpha(INTENT_HUES.success, 0.14),
    "--ui-intent-warning-fg": legibleOn(INTENT_HUES.warning, colors.bg),
    "--ui-intent-warning-bg": withAlpha(INTENT_HUES.warning, 0.14),
    "--ui-intent-danger-fg": legibleOn(INTENT_HUES.danger, colors.bg),
    "--ui-intent-danger-bg": withAlpha(INTENT_HUES.danger, 0.14),
    "--ui-intent-info-fg": legibleOn(INTENT_HUES.info, colors.bg),
    "--ui-intent-info-bg": withAlpha(INTENT_HUES.info, 0.14),

    // Categorical data
    "--ui-data-informational-fg": legibleOn(DATA_HUES.informational, colors.bg),
    "--ui-data-informational-bg": withAlpha(DATA_HUES.informational, 0.14),
    "--ui-data-informational-solid": legibleOn(DATA_HUES.informational, colors.bg, 3),
    "--ui-data-commercial-fg": legibleOn(DATA_HUES.commercial, colors.bg),
    "--ui-data-commercial-bg": withAlpha(DATA_HUES.commercial, 0.14),
    "--ui-data-commercial-solid": legibleOn(DATA_HUES.commercial, colors.bg, 3),
    "--ui-data-transactional-fg": legibleOn(DATA_HUES.transactional, colors.bg),
    "--ui-data-transactional-bg": withAlpha(DATA_HUES.transactional, 0.14),
    "--ui-data-transactional-solid": legibleOn(DATA_HUES.transactional, colors.bg, 3),
    "--ui-data-navigational-fg": legibleOn(DATA_HUES.navigational, colors.bg),
    "--ui-data-navigational-bg": withAlpha(DATA_HUES.navigational, 0.14),
    "--ui-data-navigational-solid": legibleOn(DATA_HUES.navigational, colors.bg, 3),

    // Shape
    "--ui-radius-sm": px(radius.sm),
    "--ui-radius-md": px(radius.md),
    "--ui-radius-lg": px(radius.lg),
    "--ui-radius-xl": px(radius.lg * 1.35),
    "--ui-radius-2xl": px(radius.lg * 2),
    "--ui-radius-full": px(radius.pill),
    "--ui-border-width": px(clamp(shape.borderWidthPx ?? SEED_BOUNDS.borderWidthPx.default, SEED_BOUNDS.borderWidthPx.min, SEED_BOUNDS.borderWidthPx.max)),
    "--ui-shadow-sm": shadow(1, 2, 0.06),
    "--ui-shadow-md": shadow(2, 8, 0.08),
    "--ui-shadow-lg": shadow(8, 24, 0.1),
    "--ui-shadow-xl": shadow(16, 48, 0.12),

    // Typography
    "--ui-font-body": seed.typography?.fontBody ?? "Aspekta, ui-sans-serif, system-ui, sans-serif",
    "--ui-font-display": seed.typography?.fontDisplay ?? "Aspekta, ui-sans-serif, system-ui, sans-serif",
    "--ui-font-mono": seed.typography?.fontMono ?? "ui-monospace, SFMono-Regular, Menlo, monospace",
    ...type,

    // Chrome
    "--ui-nav-bg": navBg,
    "--ui-nav-ink": navInk,
    "--ui-nav-ink-muted": navStyle === "accent" ? withAlpha(navInk, 0.72) : colors.textMuted,
    "--ui-nav-border": navStyle === "accent" ? withAlpha(navInk, 0.16) : colors.border,
    "--ui-nav-active-bg":
      navStyle === "accent"
        ? shiftL(accent, awayFromInk * 0.1)
        : withAlpha(accent, navStyle === "tinted" ? 0.14 : 0.1),
    // The active label is TEXT ON THE RAIL, so it clears AA against the rail's
    // own background rather than the page's.
    "--ui-nav-active-ink": navStyle === "accent" ? navInk : legibleOn(accent, navBg),
    "--ui-nav-width": "17rem",
    "--ui-nav-rail-width": "3.5rem",
    "--ui-content-width": `${clamp(seed.chrome?.contentWidthPx ?? SEED_BOUNDS.contentWidthPx.default, SEED_BOUNDS.contentWidthPx.min, SEED_BOUNDS.contentWidthPx.max)}px`,
    "--ui-section-gap": seed.chrome?.sectionGap ?? "4rem",
    "--ui-logo-height": seed.chrome?.logoHeight ?? "2rem",
  };

  return theme;
}

// ── Contrast audit ──────────────────────────────────────────────────────

/**
 * Walk every declared pair and nudge the foreground until it clears AA.
 *
 * Adjustments are returned, not swallowed: a theme editor can then tell the
 * author "we adjusted your link colour for legibility" instead of silently
 * shipping either a contrast failure or a colour they did not choose.
 */
function auditContrast(theme: ResolvedTheme): ContrastAdjustment[] {
  const adjustments: ContrastAdjustment[] = [];

  for (const [fgToken, bgToken] of CONTRAST_PAIRS) {
    const fg = theme[fgToken];
    // Translucent backgrounds are composited over the page first — contrast
    // against something you can see through is not a defined quantity.
    const bg = flatten(theme[bgToken], theme["--ui-bg-base"]);

    const before = contrastRatio(fg, bg);
    if (before >= AA_TEXT) continue;

    const fixed = legibleOn(fg, bg);
    const after = contrastRatio(fixed, bg);
    if (fixed === fg) continue;

    theme[fgToken] = fixed;
    adjustments.push({ token: fgToken, against: bgToken, from: fg, to: fixed, ratioBefore: round(before, 2), ratioAfter: round(after, 2) });
  }

  return adjustments;
}

// ── Public API ──────────────────────────────────────────────────────────

export function resolveTheme(seed: ThemeSeed, options: ResolveOptions = {}): ResolveResult {
  const issues = validateSeed(seed);
  const scheme = options.scheme ?? (isDark(seed.colors.bg) ? "dark" : "light");
  const colors = colorsFor(seed, scheme);

  const theme = derive(seed, colors);
  const adjustments = auditContrast(theme);

  return { theme, adjustments, issues };
}

export interface ResolvedPair {
  light: ResolvedTheme;
  dark: ResolvedTheme;
  adjustments: { light: ContrastAdjustment[]; dark: ContrastAdjustment[] };
  issues: SeedValidationIssue[];
}

/** Both schemes at once — what the CSS emitter needs to write `light-dark()`. */
export function resolveThemePair(seed: ThemeSeed): ResolvedPair {
  const light = resolveTheme(seed, { scheme: "light" });
  const dark = resolveTheme(seed, { scheme: "dark" });
  return {
    light: light.theme,
    dark: dark.theme,
    adjustments: { light: light.adjustments, dark: dark.adjustments },
    issues: light.issues,
  };
}

/** Tokens the resolver failed to produce. Always empty if it type-checks —
 *  exported so tests can assert that at runtime too, for the JS consumers who
 *  do not get the compile-time guarantee. */
export function missingTokens(theme: ResolvedTheme): BrandableToken[] {
  return BRANDABLE_TOKENS.filter((t) => {
    const value = theme[t];
    return value === undefined || value === "";
  });
}
