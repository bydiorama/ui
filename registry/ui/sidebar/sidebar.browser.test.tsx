import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Sidebar } from "./sidebar.tsx";

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
    <Sidebar label="Primary">
      <Sidebar.Group>
        <button type="button">Back</button>
        <button type="button">Close</button>
      </Sidebar.Group>
      <Sidebar.Section label="Brand" isCollapsible icon={<svg aria-hidden="true" />}>
        <Sidebar.Item href="/brand/guidelines" isCurrent>Guidelines</Sidebar.Item>
        <Sidebar.Item href="/brand/assets">Assets</Sidebar.Item>
        <Sidebar.Item href="/brand/templates">Templates</Sidebar.Item>
      </Sidebar.Section>
      <Sidebar.Item href="/exports">Exports</Sidebar.Item>
      <Sidebar.Section label="Most recent">
        <Sidebar.Item href="/settings/team">Team</Sidebar.Item>
      </Sidebar.Section>
      <Sidebar.Spacer />
      <Sidebar.Item>
        <progress value={0.4} aria-label="Storage used" />
      </Sidebar.Item>
    </Sidebar>
  );
}

describe("Sidebar is navigation, and the platform provides the behaviour", () => {
  test("a named nav landmark — several navs on a page are otherwise identical", () => {
    const c = mount(<Basic />);
    const nav = c.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    expect(nav.tagName).toBe("NAV");
    const name = nav.getAttribute("aria-labelledby")!;
    const label = c.querySelector<HTMLElement>(`#${CSS.escape(name)}`)!;
    expect(label.textContent).toBe("Primary");
    // Hidden by default: the sheet draws no rail heading, so the label names
    // the landmark without rendering. sr-only, never display:none — the
    // accessibility tree still needs it.
    expect(getComputedStyle(label).display).not.toBe("none");
    expect(label.getBoundingClientRect().width).toBeLessThan(2);
  });

  test("a collapsed last section is not jammed against the rail edge", async () => {
    const c = mount(
      <Sidebar label="Primary">
        <Sidebar.Section label="Brand" isCollapsible>
          <Sidebar.Item href="/brand/guidelines">Guidelines</Sidebar.Item>
        </Sidebar.Section>
      </Sidebar>,
    );
    const header = c.querySelector<HTMLElement>('[data-slot="sidebar-section-label"]')!;
    await userEvent.click(header);

    const nav = c.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    const gap = nav.getBoundingClientRect().bottom - header.getBoundingClientRect().bottom;
    // The rail carries no padding of its own; the body's p-sm is what keeps a
    // collapsed final row off the edge. 4px of rail padding used to be all
    // there was, and it read as a mistake.
    expect(gap).toBeGreaterThanOrEqual(8);
  });

  test("an item with an href is a real link, so the browser keeps its contract", () => {
    const c = mount(<Basic />);
    const link = c.querySelector<HTMLAnchorElement>('a[data-slot="sidebar-item"]')!;
    // A <div role="link"> loses middle-click, open-in-new-tab and the UA's
    // own focus handling; none of that is worth arrow keys on a list of links.
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/brand/guidelines");
    expect(link.getAttribute("tabindex")).toBeNull();
  });

  test("an item WITHOUT an href is a plain slot, not a link to nowhere", () => {
    const c = mount(<Basic />);
    const rows = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="sidebar-item"]'));
    const slot = rows.find((el) => el.querySelector("progress"))!;
    // The sheet puts a search field in one Primary Level Item and a progress
    // bar in a Second Level Item. Forcing every row to be an anchor would mean
    // an anchor wrapping a form control — invalid, and unreachable by keyboard
    // in the way the user expects.
    expect(slot.tagName).toBe("DIV");
    expect(slot.getAttribute("href")).toBeNull();
    // Its child fills the row rather than being squeezed beside an absent label.
    expect(slot.querySelector('[data-slot="sidebar-text"]')).toBeNull();
  });

  test("rows inside a Section are list items; rows outside one are not", () => {
    const c = mount(<Basic />);
    const section = c.querySelector<HTMLElement>('[data-slot="sidebar-section"]')!;
    const sublist = section.querySelector<HTMLElement>('[data-slot="sidebar-sublist"]')!;
    expect(sublist.tagName).toBe("UL");
    // "list, 3 items" should arrive attached to the section it belongs to.
    expect(sublist.children).toHaveLength(3);
    for (const li of Array.from(sublist.children)) expect(li.tagName).toBe("LI");

    // A top-level row may hold a search field or a progress bar; announcing
    // that furniture as a list item would be a lie about the page structure.
    const top = c.querySelector<HTMLElement>('a[data-slot="sidebar-item"][href="/exports"]')!;
    expect(top.parentElement?.tagName).toBe("DIV");
  });

  test("a collapsible section header is a disclosure BUTTON; a plain one is not", () => {
    const c = mount(<Basic />);
    const headers = Array.from(
      c.querySelectorAll<HTMLElement>('[data-slot="sidebar-section-label"]'),
    );
    // It reveals content on this page rather than going anywhere. A link that
    // does not navigate is the most common lie in a nav.
    expect(headers[0]!.tagName).toBe("BUTTON");
    expect(headers[0]!.getAttribute("aria-expanded")).toBe("true");
    const controls = headers[0]!.getAttribute("aria-controls")!;
    expect(c.querySelector(`#${CSS.escape(controls)}`)?.getAttribute("data-slot"))
      .toBe("sidebar-sublist");

    // The sheet draws a chevron on "Brand" and none on "Most recent", so
    // collapsibility is a property of a section rather than its definition —
    // and a header that cannot collapse must not be a button that does nothing.
    expect(headers[1]!.tagName).toBe("SPAN");
    expect(headers[1]!.getAttribute("aria-expanded")).toBeNull();
  });

  test("collapsing hides the sublist and flips aria-expanded", async () => {
    const c = mount(<Basic />);
    const header = c.querySelector<HTMLElement>('[data-slot="sidebar-section-label"]')!;
    const sublist = c.querySelector<HTMLElement>('[data-slot="sidebar-sublist"]')!;
    expect(sublist.hidden).toBe(false);

    await userEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    // The ATTRIBUTE is not the behaviour: Tailwind's `flex` sets display and
    // beats the UA's [hidden] rule, so a hidden attribute alone leaves the
    // list on screen. Assert what a user would see.
    expect(sublist.hidden).toBe(true);
    expect(getComputedStyle(sublist).display).toBe("none");
    // `hidden`, not unmounted: aria-controls must keep pointing at something.
    expect(c.contains(sublist)).toBe(true);
  });

  test("the current page is ANNOUNCED, not just filled", () => {
    const c = mount(<Basic />);
    const current = c.querySelector<HTMLElement>("[data-current]")!;
    // A background alone conveys nothing to a screen reader (WCAG 1.4.1).
    expect(current.getAttribute("aria-current")).toBe("page");
    const others = Array.from(c.querySelectorAll('a[data-slot="sidebar-item"]'))
      .filter((el) => el !== current);
    for (const el of others) expect(el.getAttribute("aria-current")).toBeNull();
  });

  test("both levels sit at the SAME inset — the sheet does not indent", () => {
    const c = mount(<Basic />);
    const section = c.querySelector<HTMLElement>('[data-slot="sidebar-section"]')!;
    const header = section.querySelector<HTMLElement>('[data-slot="sidebar-section-label"]')!;
    const link = section.querySelector<HTMLElement>('a[data-slot="sidebar-item"]')!;
    const sublist = section.querySelector<HTMLElement>('[data-slot="sidebar-sublist"]')!;
    const body = c.querySelector<HTMLElement>('[data-slot="sidebar-body"]')!;

    // 8px on the body + 12px on the row = the sheet's 20px, both levels.
    // Hierarchy is carried by type and colour, not by a redundant indent that
    // would cost horizontal room on a narrow rail.
    //
    // Asserted through the padding that CREATES the inset rather than through
    // glyph positions, which move with text metrics and the trailing chevron.
    expect(getComputedStyle(sublist).paddingLeft).toBe("0px");
    expect(getComputedStyle(body).paddingLeft).toBe("8px");
    expect(getComputedStyle(header).paddingLeft).toBe(getComputedStyle(link).paddingLeft);
    expect(getComputedStyle(link).paddingLeft).toBe("12px");
  });

  test("tab order walks the links in document order", async () => {
    const c = mount(<Basic />);
    const links = Array.from(c.querySelectorAll<HTMLElement>("a"));
    links[0]!.focus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(links[1]);
  });

  test("the Spacer pushes what follows to the bottom", () => {
    const c = mount(
      <div style={{ height: "600px", display: "flex" }}>
        <Sidebar label="Primary" className="h-full">
          <Sidebar.Item href="/a">Top</Sidebar.Item>
          <Sidebar.Spacer />
          <Sidebar.Item href="/b">Bottom</Sidebar.Item>
        </Sidebar>
      </div>,
    );
    const nav = c.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    const bottom = c.querySelector<HTMLElement>('a[href="/b"]')!;
    // Within 8px of the rail's own floor — the body's p-sm, nothing else.
    const slack = nav.getBoundingClientRect().bottom - bottom.getBoundingClientRect().bottom;
    expect(slack).toBeLessThanOrEqual(9);
    // Furniture, not content: a spacer in the a11y tree is a nameless node
    // a screen reader has to step over.
    const spacer = c.querySelector<HTMLElement>('[data-slot="sidebar-spacer"]')!;
    expect(spacer.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Sidebar paints the nav role family", () => {
  test("the rail uses --ui-nav-width and the nav surface roles", () => {
    const c = mount(<Basic />);
    const nav = c.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    const style = getComputedStyle(nav);
    // w-nav is --ui-nav-width (17rem = 272px). Neither width token had a
    // Tailwind utility until this component needed one.
    expect(style.width).toBe("272px");
    expect(style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(style.borderRadius).toBe("16px");
  });

  test("the two levels are told apart by TYPE, since they share an inset", () => {
    const c = mount(<Basic />);
    const header = c.querySelector<HTMLElement>('[data-slot="sidebar-section-label"]')!;
    const link = c.querySelector<HTMLElement>(
      '[data-slot="sidebar-sublist"] a[data-slot="sidebar-item"]:not([data-current])',
    )!;
    const a = getComputedStyle(header);
    const b = getComputedStyle(link);
    // Same 16px body size at both levels, per the sheet — the difference is
    // weight and ink. Asserted as a DIFFERENCE: equal numbers would pass while
    // the two levels silently converged into one flat list.
    //
    // The absolute numbers matter too, and are what caught the first version:
    // title-sm also peaks at 16 but is FLUID, so it computed to 12.17px here.
    // A fluid role inside a fixed-width rail shrinks with a viewport the rail
    // does not follow.
    expect(a.fontSize).toBe("16px");
    expect(b.fontSize).toBe("16px");
    expect(Number(a.fontWeight)).toBeGreaterThan(Number(b.fontWeight));
    expect(a.color).not.toBe(b.color);
  });

  test("current and resting items use DIFFERENT nav roles", async () => {
    const c = mount(<Basic />);
    const current = c.querySelector<HTMLElement>("[data-current]")!;
    const resting = c.querySelector<HTMLElement>(
      'a[data-slot="sidebar-item"]:not([data-current])',
    )!;
    await settled(current);

    // Asserted as a DIFFERENCE: matching numbers would pass while the two
    // silently converged into one indistinguishable state.
    const a = getComputedStyle(current);
    const b = getComputedStyle(resting);
    expect(a.backgroundColor).not.toBe(b.backgroundColor);
    expect(a.color).not.toBe(b.color);
    expect(a.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    // The active fill measures barely over 1:1 against the rail, so weight
    // carries the state too — colour alone would not survive a brand seed.
    expect(Number(a.fontWeight)).toBeGreaterThan(Number(b.fontWeight));
  });

  test("a row is the sheet's 46px, and clears the 24px target floor", () => {
    const c = mount(<Basic />);
    for (const link of Array.from(c.querySelectorAll<HTMLElement>("a"))) {
      // p-md (12+12) around a 16px line at leading-normal (21.6px) = 45.6,
      // which is the 46 the sheet draws. Well clear of SC 2.5.8's 24px.
      const h = link.getBoundingClientRect().height;
      expect(h).toBeGreaterThanOrEqual(24);
      expect(h).toBeCloseTo(45.6, 0);
    }
  });

  test("rows stack FLUSH — the rhythm is the row's padding, not a gap", () => {
    const c = mount(<Basic />);
    const sublist = c.querySelector<HTMLElement>('[data-slot="sidebar-sublist"]')!;
    const [first, second] = Array.from(sublist.querySelectorAll<HTMLElement>('[data-slot="sidebar-item"]'));
    // The sheet's six-row section measures exactly 6 × 46 = 276. A gap on top
    // of the row padding is a second, competing spacing system — and it is
    // invisible in a screenshot until you measure the total.
    const delta = second!.getBoundingClientRect().top - first!.getBoundingClientRect().bottom;
    expect(delta).toBeCloseTo(0, 0);
  });

  test("the focus ring is PAINTED on a link", async () => {
    const c = mount(<Basic />);
    const link = c.querySelector<HTMLElement>('a[data-slot="sidebar-item"]')!;
    const before = getComputedStyle(link).boxShadow;
    expect(before).toBe("none");
    // Tabbed to, never focused programmatically: :focus-visible does not match
    // a scripted .focus() on a link in Chromium, so the ring would read as
    // broken. Walked rather than counted, because the rail's leading rows are
    // slots — a Group's buttons and a search field come first in tab order,
    // and a fixed number of Tabs silently asserts against one of those.
    for (let i = 0; i < 12 && document.activeElement !== link; i++) {
      await userEvent.keyboard("{Tab}");
    }
    expect(document.activeElement).toBe(link);
    await settled(link);
    expect(getComputedStyle(link).boxShadow).not.toBe("none");
  });
});

describe("A disabled row is announced, not hidden", () => {
  function WithDisabled() {
    return (
      <Sidebar label="Primary">
        <Sidebar.Item href="/a">Available</Sidebar.Item>
        <Sidebar.Item href="/b" isDisabled>Unavailable</Sidebar.Item>
      </Sidebar>
    );
  }

  test("it keeps its link role, its href and its place in the tab order", async () => {
    const c = mount(<WithDisabled />);
    const row = c.querySelector<HTMLAnchorElement>('[data-disabled]')!;
    expect(row.tagName).toBe("A");
    // The href STAYS. Dropping it would leave something that looks like a link
    // and silently does nothing, which is worse than one that says it is off.
    expect(row.getAttribute("href")).toBe("/b");
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(row.getAttribute("tabindex")).toBeNull();

    const links = Array.from(c.querySelectorAll<HTMLElement>("a"));
    links[0]!.focus();
    await userEvent.keyboard("{Tab}");
    // A row a screen-reader user cannot reach is one they cannot be told the
    // reason for, so it stays reachable.
    expect(document.activeElement).toBe(row);
  });

  test("it does not navigate, and does not light up on hover", async () => {
    const c = mount(<WithDisabled />);
    const row = c.querySelector<HTMLElement>('[data-disabled]')!;
    const before = getComputedStyle(row).backgroundColor;
    await userEvent.hover(row);
    await settled(row);
    // Gated behind `!isDisabled`, so an unavailable row cannot look reachable.
    expect(getComputedStyle(row).backgroundColor).toBe(before);
    // Never pointer-events-none: that removes the row from hit-testing and
    // kills any tooltip explaining why it is off.
    expect(getComputedStyle(row).pointerEvents).not.toBe("none");
    expect(getComputedStyle(row).cursor).toBe("not-allowed");
  });

  test("a consumer click handler cannot re-enable navigation", () => {
    const onClick = vi.fn();
    const c = mount(
      <Sidebar label="Primary">
        <Sidebar.Item href="/b" isDisabled onClick={onClick}>Unavailable</Sidebar.Item>
      </Sidebar>,
    );
    const row = c.querySelector<HTMLAnchorElement>("[data-disabled]")!;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(row.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("its ink is the RAIL's disabled step, not the page's", () => {
    const c = mount(<WithDisabled />);
    const disabled = getComputedStyle(c.querySelector<HTMLElement>('[data-disabled]')!);
    const available = getComputedStyle(c.querySelector<HTMLElement>('a[data-slot="sidebar-item"]:not([data-disabled])')!);
    // Asserted as a DIFFERENCE: a disabled row that reads the same as an
    // available one is the actual accessibility failure here, not the ratio.
    expect(disabled.color).not.toBe(available.color);
  });
});

describe("render swaps the row's own tag without dropping its wiring", () => {
  test("the render element's tag and attributes carry the DOM node", async () => {
    const onLinkClick = vi.fn();
    const c = mount(
      <Sidebar label="Primary">
        <Sidebar.Item
          href="/exports"
          isCurrent
          render={<a href="/exports" data-testid="custom-link" onClick={onLinkClick} />}
        >
          Exports
        </Sidebar.Item>
      </Sidebar>,
    );
    // Passed through, not wrapped (§3).
    const row = c.querySelector<HTMLElement>('[data-slot="sidebar-item"]')!;
    expect(row.tagName).toBe("A");
    expect(row.getAttribute("data-testid")).toBe("custom-link");
    // But what render exists to preserve — the row's own wiring — still
    // lands: aria-current, its content, and its click handler chains rather
    // than being replaced by the element's own.
    expect(row.getAttribute("aria-current")).toBe("page");
    expect(row.textContent).toBe("Exports");
    await userEvent.click(row);
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });

  test("the disabled invariant survives a render element with its own onClick", () => {
    const onLinkClick = vi.fn();
    const onClick = vi.fn();
    const c = mount(
      <Sidebar label="Primary">
        <Sidebar.Item
          href="/b"
          isDisabled
          onClick={onClick}
          render={<a href="/b" onClick={onLinkClick} />}
        >
          Unavailable
        </Sidebar.Item>
      </Sidebar>,
    );
    const row = c.querySelector<HTMLAnchorElement>("[data-disabled]")!;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    // Non-navigation is an invariant regardless of which element renders the
    // row — a render slot is not a way to route around it.
    expect(row.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
