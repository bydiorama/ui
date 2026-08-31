/**
 * The stacking scale, measured across the components that consume it.
 *
 * `--ui-z-*` shipped for months with NO consumer — and a token nothing
 * consumes is a guess. The guess was wrong in exactly one place: sticky sat
 * at 1100, above dropdown, while every shipped component ordered them the
 * other way (the affix Header at z-30 under the panels' z-50). Anchored
 * panels portal to <body>, so a Menu opened from the affix bar itself is a
 * SIBLING of the page root: sticky-above-dropdown would slide that panel
 * under the translucent bar it was opened from.
 *
 * This suite is the cross-component half of the fix (the token test asserts
 * the ladder's ordering): each consumer's computed z-index must EQUAL the
 * resolved token — the number's SOURCE is what is asserted, not its effect
 * at a comfortable stacking, which is the same rule as the overlay
 * max-height tests. A component that drifts back to a bare Tailwind step
 * keeps working at every zoom level and fails only here.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { createRoot, type Root } from "react-dom/client";
import { act, useEffect } from "react";
import type { ReactElement } from "react";

import { Button } from "@/ui/button/button.tsx";
import { Header } from "@/ui/header/header.tsx";
import { Menu } from "@/ui/menu/menu.tsx";
import { Select, type SelectItem } from "@/ui/select/select.tsx";
import { Toast, useToast, type ToastManager } from "@/ui/toast/toast.tsx";

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

test("the ladder is in the stylesheet and orders chrome under every floating surface", () => {
  // The browser-side twin of the token test: proves the CSS emit actually
  // carries the scale (a var missing from the stylesheet computes z-index
  // 'auto' — silently — in every consumer below).
  const ladder = ["below", "base", "sticky", "dropdown", "overlay", "modal", "toast", "tooltip"];
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
});
