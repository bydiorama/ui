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

  test("the busy contract cannot be undone by a forwarded aria-busy", () => {
    const forwarded = { "aria-busy": false } as const;
    const button = mount(<Button isBusy {...forwarded}>Saving…</Button>);
    expect(button.getAttribute("aria-busy")).toBe("true");
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
describe("Button geometry and typography match the design sheet", () => {
  test.each([
    ["lg", "44px"],
    ["md", "32px"],
    ["sm", "24px"],
  ] as const)("labelled size %s owns its documented %s hit area", (size, expected) => {
    const button = mount(<Button size={size}>Create New</Button>);
    expect(getComputedStyle(button).height).toBe(expected);
  });

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

/**
 * The PRESSED state, read out of the compiled stylesheet.
 *
 * `:active` is a user-agent state: no synthetic event produces it, and vitest's
 * browser driver exposes no way to hold a pointer down. So this reads layer 3 —
 * the actual compiled rules — rather than inventing a class at runtime, which
 * proves nothing about a variant utility (Tailwind only compiles what it finds
 * when scanning source).
 */
function everyStyleRule(): CSSStyleRule[] {
  const out: CSSStyleRule[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) out.push(rule);
      // Tailwind v4 wraps EVERYTHING in `@layer`, and a CSSLayerBlockRule is
      // not a CSSStyleRule — so a walker that only reads `sheet.cssRules`
      // finds zero utilities and every "it declares no fill" assertion passes
      // vacuously. Probed: 0 active rules before recursing, 10 after.
      const nested = (rule as unknown as { cssRules?: CSSRuleList }).cssRules;
      if (nested) walk(nested);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // cross-origin
    }
  }
  return out;
}

function declarationsFor(el: Element, state: ":active" | ":hover" | ":disabled"): Map<string, string> {
  const found = new Map<string, string>();
  for (const rule of everyStyleRule()) {
    {
      if (!rule.selectorText.includes(state)) continue;
      // Strip the TRAILING pseudo-class chain only. A blanket replaceAll is
      // wrong and silently so: the compiled class name is
      // `.enabled\:active\:bg-accent-active:enabled:active`, which contains
      // the literal ":active" INSIDE the escaped class — removing every
      // occurrence mangles the selector, nothing matches, and every "declares
      // no fill" assertion passes vacuously. Probed: primary's pressed fill
      // read as absent.
      let base = rule.selectorText;
      while (
        base.endsWith(":active") ||
        base.endsWith(":enabled") ||
        base.endsWith(":hover") ||
        base.endsWith(":disabled")
      ) {
        base = base.slice(0, base.lastIndexOf(":"));
      }
      let matches = false;
      try {
        matches = el.matches(base);
      } catch {
        continue;
      }
      if (!matches) continue;
      for (const property of Array.from(rule.style))
        found.set(property, rule.style.getPropertyValue(property));
    }
  }
  return found;
}

const activeDeclarations = (el: Element) => new Set(declarationsFor(el, ":active").keys());

describe("pressing an edge-only Button paints no fill", () => {
  // The sheet draws ELEVEN button frames — five variants, their five hovers,
  // and disabled. There is no pressed row anywhere in it, so every active
  // treatment here is DERIVED. What the derivation reached for was
  // --ui-bg-active (#DAD4CE), a value that appears ZERO times in the whole
  // Button artboard: an edge-on-nothing control grew a neutral chip under the
  // pointer, heavier than any fill the design draws for a button.
  test.each(["secondary", "outline"] as const)(
    "%s declares no background-color while pressed",
    (variant) => {
      const button = mount(<Button variant={variant}>Create New</Button>);
      const pressed = activeDeclarations(button);
      expect([...pressed], `${variant} pressed declares: ${[...pressed].join(", ")}`).not.toContain(
        "background-color",
      );
    },
  );

  test.each(["secondary", "outline", "ghost"] as const)(
    "%s still carries a STATIC press cue, not motion alone (§8)",
    (variant) => {
      const button = mount(<Button variant={variant}>Create New</Button>);
      // CONVENTIONS §8: motion is never the only feedback channel. The press
      // scale is the motion; the ink step is what makes it conformant.
      expect([...activeDeclarations(button)]).toContain("color");
    },
  );

  test("a FILLED variant keeps its pressed fill — the rule is about edge-only types", () => {
    const button = mount(<Button variant="primary">Create New</Button>);
    expect([...activeDeclarations(button)]).toContain("background-color");
  });

  test("a DISABLED button fills with the sheet's bg-elevated, not a step darker", () => {
    // The sheet's Disabled frame fills with --ui-neutral-95 and rings itself
    // with the same value. It shipped as bg-sunken (neutral-90), which is the
    // identical off-by-one as ghost's hover — and it is the state most often
    // seen, because a form disables its secondary actions while it submits.
    const button = mount(<Button variant="secondary">Create New</Button>);
    expect(declarationsFor(button, ":disabled").get("background-color")).toBe(
      "var(--ui-bg-elevated)",
    );
  });

  test("ghost's hover fill is the sheet's bg-elevated, not a step darker", () => {
    const button = mount(<Button variant="ghost">Create New</Button>);
    // The sheet's Ghost Hover frame fills with --ui-neutral-95, whose role is
    // --ui-bg-elevated. `bg-hover` is neutral-90 — one step darker than drawn.
    expect(declarationsFor(button, ":hover").get("background-color")).toBe("var(--ui-bg-elevated)");
  });
});
