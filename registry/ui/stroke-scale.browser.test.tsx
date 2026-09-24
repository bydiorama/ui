/**
 * The stroke scale, measured where it lands: in Chromium's USED widths.
 *
 * `shape.borderWidthPx` resolved to `--ui-border-width` for the whole life
 * of the knob and nothing read it, so a brand could set it and change
 * nothing. Resolver tests cannot see that failure — the token was always
 * there, with the right value. Only a rendered edge can (ADR 0020 §2).
 *
 * Two brands, because each proves something the other cannot:
 *
 *   theme zero — the migration from literals changed NOTHING. Including the
 *     trap `border-hairline.browser.test.tsx` pins: a 1.5px border floors to
 *     1px at DPR 1 while a 1.5px ring keeps its half pixel.
 *   a heavy brand — the knob now reaches every width utility, bare ones
 *     included, and the focus ring follows its own knob, not the base.
 */
import { afterEach, describe, expect, test } from "vitest";

import { resolveThemePair, toStyleObject, THEME_ZERO, type ThemeSeed } from "@bydiorama/tokens";

const HEAVY: ThemeSeed = { ...THEME_ZERO, shape: { ...THEME_ZERO.shape, borderWidthPx: 2, focusRingWidthPx: 3 } };

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

/** The ring width a `ring-*` utility draws: the widest spread in its
 *  box-shadow list. Tailwind composes five layers (inset shadow, inset ring,
 *  ring offset, ring, shadow) and the unused ones compute to a 0px spread,
 *  so the first spread in the string is not the ring's. */
const ringSpread = (style: CSSStyleDeclaration) => {
  const spreads = [...style.boxShadow.matchAll(/0px 0px 0px ([\d.]+)px/g)].map((m) => Number(m[1]));
  return spreads.length ? `${Math.max(...spreads)}px` : undefined;
};

describe("theme zero draws exactly what the literals drew", () => {
  test("bare border is 1px — `--default-border-width` is the default stroke", () => {
    expect(probe(null, "border").borderTopWidth).toBe("1px");
  });
  test("border-thick is 2px, as border-2 was", () => {
    expect(probe(null, "border-thick").borderTopWidth).toBe("2px");
  });
  test("ring-hairline keeps its half pixel, as ring-[1.5px] did", () => {
    expect(ringSpread(probe(null, "ring-hairline"))).toBe("1.5px");
  });
  test("bare ring is 1px, as ring-1 was", () => {
    expect(ringSpread(probe(null, "ring"))).toBe("1px");
  });
  test("outline-focus is 2px, as outline-2 was, at the 2px offset", () => {
    const style = probe(null, "outline outline-focus outline-offset-focus");
    expect(style.outlineWidth).toBe("2px");
    expect(style.outlineOffset).toBe("2px");
  });
});

describe("a brand's stroke knob reaches every width utility", () => {
  test("the base, the hairline and the thick stroke move in proportion", () => {
    expect(probe(HEAVY, "border").borderTopWidth).toBe("2px");
    scope?.remove();
    expect(probe(HEAVY, "border-hairline").borderTopWidth).toBe("3px");
    scope?.remove();
    expect(probe(HEAVY, "border-thick").borderTopWidth).toBe("4px");
    scope?.remove();
    expect(ringSpread(probe(HEAVY, "ring-hairline"))).toBe("3px");
  });
  test("the focus indicator follows its OWN knob, not the base", () => {
    expect(probe(HEAVY, "outline outline-focus").outlineWidth).toBe("3px");
  });
});
