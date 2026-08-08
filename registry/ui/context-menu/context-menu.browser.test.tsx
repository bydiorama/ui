import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { ContextMenu } from "./context-menu.tsx";
import { Menu } from "@/ui/menu/menu.tsx";

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

const region = () => document.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]')!;
const panel = () => document.querySelector<HTMLElement>('[data-slot="context-menu-panel"]');
const items = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="menu-item"]'));

function Basic({ onSelect = vi.fn() }: { onSelect?: () => void }) {
  return (
    <ContextMenu>
      <ContextMenu.Trigger tabIndex={0} aria-label="Brand asset" className="h-24 w-48">
        Right-click here
      </ContextMenu.Trigger>
      <ContextMenu.Panel>
        <Menu.Item onSelect={onSelect}>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={onSelect}>Rename</Menu.Item>
      </ContextMenu.Panel>
    </ContextMenu>
  );
}

/** A right-click, as the platform actually delivers one. */
async function rightClick(el: HTMLElement) {
  const { x, y } = el.getBoundingClientRect();
  await act(async () => {
    el.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x + 8, clientY: y + 8, button: 2 }),
    );
  });
}

describe("ContextMenu opens on a right-click", () => {
  test("the region carries no menu until it is asked", async () => {
    mount(<Basic />);
    expect(panel()).toBeNull();
    await rightClick(region());
    expect(panel()).not.toBeNull();
    expect(panel()!.getAttribute("role")).toBe("menu");
    expect(items()).toHaveLength(2);
  });

  test("the trigger is the caller's own element, not a wrapper (§3)", () => {
    const c = mount(<Basic />);
    // One element, not a div around a div: the area the user aims at is the
    // region the caller drew.
    expect(c.children).toHaveLength(1);
    expect(region().getAttribute("aria-label")).toBe("Brand asset");
    expect(region().className).toContain("h-24");
  });

  test("choosing a row fires onSelect and closes", async () => {
    const onSelect = vi.fn();
    mount(<Basic onSelect={onSelect} />);
    await rightClick(region());
    await userEvent.click(items()[0]!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    await expect.poll(() => panel()).toBeNull();
  });

  test("Escape closes and returns focus to the region", async () => {
    mount(<Basic />);
    // Focused FIRST: the behaviour layer restores focus to wherever it was,
    // and a menu opened from a synthetic event on an unfocused region has
    // nowhere to return to. That is not a defect, it is what "restore" means.
    region().focus();
    await rightClick(region());
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.activeElement).toBe(region());
  });
});

describe("It is reachable without a pointer", () => {
  /*
   * What is actually true, asserted rather than assumed.
   *
   * Base UI's ContextMenuTrigger listens for ONE thing — the `contextmenu`
   * DOM event. It has no keydown handler, so nothing in this library turns
   * Shift+F10 into an open. The BROWSER does that: Chrome and Firefox fire a
   * native `contextmenu` on the focused element for Shift+F10 and for the
   * dedicated context-menu key, and Base UI receives it like any other.
   *
   * Which means the keyboard path is real but has two preconditions, and both
   * are ours to keep: the region must be FOCUSABLE, and a `contextmenu` event
   * arriving on it must open the menu. Those are what these tests assert.
   * Driving Shift+F10 through Playwright would not prove it either way —
   * synthetic key events go through CDP and never produce the native
   * contextmenu, so that test fails on working code, which is worse than no
   * test. Written that way first, and it did.
   */
  test("the region is focusable, or the keyboard path has nothing to act on", () => {
    mount(<Basic />);
    region().focus();
    // A bare div with no tabIndex can only ever be right-clicked.
    expect(document.activeElement).toBe(region());
    expect(region().getAttribute("tabindex")).toBe("0");
  });

  test("a contextmenu event on the FOCUSED region opens it — the other half", async () => {
    mount(<Basic />);
    region().focus();
    await rightClick(region());
    expect(panel()).not.toBeNull();
  });

  test("arrows move through the rows once it is open", async () => {
    mount(<Basic />);
    region().focus();
    await rightClick(region());
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent?.trim()).toBe("Duplicate");
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent?.trim()).toBe("Rename");
  });
});
