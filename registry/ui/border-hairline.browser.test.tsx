/**
 * Why `border-[1.5px]` computes to 1px, pinned so it is not re-investigated.
 *
 * This sat open as "cause unknown" through two wrong hypotheses. It was
 * assumed to be tailwind-merge deleting the class — tested directly, and
 * false; `cn()` keeps both. It was then assumed to be Tailwind failing to
 * compile the arbitrary value — also false; the compiled rule is exactly
 * `border-width: 1.5px`.
 *
 * The cause is neither. **Chromium floors a border to whole DEVICE pixels**,
 * with a floor of 1px for any non-zero width. At devicePixelRatio 1 — which
 * is what a headless test browser runs at — 1.5px and 1.9px both report 1px.
 * At devicePixelRatio 2, where the design was drawn and where most users are,
 * 1.5 CSS px is 3 device pixels and renders exactly.
 *
 * So there is nothing to fix in Input or Multiselect. What there is to fix is
 * the assumption that a computed style is the value you wrote: for borders it
 * is the value the display can draw. That is what this file records.
 */
import { afterEach, describe, expect, test } from "vitest";

let probe: HTMLDivElement | null = null;

function widthOf(declared: string): string {
  probe = document.createElement("div");
  probe.style.border = `${declared} solid red`;
  document.body.appendChild(probe);
  return getComputedStyle(probe).borderTopWidth;
}

afterEach(() => {
  probe?.remove();
  probe = null;
});

describe("a ring is a box-shadow, and box-shadow does NOT floor", () => {
  test("a 1.5px ring keeps its half pixel where a 1.5px border loses it", () => {
    probe = document.createElement("div");
    probe.style.boxShadow = "0 0 0 1.5px red inset";
    document.body.appendChild(probe);
    // Button draws its resting edge with `ring-*`, which compiles to a
    // box-shadow spread — and spread is not snapped to device pixels the way
    // border-width is. So Button's 1.5px edge is REAL at DPR 1, while Input's
    // 1.5px border is not. Two utilities, the same declared number, two
    // different answers; asserting one from the other would be wrong.
    expect(getComputedStyle(probe).boxShadow).toContain("1.5px");
    probe.remove();
    probe = document.createElement("div");
    probe.style.border = "1.5px solid red";
    document.body.appendChild(probe);
    expect(getComputedStyle(probe).borderTopWidth).toBe("1px");
  });
});

describe("OUTLINE floors the same way a border does — and a ring still does not", () => {
  test("a 1.5px outline reports 1px, exactly like a 1.5px border", () => {
    // Added when Avatar took the sheet's 1.5px inset hairline. The natural
    // assumption from the tests above is that `outline` behaves like the
    // box-shadow ring, because both paint outside the box and neither is part
    // of layout. It does not: outline-width snaps to device pixels the way
    // border-width does, so the same 1.5px is real in a ring and lost in an
    // outline. Two of the three properties floor; only the ring survives.
    probe = document.createElement("div");
    probe.style.outline = "1.5px solid red";
    document.body.appendChild(probe);
    expect(getComputedStyle(probe).outlineWidth).toBe("1px");
  });

  test("outline-OFFSET snaps too, which is the half of this that surprises", () => {
    // Written first as "offset is a length, not a stroke, so it keeps its half
    // pixel" — and that was wrong, measured. BOTH halves of an outline snap,
    // so a 1.5px inset hairline is a 1px hairline inset by 1px at dPR 1: it
    // stays flush to the radius rather than drifting half a pixel off it,
    // which is the behaviour you want and not the one the reasoning predicted.
    probe = document.createElement("div");
    probe.style.outline = "1.5px solid red";
    probe.style.outlineOffset = "-1.5px";
    document.body.appendChild(probe);
    expect(getComputedStyle(probe).outlineOffset).toBe("-1px");
  });
});

describe("a border's computed width is what the DISPLAY can draw", () => {
  test("the test browser runs at devicePixelRatio 1", () => {
    // Everything below depends on this. If a future runner changes it, these
    // expectations change with it — and the message will say so.
    expect(window.devicePixelRatio, "these expectations assume DPR 1").toBe(1);
  });

  test("sub-2px widths all floor to 1px at DPR 1", () => {
    // Not rounding — flooring, with a 1px minimum. 1.9px does NOT become 2.
    expect(widthOf("0.5px")).toBe("1px");
    expect(widthOf("1.5px")).toBe("1px");
    expect(widthOf("1.9px")).toBe("1px");
  });

  test("whole and half widths above 2px behave the same way", () => {
    expect(widthOf("2px")).toBe("2px");
    expect(widthOf("2.5px")).toBe("2px");
    expect(widthOf("3px")).toBe("3px");
  });

  test("a declared 1.5px is therefore INDISTINGUISHABLE from 1px here", () => {
    // Which is why Multiselect's test compares its control against Input's
    // rather than asserting a number: the relationship is the thing that can
    // break, and it is the thing a computed style can still prove.
    expect(widthOf("1.5px")).toBe(widthOf("1px"));
  });
});
