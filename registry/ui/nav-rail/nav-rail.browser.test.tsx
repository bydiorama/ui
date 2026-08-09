import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { NavRail } from "./nav-rail.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

async function settled(el: Element) {
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

function Basic() {
  return (
    <NavRail label="Primary">
      <NavRail.Slot>
        <button type="button" aria-label="Expand navigation" />
      </NavRail.Slot>
      <NavRail.Section label="Workspace">
        <NavRail.Item icon={<svg aria-hidden="true" />} label="Overview" href="/overview" />
        <NavRail.Item icon={<svg aria-hidden="true" />} label="Search everything" />
      </NavRail.Section>
      <NavRail.Section label="Brand profile">
        <NavRail.Item icon={<svg aria-hidden="true" />} label="Colours" href="/colours" isCurrent />
        <NavRail.Item icon={<svg aria-hidden="true" />} label="Members" href="/members" isDisabled />
      </NavRail.Section>
      <NavRail.Spacer />
    </NavRail>
  );
}

const rows = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[data-slot="nav-rail-item"]')];

describe("NavRail is navigation at chrome-control geometry", () => {
  test("a named nav landmark whose label can never be shown", () => {
    const c = mount(<Basic />);
    const nav = c.querySelector<HTMLElement>('[data-slot="nav-rail"]')!;
    expect(nav.tagName).toBe("NAV");
    const label = c.querySelector<HTMLElement>(`#${CSS.escape(nav.getAttribute("aria-labelledby")!)}`)!;
    expect(label.textContent).toBe("Primary");
    // sr-only, never display:none — the accessibility tree still needs it.
    expect(getComputedStyle(label).display).not.toBe("none");
    expect(label.getBoundingClientRect().width).toBeLessThan(2);
  });

  test("the rail is 48px, and the row is the shared chrome control's 32px square", () => {
    const c = mount(<Basic />);
    const nav = c.querySelector<HTMLElement>('[data-slot="nav-rail"]')!;
    // The number is measured from the artboard, not chosen: fit-content around
    // space-sm padding on a 32px control. 8 + 32 + 8 = 48, and the three parts
    // are asserted rather than just the total, because a total can be right
    // for the wrong reasons.
    expect(nav.getBoundingClientRect().width).toBe(48);
    const body = c.querySelector<HTMLElement>('[data-slot="nav-rail-body"]')!;
    expect(getComputedStyle(body).paddingLeft).toBe("8px");
    expect(getComputedStyle(body).paddingRight).toBe("8px");
    for (const row of rows(c)) {
      expect(row.getBoundingClientRect().width).toBe(32);
      expect(row.getBoundingClientRect().height).toBe(32);
    }
  });

  test("a row is an <a> when it navigates and a <button> when it acts", () => {
    const c = mount(<Basic />);
    const [overview, search] = rows(c);
    expect(overview!.tagName).toBe("A");
    expect(overview!.getAttribute("href")).toBe("/overview");
    expect(search!.tagName).toBe("BUTTON");
    expect(search!.getAttribute("href")).toBeNull();
  });

  test("the row's only name is its label — nothing renders text", () => {
    const c = mount(<Basic />);
    const [overview] = rows(c);
    expect(overview!.getAttribute("aria-label")).toBe("Overview");
    // The pointer affordance, and a placeholder for a Tooltip this library
    // does not have. The keyboard and SR paths do not depend on it.
    expect(overview!.getAttribute("title")).toBe("Overview");
    expect(overview!.textContent).toBe("");
  });

  test("the glyph slot is sized by the component, not by the icon library", () => {
    const c = mount(<Basic />);
    for (const row of rows(c)) {
      const svg = row.querySelector("svg")!;
      expect(getComputedStyle(svg).width).toBe("16px");
      expect(getComputedStyle(svg).height).toBe("16px");
    }
  });
});

describe("current and hover are told apart by DEPTH, not by a marker", () => {
  test("rest, hover and current are three different fills", async () => {
    const c = mount(<Basic />);
    const [overview, , colours] = rows(c);

    const rest = getComputedStyle(overview!).backgroundColor;
    await userEvent.hover(overview!);
    await settled(overview!);
    const hover = getComputedStyle(overview!).backgroundColor;
    const current = getComputedStyle(colours!).backgroundColor;

    // This shipped as TWO fills with a 2px bar down the current row's leading
    // edge doing the separating. A rule inside a 48px control is clutter, and
    // the library had already ruled it out once — Menu.Separator is "SPACE,
    // not a rule". The family gained --ui-nav-hover-bg instead.
    //
    // Asserted as three DISTINCT values rather than three hexes: pinning the
    // colours would pass while any two of them converged, which is the only
    // failure that matters.
    const fills = [rest, hover, current];
    expect(new Set(fills).size, `ramp collapsed: ${fills.join(" / ")}`).toBe(3);
    expect(rest).toBe("rgba(0, 0, 0, 0)");
  });

  test("nothing paints a partial edge — no marker, no rule, anywhere", () => {
    const c = mount(<Basic />);
    expect(c.querySelector('[data-slot="nav-rail-marker"]')).toBeNull();
    for (const el of [...rows(c), ...c.querySelectorAll<HTMLElement>('[data-slot="nav-rail-section"]')]) {
      const s = getComputedStyle(el);
      // A border on ONE side is the shape being banned: a ruler rather than an
      // outline. All four have to agree, and at rest they are all zero.
      const widths = [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth];
      expect(new Set(widths).size, `partial border on ${el.dataset.slot}: ${widths.join(" ")}`).toBe(1);
      expect(s.boxShadow).toBe("none");
    }
  });

  test("the current row is still announced, which the fill alone never was", () => {
    const c = mount(<Basic />);
    const [overview, , colours] = rows(c);
    expect(colours!.getAttribute("aria-current")).toBe("page");
    expect(overview!.getAttribute("aria-current")).toBeNull();
  });
});

describe("a disabled row stays reachable", () => {
  test("announced as disabled, still tabbable, and it does not navigate", () => {
    const c = mount(<Basic />);
    const members = rows(c).find((r) => r.getAttribute("aria-label") === "Members")!;
    expect(members.getAttribute("aria-disabled")).toBe("true");
    // Kept in the tab order on purpose: a row a screen-reader user cannot
    // reach is one they cannot be told the reason for.
    expect(members.getAttribute("tabindex")).toBeNull();
    expect(members.getAttribute("aria-current")).toBeNull();
    // Never pointer-events-none — that would kill the tooltip explaining why.
    expect(getComputedStyle(members).pointerEvents).not.toBe("none");

    const onClick = vi.fn((e: MouseEvent) => e.preventDefault());
    document.addEventListener("click", onClick);
    act(() => { members.click(); });
    document.removeEventListener("click", onClick);
    expect(onClick.mock.calls[0]?.[0].defaultPrevented).toBe(true);
  });
});

describe("the two-level tree does not survive the width", () => {
  test("a section is a named list, and the grouping is SPACE", () => {
    const c = mount(<Basic />);
    const sections = [...c.querySelectorAll<HTMLElement>('[data-slot="nav-rail-section"]')];
    expect(sections).toHaveLength(2);
    for (const s of sections) expect(s.tagName).toBe("UL");
    expect(sections[0]!.getAttribute("aria-label")).toBe("Workspace");
    expect(sections[1]!.getAttribute("aria-label")).toBe("Brand profile");

    // The grouping is the DIFFERENCE between the body's gap and a section's,
    // and nothing painted. A hairline here was the first version, and it is
    // the shape Menu.Separator already refused.
    const body = c.querySelector<HTMLElement>('[data-slot="nav-rail-body"]')!;
    const between = getComputedStyle(body).rowGap;
    const within = getComputedStyle(sections[0]!).rowGap;
    expect(parseFloat(between)).toBeGreaterThan(parseFloat(within));
    for (const s of sections) expect(getComputedStyle(s).borderTopWidth).toBe("0px");
  });
});

describe("NavRail and Sidebar are interchangeable in a layout", () => {
  test("both put a row on the same lane — the relationship, not the numbers", () => {
    // Asserting `8px` on each would pass while the two silently drifted apart,
    // which is the only failure that matters: a layout swaps one for the other
    // and the navigation must not shift sideways.
    const railC = mount(<Basic />);
    const railPad = getComputedStyle(railC.querySelector('[data-slot="nav-rail-body"]')!).paddingLeft;
    act(() => root?.unmount());
    railC.remove();

    const sideC = mount(
      <Sidebar label="Expanded">
        <Sidebar.Item href="/o">Overview</Sidebar.Item>
      </Sidebar>,
    );
    const sidePad = getComputedStyle(sideC.querySelector('[data-slot="sidebar-body"]')!).paddingLeft;
    expect(railPad).toBe(sidePad);
  });

  test("both paint from the same nav fill, so swapping one for the other keeps the colour", () => {
    const railC = mount(<Basic />);
    const railBg = getComputedStyle(railC.querySelector('[data-slot="nav-rail"]')!).backgroundColor;
    act(() => root?.unmount());
    railC.remove();

    const sideC = mount(
      <Sidebar label="Expanded">
        <Sidebar.Item href="/o">Overview</Sidebar.Item>
      </Sidebar>,
    );
    const sideBg = getComputedStyle(sideC.querySelector('[data-slot="sidebar"]')!).backgroundColor;
    expect(railBg).toBe(sideBg);
  });
});
