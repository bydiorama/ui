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
  /**
   * The scale's 16px reference, in px — NOT the body size. Default 16.
   *
   * The type scale is an authored table (ADR 0009) drawn at a reference of
   * 16, and `baseSize` multiplies every row by `baseSize / 16`. Body copy is
   * `body-md`, the table's 14px row, so `baseSize: 13` gives 11.375px body
   * text, not 13px. Clamped to 13–20 (`SEED_BOUNDS.baseSize`).
   *
   * | baseSize | body-lg / title-sm | body-md (body copy) | body-sm / label-md | label-sm / caption |
   * |---------:|-------------------:|--------------------:|-------------------:|-------------------:|
   * |       13 |                 13 |              11.375 |             10.563 |               9.75 |
   * |       14 |                 14 |               12.25 |             11.375 |               10.5 |
   * |       15 |                 15 |              13.125 |             12.188 |              11.25 |
   * |   **16** |             **16** |              **14** |             **13** |             **12** |
   * |       17 |                 17 |              14.875 |             13.813 |              12.75 |
   * |       18 |                 18 |               15.75 |             14.625 |               13.5 |
   * |       20 |                 20 |                17.5 |              16.25 |                 15 |
   *
   * (px; the fluid display/title roles scale the same way at their maximum.)
   * To get body copy of B px, set `baseSize` to `B × 16 / 14` — 13px body is
   * 14.857. Below 16 the label and caption rows fall under the scale's own
   * 12px floor; `validateSeed` reports an `info` issue for anything under 15.
   */
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
 * Every numeric knob's real gate, run before `clamp` ever sees the value.
 *
 * A seed is untyped JSON at the boundary — an author-supplied theme, not a
 * TypeScript literal — so `"2"`, `null` or `NaN` arrive as legitimate input.
 * `clamp` assumed a finite `number` and either threw (`"2".toFixed is not a
 * function`, one call site up the chain) or propagated `NaN` into a composite
 * CSS value with no signal — a `NaN`-wide focus ring is emitted, not a build
 * failure, and it guards nothing.
 *
 * Deliberately NOT a coercing parse: `Number("2")` is tempting, but a knob
 * typed `number` that arrives as a string is a seed built by hand or by a
 * broken editor, and guessing at "2px" or a locale-formatted "2,5" invites
 * more failure modes than it fixes. Anything short of a genuine finite
 * `number` falls back; `validateSeed` is what tells the author it happened.
 */
export const seedNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

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
  /**
   * `error`: the value was unusable — unsafe, missing or not a number — and
   * the resolver fell back. `info`: the value is valid and was used, but it
   * resolves to something authors are known to misread (a `baseSize` under
   * 15 shrinks body copy well below the number typed). A build may fail on
   * `error`; it should print `info` and carry on.
   */
  severity: "error" | "info";
}

/** Below this, `validateSeed` explains what `baseSize` actually resolves to. */
export const BASE_SIZE_INFO_BELOW = 15;

/** Structural + safety validation. Colour parseability is checked by the
 *  resolver, which can fall back; `error` issues cannot be recovered from,
 *  `info` issues explain a valid value (see `SeedValidationIssue.severity`). */
export function validateSeed(seed: ThemeSeed): SeedValidationIssue[] {
  const issues: SeedValidationIssue[] = [];

  const checkValue = (path: string, value: string | undefined) => {
    if (value === undefined) return;
    if (!SAFE_SEED_VALUE.test(value)) {
      issues.push({ path, severity: "error", message: `contains characters that cannot be serialised into CSS safely` });
    }
  };

  /** `seedNumber` recovers silently, by design (a build must never throw on
   *  a bad brand seed); this is what tells the author it happened, so
   *  "borderWidthPx: '2'" reads as their bug rather than a mystery default. */
  const checkNumber = (path: string, value: unknown) => {
    if (value === undefined) return;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push({ path, severity: "error", message: `must be a finite number — the resolver fell back to its default` });
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
        issues.push({ path: `colors.${key}`, severity: "error", message: "is required" });
        continue;
      }
      checkValue(`${group}.${key}`, value);
    }
  }

  checkValue("typography.fontBody", seed.typography?.fontBody);
  checkValue("typography.fontDisplay", seed.typography?.fontDisplay);
  checkValue("chrome.sectionGap", seed.chrome?.sectionGap);
  checkValue("chrome.logoHeight", seed.chrome?.logoHeight);

  checkNumber("typography.baseSize", seed.typography?.baseSize);
  // A VALID baseSize read as "body size" — which is what this field's doc
  // used to say. A consumer set 13 expecting 13px body copy and got 11.375px.
  const baseSize = seed.typography?.baseSize;
  if (typeof baseSize === "number" && Number.isFinite(baseSize) && baseSize < BASE_SIZE_INFO_BELOW) {
    const used = clamp(baseSize, SEED_BOUNDS.baseSize.min, SEED_BOUNDS.baseSize.max);
    const px = (row: number) => `${Number(((row * used) / SEED_BOUNDS.baseSize.default).toFixed(3))}px`;
    const forBody = Number(((baseSize * SEED_BOUNDS.baseSize.default) / 14).toFixed(3));
    issues.push({
      path: "typography.baseSize",
      severity: "info",
      message:
        `${baseSize}${used !== baseSize ? ` (clamped to ${used})` : ""} is the type scale's 16px reference, not the body size: ` +
        `body copy (--ui-text-body-md) resolves to ${px(14)}, body-sm to ${px(13)}, and label-sm and caption to ${px(12)}, ` +
        `under the scale's 12px floor. For ${baseSize}px body copy, set baseSize to ${forBody}` +
        `${forBody > SEED_BOUNDS.baseSize.max || forBody < SEED_BOUNDS.baseSize.min ? " (outside the 13–20 clamp — not reachable)" : ""}.`,
    });
  }
  checkNumber("typography.ratio", seed.typography?.ratio);
  checkNumber("chrome.contentWidthPx", seed.chrome?.contentWidthPx);
  checkNumber("shape.borderWidthPx", seed.shape?.borderWidthPx);
  checkNumber("shape.focusRingWidthPx", seed.shape?.focusRingWidthPx);
  for (const key of ["sm", "md", "lg", "xl", "2xl", "pill"] as const) {
    checkNumber(`shape.radiusPx.${key}`, seed.shape?.radiusPx?.[key]);
  }
  for (const name of ["regular", "book", "medium", "semibold", "bold"] as const) {
    checkNumber(`typography.weights.${name}`, seed.typography?.weights?.[name]);
  }

  return issues;
}
