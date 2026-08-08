import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";
import { ChevronDown } from "griddy-icons";

import { Sheet } from "@/ui/sheet/sheet.tsx";
import { Header } from "./header.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

function Basic() {
  return (
    <Header>
      <Header.Start>
        <button type="button">Brand</button>
        <button type="button">Back</button>
      </Header.Start>
      <Header.Spacer />
      <Header.Nav label="Primary">
        <Header.Item href="/agent">Agent</Header.Item>
        <Header.Item trailing={<ChevronDown aria-hidden="true" />}>Create</Header.Item>
        <Header.Item href="/library" isCurrent>Library</Header.Item>
      </Header.Nav>
      <Header.Spacer />
      <Header.End>
        <button type="button">Menu</button>
      </Header.End>
    </Header>
  );
}

const items = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="header-item"]'));

describe("Header is a banner that contains a navigation, not one that IS one", () => {
  test("the bar is a <header>, and only the item row is a nav", () => {
    const c = mount(<Basic />);
    const bar = c.querySelector<HTMLElement>('[data-slot="header"]')!;
    expect(bar.tagName).toBe("HEADER");
    // The bar also holds a brand switcher and an avatar menu. Calling all of
    // that "navigation" would make the landmark useless to skip to.
    expect(bar.getAttribute("role")).toBeNull();

    const nav = c.querySelector<HTMLElement>('[data-slot="header-nav"]')!;
    expect(nav.tagName).toBe("NAV");
    const labelledBy = nav.getAttribute("aria-labelledby")!;
    expect(c.querySelector(`#${CSS.escape(labelledBy)}`)?.textContent).toBe("Primary");
  });

  test("a Header inside a section is NOT a second banner", () => {
    const c = mount(
      <>
        <Basic />
        <section><Basic /></section>
      </>,
    );
    const bars = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="header"]'));
    // A document may have exactly ONE banner, and <header> maps to that role
    // only when it is not inside article/aside/main/nav/section. Two bare
    // Headers on a page is an axe landmark-no-duplicate-banner violation —
    // which is a composition rule, not something the component can enforce,
    // so it is pinned here and written down in the doc.
    expect(bars[0]!.closest("section")).toBeNull();
    expect(bars[1]!.closest("section")).not.toBeNull();
  });

  test("nav items are list items; controls in Start and End are not", () => {
    const c = mount(<Basic />);
    const list = c.querySelector<HTMLElement>('[data-slot="header-nav-list"]')!;
    expect(list.tagName).toBe("UL");
    expect(list.children).toHaveLength(3);
    for (const li of Array.from(list.children)) expect(li.tagName).toBe("LI");
    // A brand switcher announced as a list item misdescribes the page.
    const start = c.querySelector<HTMLElement>('[data-slot="header-start"]')!;
    expect(start.querySelector("li")).toBeNull();
  });

  test("an item with href is a LINK; one without is a BUTTON", () => {
    mount(<Basic />);
    expect(items()[0]!.tagName).toBe("A");
    // The sheet draws two items with a chevron: they open menus rather than
    // navigate, and a link that does not navigate is the commonest lie in a bar.
    expect(items()[1]!.tagName).toBe("BUTTON");
    expect(items()[1]!.getAttribute("type")).toBe("button");
  });

  test("the current page is ANNOUNCED, not just filled", () => {
    mount(<Basic />);
    const current = items()[2]!;
    expect(current.getAttribute("aria-current")).toBe("page");
    for (const other of items().filter((i) => i !== current)) {
      expect(other.getAttribute("aria-current")).toBeNull();
    }
  });

  test("the spacers are furniture, not content", () => {
    const c = mount(<Basic />);
    for (const s of Array.from(c.querySelectorAll<HTMLElement>('[data-slot="header-spacer"]'))) {
      expect(s.getAttribute("aria-hidden")).toBe("true");
    }
  });

  test("render swaps the item's own tag without dropping its wiring", async () => {
    const onLinkClick = vi.fn();
    const c = mount(
      <Header>
        <Header.Nav label="Primary">
          <Header.Item
            href="/agent"
            isCurrent
            render={<a href="/agent" data-testid="custom-link" onClick={onLinkClick} />}
          >
            Agent
          </Header.Item>
        </Header.Nav>
      </Header>,
    );
    // Passed through, not wrapped (§3): the render element's own tag and
    // attributes carry the DOM node.
    const item = c.querySelector<HTMLElement>('[data-slot="header-item"]')!;
    expect(item.tagName).toBe("A");
    expect(item.getAttribute("data-testid")).toBe("custom-link");
    // But what render exists to preserve — the item's own wiring — still
    // lands on it: aria-current, its content, and its click handler chains
    // rather than being replaced by the element's own.
    expect(item.getAttribute("aria-current")).toBe("page");
    expect(item.textContent).toBe("Agent");
    await userEvent.click(item);
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });
});

describe("Header paints the sheet's bar", () => {
  test("the bar is 48px on a 32px control", () => {
    const c = mount(<Basic />);
    const bar = c.querySelector<HTMLElement>('[data-slot="header"]')!;
    const style = getComputedStyle(bar);
    // py-sm (8+8) around a 32px control is the sheet's 48.
    expect(style.paddingTop).toBe("8px");
    expect(style.paddingBottom).toBe("8px");
    // px-lg, NOT the sheet's raw 20px — 20 is off the spacing scale, and the
    // mobile drawing of the same bar uses 12. Recorded as a design defect.
    expect(style.paddingLeft).toBe("16px");
    expect(style.backgroundColor).toBe("rgb(253, 252, 251)");
  });

  test("an item uses the compact control inset and soft radius", () => {
    const c = mount(<Basic />);
    const list = c.querySelector<HTMLElement>('[data-slot="header-nav-list"]')!;
    expect(getComputedStyle(list).gap).toBe("4px");

    const item = items()[1]!;
    const style = getComputedStyle(item);
    expect(style.fontSize).toBe("12px");
    expect(style.fontWeight).toBe("600");
    expect(style.paddingTop).toBe("4px");
    expect(style.paddingRight).toBe("8px");
    expect(style.paddingBottom).toBe("4px");
    expect(style.paddingLeft).toBe("8px");
    expect(style.borderRadius).toBe("4px");
    // 24 exactly — SC 2.5.8's floor rather than comfortably over it.
    expect(item.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);

    const trailing = item.querySelector<SVGElement>("svg")!;
    expect(trailing.getBoundingClientRect().width).toBe(16);
    expect(trailing.getBoundingClientRect().height).toBe(16);
  });

  test("current and resting items differ in FILL, not only in aria", () => {
    mount(<Basic />);
    const a = getComputedStyle(items()[2]!);
    const b = getComputedStyle(items()[0]!);
    // Asserted as a difference: equal values would pass while the two states
    // silently converged into one.
    expect(a.backgroundColor).not.toBe(b.backgroundColor);
    expect(a.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("the focus ring is PAINTED on an item", async () => {
    mount(<Basic />);
    const item = items()[0]!;
    expect(getComputedStyle(item).boxShadow).toBe("none");
    for (let i = 0; i < 8 && document.activeElement !== item; i++) await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(item);
    await Promise.all(item.getAnimations().map((a) => a.finished.catch(() => undefined)));
    expect(getComputedStyle(item).boxShadow).not.toBe("none");
  });
});

describe("The navigation collapses into a single menu button", () => {
  test("MenuButton is a named chrome control, not a ghost button", () => {
    const c = mount(
      <Header>
        <Header.End>
          <Header.MenuButton label="Open primary navigation" />
        </Header.End>
      </Header>,
    );
    const b = c.querySelector<HTMLElement>('[data-slot="header-menu-button"]')!;
    expect(b.tagName).toBe("BUTTON");
    // "Menu" is not an accessible name — say what it opens.
    expect(b.getAttribute("aria-label")).toBe("Open primary navigation");

    const style = getComputedStyle(b);
    // The chrome control: a 32px square FILLED with bg-elevated and no edge.
    // The stories had this as a ghost Button — transparent, ringless — which
    // is a different thing the sheet does not draw here.
    expect(Math.round(b.getBoundingClientRect().width)).toBe(32);
    expect(Math.round(b.getBoundingClientRect().height)).toBe(32);
    expect(style.backgroundColor).toBe("rgb(246, 243, 240)");
    expect(style.borderRadius).toBe("8px");
  });

  test("it takes the Sheet's disclosure wiring rather than declaring its own", async () => {
    const c = mount(
      <Sheet>
        <Header>
          <Header.End>
            <Sheet.Trigger render={<Header.MenuButton label="Open primary navigation" />} />
          </Header.End>
        </Header>
        <Sheet.Panel label="Primary navigation">
          <a href="#a">One</a>
        </Sheet.Panel>
      </Sheet>,
    );
    // COMPOSED through `render`, the trigger's own data-slot wins — a part
    // used as a trigger is targeted by the trigger's slot, not its own. That
    // is a property of every render slot in this library, not of this button.
    expect(c.querySelector('[data-slot="header-menu-button"]')).toBeNull();
    const b = c.querySelector<HTMLElement>('[data-slot="sheet-trigger"]')!;
    // One source for the disclosure state. A button that declared its own
    // aria-expanded could disagree with the panel it opens, and nothing would
    // catch the disagreement.
    expect(b.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(b);
    expect(b.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[data-slot="sheet-panel"]')).not.toBeNull();
    // It keeps its own name through the render slot.
    expect(b.getAttribute("aria-label")).toBe("Open primary navigation");
  });

  test("the bar carries a menu button OR a nav row, and the caller picks", () => {
    // There is no rail: below the breakpoint the Sidebar is removed, not
    // narrowed. Which of the two renders is a layout decision, so Header
    // must not assume either exists.
    const bar = mount(
      <Header>
        <Header.Start><button type="button">Brand</button></Header.Start>
        <Header.Spacer />
        <Header.End><Header.MenuButton label="Open primary navigation" /></Header.End>
      </Header>,
    );
    expect(bar.querySelector('[data-slot="header-nav"]')).toBeNull();
    expect(bar.querySelector('[data-slot="header-menu-button"]')).not.toBeNull();
  });
});
