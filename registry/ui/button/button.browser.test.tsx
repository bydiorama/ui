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

  test("isBusy KEEPS focus and its tab stop — the distinction from isDisabled", () => {
    const button = mount(<Button isBusy>Saving…</Button>);

    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.disabled).toBe(false);
    expect(button.tabIndex).toBe(0);

    button.focus();
    expect(document.activeElement).toBe(button);
  });

  test("the busy contract cannot be undone by a forwarded aria-busy", () => {
    const forwarded = { "aria-busy": false } as const;
    const button = mount(<Button isBusy {...forwarded}>Saving…</Button>);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});

/**
 * BUSY SWALLOWS ACTIVATION (#8). The maintainer decision of 2026-10-05: a busy
 * button is the double-submit guard on its own. Before it, busy stayed fully
 * operable, and ~87 of 93 real `loading=` call sites in a consuming app would
 * have lost their guard on a mechanical `loading` → `isBusy` rename.
 *
 * Clicks are dispatched natively inside act(): Playwright's actionability
 * check treats aria-disabled="true" as not-enabled and would wait forever.
 * What is being proved is that the handler refuses, and a dispatched click
 * proves that just as well.
 */
describe("a busy Button swallows activation", () => {
  test("a busy click does not call onClick", () => {
    const onClick = vi.fn();
    const button = mount(<Button isBusy onClick={onClick}>Saving…</Button>);
    act(() => button.click());
    expect(onClick).not.toHaveBeenCalled();
  });

  test.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("a focused busy button ignores %s", async (_, key) => {
    const onClick = vi.fn();
    const button = mount(<Button isBusy onClick={onClick}>Saving…</Button>);
    button.focus();
    expect(document.activeElement).toBe(button);
    await userEvent.keyboard(key);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("activation returns the moment busy clears", () => {
    const onClick = vi.fn();
    const button = mount(<Button isBusy onClick={onClick}>Save</Button>);
    act(() => root!.render(<Button onClick={onClick}>Save</Button>));
    act(() => button.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  test("it announces that activation is unavailable — aria-disabled, not only aria-busy", () => {
    // Most screen readers do not announce aria-busy on a button at all, so a
    // control that refuses activation while saying only aria-busy would be
    // presented as operable.
    const button = mount(<Button isBusy>Saving…</Button>);
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  test("a caller's own aria-disabled survives on a button that is not busy", () => {
    const button = mount(<Button aria-disabled>Explain why</Button>);
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  test("busy shows the progress cursor, not a pointer promising a click", () => {
    const button = mount(<Button isBusy>Saving…</Button>);
    expect(getComputedStyle(button).cursor).toBe("progress");
  });
});

/**
 * A busy SUBMIT button must not submit its form, by any route. The subtle one
 * is implicit submission: Enter in a text field submits through the form's
 * DEFAULT BUTTON by firing a synthetic click at it, so a guard that watched
 * only the button's own keyboard would let it straight through.
 */
describe("a busy submit button does not submit its form", () => {
  function mountForm(isBusy: boolean) {
    const onSubmit = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <form
          onSubmit={(event) => {
            // Never let a real submission navigate the test page away.
            event.preventDefault();
            onSubmit();
          }}
        >
          <input aria-label="Name" defaultValue="Brief" />
          <Button type="submit" isBusy={isBusy}>
            Save
          </Button>
        </form>,
      );
    });
    return {
      onSubmit,
      input: container.querySelector("input")!,
      button: container.querySelector("button")!,
    };
  }

  test("control: the same form NOT busy submits by click and by Enter in the field", async () => {
    // Without this, every busy assertion below would pass against a harness
    // that never submits at all.
    const { onSubmit, input, button } = mountForm(false);
    act(() => button.click());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    input.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  test("clicking a busy submit button does not fire onSubmit", () => {
    const { onSubmit, button } = mountForm(true);
    act(() => button.click());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("Enter on the focused busy submit button does not fire onSubmit", async () => {
    const { onSubmit, button } = mountForm(true);
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("Enter in a field — implicit submission — does not fire onSubmit", async () => {
    const { onSubmit, input } = mountForm(true);
    input.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("the busy submit button stays focusable", () => {
    const { button } = mountForm(true);
    button.focus();
    expect(document.activeElement).toBe(button);
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

  test("a disabled GHOST keeps no fill and no ring — only the disabled ink (#27)", () => {
    // Every disabled Button used to flatten to the same filled chip, which
    // turned a ghost — no fill at rest — into a grey slab, the heaviest thing
    // in a row of quiet actions, for an action that is unavailable.
    const ghost = mount(<Button variant="ghost" isDisabled>Delete</Button>);
    const declared = declarationsFor(ghost, ":disabled");
    expect([...declared.keys()]).not.toContain("background-color");
    expect([...declared.keys()]).not.toContain("--tw-ring-color");

    const style = getComputedStyle(ghost);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    // Ring width is shared by every type; ghost's ring COLOUR is transparent,
    // so whatever box-shadow is declared must paint nothing.
    const shadow = style.boxShadow;
    expect(shadow === "none" || shadow.startsWith("rgba(0, 0, 0, 0)"), `box-shadow: ${shadow}`).toBe(
      true,
    );
  });

  test("a disabled ghost takes the SAME disabled ink as the chip variants", () => {
    // Assert the relationship, not a hex: the ghost and the chip must agree
    // on what "unavailable" looks like in ink.
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <>
          <Button variant="ghost" isDisabled>Ghost</Button>
          <Button variant="secondary" isDisabled>Secondary</Button>
          <Button variant="ghost">Resting</Button>
        </>,
      );
    });
    const [ghost, secondary, resting] = Array.from(container.querySelectorAll("button"));
    expect(getComputedStyle(ghost!).color).toBe(getComputedStyle(secondary!).color);
    expect(getComputedStyle(ghost!).color).not.toBe(getComputedStyle(resting!).color);
    // ...and the chip variants KEEP their chip — the rule is ghost-only.
    expect(getComputedStyle(secondary!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(ghost!).backgroundColor).toBe(getComputedStyle(resting!).backgroundColor);
    expect(getComputedStyle(ghost!).boxShadow).toBe(getComputedStyle(resting!).boxShadow);
  });

  test("ghost's hover fill is the sheet's bg-elevated, not a step darker", () => {
    const button = mount(<Button variant="ghost">Create New</Button>);
    // The sheet's Ghost Hover frame fills with --ui-neutral-95, whose role is
    // --ui-bg-elevated. `bg-hover` is neutral-90 — one step darker than drawn.
    expect(declarationsFor(button, ":hover").get("background-color")).toBe("var(--ui-bg-elevated)");
  });
});
