// The geometry laws. Pure arithmetic over a `figure`, shared by the two sides
// that have to agree: the design sheet and the shipped render.
//
// WHY THIS IS ARITHMETIC AND NOT A LINT RULE. Tabs shipped `p-[2px] h-8` on
// its track. Read as source that is symmetric — one padding, four sides — and
// every gate in this repo passed it. On screen it was 3px left and right and
// 4px top and bottom, because `h-8` demanded a height the parts did not add up
// to and `items-center` paid the difference out of the vertical gaps. No rule
// over the CLASS LIST can see that; the asymmetry only exists after layout.
// So the laws take measured numbers, and the same functions run against the
// numbers Paper laid out, which makes "matches the design" a computation
// rather than an opinion about two screenshots.
//
// USED WIDTH, NOT DECLARED WIDTH. A `1.5px` border is not 1.5px on screen:
// browsers snap border widths to whole device pixels, so at DPR 1 both Chromium
// and Paper's own canvas draw it as 1px. That single fact is the difference
// between the sheet reading as self-contradictory (24 + 3 + 3 + 1.5 + 1.5 = 33
// against a frame typed as 32) and reading as exact (24 + 3 + 3 + 1 + 1 = 32).
// Every law here consumes the USED width. A figure carrying a declared width
// instead will produce confident nonsense.
//
// A FIGURE is: { axis, container, children[], gap, gaps } where
//   container  { width, height, padding: sides, border: sides, radius }
//   children   [{ width, height, radius }] in stacking order
//   gap        the flex gap between children
//   gaps       { top, right, bottom, left } from the container's BORDER box to
//              the union of the children — the thing a person actually sees.

/** Every side, in the order humans read a CSS shorthand. */
export const SIDES = ["top", "right", "bottom", "left"];

/** The two sides an axis runs between. */
const ALONG = { horizontal: ["left", "right"], vertical: ["top", "bottom"] };

const round = (n) => Math.round(n * 1000) / 1000;

/**
 * A law is a name, the prose a failure should print, and a predicate returning
 * a list of violations. Keeping the prose beside the arithmetic is deliberate —
 * a geometry failure that prints only two numbers sends whoever hits it back to
 * the sheet to work out which of them was supposed to win.
 */
export const LAWS = {
  "uniform-inset": {
    why: "The gap between the container's border box and its children is the same on all four sides.",
    check(figure, tol) {
      const gaps = SIDES.map((s) => figure.gaps[s]);
      const spread = Math.max(...gaps) - Math.min(...gaps);
      if (spread <= tol) return [];
      return [
        `insets differ by ${round(spread)}px — ` +
          SIDES.map((s) => `${s} ${round(figure.gaps[s])}`).join(", "),
      ];
    },
  },

  "inset-is-declared": {
    why:
      "Each gap equals the container's own border plus padding on that side, and nothing else. " +
      "A fixed height or width is a SECOND author of the inset; the two agree only by accident.",
    check(figure, tol) {
      const out = [];
      for (const side of SIDES) {
        const declared = figure.container.border[side] + figure.container.padding[side];
        const actual = figure.gaps[side];
        if (Math.abs(actual - declared) > tol) {
          out.push(
            `${side} inset is ${round(actual)}px but border+padding declares ${round(declared)}px ` +
              `(border ${round(figure.container.border[side])}, padding ${round(figure.container.padding[side])}) ` +
              `— something other than padding is spacing this child`,
          );
        }
      }
      return out;
    },
  },

  "concentric-radius": {
    why:
      "CONVENTIONS §6: outerRadius = innerRadius + padding. Measured on the PADDING box, which is " +
      "the border-box radius minus the border — the border is why a 2px inset never closed this. " +
      "Declare it only where the container has a visible shape; an invisible track has no radius to be concentric with.",
    check(figure, tol) {
      const child = figure.children[0];
      if (figure.container.radius == null || child?.radius == null) return [];
      const outer = figure.container.radius - figure.container.border.top;
      const inner = child.radius + figure.container.padding.top;
      if (Math.abs(outer - inner) <= tol) return [];
      return [
        `padding-box radius is ${round(outer)}px (${figure.container.radius} − ${round(figure.container.border.top)} border) ` +
          `but the child wants ${round(inner)}px (${child.radius} radius + ${round(figure.container.padding.top)} padding)`,
      ];
    },
  },

  "track-is-the-sum-of-its-parts": {
    why:
      "The container's extent along its stacking axis is its children, its gaps and its own inset — " +
      "a derived number. Typing it as a constant is what lets the inset drift with nothing failing.",
    check(figure, tol) {
      const axis = figure.axis === "vertical" ? "vertical" : "horizontal";
      const [a, b] = ALONG[axis];
      const extent = axis === "vertical" ? "height" : "width";
      const kids = figure.children;
      const rows = kids.reduce((sum, k) => sum + k[extent], 0);
      const gaps = (kids.length - 1) * (figure.gap ?? 0);
      const inset =
        figure.container.border[a] + figure.container.border[b] +
        figure.container.padding[a] + figure.container.padding[b];
      const parts = rows + gaps + inset;
      const actual = figure.container[extent];
      if (Math.abs(actual - parts) <= tol) return [];
      return [
        `${extent} is ${round(actual)}px but its parts add to ${round(parts)}px ` +
          `(${kids.length} child ${extent}s totalling ${round(rows)}, ${kids.length - 1} × ${round(figure.gap ?? 0)} gap, ` +
          `inset ${round(inset)} across both sides)`,
      ];
    },
  },
};

export const LAW_NAMES = Object.keys(LAWS);

/** `3` and `{ top: 3, … }` both mean the same thing; laws only read the long form. */
export function sides(value) {
  if (value == null) return { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof value === "number") return { top: value, right: value, bottom: value, left: value };
  return { top: 0, right: 0, bottom: 0, left: 0, ...value };
}

/**
 * Run the named laws over a figure.
 *
 * An unknown law name is itself a failure. A spec naming a law this file does
 * not implement would otherwise assert nothing at all, silently — the one
 * failure mode a gate must never have.
 */
export function evaluate(figure, lawNames, tolerance = 0.5) {
  const failures = [];
  for (const name of lawNames) {
    const law = LAWS[name];
    if (!law) {
      failures.push({
        law: name,
        why: "unknown law",
        violations: [`no law named "${name}" — known: ${LAW_NAMES.join(", ")}`],
      });
      continue;
    }
    const violations = law.check(figure, tolerance);
    if (violations.length) failures.push({ law: name, why: law.why, violations });
  }
  return failures;
}

/** Format failures the same way on both sides, so one eye reads both reports. */
export function formatFailures(label, failures) {
  const lines = [`${label}:`];
  for (const f of failures) {
    lines.push(`  ✗ ${f.law} — ${f.why}`);
    for (const v of f.violations) lines.push(`      ${v}`);
  }
  return lines.join("\n");
}
