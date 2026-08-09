/**
 * Two library-wide contracts, asserted in one place because they belong to the
 * system rather than to any one component.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Button } from "@/ui/button/button.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

/**
 * Every `@media (forced-colors: active)` block in the compiled sheet.
 *
 * Walked STRUCTURALLY, and the previous version — a regex over the flattened
 * text — is why. It looked for `outline-width` between a block's opening brace
 * and the first `}`, which quietly assumed every bare `forced-colors:` utility
 * Tailwind emits is an outline one. Tailwind puts them all in ONE block sorted
 * by property, so the first non-outline utility to exist anywhere in the
 * library pushed the outline rules past that first brace and the assertion
 * broke — reported as "no forced-colors fallback exists" when eleven of them
 * did. NavRail's marker was that first utility (`forced-colors:bg-[CanvasText]`,
 * keeping a 2px current-page bar visible where a background is otherwise
 * forced). A structural walk cannot be reordered out of correctness.
 */
function forcedColorRules(): CSSRule[] {
  const found: CSSRule[] = [];
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      const media = (rule as CSSMediaRule).media?.mediaText ?? "";
      const nested = (rule as CSSGroupingRule).cssRules;
      if (media.includes("forced-colors: active")) found.push(...Array.from(nested ?? []));
      else if (nested) visit(nested);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { visit(sheet.cssRules); } catch { continue; }
  }
  return found;
}

describe("every box-shadow focus ring has a forced-colors fallback", () => {
  test("the compiled sheet contains forced-colors outline rules", () => {
    // Read from document.styleSheets — layer 3 — rather than inventing a class
    // at runtime: Tailwind only compiles what it finds when scanning source, so
    // a probe class would be absent even when the component's rule exists.
    const inForcedColors = forcedColorRules();
    expect(inForcedColors.length, "no @media (forced-colors: active) block compiled at all").toBeGreaterThan(0);
    const outlines = inForcedColors.filter((r) => /outline(-width)?\s*:/.test(r.cssText));
    expect(
      outlines.length,
      `forced-colors blocks exist but none draws an outline:\n${inForcedColors.map((r) => r.cssText).join("\n")}`,
    ).toBeGreaterThan(0);
  });

  test("Button's ring is an OUTLINE, which forced colours keeps", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(<Button>Save</Button>); });
    const button = container.querySelector("button")!;
    button.focus();
    // Button never needed the fallback: it draws its ring with `outline`,
    // which forced-colors re-colours rather than removes. box-shadow is forced
    // to `none` there, which is why the other eleven components did need it.
    expect(getComputedStyle(button).outlineStyle).toBe("solid");
    // NOT asserting boxShadow is "none" here — Tailwind's `ring-*` compiles to
    // a box-shadow, so Button has one for its RESTING edge. That resting ring
    // does disappear in forced colours; the system's own high-contrast borders
    // stand in for it, and the focus indicator — the one that must never go
    // missing — is the outline above.
  });
});

describe("isBusy is a VISUAL state, not only an announcement", () => {
  function render(busy: boolean) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <Button isBusy={busy} icon={<svg data-testid="icon" aria-hidden="true" />}>Save</Button>,
      );
    });
    return container;
  }

  test("busy swaps the leading icon for a spinner, and says so", () => {
    const c = render(true);
    const button = c.querySelector("button")!;
    expect(button.getAttribute("aria-busy")).toBe("true");
    // It shipped as a prop that set aria-busy and nothing else: a screen-reader
    // user was told the control was busy while a sighted user saw no change.
    expect(c.querySelector('[data-slot="button-spinner"]')).not.toBeNull();
    // REPLACES rather than joins, so the button keeps its width mid-submit and
    // does not shift the layout under a pointer still resting on it.
    expect(c.querySelector('[data-testid="icon"]')).toBeNull();
  });

  test("not busy renders the caller's icon and no spinner", () => {
    const c = render(false);
    expect(c.querySelector('[data-slot="button-spinner"]')).toBeNull();
    expect(c.querySelector('[data-testid="icon"]')).not.toBeNull();
    expect(c.querySelector("button")!.getAttribute("aria-busy")).toBeNull();
  });

  test("the spinner is aria-hidden — aria-busy already carries the meaning", () => {
    const c = render(true);
    expect(c.querySelector('[data-slot="button-spinner"]')!.getAttribute("aria-hidden")).toBe("true");
  });

  test("a busy button keeps focus and stays in the tab order", () => {
    const c = render(true);
    const button = c.querySelector("button")!;
    button.focus();
    // A control that leaves the tab order mid-submit strands the keyboard user
    // who was standing on it (CONVENTIONS §4).
    expect(document.activeElement).toBe(button);
    expect(button.disabled).toBe(false);
  });
});
