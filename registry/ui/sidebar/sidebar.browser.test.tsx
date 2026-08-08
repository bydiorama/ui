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

describe("The rail is two layers, and the second replaces the first", () => {
  const profile = () => document.querySelector<HTMLButtonElement>('[data-slot="sidebar-profile"]')!;
  const layer = () => document.querySelector<HTMLElement>('[data-slot="sidebar-layer"]');
  const main = () => document.querySelector<HTMLElement>('[data-slot="sidebar-main"]');
  const back = () => document.querySelector<HTMLButtonElement>('[data-slot="sidebar-layer-back"] button')!;

  function Rail() {
    return (
      <Sidebar label="Primary">
        <Sidebar.Main>
          <Sidebar.Profile name="Jakub Otcenas" email="jakub@bydiorama.com" layer="profile" />
          <Sidebar.Item href="/agent">Agent</Sidebar.Item>
        </Sidebar.Main>
        <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back to navigation">
          <Sidebar.Heading>Select brand</Sidebar.Heading>
          <Sidebar.Search label="Search brands" />
          <Sidebar.Item href="/ohpen" isCurrent>Ohpen</Sidebar.Item>
        </Sidebar.Layer>
      </Sidebar>
    );
  }

  test("the second layer REPLACES the navigation rather than covering it", async () => {
    mount(<Rail />);
    expect(main()).not.toBeNull();
    expect(layer()).toBeNull();
    await userEvent.click(profile());
    // Both halves: the layer arrives AND the navigation goes. A layer that
    // merely rendered on top would leave the rows beneath reachable by Tab.
    expect(layer()).not.toBeNull();
    expect(main()).toBeNull();
    expect(document.querySelector('[data-slot="sidebar-item"]')?.textContent).toBe("Ohpen");
  });

  test("focus moves INTO the layer and comes back to the row that opened it", async () => {
    mount(<Rail />);
    const opener = profile();
    await userEvent.click(opener);
    // Otherwise a keyboard user presses the profile row and is left standing
    // on a row that no longer exists — §10, focus is never lost.
    await expect.poll(() => document.activeElement).toBe(back());
    await userEvent.click(back());
    await expect.poll(() => document.activeElement).toBe(profile());
    expect(main()).not.toBeNull();
  });

  test("the back control is NAMED for where it returns to", async () => {
    mount(<Rail />);
    await userEvent.click(profile());
    // "Back" alone leaves a screen-reader user to guess, and a rail may hold
    // more than one layer — which is why backLabel is required.
    expect(back().getAttribute("aria-label")).toBe("Back to navigation");
  });

  test("a controlled layer is the caller's alone", async () => {
    mount(
      <Sidebar label="Primary" layer={null}>
        <Sidebar.Main>
          <Sidebar.Profile name="Jakub" layer="profile" />
        </Sidebar.Main>
        <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back">
          <Sidebar.Item href="/x">Brand</Sidebar.Item>
        </Sidebar.Layer>
      </Sidebar>,
    );
    await userEvent.click(profile());
    expect(layer(), "the component must not open itself when the caller holds the state").toBeNull();
  });

  test("the profile row announces its parts and is a real button", () => {
    mount(<Rail />);
    expect(profile().tagName).toBe("BUTTON");
    expect(profile().textContent).toContain("Jakub Otcenas");
    expect(profile().textContent).toContain("jakub@bydiorama.com");
    // Not aria-expanded: nothing expands. The rail swaps screens, so the row
    // is navigation between two of them.
    expect(profile().getAttribute("aria-expanded")).toBeNull();
  });
});

describe("The rail's own controls", () => {
  test("the email is readable ink, not the disabled role", () => {
    const c = mount(
      <Sidebar label="Primary">
        <Sidebar.Main>
          <Sidebar.Profile name="Jakub" email="jakub@bydiorama.com" />
        </Sidebar.Main>
      </Sidebar>,
    );
    const email = c.querySelector<HTMLElement>('[data-slot="sidebar-profile-email"]')!;
    // The sheet drew --ui-text-disabled: 2.14:1 in light, 2.51:1 in dark. An
    // address is CONTENT, so WCAG's disabled exemption does not apply.
    // text-ink-muted measures 5.93 / 4.94. Corrected in Paper.
    expect(getComputedStyle(email).color).toBe("rgb(105, 99, 93)");
  });

  test("the search field is LABELLED, and the placeholder is not the label", () => {
    const c = mount(
      <Sidebar label="Primary">
        <Sidebar.Main>
          <Sidebar.Search label="Search brands" />
        </Sidebar.Main>
      </Sidebar>,
    );
    const input = c.querySelector<HTMLInputElement>('input[type="search"]')!;
    const labelled = c.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(input.id)}"]`)!;
    expect(labelled.textContent).toBe("Search brands");
    expect(input.placeholder).toBe("Search");
    // A placeholder disappears the moment anything is typed, taking the
    // field's name with it (§10).
    expect(input.getAttribute("aria-label")).toBeNull();
  });

  test("the search WRAPPER draws the ring, so the input can be outline-none", async () => {
    const c = mount(
      <Sidebar label="Primary">
        <Sidebar.Main>
          <Sidebar.Search label="Search brands" />
        </Sidebar.Main>
      </Sidebar>,
    );
    const field = c.querySelector<HTMLElement>('[data-slot="sidebar-search"]')!;
    const input = c.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(getComputedStyle(field).boxShadow).toBe("none");
    input.focus();
    await settled(field);
    // focus-within on the wrapper is the ONE place outline-none on the inner
    // control is safe (§6).
    expect(getComputedStyle(field).boxShadow).not.toBe("none");
  });

  test("a Slot holds a control at the row inset and adds nothing to it", () => {
    const c = mount(
      <Sidebar label="Primary">
        <Sidebar.Main>
          <Sidebar.Slot>
            <button type="button" data-testid="inner">Do a thing</button>
          </Sidebar.Slot>
        </Sidebar.Main>
      </Sidebar>,
    );
    const slot = c.querySelector<HTMLElement>('[data-slot="sidebar-slot"]')!;
    // No role, no tab stop, no click target of its own — whatever goes in
    // keeps its own semantics.
    expect(slot.getAttribute("role")).toBeNull();
    expect(slot.getAttribute("tabindex")).toBeNull();
    expect(slot.querySelector('[data-testid="inner"]')).not.toBeNull();
  });
});

describe("A layer showing from the start does not steal focus", () => {
  test("defaultLayer mounts the layer WITHOUT moving focus into it", () => {
    mount(
      <Sidebar label="Primary" defaultLayer="profile">
        <Sidebar.Main>
          <Sidebar.Profile name="Jakub" layer="profile" />
        </Sidebar.Main>
        <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back to navigation">
          <Sidebar.Item href="/x">Ohpen</Sidebar.Item>
        </Sidebar.Layer>
      </Sidebar>,
    );
    expect(document.querySelector('[data-slot="sidebar-layer"]')).not.toBeNull();
    // Focus follows a USER opening the layer, not the layer existing. A rail
    // rendered with its second screen already showing must leave the page's
    // focus where it was — the same rudeness as a menu that opens itself.
    expect(document.activeElement).toBe(document.body);
  });

  test("but a user-driven open still moves focus in", async () => {
    mount(
      <Sidebar label="Primary">
        <Sidebar.Main>
          <Sidebar.Profile name="Jakub" layer="profile" />
        </Sidebar.Main>
        <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back to navigation">
          <Sidebar.Item href="/x">Ohpen</Sidebar.Item>
        </Sidebar.Layer>
      </Sidebar>,
    );
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="sidebar-profile"]')!);
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Back to navigation");
  });
});

describe("Every label in the rail sits on ONE lane", () => {
  test("row, heading, layer title, profile and search text all share a left edge", async () => {
    const c = mount(
      <Sidebar label="Primary" className="w-nav">
        <Sidebar.Main>
          <Sidebar.Profile name="Jakub Otcenas" email="jakub@bydiorama.com" layer="profile" avatar={<svg />} />
          <Sidebar.Heading>Most recent</Sidebar.Heading>
          <Sidebar.Search label="Search the workspace" />
          <Sidebar.Item href="/agent">Agent</Sidebar.Item>
          <Sidebar.Section label="Create" isCollapsible>
            <Sidebar.Item href="/overview">Overview</Sidebar.Item>
          </Sidebar.Section>
        </Sidebar.Main>
        <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back to navigation">
          <Sidebar.Heading>Select brand</Sidebar.Heading>
          <Sidebar.Item href="/ohpen">Ohpen</Sidebar.Item>
        </Sidebar.Layer>
      </Sidebar>,
    );
    const rail = c.querySelector<HTMLElement>('[data-slot="sidebar"]')!.getBoundingClientRect().left;
    const lane = (el: Element) => Math.round(el.getBoundingClientRect().left - rail);

    // The sheet measures ONE lane at 20px from the rail's edge, for every
    // piece of text in it: row labels, the section heading, the layer title,
    // the profile row's avatar and the search field's placeholder. Three of
    // these shipped at 24 and 28 — "the indentation of various text classes"
    // is exactly what that looks like from the outside.
    const lanes = {
      row: lane(c.querySelector('[data-slot="sidebar-item"] [data-slot="sidebar-text"]')!),
      sectionLabel: lane(c.querySelector('[data-slot="sidebar-section-label"] [data-slot="sidebar-text"]')!),
      heading: lane(c.querySelector('[data-slot="sidebar-heading"] [data-slot="sidebar-text"]')!),
      profileAvatar: lane(c.querySelector('[data-slot="sidebar-profile-avatar"]')!),
      searchText: lane(c.querySelector('[data-slot="sidebar-search"] input')!),
    };
    for (const [part, value] of Object.entries(lanes)) {
      expect(value, `${part} is off the 20px lane`).toBe(20);
    }

    // The layer's own text is on the same lane, which is what makes the two
    // screens read as one surface rather than two.
    await userEvent.click(c.querySelector<HTMLElement>('[data-slot="sidebar-profile"]')!);
    expect(lane(document.querySelector('[data-slot="sidebar-layer-title"] [data-slot="sidebar-text"]')!)).toBe(20);
    expect(lane(document.querySelector('[data-slot="sidebar-heading"] [data-slot="sidebar-text"]')!)).toBe(20);
    expect(lane(document.querySelector('[data-slot="sidebar-item"] [data-slot="sidebar-text"]')!)).toBe(20);
  });

  test("a boxed control sits 8px inside the text lane, as the field does", () => {
    const c = mount(
      <Sidebar label="Primary" className="w-nav">
        <Sidebar.Main>
          <Sidebar.Search label="Search" />
          <Sidebar.Slot>
            <button type="button" data-testid="inner">New chat</button>
          </Sidebar.Slot>
        </Sidebar.Main>
      </Sidebar>,
    );
    const rail = c.querySelector<HTMLElement>('[data-slot="sidebar"]')!.getBoundingClientRect().left;
    const lane = (el: Element) => Math.round(el.getBoundingClientRect().left - rail);
    // A box, not a label: it shares the search field's edge so the two stack
    // without a step between them.
    expect(lane(c.querySelector('[data-slot="sidebar-search"]')!)).toBe(12);
    expect(lane(c.querySelector('[data-testid="inner"]')!)).toBe(12);
  });
});

describe("The search field is the sheet's field, measured", () => {
  test("every drawn number, against node LFL-0 on the Sidebar artboard", () => {
    const c = mount(
      <Sidebar label="Primary" className="w-nav">
        <Sidebar.Main>
          <Sidebar.Search label="Search the workspace" />
        </Sidebar.Main>
      </Sidebar>,
    );
    const field = c.querySelector<HTMLElement>('[data-slot="sidebar-search"]')!;
    const style = getComputedStyle(field);
    // The sheet: height 40, radius-sm, px-sm, py-xs, gap-sm, bg-base, and a
    // 1px OUTLINE rather than a border — the outline is why the placeholder
    // lands on the same lane as every row label instead of 1px inside it.
    expect(field.getBoundingClientRect().height).toBe(40);
    expect(style.borderRadius).toBe("4px");
    expect(style.paddingLeft).toBe("8px");
    expect(style.paddingTop).toBe("4px");
    expect(style.columnGap).toBe("8px");
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineWidth).toBe("1px");
    expect(style.borderTopWidth).toBe("0px");

    // The glyph is TRAILING, as the sheet orders its children — text, then
    // icon — and sits in a 4px box of its own, which is what sets the field's
    // right inset.
    const input = field.querySelector<HTMLInputElement>("input")!;
    const icon = field.querySelector("svg")!;
    expect(input.getBoundingClientRect().left).toBeLessThan(icon.getBoundingClientRect().left);
    expect(icon.getBoundingClientRect().width).toBe(16);
    expect(getComputedStyle(icon.parentElement!).padding).toBe("4px");
  });
});
