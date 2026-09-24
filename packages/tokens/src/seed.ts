/**
 * What a theme author supplies.
 *
 * Deliberately small. Everything a component reads is *derived* from this
 * (see `resolve.ts`); authors get knobs, not tokens. Per ADR 0006(d) there is
 * no per-token override — the pressure valve for "I need more control" is a new
 * knob here, which is reviewable and derivable, rather than an escape hatch
 * that would break the completeness and contrast guarantees.
 *
 * Diorama's own look is theme zero: this same shape, no special case.
 */

/** The seven colours an author actually picks. */
export interface SeedColors {
  /** Page background. */
  bg: string;
  /** Cards, panels, anything floating on the page. */
  surface: string;
  /** Recessed/secondary blocks. May be light or dark independently of the page. */
  muted: string;
  /** Body ink. */
  textPrimary: string;
  /** De-emphasised ink. */
  textMuted: string;
  /** Hairlines. */
  border: string;
  /** The brand colour. Seeds every emphasis, link and focus role. */
  accent: string;
}

export type NavStyle = "page" | "tinted" | "accent";

/** The steps of the weight ladder, named as the `font-*` utilities are. */
export type WeightName = "regular" | "book" | "medium" | "semibold" | "bold";

export interface SeedTypography {
  /** Body size in px. Drives the whole type scale. */
  baseSize?: number;
  /** Modular-scale ratio between steps. */
  ratio?: number;
  fontBody?: string;
  fontDisplay?: string;
  /** Maps the weight ladder onto the cuts the brand's face actually has
   *  (ADR 0020 §3). Aspekta's 450/550 exist because it is variable; a static
   *  face would synthesise or round them, so a brand points `book` and
   *  `semibold` at real cuts. Every role's weight follows. */
  weights?: Partial<Record<WeightName, number>>;
  /** `tight` (default) is the −0.02em Aspekta is set at. `font` sets every
   *  tracking to 0 for a face that ships with its own spacing. */
  tracking?: "tight" | "font";
  /** No mono counterpart exists — ADR 0011. Code content is set in the body
   *  face; numeric alignment uses `font-variant-numeric: tabular-nums`. */
}

/** Elevation intensity. A knob rather than a raw CSS value, per ADR 0006(d):
 *  the four shadow levels stay in proportion and pick up the theme's own ink,
 *  which hand-authored values cannot be trusted to do. "none" is a legitimate
 *  choice, not an absence. */
export type ShadowIntensity = "none" | "subtle" | "standard" | "strong";

export interface SeedShape {
  /** Six knobs matching the approved radius scale (4/8/16/24/32/pill). */
  radiusPx?: { sm?: number; md?: number; lg?: number; xl?: number; "2xl"?: number; pill?: number };
  /** The base of the stroke scale (ADR 0020 §2): `--ui-stroke-default` is
   *  this, the control hairline 1.5×, the thick stroke 2×. Floored at 1 — a
   *  0 base would erase every control boundary. */
  borderWidthPx?: number;
  /** The focus indicator's width, deliberately NOT derived from the base: a
   *  brand choosing delicate edges must not thin its focus ring. Floored at
   *  2px (SC 2.4.13, AAA, adopted on purpose). */
  focusRingWidthPx?: number;
  shadow?: ShadowIntensity;
}

export interface SeedChrome {
  navStyle?: NavStyle;
  contentWidthPx?: number;
  sectionGap?: string;
  logoHeight?: string;
}

export interface ThemeSeed {
  colors: SeedColors;
  /**
   * Hand-authored dark counterpart (ADR 0006(b)). When absent the resolver
   * derives one. Authoring it is what makes a deliberately dark identity — or
   * the app's own dark mode — exact rather than approximated.
   */
  dark?: SeedColors;
  typography?: SeedTypography;
  shape?: SeedShape;
  chrome?: SeedChrome;
}

/**
 * Bounds on the numeric knobs.
 *
 * These are not paranoia: `baseSize` and `ratio` re-bind the system's type
 * roles inside a themed scope (ADR 0006(c)), so an unclamped ratio would let
 * one theme produce 90px body text and break every layout built on the scale.
 */
export const SEED_BOUNDS = {
  baseSize: { min: 13, max: 20, default: 16 },
  /** RESERVED (ADR 0009). The type scale is an authored table, not a modular
   *  derivation, so `ratio` is currently accepted and ignored. It stays in the
   *  seed shape so accepting it again later is not a breaking change. */
  ratio: { min: 1.1, max: 1.414, default: 1.2 },
  contentWidthPx: { min: 560, max: 1440, default: 880 },
  /** Any weight a variable or static face can name (CSS allows 1–1000; the
   *  named cuts run 100–900). Defaults are Aspekta's ladder. */
  weight: { min: 100, max: 900 },
  borderWidthPx: { min: 1, max: 2, default: 1 },
  focusRingWidthPx: { min: 2, max: 4, default: 2 },
  radiusPx: {
    sm: { min: 0, max: 24, default: 4 },
    md: { min: 0, max: 32, default: 8 },
    lg: { min: 0, max: 48, default: 16 },
    xl: { min: 0, max: 64, default: 24 },
    "2xl": { min: 0, max: 80, default: 32 },
    pill: { min: 0, max: 999, default: 999 },
  },
} as const;

export const clamp = (n: number, min: number, max: number) => (n < min ? min : n > max ? max : n);

/**
 * Characters a seed value may contain.
 *
 * A hard security boundary inherited from the previous generation, moved to
 * *intake*. Resolved themes are serialised into CSS, and a value carrying `}`
 * or `<` can close the block and open a tag. The old implementation filtered
 * offending declarations at emit time, which failed silently — a brand would
 * simply see the app's default bleed through with no signal. Rejecting at
 * intake makes it loud, and by the time values reach an emitter they are
 * derived and known-safe.
 */
export const SAFE_SEED_VALUE = /^[\w\s#(),.%/+*-]+$/;

export interface SeedValidationIssue {
  path: string;
  message: string;
}

/** Structural + safety validation. Colour parseability is checked by the resolver,
 *  which can fall back; these issues cannot be recovered from. */
export function validateSeed(seed: ThemeSeed): SeedValidationIssue[] {
  const issues: SeedValidationIssue[] = [];

  const checkValue = (path: string, value: string | undefined) => {
    if (value === undefined) return;
    if (!SAFE_SEED_VALUE.test(value)) {
      issues.push({ path, message: `contains characters that cannot be serialised into CSS safely` });
    }
  };

  const requiredColors: ReadonlyArray<keyof SeedColors> = [
    "bg", "surface", "muted", "textPrimary", "textMuted", "border", "accent",
  ];

  for (const group of ["colors", "dark"] as const) {
    const colors = seed[group];
    if (!colors) continue;
    for (const key of requiredColors) {
      const value = colors[key];
      if (group === "colors" && (value === undefined || value === "")) {
        issues.push({ path: `colors.${key}`, message: "is required" });
        continue;
      }
      checkValue(`${group}.${key}`, value);
    }
  }

  checkValue("typography.fontBody", seed.typography?.fontBody);
  checkValue("typography.fontDisplay", seed.typography?.fontDisplay);
  checkValue("chrome.sectionGap", seed.chrome?.sectionGap);
  checkValue("chrome.logoHeight", seed.chrome?.logoHeight);

  return issues;
}
