/**
 * The stacking scale, measured across the components that consume it.
 *
 * `--ui-z-*` shipped for months with NO consumer, and a token nothing
 * consumes is a guess. Both guesses it made were wrong, in the same way:
 *
 *   1. sticky sat ABOVE dropdown, so a Menu opened from the affix bar would
 *      have slid under the translucent bar it was opened from.
 *   2. with that corrected, dropdown sat UNDER modal — which reads natural
 *      and breaks every Select inside a Modal the moment Modal takes its own
 *      role, because the two portal to <body> and are SIBLINGS.
 *
 * Both are the same fact: a portalled surface has left DOM order behind, so
 * only the scale separates it from anything else portalled. The ordering is
 * therefore forced, not chosen — a surface outranks anything it can be
 * OPENED FROM.
 *
 * Two halves here, and each catches what the other cannot:
 *
 *   "each consumer's z-index IS its token" asserts the number's SOURCE, not
 *   its effect at a comfortable stacking — the same rule as the overlay
 *   max-height tests. A component that drifts to a bare Tailwind step keeps
 *   working at every zoom level and fails only there.
 *
 *   "paint order" asserts the EFFECT, in the one composition the whole scale
 *   exists for. Sources can each be correct while the ladder that orders
 *   them is wrong, which is exactly how the second guess above survived.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { createRoot, type Root } from "react-dom/client";
import { act, useEffect } from "react";
import type { ReactElement } from "react";

import { Button } from "@/ui/button/button.tsx";
import { Drawer } from "@/ui/drawer/drawer.tsx";
import { Header } from "@/ui/header/header.tsx";
import { Menu } from "@/ui/menu/menu.tsx";
import { Modal } from "@/ui/modal/modal.tsx";
import { Popover } from "@/ui/popover/popover.tsx";
import { Select, type SelectItem } from "@/ui/select/select.tsx";
import { Sheet } from "@/ui/sheet/sheet.tsx";
import { Toast, useToast, type ToastManager } from "@/ui/toast/toast.tsx";
import { Tooltip } from "@/ui/tooltip/tooltip.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** A z token's value, read through the cascade the components read it from. */
function zToken(name: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--ui-z-${name}`)
    .trim();
  if (value === "") throw new Error(`--ui-z-${name} is not in the stylesheet`);
  return value;
}

test("the ladder is in the stylesheet and orders every surface under what it opens", () => {
  // The browser-side twin of the token test: proves the CSS emit actually
  // carries the scale (a var missing from the stylesheet computes z-index
  // 'auto' — silently — in every consumer below).
  //
  // It is also the tripwire for a STALE emit, which is a real failure mode
  // of this suite rather than a hypothetical one: the source assertions
  // below read the token from the same stylesheet they check the component
  // against, so an un-regenerated `pnpm tokens` leaves them comparing stale
  // to stale and passing. This test and the paint-order block are the two
  // that notice. Keep the array in step with resolve.test.ts.
  const ladder = ["below", "base", "sticky", "overlay", "modal", "toast", "dropdown", "tooltip"];
  const values = ladder.map((name) => Number(zToken(name)));
  for (let i = 1; i < values.length; i++) {
    expect(values[i - 1]!, `${ladder[i - 1]} under ${ladder[i]}`).toBeLessThan(values[i]!);
  }
});

describe("each consumer's z-index IS its token", () => {
  test("the affix Header layers at --ui-z-sticky", () => {
    const c = mount(
      <Header affix>
        <Header.Nav label="Primary">
          <Header.Item href="#a">Agent</Header.Item>
        </Header.Nav>
      </Header>,
    );
    const bar = c.querySelector<HTMLElement>('[data-slot="header"]')!;
    expect(getComputedStyle(bar).zIndex).toBe(zToken("sticky"));
  });

  test("an anchored panel's positioner layers at --ui-z-dropdown", async () => {
    mount(
      <Menu>
        <Menu.Trigger render={<Button>Open menu</Button>} />
        <Menu.Panel>
          <Menu.Item onSelect={vi.fn()}>Profile</Menu.Item>
        </Menu.Panel>
      </Menu>,
    );
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="menu-trigger"]')!);
    // The z rides on Base UI's Positioner — the panel's parent; the popup
    // itself has no z of its own.
    const positioner = document.querySelector<HTMLElement>('[data-slot="menu-panel"]')!
      .parentElement!;
    expect(getComputedStyle(positioner).zIndex).toBe(zToken("dropdown"));
    // The relationship the sticky correction exists for: a panel opened from
    // the affix bar must never slide under it.
    expect(Number(zToken("sticky"))).toBeLessThan(Number(zToken("dropdown")));
  });

  test("a second Base UI family agrees — Select's positioner is not Menu's code", async () => {
    // Menu, ContextMenu, Select, Multiselect (Combobox) and DatePicker
    // (Popover) are FIVE different Base UI primitives that each received the
    // same one-line class. Base UI writes no inline z-index on any
    // positioner today (its only inline z in the whole package is
    // SliderThumb) — but that is a fact about a dependency version, so a
    // second family is asserted here: an upgrade that starts stamping one
    // family's positioner would leave the Menu assertion green and fail this
    // one, which is the difference between covered and coincidental.
    const items: SelectItem[] = [{ value: "design", label: "Design" }];
    mount(<Select label="Services" items={items} />);
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="select-trigger"]')!);
    const positioner = document.querySelector<HTMLElement>('[data-slot="select-panel"]')!
      .parentElement!;
    expect(getComputedStyle(positioner).zIndex).toBe(zToken("dropdown"));
  });

  test("the toast viewport layers at --ui-z-toast", async () => {
    let manager: ToastManager;
    function Grab() {
      const m = useToast();
      useEffect(() => {
        manager = m;
      }, [m]);
      return null;
    }
    mount(
      <Toast.Provider timeout={0}>
        <Grab />
        <Toast.Viewport label="Notifications" dismissLabel="Dismiss" />
      </Toast.Provider>,
    );
    act(() => {
      manager!.add({ title: "Saved" });
    });
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="toast-viewport"]')).not.toBeNull(),
    );
    const viewport = document.querySelector<HTMLElement>('[data-slot="toast-viewport"]')!;
    expect(getComputedStyle(viewport).zIndex).toBe(zToken("toast"));
  });

  // The five that carried NO z-index at all and layered by portal order.
  // Each is asserted on BOTH of its roots where it has two: a scrim that
  // moves independently of its panel is a veil with the page showing over it.

  test("Modal's scrim and panel both layer at --ui-z-modal", async () => {
    mount(
      <Modal isOpen onOpenChange={vi.fn()}>
        <Modal.Surface>
          <Modal.Title>New task</Modal.Title>
        </Modal.Surface>
      </Modal>,
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="modal-surface"]')).not.toBeNull(),
    );
    for (const slot of ["modal-scrim", "modal-surface"]) {
      const el = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
      expect(getComputedStyle(el).zIndex, slot).toBe(zToken("modal"));
    }
  });

  test("Sheet's scrim and panel both layer at --ui-z-overlay", async () => {
    mount(
      <Sheet isOpen onOpenChange={vi.fn()}>
        <Sheet.Panel label="Filters">
          <Sheet.Title>Filters</Sheet.Title>
        </Sheet.Panel>
      </Sheet>,
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="sheet-panel"]')).not.toBeNull(),
    );
    for (const slot of ["sheet-scrim", "sheet-panel"]) {
      const el = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
      expect(getComputedStyle(el).zIndex, slot).toBe(zToken("overlay"));
    }
  });

  test("Drawer takes the same role as Sheet — one layer, two geometries", async () => {
    mount(
      <Drawer isOpen onOpenChange={vi.fn()}>
        <Drawer.Panel label="Details">
          <Drawer.Title>Details</Drawer.Title>
        </Drawer.Panel>
      </Drawer>,
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="drawer-panel"]')).not.toBeNull(),
    );
    for (const slot of ["drawer-scrim", "drawer-panel"]) {
      const el = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
      expect(getComputedStyle(el).zIndex, slot).toBe(zToken("overlay"));
    }
  });

  test("Popover's positioner layers at --ui-z-dropdown", async () => {
    mount(
      <Popover>
        <Popover.Trigger render={<Button>Details</Button>} />
        <Popover.Panel>
          <Popover.Title>Details</Popover.Title>
        </Popover.Panel>
      </Popover>,
    );
    await userEvent.click(document.querySelector<HTMLElement>("button")!);
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="popover-panel"]')).not.toBeNull(),
    );
    const positioner = document.querySelector<HTMLElement>('[data-slot="popover-panel"]')!
      .parentElement!;
    expect(getComputedStyle(positioner).zIndex).toBe(zToken("dropdown"));
  });

  test("Tooltip's positioner tops the ladder at --ui-z-tooltip", async () => {
    mount(
      <Tooltip.Provider>
        <Tooltip isOpen>
          <Tooltip.Trigger render={<Button>Copy</Button>} />
          <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
        </Tooltip>
      </Tooltip.Provider>,
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip"]')).not.toBeNull(),
    );
    const positioner = document.querySelector<HTMLElement>('[data-slot="tooltip"]')!
      .parentElement!;
    expect(getComputedStyle(positioner).zIndex).toBe(zToken("tooltip"));
  });
});

/**
 * The effect, in the composition the scale exists for.
 *
 * Every assertion above can pass while the ladder ORDERING them is wrong —
 * that is not hypothetical, it is how `dropdown` under `modal` survived a
 * review. So this block asserts what a person would see.
 *
 * Hit-testing is the right instrument HERE and only here: every surface
 * below is opaque and takes pointer events, so `elementFromPoint` returns
 * the painted top. It would be the wrong instrument for the Header's Fade,
 * which is `pointer-events: none` — a probe written that way reports the
 * element UNDER the fade and passes in both the broken and the fixed state.
 * A Fade overlap has to compare rendered pixels.
 */
describe("paint order", () => {
  /** What a click at the centre of the region where two boxes overlap hits. */
  function topmostInOverlap(a: HTMLElement, b: HTMLElement) {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const x = Math.round((Math.max(ra.left, rb.left) + Math.min(ra.right, rb.right)) / 2);
    const y = Math.round((Math.max(ra.top, rb.top) + Math.min(ra.bottom, rb.bottom)) / 2);
    expect(
      x > Math.max(ra.left, rb.left) - 1 && y < Math.min(ra.bottom, rb.bottom),
      "the two elements must actually overlap for this to mean anything",
    ).toBe(true);
    return document.elementFromPoint(x, y) as HTMLElement | null;
  }

  test("an affixed Header does not cover a Sheet, and a Menu in the Sheet covers both", async () => {
    // THE REGRESSION THIS FILE EXISTS FOR. Measured before the fix: the
    // header won this overlap. It is a positive z in the ROOT stacking
    // context, and that paints over a z-auto positioned element whatever
    // the DOM order — so the bar covered every portalled surface carrying
    // no z. Moving it from z-30 to --ui-z-sticky changed the number and not
    // the category; binding the Sheet is what fixed it.
    mount(
      <>
        <Header affix>
          <Header.Nav label="Primary">
            <Header.Item href="#a">Agent</Header.Item>
          </Header.Nav>
        </Header>
        <Sheet isOpen onOpenChange={vi.fn()}>
          <Sheet.Panel label="Filters">
            <Sheet.Title>Filters</Sheet.Title>
            <Menu>
              <Menu.Trigger render={<Button>Sort</Button>} />
              <Menu.Panel>
                <Menu.Item onSelect={vi.fn()}>Newest</Menu.Item>
              </Menu.Panel>
            </Menu>
          </Sheet.Panel>
        </Sheet>
      </>,
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="sheet-panel"]')).not.toBeNull(),
    );

    const bar = document.querySelector<HTMLElement>('[data-slot="header"]')!;
    const panel = document.querySelector<HTMLElement>('[data-slot="sheet-panel"]')!;

    expect(panel.contains(topmostInOverlap(bar, panel))).toBe(true);

    // And the popup opened from INSIDE that sheet clears the sheet. The two
    // are body siblings — Base UI portals the positioner out — so this is
    // the scale's doing and nothing else's.
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="menu-trigger"]')!);
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="menu-panel"]')).not.toBeNull(),
    );
    const menu = document.querySelector<HTMLElement>('[data-slot="menu-panel"]')!;
    expect(panel.contains(menu), "the menu portals OUT of the sheet").toBe(false);
    expect(menu.contains(topmostInOverlap(menu, panel))).toBe(true);
  });

  test("a Select opened inside a Modal is not swallowed by it", async () => {
    // The trap that blocked this adoption for a commit: give Modal its role
    // while `dropdown` sits below it and every popup inside a dialog goes
    // behind the dialog. The two are siblings, so nothing but the ladder
    // decides. This is the assertion that pins the ordering.
    const items: SelectItem[] = [{ value: "design", label: "Design" }];
    mount(
      <Modal isOpen onOpenChange={vi.fn()}>
        <Modal.Surface>
          <Modal.Title>New task</Modal.Title>
          <Select label="Services" items={items} />
        </Modal.Surface>
      </Modal>,
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="modal-surface"]')).not.toBeNull(),
    );
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="select-trigger"]')!);
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="select-panel"]')).not.toBeNull(),
    );
    const surface = document.querySelector<HTMLElement>('[data-slot="modal-surface"]')!;
    const list = document.querySelector<HTMLElement>('[data-slot="select-panel"]')!;
    expect(surface.contains(list), "the select portals OUT of the dialog").toBe(false);
    expect(list.contains(topmostInOverlap(list, surface))).toBe(true);
  });
});
