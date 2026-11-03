/**
 * The perceptual edge ramp — the alpha profile every fade in this library
 * paints or masks with.
 *
 * WHY NOT TWO STOPS. A two-stop gradient is linear in alpha, and a linear
 * ramp has a corner at each end: its slope jumps from zero to constant where
 * it starts and back where it stops. The eye does not read the gradient, it
 * reads those corners (Mach bands) — so a 32px linear fade over body text
 * showed as a stripe with a start line, and the line under it as uniformly
 * "ghosted" rather than dissolving. Measured, not assumed: rendered over the
 * shipped copy at every depth and curve before this was chosen
 * (fade.doc.ts, knownGaps "Ramp research").
 *
 * THE CURVE is a Gaussian penumbra — the cumulative normal, the profile of a
 * sharp edge seen out of focus — with its mean at 0.55 and sigma 0.22 of the
 * depth, normalised to run exactly 0 → 1. Its slope is (near) zero at both
 * ends, so there is no corner to see; and because the mean sits past the
 * middle, the long side of the curve is the TRAIL into the content, which is
 * where a fade is looked at. The first quarter is under 9% alpha, so a
 * Gaussian ramp reads about 0.7 of its geometric depth — which is why the
 * depth scale moved up a step when this landed (48px default, not 32).
 *
 * THE DARK CURVE IS NOT THE LIGHT ONE. Browsers composite in gamma-encoded
 * sRGB, and the perceived lightness of "ink under a veil of ground" does not
 * fall at the same rate in both polarities: at 50% alpha, dark ink on a light
 * ground keeps 46% of its OKLab lightness distance, light ink on a dark
 * ground keeps 53% (3.78:1 against 2.95:1). The same alphas therefore leave a
 * longer, dirtier trail in dark. The dark table is the alpha that leaves the
 * SAME perceptual fraction of ink visible as the light table does, solved per
 * stop for text-secondary on bg-surface. The correction is a property of the
 * polarity, not the pair: across five role pairs it agrees to ±0.015, so one
 * table serves every ground. `light-dark()` picks per stop, the same switch
 * every colour token in the theme already uses.
 *
 * fade-ramp.test.ts re-derives both tables from the curve and the colour
 * model, so a hand-edited number fails rather than drifts.
 */

/** Alpha of the GROUND at t = i/16, from the content side (0) to the pinned edge (1). */
export const FADE_RAMP_LIGHT = [
  0, 0.007, 0.021, 0.045, 0.082, 0.138, 0.213, 0.306, 0.415, 0.531, 0.644, 0.748, 0.834, 0.901,
  0.949, 0.981, 1,
] as const;

/** The same profile, perceptually matched for light ink on a dark ground. */
export const FADE_RAMP_DARK = [
  0, 0.01, 0.028, 0.059, 0.107, 0.175, 0.263, 0.368, 0.483, 0.598, 0.704, 0.796, 0.869, 0.924,
  0.961, 0.985, 1,
] as const;

/** Where the ramp runs — always TOWARD the pinned edge, whose stop is solid. */
export type FadeRampDirection = "to top" | "to bottom" | "to left" | "to right";

/** An alpha as a mix percentage — a tenth of a percent is below any visible step. */
const pct = (n: number) => `${+(n * 100).toFixed(1)}%`;
/** A stop position — sixteenths are exact at two decimals (6.25%). */
const at100 = (n: number) => `${+(n * 100).toFixed(2)}%`;

/** The two tables zipped, with each stop's position t from content (0) to edge (1). */
const STOPS = FADE_RAMP_LIGHT.map((light, i) => ({
  t: i / (FADE_RAMP_LIGHT.length - 1),
  light,
  dark: FADE_RAMP_DARK[i] ?? light,
}));

/** One stop's colour: a single value where both schemes agree, else a per-scheme switch. */
function perScheme(light: number, dark: number, at: (alpha: number) => string): string {
  return light === dark ? at(light) : `light-dark(${at(light)}, ${at(dark)})`;
}

/**
 * The PAINTED ramp: a colour, rising from 0 to its own alpha at the edge.
 *
 * `color-mix(… X p%, transparent)` is X at p% of ITS alpha, so a ground that
 * is itself translucent scales the whole ramp — `--ui-bg-affix` is the page at
 * 90%, and a ramp in it ends at exactly the bar's 90%. That is what lets a
 * fade hung under a translucent bar meet it without a seam.
 *
 * Interpolation between stops is premultiplied, so the transparent end's hue
 * never greys the band — and with every stop one colour, the interpolation
 * space does not matter either.
 */
export function paintRamp(direction: FadeRampDirection, ground: string): string {
  const at = (alpha: number) => `color-mix(in srgb, ${ground} ${pct(alpha)}, transparent)`;
  const stops = STOPS.map(({ t, light, dark }) => `${perScheme(light, dark, at)} ${at100(t)}`);
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}

/**
 * The MASKED ramp: the content's own alpha, falling to 0 at the edge — the
 * complement of the paint, so a masked container over an opaque ground lands
 * on the same pixels a painted band would.
 *
 * Here `direction` runs AWAY from the pinned edge (a bottom fade masks
 * `to top`), so position 0 is the edge itself, fully cut, and the ramp
 * reaches opaque at `depth`. Stops sit at fractions of the depth rather than
 * percentages because a mask covers the whole scrolling container: past the
 * depth the last stop holds, opaque, and everything shows.
 */
export function maskRamp(direction: FadeRampDirection, depth: string): string {
  const at = (alpha: number) => `rgb(0 0 0 / ${+(1 - alpha).toFixed(3)})`;
  // Walk the table from the edge inward: the first stop is t = 1, the edge.
  const stops = [...STOPS]
    .reverse()
    .map(({ t, light, dark }) => `${perScheme(light, dark, at)} calc(${depth} * ${+(1 - t).toFixed(4)})`);
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}
