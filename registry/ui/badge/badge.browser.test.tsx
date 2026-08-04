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
    ["success", "rgb(214, 239, 203)", "rgb(36, 110, 65)"],
    // The sheet used --ui-bg-danger-solid as ink; the fixed role is the
    // deeper on-subtle ink, which is what must actually paint.
    ["danger", "rgb(249, 226, 219)", "rgb(106, 44, 24)"],
  ] as const)("%s paints its fill and ink", (variant, bg, fg) => {
    const { badge } = mount(<Badge variant={variant}>Label</Badge>);
    const style = getComputedStyle(badge);
    expect(style.backgroundColor).toBe(bg);
    expect(style.color).toBe(fg);
  });

  test("status variants carry no visible border; choice variants do", () => {
    const success = mount(<Badge variant="success">Ready</Badge>);
    expect(getComputedStyle(success.badge).borderTopColor).toBe("rgba(0, 0, 0, 0)");
    act(() => root?.unmount());
    container?.remove();

    const unselected = mount(<Badge variant="unselected">Unselected</Badge>);
    expect(getComputedStyle(unselected.badge).borderTopColor).toBe("rgb(218, 212, 206)");
  });
});

describe("Badge typography matches the corrected sheet", () => {
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

  test("shape switches between pill and the rounded radius", () => {
    const rounded = mount(<Badge shape="rounded">Tag</Badge>);
    expect(getComputedStyle(rounded.badge).borderRadius).toBe("4px");
  });
});
