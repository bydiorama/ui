/**
 * Colour maths for the theme resolver.
 *
 * Perceptual work happens in OKLCH, because the derivations this system needs —
 * "a bit lighter", "far enough from that ink to read" — are lightness
 * operations, and lightness in sRGB is a lie: `#0000ff` and `#ffff00` have the
 * same nominal value and wildly different apparent brightness. Contrast
 * checking, by contrast, uses WCAG relative luminance, because that is the
 * thing being conformed to.
 *
 * Dependency-free on purpose (see AGENTS.md): the token pipeline must run in a
 * cold clone.
 */

export interface Rgb {
  /** 0–1 */ r: number;
  /** 0–1 */ g: number;
  /** 0–1 */ b: number;
  /** 0–1 */ a: number;
}

export interface Oklch {
  /** 0–1 */ L: number;
  /** ≥0 */ C: number;
  /** degrees */ h: number;
  /** 0–1 */ a: number;
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// ── Parsing / formatting ────────────────────────────────────────────────

const HEX_RE = /^#([0-9a-f]{3,8})$/i;
const RGB_RE = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/i;

/**
 * Parse a CSS colour this system is willing to accept. Returns null rather than
 * throwing: brand seeds come from user input, and the caller decides whether an
 * unparseable value is a validation error or a reason to fall back.
 */
export function parseColor(input: string): Rgb | null {
  const value = input.trim();

  const hex = HEX_RE.exec(value);
  if (hex?.[1]) {
    const h = hex[1];
    const expand = (s: string) => parseInt(s.length === 1 ? s + s : s, 16) / 255;
    if (h.length === 3 || h.length === 4) {
      return {
        r: expand(h[0]!), g: expand(h[1]!), b: expand(h[2]!),
        a: h.length === 4 ? expand(h[3]!) : 1,
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16) / 255,
        g: parseInt(h.slice(2, 4), 16) / 255,
        b: parseInt(h.slice(4, 6), 16) / 255,
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
    return null;
  }

  const rgb = RGB_RE.exec(value);
  if (rgb) {
    const alphaRaw = rgb[4];
    const a = alphaRaw === undefined
      ? 1
      : alphaRaw.endsWith("%")
        ? parseFloat(alphaRaw) / 100
        : parseFloat(alphaRaw);
    return {
      r: clamp01(parseFloat(rgb[1]!) / 255),
      g: clamp01(parseFloat(rgb[2]!) / 255),
      b: clamp01(parseFloat(rgb[3]!) / 255),
      a: clamp01(Number.isFinite(a) ? a : 1),
    };
  }

  return null;
}

const byteHex = (n: number) => Math.round(clamp01(n) * 255).toString(16).padStart(2, "0");

/** Opaque hex. Alpha is dropped — use {@link formatColor} when it matters. */
export function toHex({ r, g, b }: Rgb): string {
  return `#${byteHex(r)}${byteHex(g)}${byteHex(b)}`;
}

/** Hex when opaque, `rgba()` when not — the shortest form a browser reads identically. */
export function formatColor(rgb: Rgb): string {
  if (rgb.a >= 1) return toHex(rgb);
  const to255 = (n: number) => Math.round(clamp01(n) * 255);
  return `rgba(${to255(rgb.r)}, ${to255(rgb.g)}, ${to255(rgb.b)}, ${Number(rgb.a.toFixed(3))})`;
}

// ── sRGB ↔ OKLCH ────────────────────────────────────────────────────────

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** Björn Ottosson's OKLab transform, then to polar form. */
export function rgbToOklch(rgb: Rgb): Oklch {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { L, C: Math.hypot(A, B), h: h < 0 ? h + 360 : h, a: rgb.a };
}

/** Unclamped conversion — channels may fall outside 0–1 when the colour is
 *  outside the sRGB gamut. Only {@link oklchToRgb} should call this directly. */
function oklchToRgbRaw(c: Oklch): Rgb {
  const hRad = (c.h * Math.PI) / 180;
  const A = Math.cos(hRad) * c.C;
  const B = Math.sin(hRad) * c.C;

  const l = (c.L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (c.L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (c.L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a: c.a,
  };
}

const EPSILON = 1e-4;
const inGamut = ({ r, g, b }: Rgb) =>
  r >= -EPSILON && r <= 1 + EPSILON &&
  g >= -EPSILON && g <= 1 + EPSILON &&
  b >= -EPSILON && b <= 1 + EPSILON;

/**
 * OKLCH → sRGB, gamut-mapped by chroma reduction.
 *
 * Naively clamping the channels is wrong in a way that matters here: lightening
 * a saturated brand colour pushes it outside sRGB, and clamping then shifts its
 * HUE — so a derived hover state comes back a different colour rather than a
 * lighter one. Reducing chroma until the colour fits keeps hue and lightness,
 * which are the two things every derivation in this system is reasoning about.
 */
export function oklchToRgb(c: Oklch): Rgb {
  const direct = oklchToRgbRaw(c);
  if (inGamut(direct)) {
    return { r: clamp01(direct.r), g: clamp01(direct.g), b: clamp01(direct.b), a: c.a };
  }

  // Nothing at this lightness is representable — pure black/white ends.
  if (c.L <= 0) return { r: 0, g: 0, b: 0, a: c.a };
  if (c.L >= 1) return { r: 1, g: 1, b: 1, a: c.a };

  let lo = 0;
  let hi = c.C;
  let best = oklchToRgbRaw({ ...c, C: 0 });

  for (let i = 0; i < 24 && hi - lo > 1e-5; i++) {
    const mid = (lo + hi) / 2;
    const candidate = oklchToRgbRaw({ ...c, C: mid });
    if (inGamut(candidate)) {
      best = candidate;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { r: clamp01(best.r), g: clamp01(best.g), b: clamp01(best.b), a: c.a };
}

/** Read a colour string into OKLCH, or null if unparseable. */
export function toOklch(input: string): Oklch | null {
  const rgb = parseColor(input);
  return rgb ? rgbToOklch(rgb) : null;
}

// ── Derivation primitives ───────────────────────────────────────────────

/**
 * Move a colour's lightness by `delta`, keeping hue and chroma. The workhorse:
 * hover states, elevated surfaces, tinted rails.
 */
export function shiftL(input: string, delta: number): string {
  const c = toOklch(input);
  if (!c) return input;
  return formatColor(oklchToRgb({ ...c, L: clamp01(c.L + delta) }));
}

/**
 * Move `from`'s lightness a fraction `t` of the way toward `to`'s, keeping
 * `from`'s hue and chroma — so a brand's ink stays its own colour while fading,
 * rather than reverting to grey.
 */
export function towardL(from: string, to: string, t: number): string {
  const a = toOklch(from);
  const b = toOklch(to);
  if (!a || !b) return from;
  return formatColor(oklchToRgb({ ...a, L: clamp01(a.L + (b.L - a.L) * t) }));
}

/** Same colour at a given alpha. */
export function withAlpha(input: string, alpha: number): string {
  const rgb = parseColor(input);
  if (!rgb) return input;
  return formatColor({ ...rgb, a: clamp01(alpha) });
}

/** Composite a translucent colour over an opaque one. */
export function flatten(input: string, over: string): string {
  const fg = parseColor(input);
  const bg = parseColor(over);
  if (!fg || !bg) return input;
  if (fg.a >= 1) return formatColor(fg);
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return formatColor({ r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 });
}

// ── Contrast ────────────────────────────────────────────────────────────

function relativeLuminance(rgb: Rgb): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x contrast ratio, 1–21. Translucent inputs are composited over the
 * other colour first, because contrast against a colour you can see through is
 * not a defined quantity.
 */
export function contrastRatio(a: string, b: string): number {
  const bgRaw = parseColor(b);
  if (!bgRaw) return 1;
  const bg = bgRaw.a >= 1 ? bgRaw : parseColor(flatten(b, "#ffffff"))!;
  const fg = parseColor(flatten(a, formatColor(bg)));
  if (!fg) return 1;

  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA floors. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

/**
 * Whichever of the system's two inks reads better on `background`.
 *
 * Brands store accents at every lightness, so a hand-picked white label is
 * unreadable on pale yellow and a hand-picked dark one is unreadable on navy.
 * Measuring both candidates gets it right for an accent nobody anticipated.
 */
export function readableInkOn(background: string, inks: readonly [string, string]): string {
  const [dark, light] = inks;
  return contrastRatio(dark, background) >= contrastRatio(light, background) ? dark : light;
}

/**
 * The nearest version of `color` that clears `target` against `background`.
 *
 * Walks lightness away from the background — the only direction that can help —
 * and gives up gracefully at the ends of the range, returning the best it
 * managed rather than an unreadable value or an exception. Callers that must
 * guarantee legibility fall back to {@link readableInkOn}.
 */
export function legibleOn(color: string, background: string, target: number = AA_TEXT): string {
  const start = toOklch(color);
  const bg = toOklch(background);
  if (!start || !bg) return color;

  if (contrastRatio(color, background) >= target) return formatColor(oklchToRgb(start));

  // Away from the page: darker on a light background, lighter on a dark one.
  const direction = bg.L >= 0.5 ? -1 : 1;
  let best = start;
  let bestRatio = contrastRatio(color, background);

  for (let step = 1; step <= 100; step++) {
    const candidate: Oklch = { ...start, L: clamp01(start.L + direction * step * 0.01) };
    const formatted = formatColor(oklchToRgb(candidate));
    const ratio = contrastRatio(formatted, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
    if (ratio >= target) return formatted;
    if (candidate.L === 0 || candidate.L === 1) break;
  }

  return formatColor(oklchToRgb(best));
}

/** True when the colour reads as a dark surface — the rule that decides which
 *  way "raised" and "recessed" point. */
export function isDark(input: string): boolean {
  const c = toOklch(input);
  return c !== null && c.L < 0.5;
}
