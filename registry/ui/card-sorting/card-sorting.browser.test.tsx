import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { CardSorting } from "./card-sorting.tsx";

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

const ITEMS = [
  ["guidelines", "Brand guidelines"],
  ["cards", "Business cards"],
  ["signatures", "Email signatures"],
  ["test", "Dokument test"],
] as const;

function List(props: { onOrderChange?: (order: string[]) => void } = {}) {
  return (
    <CardSorting label="Brand assets" {...props}>
      {ITEMS.map(([id, label]) => (
        <CardSorting.Item key={id} id={id} label={label}>
          <span>{label}</span>
        </CardSorting.Item>
      ))}
    </CardSorting>
  );
}

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="card-sorting-item"]'));
const labels = () => rows().map((r) => r.dataset["itemLabel"]);
const handles = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="card-sorting-handle"]'));
const announcer = () => document.querySelector<HTMLElement>('[data-slot="card-sorting-announcer"]')!;

/** Drives a pointer drag from a handle to a y coordinate. */
async function dragTo(handle: HTMLElement, clientY: number) {
  const box = handle.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const opts = { pointerId: 1, pointerType: "mouse", bubbles: true, cancelable: true } as const;
  await act(async () => {
    handle.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: x, clientY: box.top + 8 }));
  });
  await act(async () => {
    handle.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientX: x, clientY }));
  });
  await act(async () => {
    handle.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: x, clientY }));
  });
}

describe("CardSorting is a named list of reorderable rows", () => {
  test("it is a real list, named, with one row per item", () => {
    const c = mount(<List />);
    const list = c.querySelector<HTMLElement>('[data-slot="card-sorting"]')!;
    expect(list.tagName).toBe("UL");
    expect(list.getAttribute("aria-label")).toBe("Brand assets");
    expect(rows()).toHaveLength(4);
    for (const row of rows()) expect(row.tagName).toBe("LI");
    expect(labels()).toEqual(["Brand guidelines", "Business cards", "Email signatures", "Dokument test"]);
  });

  test("the handle NAMES the row and its position — not just 'drag'", () => {
    mount(<List />);
    // A row of identical "Reorder" buttons tells a screen-reader user nothing
    // about which one they are on, or where it is in the list.
    expect(handles()[0]!.getAttribute("aria-label")).toBe("Reorder Brand guidelines, position 1 of 4");
    expect(handles()[2]!.getAttribute("aria-label")).toBe("Reorder Email signatures, position 3 of 4");
  });

  test("the handle is a real button that reports whether it is holding anything", async () => {
    mount(<List />);
    const h = handles()[0]!;
    expect(h.tagName).toBe("BUTTON");
    expect(h.getAttribute("aria-pressed")).toBe("false");
    h.focus();
    await userEvent.keyboard(" ");
    expect(h.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Reordering works three ways, and all three announce", () => {
  test("KEYBOARD: space lifts, arrows move, space drops", async () => {
    const onOrderChange = vi.fn();
    mount(<List onOrderChange={onOrderChange} />);
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard(" ");

    expect(labels()).toEqual(["Business cards", "Email signatures", "Brand guidelines", "Dokument test"]);
    expect(onOrderChange).toHaveBeenLastCalledWith(["cards", "signatures", "guidelines", "test"]);
  });

  test("KEYBOARD: escape puts it back where it started", async () => {
    mount(<List />);
    const before = labels();
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    expect(labels()).not.toEqual(before);
    await userEvent.keyboard("{Escape}");
    // A cancel that leaves the row wherever the arrows took it is not a cancel.
    expect(labels()).toEqual(before);
    expect(announcer().textContent).toContain("cancelled");
  });

  test("arrows do NOTHING until the row is lifted", async () => {
    mount(<List />);
    const before = labels();
    handles()[0]!.focus();
    // Otherwise a stray arrow key silently reorders a list someone was reading,
    // and it fights the browser's own scrolling.
    await userEvent.keyboard("{ArrowDown}");
    expect(labels()).toEqual(before);
  });

  test("arrows cannot push a row off either end", async () => {
    mount(<List />);
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowUp}");
    expect(labels()[0]).toBe("Brand guidelines");
    await userEvent.keyboard("{Escape}");
  });

  test("SINGLE POINTER: click the handle, then click the destination — SC 2.5.7", async () => {
    mount(<List />);
    // WCAG 2.5.7 requires a no-drag pointer path for every dragging movement.
    // A keyboard path does not satisfy it; this does.
    await userEvent.click(handles()[0]!);
    expect(handles()[0]!.getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(rows()[2]!);
    expect(labels()).toEqual(["Business cards", "Email signatures", "Brand guidelines", "Dokument test"]);
    expect(handles()[0]!.getAttribute("aria-pressed")).toBe("false");
  });

  test("POINTER DRAG: dragging past a row's midpoint moves it there", async () => {
    mount(<List />);
    const third = rows()[2]!.getBoundingClientRect();
    // Past the midpoint of the third row, so the first should land there.
    await dragTo(handles()[0]!, third.top + third.height * 0.75);
    expect(labels()[2]).toBe("Brand guidelines");
  });

  test("POINTER DRAG: dragging below the last row moves it to the end", async () => {
    mount(<List />);
    const last = rows()[3]!.getBoundingClientRect();
    // Guards the other branch of the index maths: past every midpoint there is
    // no row to insert before, so the target is the end of the list.
    await dragTo(handles()[0]!, last.bottom + 40);
    expect(labels()).toEqual(["Business cards", "Email signatures", "Dokument test", "Brand guidelines"]);
  });

  test("every reorder is ANNOUNCED, with the row's name and its new position", async () => {
    mount(<List />);
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    expect(announcer().textContent).toBe("Brand guidelines, lifted, position 1 of 4, in Brand assets.");
    await userEvent.keyboard("{ArrowDown}");
    // The whole point: a reorder only sighted mouse users can perceive is not
    // a reorder. Position and total, not just "moved".
    expect(announcer().textContent).toBe("Brand guidelines, moved, position 2 of 4, in Brand assets.");
    await userEvent.keyboard(" ");
    expect(announcer().textContent).toContain("dropped");
  });

  test("the announcer is polite and off-screen, never display:none", () => {
    mount(<List />);
    const a = announcer();
    expect(a.getAttribute("aria-live")).toBe("polite");
    expect(a.getAttribute("aria-atomic")).toBe("true");
    // display:none would remove it from the accessibility tree entirely, and
    // the announcements would go nowhere.
    expect(getComputedStyle(a).display).not.toBe("none");
  });
});

describe("CardSorting paints the sheet's card", () => {
  test("a resting row is an elevated card with no edge", async () => {
    mount(<List />);
    const style = getComputedStyle(rows()[0]!);
    expect(style.borderRadius).toBe("16px");
    expect(style.backgroundColor).toBe("rgb(246, 243, 240)");
    expect(style.outlineStyle).toBe("none");
  });

  test("a lifted row gains an OUTLINE, so nothing shifts", async () => {
    mount(<List />);
    const row = rows()[0]!;
    const before = row.getBoundingClientRect();
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    const style = getComputedStyle(rows()[0]!);
    expect(style.outlineStyle).toBe("solid");
    // The sheet draws a 1px edge on the active card. A border would add a
    // pixel the resting card does not have and nudge every row as it lifts.
    expect(rows()[0]!.getBoundingClientRect().height).toBe(before.height);
    await userEvent.keyboard("{Escape}");
  });

  test("the handle clears the 24px target floor", () => {
    mount(<List />);
    const box = handles()[0]!.getBoundingClientRect();
    // 24 exactly — the sheet's own box. It is the floor, not comfortably over
    // it; recorded in knownGaps.
    expect(Math.round(box.width)).toBe(24);
    expect(Math.round(box.height)).toBe(24);
  });

  test("the focus ring is PAINTED on the handle", async () => {
    mount(<List />);
    const h = handles()[0]!;
    expect(getComputedStyle(h).outlineStyle).toBe("none");
    for (let i = 0; i < 4 && document.activeElement !== h; i++) await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(h);
    await Promise.all(h.getAnimations().map((a) => a.finished.catch(() => undefined)));
    // An OUTLINE, not a box-shadow: the handle is a Button now, and Button
    // draws its ring on the outline layer — which is the one that survives
    // forced-colors mode. This assertion changed with the refactor, and that
    // is the refactor working.
    expect(getComputedStyle(h).outlineStyle).toBe("solid");
  });
});

describe("CardSorting survives its children changing", () => {
  test("a row added later joins the end; a removed one leaves no hole", async () => {
    function Growing({ ids }: { ids: string[] }) {
      return (
        <CardSorting label="Brand assets">
          {ids.map((id) => (
            <CardSorting.Item key={id} id={id} label={id}>
              <span>{id}</span>
            </CardSorting.Item>
          ))}
        </CardSorting>
      );
    }
    mount(<Growing ids={["a", "b"]} />);
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard(" ");
    expect(labels()).toEqual(["b", "a"]);

    // A stored order still naming a removed id would render nothing for it,
    // and a new id missing from the order would never appear at all.
    act(() => { root!.render(<Growing ids={["b", "c"]} />); });
    expect(labels()).toEqual(["b", "c"]);
  });
});
