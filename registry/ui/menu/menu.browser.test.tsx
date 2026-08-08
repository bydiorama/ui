import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, type ThemeSeed } from "@bydiorama/tokens";

import { Menu } from "./menu.tsx";
import { ContextMenu } from "@/ui/context-menu/context-menu.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Header } from "@/ui/header/header.tsx";
import { Sheet } from "@/ui/sheet/sheet.tsx";

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

const trigger = () => document.querySelector<HTMLElement>('[data-slot="menu-trigger"]')!;
const panel = () => document.querySelector<HTMLElement>('[data-slot="menu-panel"]');
const items = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="menu-item"]'));
const item = (label: string) => items().find((i) => i.textContent?.trim() === label)!;

/** A computed read taken mid-transition returns the value it is coming FROM. */
async function settled(el: Element) {
  // Wait for the transition to EXIST before waiting for it to finish.
  //
  // Base UI suppresses transitions for exactly one frame after a surface
  // opens — it writes `style="transition: none"` inline so the panel cannot
  // animate from a stale position — and an inline style beats every class.
  // So `getAnimations()` sampled on that frame returns [], this helper
  // resolves instantly, and the caller reads geometry or computed style in
  // the MIDDLE of the transition it thought it had awaited.
  //
  // That was not theoretical: Select's "opens BELOW the trigger" and "the
  // enter transition ACTUALLY runs on scale" both flaked on main, one or the
  // other on nearly every run, and this is the single cause of both. A panel
  // read while `scale-98` is still applied is 2% smaller and sits 2px lower,
  // which is exactly the 10.35-versus-8 the offset assertion kept reporting.
  for (let i = 0; i < 3 && el.getAnimations().length === 0; i++) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }
  // Then DRAIN, rather than awaiting one batch. Waiting for a transition to
  // appear can itself let a second one start — Switch's track begins moving
  // between two accent fills during those frames — and a single
  // `Promise.all` returns while that one is still mid-flight, which reads as
  // an interpolated colour that matches no token at all.
  for (let i = 0; i < 5; i++) {
    const running = el.getAnimations();
    if (running.length === 0) break;
    await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
  }
}

function Basic({ onSelect = vi.fn() }: { onSelect?: () => void }) {
  return (
    <Menu>
      <Menu.Trigger render={<Button>Open menu</Button>} />
      <Menu.Panel>
        <Menu.Item onSelect={onSelect}>Profile</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={onSelect}>Brand panel</Menu.Item>
        <Menu.Item isDisabled>Members</Menu.Item>
      </Menu.Panel>
    </Menu>
  );
}

describe("Menu is the ARIA menu, from the behaviour layer", () => {
  test("the trigger declares the menu it owns", async () => {
    mount(<Basic />);
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(panel()).toBeNull();
    await userEvent.click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(panel()!.getAttribute("role")).toBe("menu");
    expect(items().every((i) => i.getAttribute("role") === "menuitem")).toBe(true);
  });

  test("the trigger keeps its own element and accessible name (§3)", () => {
    mount(<Basic />);
    // A render slot is passed straight through, never wrapped — so the Button
    // is still a button and still says what it says.
    expect(trigger().tagName).toBe("BUTTON");
    expect(trigger().textContent).toContain("Open menu");
  });

  test("arrows reach EVERY row, including the disabled one", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent?.trim()).toBe("Profile");
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent?.trim()).toBe("Brand panel");
    await userEvent.keyboard("{ArrowDown}");
    // The disabled row is REACHED, not skipped — and that is right, for the
    // same reason Calendar's unavailable dates stay focusable: a row a
    // screen-reader user cannot reach is one they cannot be told the reason
    // for. This test was written asserting the opposite, because the doc
    // claimed the opposite; the behaviour layer was correct and the prose was
    // not. It is announced as disabled and refuses activation below.
    expect(document.activeElement?.textContent?.trim()).toBe("Members");
    expect(item("Members").getAttribute("aria-disabled")).toBe("true");
  });

  test("Enter on the disabled row does nothing and does not close", async () => {
    const onSelect = vi.fn();
    mount(<Basic onSelect={onSelect} />);
    await userEvent.click(trigger());
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  test("typeahead jumps to a row by its label", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await userEvent.keyboard("bra");
    expect(document.activeElement?.textContent?.trim()).toBe("Brand panel");
  });

  test("Enter chooses a row and closes — onSelect, not onClick", async () => {
    const onSelect = vi.fn();
    mount(<Basic onSelect={onSelect} />);
    await userEvent.click(trigger());
    await userEvent.keyboard("{ArrowDown}{Enter}");
    // The whole point of naming it for the verb: the keyboard path has to
    // fire the same handler the pointer does.
    expect(onSelect).toHaveBeenCalledTimes(1);
    await expect.poll(() => trigger().getAttribute("aria-expanded")).toBe("false");
  });

  test("Escape closes and returns focus to the trigger", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.activeElement).toBe(trigger());
  });

  test("a disabled row refuses the pointer too", async () => {
    const onSelect = vi.fn();
    mount(<Basic onSelect={onSelect} />);
    await userEvent.click(trigger());
    // Dispatched rather than driven: Playwright waits forever on a control it
    // considers not-enabled, and what is being proved is that it refuses.
    await act(async () => { item("Members").click(); });
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("a separator is announced, not just drawn", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const separator = document.querySelector('[data-slot="menu-separator"]')!;
    expect(separator.getAttribute("role")).toBe("separator");
    // ANNOUNCED but not painted: the sheet draws space and no rule, confirmed
    // by design. Rows sit flush, so the band is the only vertical space in the
    // panel and carries the break on its own — and the role is what a screen
    // reader gets either way, which is the half that must not be dropped.
    expect(getComputedStyle(separator).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(separator.getBoundingClientRect().height).toBeLessThanOrEqual(1);
    // The space is real, though: 8px above and below.
    const box = separator.getBoundingClientRect();
    const rows = items();
    const above = rows.find((r) => r.getBoundingClientRect().bottom <= box.top)!;
    const below = rows.find((r) => r.getBoundingClientRect().top >= box.bottom)!;
    expect(below.getBoundingClientRect().top - above.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(16);
  });

  test("a group is named, so the grouping is not only visual", async () => {
    mount(
      <Menu defaultIsOpen>
        <Menu.Trigger render={<Button>Open</Button>} />
        <Menu.Panel>
          <Menu.Group label="Brand profile">
            <Menu.Item>Overview</Menu.Item>
          </Menu.Group>
        </Menu.Panel>
      </Menu>,
    );
    const group = document.querySelector('[data-slot="menu-group"]')!;
    expect(group.getAttribute("role")).toBe("group");
    const labelId = group.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toBe("Brand profile");
  });
});

describe("The menu surface is ONE surface", () => {
  test("a Menu row and a ContextMenu row are the same drawing", async () => {
    // Rendered together and compared to EACH OTHER. Asserting values on each
    // separately would pass while the two recipes drifted apart, which is the
    // only failure that matters for a shared recipe — and a lib recipe has no
    // doc of its own for check:contrast to see.
    mount(
      <div>
        <Menu defaultIsOpen>
          <Menu.Trigger render={<Button>A</Button>} />
          <Menu.Panel><Menu.Item>Duplicate</Menu.Item></Menu.Panel>
        </Menu>
        <ContextMenu defaultIsOpen>
          <ContextMenu.Trigger tabIndex={0}>region</ContextMenu.Trigger>
          <ContextMenu.Panel><Menu.Item>Duplicate</Menu.Item></ContextMenu.Panel>
        </ContextMenu>
      </div>,
    );
    const menuPanelEl = document.querySelector<HTMLElement>('[data-slot="menu-panel"]')!;
    const ctxPanelEl = document.querySelector<HTMLElement>('[data-slot="context-menu-panel"]')!;
    await settled(menuPanelEl);
    await settled(ctxPanelEl);

    const a = getComputedStyle(menuPanelEl);
    const b = getComputedStyle(ctxPanelEl);
    for (const property of ["backgroundColor", "borderRadius", "borderTopWidth", "borderTopColor", "padding", "boxShadow", "minWidth"] as const) {
      expect(`${property}: ${a[property]}`).toBe(`${property}: ${b[property]}`);
    }

    const [rowA, rowB] = items();
    const ra = getComputedStyle(rowA!);
    const rb = getComputedStyle(rowB!);
    for (const property of ["padding", "borderRadius", "fontSize", "fontWeight", "color"] as const) {
      expect(`${property}: ${ra[property]}`).toBe(`${property}: ${rb[property]}`);
    }
  });

  test("the row is FIXED type, not a fluid title role", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    // text-title-sm peaks at 16 and is clamp(...vw...), so inside a panel of
    // fixed width it computes to ~12px on a phone. The sheet draws 16 at every
    // viewport, which only a fixed role delivers.
    expect(getComputedStyle(item("Profile")).fontSize).toBe("16px");
  });

  test("the highlight is a real fill, and it moves", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const resting = getComputedStyle(item("Brand panel")).backgroundColor;
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await settled(item("Brand panel"));
    expect(item("Brand panel").getAttribute("data-highlighted")).not.toBeNull();
    expect(getComputedStyle(item("Brand panel")).backgroundColor).not.toBe(resting);
  });

  test("an icon slot is sized by the component, not by griddy", async () => {
    mount(
      <Menu defaultIsOpen>
        <Menu.Trigger render={<Button>Open</Button>} />
        <Menu.Panel>
          <Menu.Item icon={<svg data-testid="glyph" viewBox="0 0 24 24" width="24" height="24" />}>Row</Menu.Item>
        </Menu.Panel>
      </Menu>,
    );
    const svg = document.querySelector<SVGElement>('[data-testid="glyph"]')!;
    // griddy renders width/height as ATTRIBUTES, so an unsized slot ships 24
    // against a sheet that draws 16 everywhere.
    expect(svg.getBoundingClientRect().width).toBe(16);
  });
});

describe("The panel never renders outside the viewport (§7c)", () => {
  test("its caps are the positioner's MEASUREMENT, not constants", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const positioner = panel()!.parentElement!;
    const read = (name: string) => Number.parseFloat(getComputedStyle(positioner).getPropertyValue(name));
    expect(read("--available-height")).toBeGreaterThan(0);
    // A fixed cap fits a comfortable test viewport perfectly well, so "the
    // panel is on screen" passes against the bug. Where the number comes from
    // is what distinguishes them.
    expect(Number.parseFloat(getComputedStyle(panel()!).maxHeight)).toBeCloseTo(read("--available-height"), 0);
    expect(Number.parseFloat(getComputedStyle(panel()!).maxWidth)).toBeCloseTo(read("--available-width"), 0);
  });

  test("the panel fades in and does NOT move while it does", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    // Sampled after a frame, not immediately: Base UI writes an inline
    // `transition: none` for the first frame of an open, so a sample taken
    // there finds no animations at all and reads as a dead transition on a
    // working component.
    await expect
      .poll(() => panel()!.getAnimations().map((a) => (a as CSSTransition).transitionProperty))
      .toContain("opacity");

    // And the box must be STILL. A scale about Base UI's anchor origin — 45px
    // inside a 224px panel — slid the left edge while it grew, which is the
    // wiggle this replaced. Asserted as a rect that does not move across the
    // whole entrance, because "there is no scale class" would pass on a panel
    // that moved for any other reason.
    const first = panel()!.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const now = panel()!.getBoundingClientRect();
      expect(Math.abs(now.left - first.left), `left moved on frame ${i}`).toBeLessThan(0.5);
      expect(Math.abs(now.width - first.width), `width moved on frame ${i}`).toBeLessThan(0.5);
    }
  });
});

describe("A submenu opens beside its row", () => {
  function Nested() {
    return (
      <Menu defaultIsOpen>
        <Menu.Trigger render={<Button>Open</Button>} />
        <Menu.Panel>
          <Menu.Item>Profile</Menu.Item>
          <Menu.Sub>
            <Menu.SubTrigger>Admin settings</Menu.SubTrigger>
            <Menu.Panel side="right" align="start">
              <Menu.Item>Roles</Menu.Item>
            </Menu.Panel>
          </Menu.Sub>
        </Menu.Panel>
      </Menu>
    );
  }

  test("the sub trigger declares its own popup", () => {
    mount(<Nested />);
    const sub = document.querySelector<HTMLElement>('[data-slot="menu-sub-trigger"]')!;
    expect(sub.getAttribute("aria-haspopup")).toBe("menu");
    expect(sub.getAttribute("aria-expanded")).toBe("false");
  });

  test("Arrow Right opens it and Arrow Left closes it again", async () => {
    mount(<Nested />);
    const sub = document.querySelector<HTMLElement>('[data-slot="menu-sub-trigger"]')!;
    sub.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.poll(() => document.querySelectorAll('[data-slot="menu-panel"]').length).toBe(2);
    await userEvent.keyboard("{ArrowLeft}");
    await expect.poll(() => document.querySelectorAll('[data-slot="menu-panel"]').length).toBe(1);
  });
});

describe("A portalled panel needs the theme brought to it", () => {
  const BRAND: ThemeSeed = {
    colors: {
      bg: "#fffdf5", surface: "#ffffff", muted: "#f4ecd8",
      textPrimary: "#1a1400", textMuted: "#6b5d3f",
      border: "rgba(26, 20, 0, 0.12)", accent: "#ffe066",
    },
  };

  function Themed({ withContainer }: { withContainer: boolean }) {
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    const brand = toStyleObject(resolveThemePair(BRAND), "light");
    return (
      <div ref={setHost} style={brand as React.CSSProperties}>
        <Menu defaultIsOpen>
          <Menu.Trigger render={<Button>Open</Button>} />
          <Menu.Panel {...(withContainer ? { container: host } : {})}>
            <Menu.Item>Profile</Menu.Item>
          </Menu.Panel>
        </Menu>
      </div>
    );
  }

  test("without a container it escapes the scope; with one it inherits", () => {
    mount(<Themed withContainer={false} />);
    const escaped = getComputedStyle(panel()!).backgroundColor;
    act(() => root?.unmount());
    container?.remove();

    mount(<Themed withContainer />);
    // Both halves asserted: a `container` prop that changed nothing would pass
    // a test that only looked at the second.
    expect(getComputedStyle(panel()!).backgroundColor).not.toBe(escaped);
  });
});

describe("A Header nav item can BE the trigger", () => {
  test("the sheet's 'Create ⌄' composes without a second control", async () => {
    // The sheet draws two nav items that open a menu rather than navigate.
    // Composing them means Header.Item has to forward a ref — without one the
    // behaviour layer cannot anchor its panel to the row or restore focus to
    // it, and the failure is silent.
    mount(
      <Header>
        <Header.Nav label="Primary">
          <Header.Item href="/agent">Agent</Header.Item>
          <Menu>
            <Menu.Trigger
              render={<Header.Item trailing={<span aria-hidden="true">▾</span>}>Create</Header.Item>}
            />
            <Menu.Panel>
              <Menu.Item>New project</Menu.Item>
              <Menu.Item>New brand</Menu.Item>
            </Menu.Panel>
          </Menu>
        </Header.Nav>
      </Header>,
    );

    const composed = trigger();
    // ONE element, not a button inside a button: the render slot is passed
    // through, never wrapped (§3).
    expect(composed.tagName).toBe("BUTTON");
    expect(composed.textContent).toContain("Create");
    expect(composed.getAttribute("aria-haspopup")).toBe("menu");
    // The item's own data-slot loses to the trigger's — true of every render
    // slot in this library, and the reason a selector written against
    // `header-item` would match nothing here.
    expect(composed.getAttribute("data-slot")).toBe("menu-trigger");

    await userEvent.click(composed);
    expect(panel()).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    // Focus restoration is the half that needs the ref.
    await expect.poll(() => document.activeElement).toBe(composed);
  });

  test("it keeps the header item's own geometry", async () => {
    mount(
      <Header>
        <Header.Nav label="Primary">
          <Header.Item href="/agent">Agent</Header.Item>
          <Menu>
            <Menu.Trigger render={<Header.Item>Create</Header.Item>} />
            <Menu.Panel><Menu.Item>New project</Menu.Item></Menu.Panel>
          </Menu>
        </Header.Nav>
      </Header>,
    );
    const plain = document.querySelector<HTMLElement>('[data-slot="header-item"]')!;
    const composed = trigger();
    // Compared to a plain item rather than to numbers: a trigger that picked
    // up the behaviour layer's own styling would drift from the row beside it,
    // and only the comparison shows that.
    for (const property of ["height", "borderRadius", "fontSize", "paddingLeft"] as const) {
      expect(`${property}: ${getComputedStyle(composed)[property]}`).toBe(
        `${property}: ${getComputedStyle(plain)[property]}`,
      );
    }
  });
});

describe("A sheet opens from the edge its trigger sits on", () => {
  test("a menu button in Header.End opens a panel on the RIGHT", async () => {
    mount(
      <Sheet>
        <Header>
          <Header.Spacer />
          <Header.End>
            <Sheet.Trigger render={<Header.MenuButton label="Open primary navigation" />} />
          </Header.End>
        </Header>
        <Sheet.Panel label="Primary navigation" side="right">
          <p>Nav</p>
        </Sheet.Panel>
      </Sheet>,
    );
    const button = document.querySelector<HTMLElement>('[data-slot="sheet-trigger"], [data-slot="header-menu-button"]')!;
    await userEvent.click(button);
    const surface = document.querySelector<HTMLElement>('[data-slot="sheet-panel"]')!;
    await settled(surface);

    const buttonBox = button.getBoundingClientRect();
    const panelBox = surface.getBoundingClientRect();
    const viewportMiddle = window.innerWidth / 2;
    // Asserted as a RELATIONSHIP between the two, not as coordinates: a drawer
    // arriving from the opposite edge to the control the user just pressed
    // reads as a different control entirely, and Sheet's `side` defaults to
    // left, so a trailing trigger has to say so. Reported against the Header
    // story, which did exactly that.
    const buttonOnRight = buttonBox.left > viewportMiddle;
    const panelOnRight = panelBox.right >= window.innerWidth - 1;
    expect(buttonOnRight, "the fixture must put the button on the right").toBe(true);
    expect(panelOnRight, "the panel must share the button's edge").toBe(true);
  });
});
