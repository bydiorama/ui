import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { Tabs } from "./tabs.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = "480px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

const tabs = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="tabs-tab"]'));
const panels = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="tabs-panel"]'));

const indicator = (scope: ParentNode = document) =>
  scope.querySelector<HTMLElement>('[data-slot="tabs-indicator"]');
/**
 * Where the selected fill is painted: the indicator while it is shown (Full),
 * else the selected tab itself (Reduced, Off, or before the layout settles).
 */
function selectedFill(scope: ParentNode = document) {
  const ind = indicator(scope);
  if (ind && getComputedStyle(ind).display !== "none") return getComputedStyle(ind).backgroundColor;
  return getComputedStyle(scope.querySelector<HTMLElement>('[data-slot="tabs-tab"][aria-selected="true"]')!).backgroundColor;
}
const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
    step(n);
  });
function tokenMs(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
}
function tokenPx(name: string) {
  const probe = document.createElement("div");
  probe.style.width = `var(${name})`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}
/** Each transition `el` starts, captured at transitionrun, with its first keyframe. */
function recordRuns(el: () => Element | null) {
  const seen = new Map<string, { from: Record<string, unknown>; duration: number; easing: string }>();
  const on = (event: TransitionEvent) => {
    const target = el();
    if (!target || event.target !== target) return;
    for (const a of target.getAnimations()) {
      const property = (a as CSSTransition).transitionProperty;
      const effect = a.effect as KeyframeEffect;
      // A CSS transition's curve lives on the effect's timing; its keyframes are linear.
      seen.set(property, { from: effect.getKeyframes()[0] as Record<string, unknown>, duration: Number(effect.getTiming().duration), easing: String(effect.getTiming().easing) });
    }
  };
  document.addEventListener("transitionrun", on, true);
  return { seen, stop: () => document.removeEventListener("transitionrun", on, true) };
}

/** Each transition running on `el`: its property, first keyframe value and duration. */
function starts(el: Element) {
  return new Map(
    el.getAnimations().map((a) => {
      const property = (a as CSSTransition).transitionProperty;
      const effect = a.effect as KeyframeEffect;
      const key = property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return [property, { from: String((effect.getKeyframes()[0] as Record<string, unknown>)[key]), duration: Number(effect.getTiming().duration) }];
    }),
  );
}

async function settled(el: Element) {
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

function Basic(props: { onValueChange?: (v: string) => void } = {}) {
  return (
    <Tabs defaultValue="links" {...props}>
      <Tabs.List>
        <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
        <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
        <Tabs.Tab value="advanced">Advanced settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="links">Links panel</Tabs.Panel>
      <Tabs.Panel value="appearance">Appearance panel</Tabs.Panel>
      <Tabs.Panel value="advanced">Advanced panel</Tabs.Panel>
    </Tabs>
  );
}

describe("The behaviour layer carries the tab contract", () => {
  test("tablist and tabs are wired to their panels both ways", () => {
    mount(<Basic />);
    const list = document.querySelector('[data-slot="tabs-list"]')!;
    expect(list.getAttribute("role")).toBe("tablist");

    const [first] = tabs();
    expect(first!.getAttribute("role")).toBe("tab");
    expect(first!.getAttribute("aria-selected")).toBe("true");

    // The pairing is what makes a tab strip navigable rather than decorative.
    const controls = first!.getAttribute("aria-controls")!;
    const panel = document.getElementById(controls)!;
    expect(panel.getAttribute("role")).toBe("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(first!.id);
  });

  test("only the SELECTED tab is in the tab order — roving tabindex", () => {
    mount(<Basic />);
    const [first, second, third] = tabs();
    // The classic hand-rolled failure is leaving every tab tabbable, so a
    // keyboard user must Tab through all of them to reach the content.
    expect(first!.getAttribute("tabindex")).toBe("0");
    expect(second!.getAttribute("tabindex")).toBe("-1");
    expect(third!.getAttribute("tabindex")).toBe("-1");
  });

  test("arrows move FOCUS and Enter selects — manual activation", async () => {
    const onValueChange = vi.fn();
    mount(<Basic onValueChange={onValueChange} />);
    tabs()[0]!.focus();

    // Manual activation, which is the ARIA-approved pattern when a panel is
    // expensive to render: arrowing does not fire a selection on every step.
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs()[1]);
    expect(onValueChange).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith("appearance");
    // Narrowed from Base UI's (value, eventDetails) to a plain string.
    expect(onValueChange.mock.calls[0]).toHaveLength(1);

    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(tabs()[2]);
    await userEvent.keyboard("{Home}");
    expect(document.activeElement).toBe(tabs()[0]);
  });

  test("selecting a tab shows only its panel", async () => {
    mount(<Basic />);
    const visible = () => panels().filter((p) => p.getAttribute("hidden") === null);
    expect(visible()).toHaveLength(1);
    expect(visible()[0]!.textContent).toBe("Links panel");

    await userEvent.click(tabs()[1]!);
    expect(visible()).toHaveLength(1);
    expect(visible()[0]!.textContent).toBe("Appearance panel");
  });

  test("a disabled tab cannot be selected", async () => {
    const onValueChange = vi.fn();
    mount(
      <Tabs defaultValue="a" onValueChange={onValueChange}>
        <Tabs.List>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b" isDisabled>B</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">A</Tabs.Panel>
        <Tabs.Panel value="b">B</Tabs.Panel>
      </Tabs>,
    );
    await userEvent.click(tabs()[1]!, { force: true });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("a disabled tab LOOKS disabled — it is aria-disabled, not disabled", async () => {
    const c = mount(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">Enabled</Tabs.Tab>
          <Tabs.Tab value="c" isDisabled>Disabled</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">A</Tabs.Panel>
      </Tabs>,
    );
    void c;
    const [, enabled, disabled] = tabs();
    // Base UI never sets the native attribute — it renders aria-disabled and
    // data-disabled, so the tab stays focusable and announceable. Every
    // `disabled:` class in this component therefore matched NOTHING, and the
    // row painted exactly like an enabled one. The refusal worked; only the
    // appearance was missing, which is the half no behaviour test could see.
    expect((disabled as HTMLButtonElement).disabled).toBe(false);
    expect(disabled!.getAttribute("aria-disabled")).toBe("true");
    // Asserted as a DIFFERENCE from the enabled tab beside it.
    expect(getComputedStyle(disabled!).color).not.toBe(getComputedStyle(enabled!).color);
    expect(getComputedStyle(disabled!).cursor).toBe("not-allowed");
    expect(getComputedStyle(enabled!).cursor).toBe("pointer");
  });
});

describe("Tabs paint the designed strip", () => {
  test("the list is a bordered surface with token geometry", () => {
    mount(<Basic />);
    const style = getComputedStyle(document.querySelector('[data-slot="tabs-list"]')!);
    // The sheet drew #FDFCFC and #E8E2D9 as raw hexes.
    expect(style.backgroundColor).toBe("rgb(253, 252, 251)");
    expect(style.borderTopColor).toBe("rgb(218, 212, 206)");
    expect(style.borderRadius).toBe("8px");
    // 3px, the sheet's own inset. This assertion said 2px and called it "the
    // sheet's own" for as long as Tabs existed, which is how the drift stayed
    // put: the component was wrong, and the test had been written from the
    // component rather than from the sheet. The sheet lays out a 4px gap on
    // all four sides — 3px padding inside a 1.5px border the browser uses as
    // 1px — and 3px is also what closes §6's concentric arithmetic against the
    // PADDING box (8 − 1 = 7 = 4 + 3).
    expect(style.padding).toBe("3px");
    // Still 32px, but now as a CONSEQUENCE (24 + 3 + 3 + 1 + 1) rather than as
    // an `h-8` that forced it. The four-sided inset is asserted against the
    // sheet's own coordinates in registry/visual/geometry.browser.test.tsx.
    expect(document.querySelector('[data-slot="tabs-list"]')!.getBoundingClientRect().height).toBe(32);
  });

  test("the selected tab is filled and the rest are not", async () => {
    mount(<Basic />);
    const [first, second] = tabs();
    await settled(first!);
    await frames();
    // The fill is the indicator's now (ADR 0030 study, Tabs motion sheet);
    // the RELATIONSHIP is unchanged: the selected tab reads filled.
    expect(selectedFill()).toBe("rgb(237, 232, 227)");
    expect(getComputedStyle(first!).color).toBe("rgb(29, 27, 25)");
    // Unselected tabs are transparent so the list's own surface shows through.
    expect(getComputedStyle(second!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(second!).color).toBe("rgb(105, 99, 93)");
  });

  test("the count renders at 12px, never the sheet's 11px", () => {
    mount(<Basic />);
    const count = document.querySelector<HTMLElement>('[data-slot="tabs-count"]')!;
    // ADR 0009 set the 12px floor after an 11px label pushed a control under
    // the WCAG target size.
    expect(getComputedStyle(count).fontSize).toBe("12px");
    expect(count.textContent).toBe("1");
  });

  test("a changing count moves only its changed digit, and its text stays the number", async () => {
    const at = (n: number) => (
      <Tabs defaultValue="a">
        <Tabs.List aria-label="Projects">
          <Tabs.Tab value="a" count={n}>Open</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    );
    mount(at(12));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    act(() => root!.render(at(13)));
    await new Promise((r) => requestAnimationFrame(r));
    const count = document.querySelector<HTMLElement>('[data-slot="tabs-count"]')!;
    expect(count.textContent).toBe("13");
    const chars = [...count.querySelectorAll<HTMLElement>('[data-slot="count-char"]')];
    expect(chars[0]!.getAnimations()).toHaveLength(0);
    expect(chars[1]!.getAnimations().map((a) => (a as CSSTransition).transitionProperty)).toContain("opacity");
  });

  test("the focus ring is PAINTED, not merely declared", async () => {
    mount(<Basic />);
    const tab = tabs()[0]!;
    const before = getComputedStyle(tab).boxShadow;

    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(tab);
    await settled(tab);

    // Roving tabindex means the ring is the ONLY thing telling a keyboard user
    // where they are — the other tabs are not even in the tab order.
    const after = getComputedStyle(tab).boxShadow;
    expect(after).not.toBe(before);
    expect(after).not.toBe("none");
  });

  test("each tab clears the 24px target floor", () => {
    mount(<Basic />);
    for (const tab of tabs()) {
      expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    }
  });
});

describe("The selected tab reads as selected in BOTH schemes", () => {
  function Strip() {
    return (
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Tab value="a">Selected</Tabs.Tab>
          <Tabs.Tab value="b">Not</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">A</Tabs.Panel>
      </Tabs>
    );
  }

  /** Renders inside a scheme-pinned frame, so dark is really dark. */
  function mountIn(scheme: "light" | "dark") {
    container = document.createElement("div");
    Object.assign(
      container.style,
      toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), scheme) as unknown as Record<string, string>,
      { colorScheme: scheme },
    );
    container.className = "bg-base";
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(<Strip />); });
    return container;
  }

  test.each(["light", "dark"] as const)("the fill differs from the track — %s", (scheme) => {
    const c = mountIn(scheme);
    const list = c.querySelector<HTMLElement>('[data-slot="tabs-list"]')!;
    const [selected, unselected] = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="tabs-tab"]'));

    const track = getComputedStyle(list).backgroundColor;
    const fill = selectedFill(c);
    void selected;
    // The selected tab must not paint the track's own colour, and the
    // unselected one must not paint anything. `bg-sunken` failed the first of
    // these by a hair in dark on the old mid-grey ramp — 1.10:1, close enough
    // to read as unselected (1.41:1 on the 2026-11-03 warm-ink ramp, where
    // sunken is a fill above the surface).
    expect(fill).not.toBe(track);
    expect(getComputedStyle(unselected!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(contrast(fill, track), `${scheme}: selected fill vs track`).toBeGreaterThanOrEqual(1.15);
  });
});

/** WCAG relative-luminance contrast between two `rgb(...)` strings. */
function contrast(a: string, b: string): number {
  const lum = (css: string) => {
    const [r, g, bl] = css.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number) as [number, number, number];
    const ch = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(bl);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

describe("Panel isAlwaysMounted (#34)", () => {
  test("an unselected panel stays in the DOM, hidden, so static HTML carries it", () => {
    const c = mount(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Tab value="a">Overview</Tabs.Tab>
          <Tabs.Tab value="b">Process</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">First</Tabs.Panel>
        <Tabs.Panel value="b" isAlwaysMounted>Second</Tabs.Panel>
      </Tabs>,
    );
    const panels = [...c.querySelectorAll<HTMLElement>('[data-slot="tabs-panel"]')];
    const second = panels.find((p) => p.textContent === "Second");
    expect(second).toBeDefined();
    expect(second!.hidden).toBe(true);
  });

  test("by default an unselected panel is not rendered", () => {
    const c = mount(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Tab value="a">Overview</Tabs.Tab>
          <Tabs.Tab value="b">Process</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">First</Tabs.Panel>
        <Tabs.Panel value="b">Second</Tabs.Panel>
      </Tabs>,
    );
    expect(c.textContent).not.toContain("Second");
  });
});

// Public Page Hockney (6GM-0/6GP-0) exposed the independent-radius bug:
// 12px track and 6px child cannot be concentric around a 3px inset.
describe("Brand geometry retains density", () => {
  test.each([{ md: 12, sm: 6 }, { md: 6, sm: 4 }, { md: 0, sm: 0 }])("enclosed corners derive from the track: %j", (radiusPx) => {
    const host = mount(<Basic />);
    const pair = resolveThemePair({ ...THEME_ZERO, shape: { radiusPx } });
    for (const [key, value] of Object.entries(pair.light)) host.style.setProperty(key, value);
    const list = host.querySelector<HTMLElement>('[data-slot="tabs-list"]')!;
    const child = host.querySelector<HTMLElement>('[data-slot="tabs-tab"]')!;
    const outer = getComputedStyle(list), inner = getComputedStyle(child);
    expect(parseFloat(outer.borderTopLeftRadius)).toBe(radiusPx.md);
    const inset = parseFloat(outer.paddingTop) + parseFloat(outer.borderTopWidth);
    expect(Math.abs(parseFloat(inner.borderTopLeftRadius) - Math.max(0, parseFloat(outer.borderTopLeftRadius) - inset))).toBeLessThanOrEqual(0.5);
    expect(outer.paddingTop).toBe("3px");
    expect(list.getBoundingClientRect().height).toBe(32);
  });
});

describe("Choosing a tab moves something (Tabs motion sheet)", () => {
  test("the selected fill is one indicator; at Full the tabs stop painting their own", async () => {
    mount(<Basic />);
    await frames();
    // The tab's own fill hands over to the indicator once it is shown, in
    // the same place and the same colour — so nothing visibly changes.
    await settled(tabs()[0]!);
    const ind = indicator()!;
    expect(ind, "one indicator per list").not.toBeNull();
    expect(ind.parentElement!.getAttribute("data-slot")).toBe("tabs-list");
    expect(getComputedStyle(ind).display).not.toBe("none");
    expect(getComputedStyle(ind).backgroundColor).toBe("rgb(237, 232, 227)");
    // Two fills would cross-fade under one sliding pill.
    expect(getComputedStyle(tabs()[0]!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    // It sits exactly on the selected tab.
    const a = ind.getBoundingClientRect();
    const b = tabs()[0]!.getBoundingClientRect();
    expect([a.left, a.top, a.width, a.height].map(Math.round)).toEqual([b.left, b.top, b.width, b.height].map(Math.round));
  });

  test("the hand-over to the indicator is instant: the selected tab's fill never fades at Full", async () => {
    // Same colour, same place — a fade there animates nothing a person can
    // see, and it made the at-rest screenshot depend on when it was taken
    // (CI's visual job differed by 3–5 corner pixels between runs).
    mount(<Basic />);
    const runs = recordRuns(() => tabs()[0] ?? null);
    await frames(4);
    runs.stop();
    expect(runs.seen.has("background-color")).toBe(false);
    expect(getComputedStyle(tabs()[0]!).transitionProperty).not.toContain("background-color");
  });

  test("its first placement does not animate", async () => {
    mount(<Basic />);
    const runs = recordRuns(() => indicator());
    await frames(4);
    runs.stop();
    expect([...runs.seen.keys()]).toEqual([]);
  });

  test("a layout change does not slide it: a resized tab is simply followed", async () => {
    // A web font arriving or the layout reflowing re-measures the tab.
    // Gliding there animates something nobody chose — and CI's at-rest
    // screenshot caught exactly that glide while the font swapped in.
    const c = mount(<Basic />);
    await frames(3);
    const runs = recordRuns(() => indicator());
    c.style.width = "360px";
    await frames(4);
    for (const t of tabs()) t.style.fontSize = "18px";
    await frames(4);
    runs.stop();
    expect([...runs.seen.keys()]).toEqual([]);
    const a = indicator()!.getBoundingClientRect();
    const b = tabs()[0]!.getBoundingClientRect();
    expect([a.left, a.width, a.height].map(Math.round)).toEqual([b.left, b.width, b.height].map(Math.round));
  });

  test("choosing another tab slides it there on --ui-duration-base with --ui-ease-out, from where it was", async () => {
    mount(<Basic />);
    await frames();
    const from = indicator()!.getBoundingClientRect().left;
    const runs = recordRuns(() => indicator());
    await userEvent.click(tabs()[2]!);
    await frames(2);
    runs.stop();
    const slide = runs.seen.get("translate");
    expect(slide, "the indicator travels rather than reappearing").toBeDefined();
    expect(slide!.duration).toBe(tokenMs("--ui-duration-base"));
    expect(slide!.easing).toBe(getComputedStyle(document.documentElement).getPropertyValue("--ui-ease-out").trim());
    await settled(indicator()!);
    const end = indicator()!.getBoundingClientRect();
    const target = tabs()[2]!.getBoundingClientRect();
    expect(Math.round(end.left)).toBe(Math.round(target.left));
    expect(Math.round(end.width)).toBe(Math.round(target.width));
    expect(Math.round(end.left)).not.toBe(Math.round(from));
  });

  test("the sliding window closes when the slide ends: a later resize is followed, a later choice slides again", async () => {
    const c = mount(<Basic />);
    await frames();
    await userEvent.click(tabs()[1]!);
    await frames(2);
    await settled(indicator()!);
    await frames(3);
    expect(indicator()!.hasAttribute("data-sliding")).toBe(false);

    let runs = recordRuns(() => indicator());
    c.style.width = "380px";
    await frames(4);
    runs.stop();
    expect([...runs.seen.keys()]).toEqual([]);

    runs = recordRuns(() => indicator());
    await userEvent.click(tabs()[2]!);
    await frames(2);
    runs.stop();
    expect(runs.seen.has("translate")).toBe(true);
  });

  test("at Reduced the indicator steps aside and the selected tab paints its own fill", async () => {
    document.documentElement.setAttribute("data-ui-motion", "reduced");
    try {
      mount(<Basic />);
      await frames();
      expect(getComputedStyle(indicator()!).display).toBe("none");
      expect(getComputedStyle(tabs()[0]!).backgroundColor).toBe("rgb(237, 232, 227)");
      await userEvent.click(tabs()[1]!);
      await settled(tabs()[1]!);
      expect(getComputedStyle(tabs()[1]!).backgroundColor).toBe("rgb(237, 232, 227)");
      expect(getComputedStyle(tabs()[0]!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    } finally {
      document.documentElement.removeAttribute("data-ui-motion");
    }
  });

  test("the first panel is simply there: nothing animates on load", async () => {
    mount(<Basic />);
    const runs = recordRuns(() => panels()[0] ?? null);
    await frames(4);
    runs.stop();
    expect([...runs.seen.keys()]).toEqual([]);
  });

  test("a panel enters from the side of the tab picked, by --ui-space-sm, fading in on base", async () => {
    mount(<Basic />);
    await frames();
    const step = tokenPx("--ui-space-sm");
    const panel = (text: string) => panels().find((p) => p.textContent === text)!;
    /** The transitions the panel starts, read straight after the change. */
    const entrance = (el: HTMLElement) => starts(el);

    await userEvent.click(tabs()[2]!);
    let run = entrance(panel("Advanced panel"));
    expect(run.get("translate")?.from).toBe(`${step}px`);
    expect(run.get("opacity")?.from).toBe("0");
    expect(run.get("opacity")?.duration).toBe(tokenMs("--ui-duration-base"));
    await settled(panel("Advanced panel"));

    await userEvent.click(tabs()[0]!);
    run = entrance(panel("Links panel"));
    expect(run.get("translate")?.from).toBe(`-${step}px`);
  });

  test("at Reduced a panel only fades: no travel", async () => {
    document.documentElement.setAttribute("data-ui-motion", "reduced");
    try {
      mount(<Basic />);
      await frames();
      await userEvent.click(tabs()[1]!);
      const run = starts(panels().find((p) => p.textContent === "Appearance panel")!);
      expect(run.get("opacity")?.from).toBe("0");
      expect(run.get("translate")?.from ?? "none").toMatch(/^(none|0px)$/);
    } finally {
      document.documentElement.removeAttribute("data-ui-motion");
    }
  });
});
