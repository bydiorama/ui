import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

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

/** One pointer, step by step, so a test can interleave Escape or a cancel. */
function pointer(handle: HTMLElement, init: { pointerId?: number; button?: number } = {}) {
  const box = handle.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const opts = { pointerId: 1, pointerType: "mouse", bubbles: true, cancelable: true, ...init } as const;
  const fire = (type: string, clientY: number) =>
    act(async () => { handle.dispatchEvent(new PointerEvent(type, { ...opts, clientX: x, clientY })); });
  return {
    down: () => fire("pointerdown", box.top + 8),
    move: (clientY: number) => fire("pointermove", clientY),
    up: (clientY: number) => fire("pointerup", clientY),
    cancel: (clientY: number) => fire("pointercancel", clientY),
    /**
     * The click a real release produces. The pointer is captured on the
     * handle, so it lands there — dispatched by hand because synthetic pointer
     * events do not synthesise one.
     */
    click: () => act(async () => { handle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); }),
  };
}

/** Drives a pointer drag from a handle to a y coordinate. */
async function dragTo(handle: HTMLElement, clientY: number) {
  const p = pointer(handle);
  await p.down();
  await p.move(clientY);
  await p.up(clientY);
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

  test("consumer pointer handlers are composed without replacing drag behaviour", async () => {
    const onPointerMove = vi.fn();
    const onPointerUp = vi.fn((event: ReactPointerEvent) => event.preventDefault());
    mount(
      <CardSorting label="Brand assets" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        {ITEMS.map(([id, label]) => (
          <CardSorting.Item key={id} id={id} label={label}><span>{label}</span></CardSorting.Item>
        ))}
      </CardSorting>,
    );
    const third = rows()[2]!.getBoundingClientRect();
    await dragTo(handles()[0]!, third.top + third.height * 0.75);
    expect(onPointerMove).toHaveBeenCalled();
    expect(onPointerUp).toHaveBeenCalled();
    expect(labels()[2]).toBe("Brand guidelines");
    // Pointer-up cleanup is a safety invariant; preventDefault must not leave
    // the component stuck in its dragging state.
    expect(rows().some((row) => row.dataset["dragging"] === "true")).toBe(false);
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

describe("the pointer path never commits a gesture the person abandoned (#21)", () => {
  const ORIGINAL = ["Brand guidelines", "Business cards", "Email signatures", "Dokument test"];

  test("pointercancel puts the row BACK and says so — it does not drop it", async () => {
    const onOrderChange = vi.fn();
    mount(<List onOrderChange={onOrderChange} />);
    const third = rows()[2]!.getBoundingClientRect();
    const p = pointer(handles()[0]!);
    await p.down();
    await p.move(third.top + third.height * 0.75);
    expect(labels()).not.toEqual(ORIGINAL);
    // On touch, pointercancel is the browser taking the gesture away (a scroll
    // takeover, an OS gesture). The consumer saves on settle, so committing
    // here would persist a move the person abandoned.
    await p.cancel(third.top + third.height * 0.75);
    expect(labels()).toEqual(ORIGINAL);
    expect(onOrderChange).toHaveBeenLastCalledWith(["guidelines", "cards", "signatures", "test"]);
    expect(announcer().textContent).toBe("Reordering cancelled, in Brand assets.");
    expect(rows().some((row) => row.dataset["dragging"] === "true")).toBe(false);
  });

  test("Escape during a drag cancels it, wherever focus is", async () => {
    mount(<List />);
    const third = rows()[2]!.getBoundingClientRect();
    const target = third.top + third.height * 0.75;
    const p = pointer(handles()[0]!);
    await p.down();
    await p.move(target);
    expect(labels()).not.toEqual(ORIGINAL);
    // Focus is on the body: a synthetic press focuses nothing, and Safari does
    // not focus a button on a real one either.
    expect(document.activeElement).toBe(document.body);
    await userEvent.keyboard("{Escape}");
    expect(labels()).toEqual(ORIGINAL);
    expect(announcer().textContent).toContain("cancelled");
    // The release and its click still arrive. Neither may move or lift anything.
    await p.move(target);
    await p.up(target);
    await p.click();
    expect(labels()).toEqual(ORIGINAL);
    expect(handles()[0]!.getAttribute("aria-pressed")).toBe("false");
    expect(announcer().textContent).toContain("cancelled");
  });

  test("Escape during a drag cancels it when the handle has focus too", async () => {
    mount(<List />);
    const third = rows()[2]!.getBoundingClientRect();
    const handle = handles()[0]!;
    const p = pointer(handle);
    await p.down();
    handle.focus();
    await p.move(third.top + third.height * 0.75);
    await userEvent.keyboard("{Escape}");
    expect(labels()).toEqual(ORIGINAL);
    expect(announcer().textContent).toBe("Reordering cancelled, in Brand assets.");
  });

  test("the click that ENDS a drag does not lift the row", async () => {
    mount(<List />);
    const third = rows()[2]!.getBoundingClientRect();
    const target = third.top + third.height * 0.75;
    const p = pointer(handles()[0]!);
    await p.down();
    await p.move(target);
    await p.up(target);
    // With the pointer captured on the grip, the browser's click after
    // pointerup lands on it. It is the end of the drag, not a request to lift.
    await p.click();
    expect(labels()[2]).toBe("Brand guidelines");
    expect(rows().some((row) => row.dataset["lifted"] === "true")).toBe(false);
    expect(handles().every((h) => h.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(announcer().textContent).toBe("Brand guidelines, dropped, position 3 of 4, in Brand assets.");
  });

  test("a press that never travels is still a click, and still lifts", async () => {
    mount(<List />);
    const h = handles()[0]!;
    const box = h.getBoundingClientRect();
    const p = pointer(h);
    // A hand never presses perfectly still: a 2px wobble is a click.
    await p.down();
    await p.move(box.top + 10);
    await p.up(box.top + 10);
    await p.click();
    expect(h.getAttribute("aria-pressed")).toBe("true");
    expect(announcer().textContent).toBe("Brand guidelines, lifted, position 1 of 4, in Brand assets.");
  });

  test.each([
    ["middle", 1],
    ["right", 2],
  ])("a %s-button press does not start a drag", async (_name, button) => {
    mount(<List />);
    const third = rows()[2]!.getBoundingClientRect();
    const p = pointer(handles()[0]!, { button });
    await p.down();
    expect(rows().some((row) => row.dataset["dragging"] === "true")).toBe(false);
    await p.move(third.top + third.height * 0.75);
    await p.up(third.top + third.height * 0.75);
    expect(labels()).toEqual(ORIGINAL);
  });

  test("a refused pointer capture does not break the drag", async () => {
    // setPointerCapture throws NotFoundError for a pointer that is no longer
    // active. An unguarded call threw out of the handler before the drag began.
    const capture = vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(() => {
      throw new DOMException("No active pointer", "NotFoundError");
    });
    try {
      mount(<List />);
      const third = rows()[2]!.getBoundingClientRect();
      await dragTo(handles()[0]!, third.top + third.height * 0.75);
      expect(capture).toHaveBeenCalled();
      expect(labels()[2]).toBe("Brand guidelines");
    } finally {
      capture.mockRestore();
    }
  });

  test("a throwing releasePointerCapture does not break the drop", async () => {
    const has = vi.spyOn(HTMLElement.prototype, "hasPointerCapture").mockReturnValue(true);
    const releaseCapture = vi.spyOn(HTMLElement.prototype, "releasePointerCapture").mockImplementation(() => {
      throw new DOMException("No active pointer", "NotFoundError");
    });
    try {
      mount(<List />);
      const third = rows()[2]!.getBoundingClientRect();
      await dragTo(handles()[0]!, third.top + third.height * 0.75);
      expect(releaseCapture).toHaveBeenCalled();
      expect(labels()[2]).toBe("Brand guidelines");
      expect(announcer().textContent).toContain("dropped");
    } finally {
      has.mockRestore();
      releaseCapture.mockRestore();
    }
  });
});

describe("every string CardSorting speaks is a prop (#20)", () => {
  // Slovak — the portal's own locale. Word order around the number moves,
  // which is why each message is a function rather than a template.
  const SLOVAK = {
    handleLabel: ({ label, position, total }: { label: string; position: number; total: number }) =>
      `Presunúť ${label}, ${position}. z ${total}`,
    lifted: ({ label, position, total, listLabel }: Details) => `${label} zdvihnuté, ${position}. z ${total}, ${listLabel}.`,
    moved: ({ label, position, total, listLabel }: Details) => `${label} presunuté, ${position}. z ${total}, ${listLabel}.`,
    dropped: ({ label, position, total, listLabel }: Details) => `${label} položené, ${position}. z ${total}, ${listLabel}.`,
    cancelled: ({ label, position, listLabel }: Details) => `Zrušené, ${label} späť na ${position}. mieste, ${listLabel}.`,
  };
  type Details = { label: string; position: number; total: number; listLabel: string };

  function Localised({ messages }: { messages: Partial<typeof SLOVAK> }) {
    return (
      <CardSorting label="Značka" messages={messages}>
        {ITEMS.map(([id, label]) => (
          <CardSorting.Item key={id} id={id} label={label}><span>{label}</span></CardSorting.Item>
        ))}
      </CardSorting>
    );
  }

  test("the handle's accessible name comes from messages.handleLabel", () => {
    mount(<Localised messages={SLOVAK} />);
    expect(handles()[0]!.getAttribute("aria-label")).toBe("Presunúť Brand guidelines, 1. z 4");
    expect(handles()[3]!.getAttribute("aria-label")).toBe("Presunúť Dokument test, 4. z 4");
  });

  test("lifted, moved, dropped and cancelled all come from messages", async () => {
    mount(<Localised messages={SLOVAK} />);
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    expect(announcer().textContent).toBe("Brand guidelines zdvihnuté, 1. z 4, Značka.");
    await userEvent.keyboard("{ArrowDown}");
    expect(announcer().textContent).toBe("Brand guidelines presunuté, 2. z 4, Značka.");
    await userEvent.keyboard(" ");
    expect(announcer().textContent).toBe("Brand guidelines položené, 2. z 4, Značka.");

    // Cancelled reports where the row went BACK to, not where it was held.
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Escape}");
    expect(announcer().textContent).toBe("Zrušené, Brand guidelines späť na 2. mieste, Značka.");
  });

  test("a pointer cancel speaks messages.cancelled too", async () => {
    mount(<Localised messages={SLOVAK} />);
    const third = rows()[2]!.getBoundingClientRect();
    const p = pointer(handles()[0]!);
    await p.down();
    await p.move(third.top + third.height * 0.75);
    await p.cancel(third.top + third.height * 0.75);
    expect(announcer().textContent).toBe("Zrušené, Brand guidelines späť na 1. mieste, Značka.");
  });

  test("a message left out keeps its English default", async () => {
    mount(<Localised messages={{ lifted: SLOVAK.lifted }} />);
    expect(handles()[0]!.getAttribute("aria-label")).toBe("Reorder Brand guidelines, position 1 of 4");
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    expect(announcer().textContent).toBe("Brand guidelines zdvihnuté, 1. z 4, Značka.");
    await userEvent.keyboard("{ArrowDown}");
    expect(announcer().textContent).toBe("Brand guidelines, moved, position 2 of 4, in Značka.");
  });
});

describe("CardSorting.Handle places the grip where the design puts it (#19)", () => {
  const SWATCHES = [
    ["ink", "Ink"],
    ["paper", "Paper"],
    ["accent", "Accent"],
  ] as const;

  /** The portal's specimen block: a tile with the grip in its top-right corner. */
  function Specimens(props: { onOrderChange?: (order: string[]) => void } = {}) {
    return (
      <CardSorting label="Colours" {...props}>
        {SWATCHES.map(([id, label]) => (
          <CardSorting.Item key={id} id={id} label={label}>
            <div data-testid="tile" className="relative h-24 w-60 rounded-md bg-sunken">
              <CardSorting.Handle className="absolute top-xs right-xs" />
            </div>
            <span>{label}</span>
          </CardSorting.Item>
        ))}
      </CardSorting>
    );
  }

  /** A Handle rendered by a component of the caller's — invisible to a JSX scan. */
  function Tile() {
    return (
      <div className="relative h-24 w-60 rounded-md bg-sunken">
        <CardSorting.Handle className="absolute top-xs right-xs" />
      </div>
    );
  }

  test("one grip per row, inside the tile, in its top-right corner", () => {
    mount(<Specimens />);
    expect(handles()).toHaveLength(3);
    const tiles = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="tile"]'));
    tiles.forEach((tile, i) => {
      const handle = handles()[i]!;
      expect(tile.contains(handle)).toBe(true);
      const t = tile.getBoundingClientRect();
      const h = handle.getBoundingClientRect();
      // The corner, not the leading edge: flush with the tile's top and end
      // insets, nowhere near its start.
      expect(Math.round(t.right - h.right)).toBe(Math.round(h.top - t.top));
      expect(h.left).toBeGreaterThan(t.left + t.width / 2);
    });
    // No lane of its own: the row's first child is the content, not a grip.
    for (const row of rows()) expect(row.firstElementChild!.getAttribute("data-slot")).toBe("card-sorting-content");
  });

  test("a row with a placed Handle keeps the card's full inset on both sides", () => {
    mount(<Specimens />);
    const style = getComputedStyle(rows()[0]!);
    expect(style.paddingLeft).toBe(style.paddingRight);
  });

  test("the placed Handle is labelled, and names the row", () => {
    mount(<Specimens />);
    const h = handles()[1]!;
    expect(h.tagName).toBe("BUTTON");
    expect(h.getAttribute("aria-label")).toBe("Reorder Paper, position 2 of 3");
    expect(rows()[1]!.getAttribute("aria-labelledby")).toBe(h.id);
    expect(h.getAttribute("aria-pressed")).toBe("false");
  });

  test("a caller's aria-label cannot replace the handle's name", () => {
    // Omitted from the props, but TypeScript never checks a hyphenated JSX
    // attribute — so the contract has to hold at runtime, and it does.
    const props = { "aria-label": "Drag" } as Record<string, string>;
    mount(
      <CardSorting label="Colours">
        <CardSorting.Item id="ink" label="Ink"><CardSorting.Handle {...props} /></CardSorting.Item>
      </CardSorting>,
    );
    expect(handles()[0]!.getAttribute("aria-label")).toBe("Reorder Ink, position 1 of 1");
  });

  test("the placed Handle keyboard-lifts, moves and drops", async () => {
    const onOrderChange = vi.fn();
    mount(<Specimens onOrderChange={onOrderChange} />);
    handles()[0]!.focus();
    await userEvent.keyboard(" ");
    expect(handles()[0]!.getAttribute("aria-pressed")).toBe("true");
    expect(announcer().textContent).toBe("Ink, lifted, position 1 of 3, in Colours.");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard(" ");
    expect(labels()).toEqual(["Paper", "Ink", "Accent"]);
    expect(onOrderChange).toHaveBeenLastCalledWith(["paper", "ink", "accent"]);
  });

  test("the placed Handle drags", async () => {
    mount(<Specimens />);
    const last = rows()[2]!.getBoundingClientRect();
    await dragTo(handles()[0]!, last.bottom + 40);
    expect(labels()).toEqual(["Paper", "Accent", "Ink"]);
  });

  test("a Handle rendered inside the caller's own component still replaces the default grip", () => {
    mount(
      <CardSorting label="Colours">
        {SWATCHES.map(([id, label]) => (
          <CardSorting.Item key={id} id={id} label={label}>
            <Tile />
            <span>{label}</span>
          </CardSorting.Item>
        ))}
      </CardSorting>,
    );
    // Found by registration, not by reading the JSX: still exactly one grip.
    expect(handles()).toHaveLength(3);
    for (const row of rows()) expect(row.firstElementChild!.getAttribute("data-slot")).toBe("card-sorting-content");
  });

  test("an Item with no Handle keeps the leading grip", () => {
    mount(<List />);
    // Back-compat: every existing list renders exactly as it did.
    for (const row of rows()) expect(row.firstElementChild!.getAttribute("data-slot")).toBe("card-sorting-handle");
  });
});
