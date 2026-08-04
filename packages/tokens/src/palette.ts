/**
 * The curated palette — Diorama's authored ramps (ADR 0008).
 *
 * Approved in the Paper handover (2026-08-03). Step numbers track CIE
 * lightness, so a step means the same brightness in every ramp:
 *
 *   step   20  40  60  70  80  85(neutral only)  90  …
 *   L*     26  42  60  72  85                    92
 *
 * Two consequences of that rule:
 *
 * - Roles can be assigned by step number: 40 is the AA-safe foreground step
 *   (≥4.5:1 on its own 90 tint and on white), 60 is decorative fills, 70 is
 *   accent fills and dark-scheme ink, 80/90 are grounds.
 * - Contrast is predictable arithmetic instead of per-hue guesswork.
 *
 * THE BRAND COLOURS ARE FIXED POINTS, NOT DERIVED VALUES. `#9EDBF3` (blue-80),
 * `#F4BA8E` (orange-80) and `#A5AAF6` (lavender-70) are Diorama's identity;
 * the ramp bends to them, never the reverse. Orange-80 sits at L* 80 — five
 * under the anchor — because the brand value outranks the tonal grid.
 * (Re-toning them to hit the anchors was tried and reverted; it also *lowered*
 * label contrast on every primary control.)
 */

/** Warm grey. Every neutral surface, border and ink role resolves to a step. */
export const NEUTRAL = {
  0: "#1D1B19",
  10: "#2F2C29",
  20: "#423E3A",
  40: "#69635D",
  60: "#98918A",
  70: "#B7B0A9",
  80: "#DAD4CE",
  90: "#EDE8E3",
  95: "#F6F3F0",
  98: "#FDFCFB",
  100: "#FFFFFF",
} as const;

export const BLUE = {
  20: "#134553",
  40: "#1B6C84",
  60: "#5799B1",
  70: "#79B8D3",
  80: "#9EDBF3", // BRAND — primary accent.
  90: "#D2EBF8",
} as const;

export const ORANGE = {
  20: "#5A351A",
  40: "#8F5426",
  60: "#CC8043",
  70: "#E0A473",
  80: "#F4BA8E", // BRAND — secondary accent.
  90: "#F8E7D9",
} as const;

export const LAVENDER = {
  20: "#3A3573",
  40: "#5B5CA8",
  60: "#8788CF",
  70: "#A5AAF6", // BRAND — tertiary accent.
  80: "#D0D4F7",
  90: "#E3E6FC",
} as const;

export const GREEN = {
  20: "#19462D",
  40: "#246E41",
  60: "#46A469",
  70: "#6FBF8D",
  80: "#B3DFA4",
  90: "#D6EFCB",
} as const;

export const RED = {
  20: "#6A2C18",
  40: "#A9441F",
  60: "#D4744A",
  70: "#EF9E80",
  80: "#F6CEC2",
  90: "#F9E2DB",
} as const;

export const RAMPS = {
  neutral: NEUTRAL,
  blue: BLUE,
  orange: ORANGE,
  lavender: LAVENDER,
  green: GREEN,
  red: RED,
} as const;

/** The three fixed points of the identity. */
export const BRAND = {
  blue: BLUE[80],
  orange: ORANGE[80],
  lavender: LAVENDER[70],
} as const;
