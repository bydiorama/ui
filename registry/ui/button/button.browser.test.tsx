import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Button } from "./button.tsx";

/**
 * The keyboard contract, asserted in a REAL browser (CONVENTIONS §10).
 *
 * Written to settle a specific report — "the button doesn't interact with the
 * Enter key" — rather than to restate the spec. jsdom cannot answer it:
 * implicit activation of a <button> by Enter/Space is a user-agent behaviour
 * jsdom does not implement, so it would return a confident wrong answer about
 * the one thing under test.
 *
 * React is mounted directly rather than through a testing wrapper: the wrapper
 * is one more API to track for a job that is six lines.
 */
let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement): HTMLButtonElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const button = container.querySelector("button");
  if (!button) throw new Error("Button did not render");
  return button;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Button keyboard contract", () => {
  test("Enter activates", async () => {
    const onClick = vi.fn();
    const button = mount(<Button onClick={onClick}>Create New</Button>);

    button.focus();
    expect(document.activeElement).toBe(button);

    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("Space activates", async () => {
    const onClick = vi.fn();
    const button = mount(<Button onClick={onClick}>Create New</Button>);

    button.focus();
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("isDisabled removes it from the tab order and blocks activation", async () => {
    const onClick = vi.fn();
    const button = mount(
      <Button isDisabled onClick={onClick}>
        Create New
      </Button>,
    );

    expect(button.disabled).toBe(true);
    button.focus();
    expect(document.activeElement).not.toBe(button);
  });

  test("isBusy KEEPS focus and stays operable — the distinction from isDisabled", async () => {
    const onClick = vi.fn();
    const button = mount(<Button isBusy onClick={onClick}>Saving…</Button>);

    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.disabled).toBe(false);

    button.focus();
    expect(document.activeElement).toBe(button);

    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

/**
 * The two affordances actually reported as broken. Asserted against COMPUTED
 * style, so the real stylesheet has to deliver them — a class name in the
 * markup proves nothing if no rule matches it.
 */
describe("Button pointer affordance", () => {
  test("shows a pointer cursor", () => {
    const button = mount(<Button>Create New</Button>);
    expect(getComputedStyle(button).cursor).toBe("pointer");
  });

  test("disabled does not advertise itself as clickable", () => {
    const button = mount(<Button isDisabled>Create New</Button>);
    expect(getComputedStyle(button).cursor).not.toBe("pointer");
  });
});

/**
 * Typography parity with the design sheet, as COMPUTED values.
 *
 * Exists because of a real regression: tailwind-merge classified the custom
 * font-size utilities (text-button-sm) and text-colour utilities
 * (text-ink-on-accent) as conflicting and silently deleted the size — md/sm
 * labels then inherited the body's 16px. Class-name assertions cannot catch
 * that; only the computed style can.
 */
describe("Button typography matches the design sheet", () => {
  test.each([
    ["lg", "16px"],
    ["md", "12px"],
    ["sm", "12px"],
  ] as const)("size %s renders a %s label", (size, expected) => {
    const button = mount(<Button size={size}>Create New</Button>);
    expect(getComputedStyle(button).fontSize).toBe(expected);
  });

  test("label weight is the design's 600, not a synthesized bold", async () => {
    const button = mount(<Button>Create New</Button>);
    expect(getComputedStyle(button).fontWeight).toBe("600");
    // The face itself must load — a fallback at 600 is a different design.
    await document.fonts.load("600 16px Aspekta");
    expect(document.fonts.check("600 16px Aspekta")).toBe(true);
  });
});

/**
 * Motion and focus-visibility, as COMPUTED values.
 *
 * Both exist because of real compiled-CSS bugs that every other gate missed:
 * `duration-[--x]` emitted `transition-duration: --x` (invalid ⇒ 0s, press
 * feedback dead), and `outline-none` poisoned `--tw-outline-style` so the
 * focus-visible ring resolved to `outline-style: none` — an invisible focus
 * ring at a perfect contrast ratio.
 */
describe("Button motion and focus are real, not just declared", () => {
  test("transition duration and easing resolve from the motion tokens", () => {
    const button = mount(<Button>Create New</Button>);
    const style = getComputedStyle(button);
    expect(style.transitionDuration).toBe("0.12s");
    expect(style.transitionTimingFunction).toBe("cubic-bezier(0, 0, 0.2, 1)");
  });

  test("keyboard focus paints a visible ring", async () => {
    const button = mount(<Button>Create New</Button>);
    button.focus();
    const style = getComputedStyle(button);
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineWidth).toBe("2px");
    expect(style.outlineColor).not.toBe("rgba(0, 0, 0, 0)");
  });
});
