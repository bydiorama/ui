/**
 * Type role ATTRIBUTES (weight and tracking), measured where they land:
 * Chromium's computed styles under a brand scope (ADR 0020 §3, review
 * finding M4).
 *
 * The resolver's own tests prove the TOKEN VALUES `typography.weights` and
 * `typography.tracking` produce. They cannot see whether those values
 * actually reach a rendered element through the two-level chain Phase 2
 * built: `--ui-text-<role>-weight` → the Tailwind v4 companion
 * `--text-<role>--font-weight` → the computed `font-weight`. A chain that
 * long is exactly where an indirection can quietly stop resolving — the
 * stroke scale has its own version of this file for the same reason.
 *
 * `title-md` and `label-md` prove the weight ladder; `body-md` (not a FLUID
 * role — no `clamp()`, no viewport dependency) proves tracking, since a
 * fluid role's em-to-px conversion would vary with the test viewport.
 */
import { afterEach, describe, expect, test } from "vitest";

import { resolveThemePair, toStyleObject, THEME_ZERO, type ThemeSeed } from "@bydiorama/tokens";

/** A static face with no 550/450 cuts: semibold rounds up to 600, bold to
 *  700, and tracking resets to 0 for a face tuned with its own spacing. */
const STATIC_FACE: ThemeSeed = {
  ...THEME_ZERO,
  typography: { ...THEME_ZERO.typography, weights: { semibold: 600, bold: 700 }, tracking: "font" },
};

let scope: HTMLDivElement | null = null;

function probe(seed: ThemeSeed | null, className: string): CSSStyleDeclaration {
  scope = document.createElement("div");
  if (seed) for (const [k, v] of Object.entries(toStyleObject(resolveThemePair(seed)))) scope.style.setProperty(k, v);
  const el = document.createElement("div");
  el.className = className;
  scope.appendChild(el);
  document.body.appendChild(scope);
  return getComputedStyle(el);
}

afterEach(() => {
  scope?.remove();
  scope = null;
});

describe("theme zero's roles draw the authored table (TYPE_ROLES)", () => {
  test("title-md sits on the semibold cut", () => {
    expect(probe(null, "text-title-md").fontWeight).toBe("550");
  });
  test("label-md sits on the bold cut", () => {
    expect(probe(null, "text-label-md").fontWeight).toBe("600");
  });
  test("body-md carries the tight tracking, in real pixels", () => {
    // 14px * -0.02em.
    expect(probe(null, "text-body-md").letterSpacing).toBe("-0.28px");
  });
});

describe("a brand's type knobs reach the rendered role (review finding M4)", () => {
  test("typography.weights re-points a ladder step, and every role sitting on it follows", () => {
    expect(probe(STATIC_FACE, "text-title-md").fontWeight).toBe("600"); // was semibold = 550
    scope?.remove();
    expect(probe(STATIC_FACE, "text-label-md").fontWeight).toBe("700"); // was bold = 600
  });
  test("typography.tracking: 'font' zeroes tracking on the rendered role", () => {
    // Chromium serialises a computed 0em letter-spacing as the keyword
    // "normal" — visually identical, and how the browser reports it.
    expect(probe(STATIC_FACE, "text-body-md").letterSpacing).toBe("normal");
  });
});
