import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

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
});

describe("Tabs paint the designed strip", () => {
  test("the list is a bordered surface with token geometry", () => {
    mount(<Basic />);
    const style = getComputedStyle(document.querySelector('[data-slot="tabs-list"]')!);
    // The sheet drew #FDFCFC and #E8E2D9 as raw hexes.
    expect(style.backgroundColor).toBe("rgb(253, 252, 251)");
    expect(style.borderTopColor).toBe("rgb(218, 212, 206)");
    expect(style.borderRadius).toBe("8px");
    expect(style.padding).toBe("4px");
  });

  test("the selected tab is filled and the rest are not", async () => {
    mount(<Basic />);
    const [first, second] = tabs();
    await settled(first!);
    expect(getComputedStyle(first!).backgroundColor).toBe("rgb(237, 232, 227)");
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
