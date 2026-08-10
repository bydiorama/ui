import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Badge } from "./badge.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const badge = container.querySelector('[data-slot="badge"]');
  if (!badge) throw new Error("Badge did not render");
  return { badge: badge as HTMLElement, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Badge is a label, not a control", () => {
  test("renders a span with no role and no tab stop", () => {
    const { badge } = mount(<Badge>Ready</Badge>);

    expect(badge.tagName).toBe("SPAN");
    expect(badge.getAttribute("role")).toBeNull();
    expect(badge.getAttribute("tabindex")).toBeNull();
    // A span that is not focusable must not look clickable either.
    expect(getComputedStyle(badge).cursor).not.toBe("pointer");
  });

  test("an interactive iconEnd keeps its own keyboard path", async () => {
    const onRemove = vi.fn();
    const { container: c } = mount(
      <Badge
        iconEnd={
          <button type="button" aria-label="Remove Brand Guidelines" onClick={onRemove}>
            <svg aria-hidden="true" />
          </button>
        }
      >
        Brand Guidelines
      </Badge>,
    );

    const button = c.querySelector("button")!;
    expect(button.getAttribute("aria-label")).toBe("Remove Brand Guidelines");

    button.focus();
    expect(document.activeElement).toBe(button);
    await userEvent.keyboard("{Enter}");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("Badge variants resolve to the designed roles", () => {
  test.each([
    ["selected", "rgb(158, 219, 243)", "rgb(29, 27, 25)"],
    ["unselected", "rgb(255, 255, 255)", "rgb(105, 99, 93)"],
    // The same two roles Banner's neutral variant uses — one vocabulary per
    // concept (§2). The sheet drew --ui-bg-active here, an INTERACTION role,
    // which would have made a resting badge the colour of a pressed row.
    ["neutral", "rgb(237, 232, 227)", "rgb(105, 99, 93)"],
    ["success", "rgb(214, 239, 203)", "rgb(36, 110, 65)"],
    ["warning", "rgb(248, 231, 217)", "rgb(143, 84, 38)"],
    // The sheet used --ui-bg-danger-solid as ink; the fixed role is the
    // deeper on-subtle ink, which is what must actually paint.
    ["danger", "rgb(249, 226, 219)", "rgb(106, 44, 24)"],
  ] as const)("%s paints its fill and ink", (variant, bg, fg) => {
    const { badge } = mount(<Badge variant={variant}>Label</Badge>);
    const style = getComputedStyle(badge);
    expect(style.backgroundColor).toBe(bg);
    expect(style.color).toBe(fg);
  });

  test("the four data variants are four DIFFERENT colours", () => {
    // Asserted as a difference, not as four separate literals: a copy-paste
    // in the VARIANT map would leave every one of those literal assertions
    // passing while warning painted the success tint. Badge has been here
    // before — its two sizes were pixel-identical while every test passed.
    const fills = new Set<string>();
    for (const variant of ["neutral", "success", "warning", "danger"] as const) {
      const { badge } = mount(<Badge variant={variant}>Label</Badge>);
      fills.add(getComputedStyle(badge).backgroundColor);
      act(() => root?.unmount());
      container?.remove();
    }
    expect(fills.size).toBe(4);

    // Ink is checked over the intents only: `neutral` deliberately reuses the
    // muted ink `unselected` already carries, because it is the absence of an
    // intent rather than a fourth one.
    const inks = new Set<string>();
    for (const variant of ["success", "warning", "danger"] as const) {
      const { badge } = mount(<Badge variant={variant}>Label</Badge>);
      inks.add(getComputedStyle(badge).color);
      act(() => root?.unmount());
      container?.remove();
    }
    expect(inks.size).toBe(3);
  });

  test("neutral carries an EDGE, and differs from unselected by its fill", () => {
    const neutral = mount(<Badge variant="neutral">Consulting</Badge>);
    // The hairline is not decoration: it is the only channel that separates a
    // neutral chip from a dark table row. The fill manages 1.098:1 there
    // against status tints at 1.629, and raising the fill to match would drop
    // `--ui-text-muted` on it to 3.86:1 — under AA — so the boundary moved
    // instead. Asserted as "not transparent" rather than as a hex, because the
    // role is a light-dark() pair and the point is that an edge EXISTS.
    expect(getComputedStyle(neutral.badge).borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
    const neutralFill = getComputedStyle(neutral.badge).backgroundColor;
    act(() => root?.unmount());
    container?.remove();

    const unselected = mount(<Badge variant="unselected">Consulting</Badge>);
    expect(getComputedStyle(unselected.badge).backgroundColor).not.toBe(neutralFill);
  });

  test("INTENT is tinted and edgeless; category and choice are outlined", () => {
    // The split the family reads by, and it is structural rather than tonal
    // so it survives both schemes: a variant that carries MEANING gets a tint
    // and no edge, a variant that is a label or a choice gets an edge.
    const success = mount(<Badge variant="success">Ready</Badge>);
    expect(getComputedStyle(success.badge).borderTopColor).toBe("rgba(0, 0, 0, 0)");
    act(() => root?.unmount());
    container?.remove();

    for (const variant of ["unselected", "neutral"] as const) {
      const outlined = mount(<Badge variant={variant}>Consulting</Badge>);
      expect(
        getComputedStyle(outlined.badge).borderTopColor,
        `${variant} lost its edge`,
      ).toBe("rgb(218, 212, 206)");
      act(() => root?.unmount());
      container?.remove();
    }
  });
});

describe("Badge typography matches the corrected sheet", () => {
  test("md is visibly taller than sm — the sizes must actually differ", () => {
    // The previous tests here asserted that BOTH sizes use a 12px label and
    // that their ICONS differ. Both passed while md and sm rendered at
    // identical heights, because nothing ever compared the badges themselves.
    // A test that cannot fail for the bug it is named after is not a test.
    const small = mount(<Badge size="sm">Selected</Badge>);
    const smHeight = small.badge.getBoundingClientRect().height;
    act(() => root?.unmount());
    container?.remove();

    const medium = mount(<Badge size="md">Selected</Badge>);
    const mdHeight = medium.badge.getBoundingClientRect().height;

    // The sheet draws 22px and 28px.
    expect(mdHeight).toBeGreaterThan(smHeight);
    expect(mdHeight).toBeGreaterThanOrEqual(28);
    expect(smHeight).toBeLessThan(25);
  });

  test.each(["sm", "md"] as const)("size %s uses the 12px label, never 11px", (size) => {
    const { badge } = mount(<Badge size={size}>Selected</Badge>);
    // The sheet drew 11px, below the system's own floor (ADR 0009).
    expect(getComputedStyle(badge).fontSize).toBe("12px");
  });

  test.each([
    ["sm", "12px"],
    ["md", "16px"],
  ] as const)("size %s renders a %s trailing icon", (size, px) => {
    // The arbitrary variant [&_svg]:size-* compiles to a descendant rule; a
    // class that exists proves nothing about which element it reaches.
    const { container: c } = mount(
      <Badge size={size} iconEnd={<svg aria-hidden="true" />}>Selected</Badge>,
    );
    const svg = c.querySelector("svg")!;
    expect(getComputedStyle(svg).width).toBe(px);
  });

  test("shape switches between full and the soft radius", () => {
    const soft = mount(<Badge shape="soft">Tag</Badge>);
    expect(getComputedStyle(soft.badge).borderRadius).toBe("4px");
    act(() => root?.unmount());
    container?.remove();
    const full = mount(<Badge shape="full">Tag</Badge>);
    // Asserted as a DIFFERENCE too: two shape values that render the same
    // radius is the defect this component has already had with its sizes.
    expect(getComputedStyle(full.badge).borderRadius).not.toBe("4px");
  });
});
