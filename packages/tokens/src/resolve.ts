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
  BRANDABLE_TOKENS, CONTRAST_PAIRS, NONTEXT_CONTRAST_PAIRS,
  type BrandableToken, type ResolvedTheme,
} from "./contract.ts";
import { BLUE, GREEN, LAVENDER, ORANGE, RED } from "./palette.ts";
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
 * Meaning-bearing hues — the approved ramps' step 40, the AA-safe foreground
 * step (ADR 0008). Fixed rather than accent-derived so "danger" is red in
 * every theme; only their tone moves, to stay legible on the theme's page.
 */
const INTENT_HUES = {
  success: GREEN[40],
  warning: ORANGE[40],
  danger: RED[40],
  info: BLUE[40],
} as const;

/**
 * Categorical data hues. Curated, NOT derived from the accent (ADR 0006(a)):
 * a ramp generated from one accent goes muddy for red or orange brands, and
 * categories a reader cannot tell apart have failed at the only job they have.
 * The approved ramps' step 40, re-toned per background for legibility.
 */
const DATA_HUES = {
  informational: BLUE[40],
  commercial: ORANGE[40],
  transactional: GREEN[40],
  navigational: LAVENDER[40],
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
  /**
   * @internal — theme zero only (ADR 0008).
   *
   * An authored role map layered over the derivation, because the approved
   * design IS the source of truth for Diorama's own theme and the derivation
   * approximates it. Both guarantees still hold: completeness is checked on
   * the merged result, and the contrast audit runs AFTER the merge, so an
   * authored value that fails AA is corrected exactly like a derived one.
   *
   * This is not a brand-author surface. Brand themes are plain `ThemeSeed`
   * JSON and never reach this option (ADR 0006(d) still stands); the theme
   * intake layer accepts seeds, not resolver options.
   */
  authored?: Partial<ResolvedTheme>;
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

/**
 * The authored type table (ADR 0009, approved handover 2026-08-03).
 *
 * The scale is hand-tuned, not modular — no single ratio reproduces
 * 48/32/24/20/16/14/13/12, and each role carries its own leading, weight and
 * tracking. `px` is what the resolver emits (scaled by the seed's `baseSize`);
 * the other attributes are data for the component layer, which pairs them with
 * the shared `--ui-weight-*` / `--ui-leading-*` / `--ui-tracking-*` tokens.
 * There is no `code-sm` role: without a mono face it duplicated `body-sm`
 * (ADR 0011).
 */
export const TYPE_ROLES = {
  "--ui-text-display-lg": { px: 48, leading: 1.35, weight: 500, tracking: "-0.02em" },
  "--ui-text-display-md": { px: 32, leading: 1.35, weight: 500, tracking: "-0.02em" },
  "--ui-text-title-lg": { px: 24, leading: 1.35, weight: 500, tracking: "-0.02em" },
  "--ui-text-title-md": { px: 20, leading: 1.25, weight: 550, tracking: "-0.02em" },
  "--ui-text-title-sm": { px: 16, leading: 1.35, weight: 600, tracking: "-0.02em" },
  "--ui-text-body-lg": { px: 16, leading: 1.55, weight: 500, tracking: "-0.02em" },
  "--ui-text-body-md": { px: 14, leading: 1.55, weight: 400, tracking: "-0.02em" }, // base target
  "--ui-text-body-sm": { px: 13, leading: 1.35, weight: 500, tracking: "-0.02em" },
  "--ui-text-label-md": { px: 13, leading: 1.3, weight: 600, tracking: "-0.02em" },
  "--ui-text-label-sm": { px: 12, leading: 1.3, weight: 600, tracking: "-0.02em" },
  "--ui-text-caption": { px: 12, leading: 1.35, weight: 600, tracking: "-0.02em" },
  "--ui-text-button-lg": { px: 16, leading: 1, weight: 600, tracking: "-0.02em" },
  "--ui-text-button-sm": { px: 12, leading: 1, weight: 600, tracking: "-0.02em" },
} as const;

/** Roles that scale with the viewport. Body and below stay fixed, because
 *  fluid body text makes line length unpredictable. */
/** The smallest size the scale admits at all (ADR 0009): caption / label-sm. */
const SCALE_FLOOR_PX = 12;

const FLUID_ROLES = new Set<string>([
  "--ui-text-display-lg", "--ui-text-display-md",
  "--ui-text-title-lg", "--ui-text-title-md", "--ui-text-title-sm",
]);

// 4 places, not 3: every whole-px size divided by a 16px base terminates
// within four decimals (1/16 = 0.0625), so 3 turned the designed 13px label
// into 0.813rem — 13.008px in the browser. Sub-pixel, but it makes a
// px-for-px comparison against the design sheet impossible to assert.
const round = (n: number, places = 4) => Number(n.toFixed(places));

/** Linear interpolation between 375px and 1440px viewports, expressed so the
 *  browser does the work: `clamp(min, intercept + slope·vw, max)`. */
function fluid(minRem: number, maxRem: number): string {
  const MIN_VW = 23.4375; // 375px
  const MAX_VW = 90; // 1440px
  const slope = (maxRem - minRem) / (MAX_VW - MIN_VW);
  const intercept = minRem - slope * MIN_VW;
  return `clamp(${round(minRem)}rem, ${round(intercept)}rem + ${round(slope * 100, 2)}vw, ${round(maxRem)}rem)`;
}

function typeScale(seed: ThemeSeed): Record<keyof typeof TYPE_ROLES, string> {
  const baseSize = clamp(
    seed.typography?.baseSize ?? SEED_BOUNDS.baseSize.default,
    SEED_BOUNDS.baseSize.min,
    SEED_BOUNDS.baseSize.max,
  );
  // The table is authored at baseSize 16; a brand's baseSize scales every
  // role proportionally. `ratio` is reserved (ADR 0009) and ignored here.
  const factor = baseSize / SEED_BOUNDS.baseSize.default;

  const out = {} as Record<keyof typeof TYPE_ROLES, string>;
  for (const [token, role] of Object.entries(TYPE_ROLES) as [keyof typeof TYPE_ROLES, (typeof TYPE_ROLES)[keyof typeof TYPE_ROLES]][]) {
    const max = (role.px * factor) / 16;
    // A flat 72% shrink has no idea what it is shrinking. On `title-sm` (16px)
    // it resolved to 11.52px on a narrow viewport — under the scale's OWN 12px
    // floor, which ADR 0009 set after an 11px label pushed the small button
    // below the WCAG target size. Fluid roles may shrink, never below the
    // floor, and never past their own maximum on a tiny base size.
    const floor = (SCALE_FLOOR_PX * factor) / 16;
    const min = Math.min(max, Math.max(max * 0.72, floor));
    out[token] = FLUID_ROLES.has(token) ? fluid(min, max) : `${round(max)}rem`;
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

  // A spectrum from the brand's own accent: same lightness and chroma, hue
  // rotated, so any seed produces a coherent three-stop sweep instead of
  // inheriting Diorama's. `in oklab` keeps the midpoint from going muddy the
  // way an sRGB interpolation does between distant hues.
  const spectrum = (() => {
    const base = toOklch(colors.accent);
    if (!base) return null;
    const at = (deg: number) =>
      formatColor(oklchToRgb({ ...base, h: (base.h + deg + 360) % 360 }));
    return [at(0), at(70), at(150)] as const;
  })();
  const brandGradient = spectrum
    ? `linear-gradient(in oklab 270deg, ${spectrum[0]} 0%, ${spectrum[1]} 50%, ${spectrum[2]} 100%)`
    : `linear-gradient(in oklab 270deg, ${accent} 0%, ${accent} 100%)`;


  const shape = seed.shape ?? {};
  const px = (n: number) => (n === 0 ? "0" : `${Math.round(n)}px`);
  const radiusKnob = (key: keyof typeof SEED_BOUNDS.radiusPx) =>
    clamp(shape.radiusPx?.[key] ?? SEED_BOUNDS.radiusPx[key].default, SEED_BOUNDS.radiusPx[key].min, SEED_BOUNDS.radiusPx[key].max);
  const radius = {
    sm: radiusKnob("sm"), md: radiusKnob("md"), lg: radiusKnob("lg"),
    xl: radiusKnob("xl"), "2xl": radiusKnob("2xl"), pill: radiusKnob("pill"),
  };

  // Layered translucent shadows in the theme's own ink (CONVENTIONS §6).
  // The xl geometry is the approved modal's shadow; sm is the raised-control
  // micro-lift from the handover components sheet.
  const intensity = SHADOW_SCALE[shape.shadow ?? "standard"];
  const shadow = (layers: Array<[y: number, blur: number, spread: number, alpha: number]>) =>
    intensity === 0
      ? "none"
      : layers
          .map(([y, blur, spread, alpha]) => {
            const grow = (n: number) => round(n * intensity, 2);
            const ink = withAlpha(colors.textPrimary, round(alpha * intensity, 3));
            return spread === 0
              ? `0 ${grow(y)}px ${grow(blur)}px ${ink}`
              : `0 ${grow(y)}px ${grow(blur)}px ${grow(spread)}px ${ink}`;
          })
          .join(", ");

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
    // A field is RECESSED from whatever contains it, and the surface scale
    // inverts between schemes: in light that means the page's lightest value,
    // in dark it means going further DOWN than any panel. Painting a field
    // with `bg-base` made it identical to its container in dark.
    "--ui-bg-field": dark ? shiftL(colors.surface, -0.06) : colors.bg,
    "--ui-bg-muted": colors.muted,
    "--ui-bg-overlay": withAlpha(dark ? "#000000" : colors.textPrimary, 0.55),
    "--ui-bg-hover": shiftL(colors.surface, up * 0.05),
    "--ui-bg-active": shiftL(colors.surface, up * 0.1),
    "--ui-bg-accent": accent,
    // Same "step away from your own ink" rule as emphasis, for the same
    // reason: keeps the label's contrast monotonic across all three states.
    "--ui-bg-accent-hover": shiftL(accent, awayFromInk * 0.06),
    "--ui-bg-accent-active": shiftL(accent, awayFromInk * 0.11),
    "--ui-bg-accent-subtle": withAlpha(accent, 0.12),
    // Floored against the SUNKEN well, which is the darkest neutral a fill
    // sits on; clearing that clears the lighter grounds too.
    "--ui-bg-accent-legible": legibleOn(accent, shiftL(colors.surface, dark ? -0.03 : -0.04), 3),
    "--ui-bg-emphasis": accent,
    "--ui-bg-emphasis-hover": shiftL(accent, awayFromInk * 0.06),
    "--ui-bg-emphasis-active": shiftL(accent, awayFromInk * 0.11),
    "--ui-bg-danger-solid": dangerSolid,
    "--ui-gradient-brand": brandGradient,

    // Borders and focus (ADR 0010: subtle → default → control → strong).
    // Control is opaque, not an alpha hairline: it must MEASURE at 3:1
    // (SC 1.4.11), and contrast against a translucent value is only defined
    // after compositing — so it is composited by construction.
    "--ui-border-subtle": colors.border,
    // Derived the same way as `control` and `strong`, not as an alpha
    // hairline. As `inkBorder(0.14)` it composited to 1.48:1 on the dark
    // ground — indistinguishable from `subtle` at 1.48:1 — so two of ADR
    // 0010's four steps were the same colour in dark while looking distinct in
    // light. The floor is 2:1, which is what theme zero's light scheme already
    // authors (neutral-70, 2.14:1); this makes every scheme land there rather
    // than only the one someone checked.
    "--ui-border-default": legibleOn(towardL(colors.textPrimary, colors.bg, 0.72), colors.bg, 2),
    "--ui-border-control": legibleOn(towardL(colors.textPrimary, colors.bg, 0.55), colors.bg, 3),
    // Strong must MEASURE stronger than control, not merely be named so. As a
    // 0.3 alpha hairline it composited to 1.78:1 on the dark ground while
    // control — which is floored at 3:1 — sat at 3.09:1, so the stack inverted
    // in dark and a mixed checkbox lost its box entirely. Same construction as
    // control, one step nearer the ink and one floor higher.
    "--ui-border-strong": legibleOn(towardL(colors.textPrimary, colors.bg, 0.35), colors.bg, 4.5),
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
    "--ui-intent-danger-bg-hover": withAlpha(INTENT_HUES.danger, 0.22),
    "--ui-intent-danger-border": withAlpha(INTENT_HUES.danger, 0.32),
    // Deeper than -fg: measured against the tint it actually sits on, at the
    // stricter floor a filled control deserves.
    "--ui-text-on-danger-subtle": legibleOn(
      INTENT_HUES.danger,
      flatten(withAlpha(INTENT_HUES.danger, 0.14), colors.bg),
      7,
    ),
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
    "--ui-radius-xl": px(radius.xl),
    "--ui-radius-2xl": px(radius["2xl"]),
    "--ui-radius-full": px(radius.pill),
    "--ui-border-width": px(clamp(shape.borderWidthPx ?? SEED_BOUNDS.borderWidthPx.default, SEED_BOUNDS.borderWidthPx.min, SEED_BOUNDS.borderWidthPx.max)),
    // sm is the approved elevation language (Modal Example: 0 0.5px 1.5px
    // ink@0.16 — surfaces separate by tint, the shadow is a whisper). The
    // larger steps are engineering defaults extrapolated from it plus the
    // draft modal's overlay geometry, pending an elevation sheet.
    "--ui-shadow-sm": shadow([[0.5, 1.5, 0, 0.16]]),
    "--ui-shadow-md": shadow([[1, 3, 0, 0.14], [0.5, 1.5, 0, 0.08]]),
    "--ui-shadow-lg": shadow([[8, 24, -4, 0.09], [2, 8, 0, 0.05]]),
    "--ui-shadow-xl": shadow([[20, 25, -5, 0.1], [10, 10, -5, 0.04]]),

    // Typography
    "--ui-font-body": seed.typography?.fontBody ?? "Aspekta, ui-sans-serif, system-ui, sans-serif",
    "--ui-font-display": seed.typography?.fontDisplay ?? "Aspekta, ui-sans-serif, system-ui, sans-serif",
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

  const audit = (
    pairs: ReadonlyArray<readonly [BrandableToken, BrandableToken]>,
    floor: number,
  ) => {
    for (const [fgToken, bgToken] of pairs) {
      const fg = theme[fgToken];
      // Translucent backgrounds are composited over the page first — contrast
      // against something you can see through is not a defined quantity.
      const bg = flatten(theme[bgToken], theme["--ui-bg-base"]);

      const before = contrastRatio(fg, bg);
      if (before >= floor) continue;

      const fixed = legibleOn(fg, bg, floor);
      const after = contrastRatio(fixed, bg);
      if (fixed === fg) continue;

      theme[fgToken] = fixed;
      adjustments.push({ token: fgToken, against: bgToken, from: fg, to: fixed, ratioBefore: round(before, 2), ratioAfter: round(after, 2) });
    }
  };

  // Text first: if it moves --ui-border-focus's source colour the non-text
  // pass re-checks the result, never the other way around.
  audit(CONTRAST_PAIRS, AA_TEXT);
  // WCAG 2.2 SC 1.4.11 — non-text boundaries that identify a control.
  audit(NONTEXT_CONTRAST_PAIRS, 3);

  return adjustments;
}

// ── Public API ──────────────────────────────────────────────────────────

export function resolveTheme(seed: ThemeSeed, options: ResolveOptions = {}): ResolveResult {
  const issues = validateSeed(seed);
  const scheme = options.scheme ?? (isDark(seed.colors.bg) ? "dark" : "light");
  const colors = colorsFor(seed, scheme);

  const theme = options.authored
    ? { ...derive(seed, colors), ...options.authored }
    : derive(seed, colors);
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
export function resolveThemePair(
  seed: ThemeSeed,
  options: { authored?: { light?: Partial<ResolvedTheme>; dark?: Partial<ResolvedTheme> } } = {},
): ResolvedPair {
  const light = resolveTheme(seed, { scheme: "light", ...(options.authored?.light ? { authored: options.authored.light } : {}) });
  const dark = resolveTheme(seed, { scheme: "dark", ...(options.authored?.dark ? { authored: options.authored.dark } : {}) });
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
