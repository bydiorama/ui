import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Input } from "@/ui/input/input.tsx";
import { Multiselect, type MultiselectItem } from "./multiselect.tsx";

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

const trigger = () => document.querySelector<HTMLElement>('[data-slot="multiselect-trigger"]')!;
const panel = () => document.querySelector<HTMLElement>('[data-slot="multiselect-panel"]');
const options = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="multiselect-option"]'));
const chips = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="badge"]'));

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const ITEMS: MultiselectItem[] = [
  { value: "concept", label: "Brand Concept", isDisabled: true },
  { value: "development", label: "Brand Development" },
  { value: "guidelines", label: "Brand Guidelines" },
  { value: "strategy", label: "Brand Strategy" },
  { value: "stationery", label: "Stationery" },
];

function Basic(props: Partial<React.ComponentProps<typeof Multiselect>> = {}) {
  return <Multiselect label="Services" items={ITEMS} {...props} />;
}

describe("The behaviour layer carries the combobox contract", () => {
  test("the trigger is named by the label, not a placeholder", () => {
    mount(<Basic />);
    const t = trigger();
    const labelledBy = t.getAttribute("aria-labelledby")!;
    expect(document.getElementById(labelledBy)?.textContent).toBe("Services");
  });

  test("opening exposes a multi-selectable listbox", async () => {
    mount(<Basic />);
    expect(panel()).toBeNull();

    await userEvent.click(trigger());
    await vi.waitFor(() => expect(panel()).not.toBeNull());

    const list = document.querySelector('[data-slot="multiselect-list"]')!;
    // aria-multiselectable is the difference between this and a Select, and
    // it is precisely the sort of attribute a hand-rolled version forgets.
    expect(list.getAttribute("aria-multiselectable")).toBe("true");
    expect(options()).toHaveLength(ITEMS.length);
  });

  test("selecting keeps the list open and adds a chip", async () => {
    const onValueChange = vi.fn();
    mount(<Basic onValueChange={onValueChange} />);
    await userEvent.click(trigger());
    await vi.waitFor(() => expect(panel()).not.toBeNull());

    await userEvent.click(options()[2]!);
    expect(onValueChange).toHaveBeenCalledWith(["guidelines"]);
    // A multiselect that closes on each pick makes choosing three things a
    // three-round-trip job.
    expect(panel()).not.toBeNull();

    await vi.waitFor(() => expect(chips().map((c) => c.textContent)).toContain("Brand Guidelines"));
  });

  test("the search filters the list", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await vi.waitFor(() => expect(panel()).not.toBeNull());

    const search = document.querySelector<HTMLInputElement>('[data-slot="multiselect-search"]')!;
    await userEvent.fill(search, "strat");
    await vi.waitFor(() => expect(options()).toHaveLength(1));
    expect(options()[0]!.textContent).toContain("Brand Strategy");
  });

  test("a disabled option cannot be chosen", async () => {
    const onValueChange = vi.fn();
    mount(<Basic onValueChange={onValueChange} />);
    await userEvent.click(trigger());
    await vi.waitFor(() => expect(panel()).not.toBeNull());

    const disabled = options()[0]!;
    expect(disabled.getAttribute("data-disabled")).not.toBeNull();
    await userEvent.click(disabled, { force: true });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("Escape closes and returns focus to the trigger", async () => {
    mount(<Basic />);
    const t = trigger();
    await userEvent.click(t);
    await vi.waitFor(() => expect(panel()).not.toBeNull());

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(panel()).toBeNull());
    expect(document.activeElement).toBe(t);
  });

  test("a chip's remove button is named and deselects", async () => {
    const onValueChange = vi.fn();
    mount(<Basic defaultValue={["guidelines"]} onValueChange={onValueChange} />);

    await vi.waitFor(() => expect(chips()).toHaveLength(1));
    const remove = chips()[0]!.querySelector<HTMLElement>("[aria-label]")!;
    // "Remove Brand Guidelines", not "Close" — the name is read out of context.
    expect(remove.getAttribute("aria-label")).toBe("Remove Brand Guidelines");

    await userEvent.click(remove);
    expect(onValueChange).toHaveBeenCalledWith([]);
  });
});

describe("The multiselect paints the designed surface", () => {
  test("the trigger matches Input's control geometry", () => {
    // Asserted as a RELATIONSHIP, not as numbers: the claim is that the
    // trigger reuses Input's control surface rather than re-deriving it, so
    // the two must agree even if the shared value changes. Absolute numbers
    // here would pass while the two silently drifted apart.
    mount(
      <>
        <Basic />
        <Input label="Reference" />
      </>,
    );
    const t = getComputedStyle(trigger());
    const control = getComputedStyle(document.querySelector('[data-slot="control"]')!);

    expect(t.height).toBe(control.height);
    expect(t.borderRadius).toBe(control.borderRadius);
    expect(t.borderTopWidth).toBe(control.borderTopWidth);
    expect(t.borderTopColor).toBe(control.borderTopColor);
    expect(t.height).toBe("48px");
  });

  test("the selected option's box uses the accent role, not a palette step", async () => {
    mount(<Basic defaultValue={["guidelines"]} />);
    await userEvent.click(trigger());
    await vi.waitFor(() => expect(panel()).not.toBeNull());

    const selected = options().find((o) => o.getAttribute("data-selected") !== null)!;
    const box = selected.querySelector<HTMLElement>('[data-slot="multiselect-option-box"]')!;
    // The sheet drew --ui-blue-80 with a --ui-neutral-100 tick, which measures
    // 1.51:1. The roles resolve to the same fill with an 11.35:1 tick.
    expect(getComputedStyle(box).backgroundColor).toBe("rgb(158, 219, 243)");
    expect(getComputedStyle(box).color).toBe("rgb(29, 27, 25)");
  });

  test("the empty state appears when nothing matches", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await vi.waitFor(() => expect(panel()).not.toBeNull());

    const search = document.querySelector<HTMLInputElement>('[data-slot="multiselect-search"]')!;
    await userEvent.fill(search, "zzzz");
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="multiselect-empty"]')?.textContent).toBe("No matches"),
    );
  });
});

describe("Multiselect's panel stays inside the brand scope", () => {
  test("the panel portals into the component's OWN root, so it inherits", async () => {
    const c = mount(
      <div style={{ "--ui-bg-surface": "rgb(255, 224, 102)" } as React.CSSProperties} id="scope">
        <Multiselect label="Assets" items={ITEMS} />
      </div>,
    );
    await userEvent.click(trigger());
    const p = panel()!;
    // Theme tokens are INHERITED custom properties. Modal, Popover and Sheet
    // portal to document.body and need a `container` prop to get back inside
    // a brand scope; this one portals to its own root, which is already there
    // — so it re-skins with no caller action. Asserted rather than assumed,
    // because "it portals somewhere sensible" is exactly the kind of claim
    // that stops being true without anyone noticing.
    expect(p.closest("#scope")).not.toBeNull();
    expect(getComputedStyle(p).backgroundColor).toBe("rgb(255, 224, 102)");
    void c;
  });
});
