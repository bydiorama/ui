import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import type { ReactElement } from "react";
import { Search } from "griddy-icons";

import { Input } from "@/ui/input/input.tsx";
import { Select } from "@/ui/select/select.tsx";
import { Combobox, ComboboxAction, type ComboboxItem, type ComboboxItemGroup } from "./combobox.tsx";

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

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const input = () => document.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
const control = () => document.querySelector<HTMLElement>('[data-slot="combobox-control"]')!;
const panel = () => document.querySelector<HTMLElement>('[data-slot="combobox-panel"]');
const list = () => document.querySelector<HTMLElement>('[role="listbox"]');
const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[role="listbox"] [role="option"]'));
const status = () => document.querySelector<HTMLElement>('[data-slot="combobox-status"]');
const highlighted = () => {
  const id = input().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
};
const highlightedText = () => highlighted()?.textContent ?? null;
/** Base UI appends a word joiner to make a repeated message re-announce. */
const statusText = () => status()?.textContent?.replace(/\u2060/g, "") ?? null;

/** Await running transitions before reading computed style (add-component §6). */
async function settled(el: Element) {
  await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
}

const GROUPS: ComboboxItemGroup[] = [
  { label: "Designers", items: [
    { value: "jmb", label: "Josef Müller-Brockmann" },
    { value: "aicher", label: "Otl Aicher", isDisabled: true },
    { value: "crouwel", label: "Wim Crouwel" },
  ] },
  { label: "Inventors", items: [
    { value: "gutenberg", label: "Johannes Gutenberg" },
    { value: "jacquard", label: "Joseph Marie Jacquard" },
  ] },
  { label: "Library", items: [
    { value: "grid", label: "Josef Müller-Brockmann · Grid systems", href: "#grid-systems" },
  ] },
];

const FLAT: ComboboxItem[] = [
  { value: "a", label: "Ada Lovelace" },
  { value: "b", label: "Babbage" },
  { value: "c", label: "Curie" },
];

function Archive(props: Partial<React.ComponentProps<typeof Combobox>> & { onAction?: (q: string) => void } = {}) {
  const { onAction = () => {}, ...rest } = props;
  return (
    <Combobox
      label="Search the archive"
      placeholder="Search designers and inventors"
      icon={<Search />}
      items={GROUPS}
      action={
        <ComboboxAction icon={<Search />} onAction={onAction}>
          {(q) => `Search everything for “${q}”`}
        </ComboboxAction>
      }
      {...rest}
    />
  );
}

async function open() {
  await userEvent.click(input());
  await userEvent.keyboard("{ArrowDown}");
  await vi.waitFor(() => expect(panel()).not.toBeNull());
  // ArrowDown from closed opens; a second ArrowDown starts moving.
}

describe("ARIA wiring", () => {
  test("the input is the combobox, named by the label, and owns the listbox", async () => {
    mount(<Archive />);
    const el = input();
    expect(el.getAttribute("role")).toBe("combobox");
    expect(el.labels?.[0]?.textContent).toBe("Search the archive");
    expect(el.getAttribute("aria-expanded")).toBe("false");

    await open();
    expect(el.getAttribute("aria-expanded")).toBe("true");
    const controls = el.getAttribute("aria-controls");
    expect(controls && document.getElementById(controls)?.getAttribute("role")).toBe("listbox");
  });

  test("groups are role=group, named by their heading", async () => {
    mount(<Archive />);
    await open();
    const groups = Array.from(document.querySelectorAll<HTMLElement>('[role="group"]'));
    expect(groups.map((g) => document.getElementById(g.getAttribute("aria-labelledby")!)?.textContent)).toEqual([
      "Designers",
      "Inventors",
      "Library",
    ]);
  });

  test("the clear control and chevron are named and out of the tab order", async () => {
    mount(<Archive defaultInputValue="Jo" />);
    const clear = document.querySelector<HTMLElement>('[data-slot="combobox-clear"]')!;
    const trigger = document.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!;
    expect(clear.getAttribute("aria-label")).toBe("Clear");
    expect(clear.tabIndex).toBe(-1);
    expect(trigger.getAttribute("aria-label")).toBe("Show all options");
    expect(trigger.tabIndex).toBe(-1);
  });

  test("no clear control without text", () => {
    mount(<Archive />);
    expect(document.querySelector('[data-slot="combobox-clear"]')).toBeNull();
  });

  test("errorText makes the FIELD invalid; listError does not", () => {
    mount(<Archive errorText="Choose someone" helperText="Names are matched against the index" />);
    const el = input();
    expect(el.getAttribute("aria-invalid")).toBe("true");
    const described = el.getAttribute("aria-describedby")!.split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(["Choose someone", "Names are matched against the index"]);
    unmount();

    mount(<Archive listError="Results couldn’t load" />);
    expect(input().getAttribute("aria-invalid")).toBeNull();
  });

  test("the ref lands on the input (§5)", () => {
    let node: HTMLInputElement | null = null;
    mount(<Archive ref={(n) => { node = n; }} />);
    expect(node).toBe(input());
  });
});

describe("Keyboard contract", () => {
  test("typing opens and filters, with nothing highlighted", async () => {
    mount(<Archive />);
    await userEvent.click(input());
    await userEvent.keyboard("Jo");
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    // Josef, Johannes, Joseph, the Library link, the action.
    expect(rows().map((r) => r.textContent)).toEqual([
      "Josef Müller-Brockmann",
      "Johannes Gutenberg",
      "Joseph Marie Jacquard",
      "Josef Müller-Brockmann · Grid systems",
      "Search everything for “Jo”",
    ]);
    expect(highlighted()).toBeNull();
  });

  test("filtering ignores case and accents", async () => {
    mount(<Archive />);
    await userEvent.click(input());
    await userEvent.keyboard("mull");
    await vi.waitFor(() => expect(rows().length).toBe(3));
    expect(rows()[0]!.textContent).toBe("Josef Müller-Brockmann");
  });

  test("ArrowDown moves across groups, skips disabled rows, ends on the action and does not wrap", async () => {
    mount(<Archive />);
    await open();
    // Opening with ArrowDown is itself a move: the first row is highlighted.
    const seen: Array<string | null> = [highlightedText()];
    for (let i = 0; i < 6; i++) {
      await userEvent.keyboard("{ArrowDown}");
      seen.push(highlightedText());
    }
    expect(seen).toEqual([
      "Josef Müller-Brockmann",
      // Otl Aicher is disabled — skipped.
      "Wim Crouwel",
      "Johannes Gutenberg",
      "Joseph Marie Jacquard",
      "Josef Müller-Brockmann · Grid systems",
      "Search everything for “”",
      // Stops at the end: no wrap, matching Select.
      "Search everything for “”",
    ]);
    expect(document.activeElement).toBe(input());
  });

  test("ArrowUp stops at the first row", async () => {
    mount(<Archive />);
    await open();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(highlightedText()).toBe("Josef Müller-Brockmann");
  });

  test("Home and End reach the first row and the action while open", async () => {
    mount(<Archive />);
    await open();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await userEvent.keyboard("{End}");
    await vi.waitFor(() => expect(highlightedText()).toBe("Search everything for “”"));
    await userEvent.keyboard("{Home}");
    await vi.waitFor(() => expect(highlightedText()).toBe("Josef Müller-Brockmann"));
  });

  test("Home and End move the caret while closed", async () => {
    mount(<Archive defaultInputValue="Gutenberg" />);
    await userEvent.click(input());
    await userEvent.keyboard("{Home}");
    expect(input().selectionStart).toBe(0);
    expect(panel()).toBeNull();
    await userEvent.keyboard("{End}");
    expect(input().selectionStart).toBe("Gutenberg".length);
  });

  test("Enter commits the highlighted option and closes", async () => {
    const onValueChange = vi.fn();
    mount(<Archive onValueChange={onValueChange} />);
    await userEvent.click(input());
    await userEvent.keyboard("Gut");
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("gutenberg");
    await vi.waitFor(() => expect(panel()).toBeNull());
    expect(input().value).toBe("Johannes Gutenberg");
  });

  test("the committed row is selected: aria-selected, a tick and the weight", async () => {
    mount(<Archive defaultValue="gutenberg" />);
    expect(input().value).toBe("Johannes Gutenberg");
    await open();
    // Reopening does not filter by the committed label: the whole list shows
    // (six options and the action).
    expect(rows().length).toBe(7);
    const row = rows().find((r) => r.getAttribute("aria-selected") === "true")!;
    expect(row.textContent).toBe("Johannes Gutenberg");
    expect(row.querySelector("svg")).not.toBeNull();
    const label = row.querySelector<HTMLElement>('[data-slot="combobox-option-label"]')!;
    const other = rows()[0]!.querySelector<HTMLElement>('[data-slot="combobox-option-label"]')!;
    expect(Number(getComputedStyle(label).fontWeight)).toBeGreaterThan(Number(getComputedStyle(other).fontWeight));
  });

  test("Enter with nothing highlighted submits the free text and closes", async () => {
    const onSubmitText = vi.fn();
    const onValueChange = vi.fn();
    mount(<Archive onSubmitText={onSubmitText} onValueChange={onValueChange} />);
    await userEvent.click(input());
    await userEvent.keyboard("Bauhaus");
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    await userEvent.keyboard("{Enter}");
    expect(onSubmitText).toHaveBeenCalledWith("Bauhaus");
    expect(onValueChange).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(panel()).toBeNull());
    expect(input().value).toBe("Bauhaus");
  });

  test("Escape once closes and keeps the text; twice clears it", async () => {
    mount(<Archive />);
    await userEvent.click(input());
    await userEvent.keyboard("Jo");
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(panel()).toBeNull());
    expect(input().value).toBe("Jo");
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(input().value).toBe(""));
    expect(document.activeElement).toBe(input());
  });

  test("Tab closes without committing the highlight; the free text stays", async () => {
    const onValueChange = vi.fn();
    mount(
      <>
        <Archive onValueChange={onValueChange} />
        <button type="button">next</button>
      </>,
    );
    await userEvent.click(input());
    await userEvent.keyboard("Jo");
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    await userEvent.keyboard("{ArrowDown}");
    expect(highlightedText()).toBe("Josef Müller-Brockmann");
    await userEvent.keyboard("{Tab}");
    await vi.waitFor(() => expect(panel()).toBeNull());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input().value).toBe("Jo");
  });

  test("free text survives a blur even with a committed value", async () => {
    mount(
      <>
        <Archive defaultValue="gutenberg" />
        <button type="button">next</button>
      </>,
    );
    await userEvent.click(input());
    await userEvent.fill(input(), "Gutenb");
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    await userEvent.keyboard("{Tab}");
    await vi.waitFor(() => expect(panel()).toBeNull());
    // Base UI would resync to "Johannes Gutenberg" here; the sheet says no.
    await new Promise((r) => setTimeout(r, 300));
    expect(input().value).toBe("Gutenb");
  });

  test("a pointer press on a row commits without blurring the input", async () => {
    const onValueChange = vi.fn();
    mount(<Archive onValueChange={onValueChange} />);
    await open();
    await userEvent.click(rows().find((r) => r.textContent === "Wim Crouwel")!);
    expect(onValueChange).toHaveBeenCalledWith("crouwel");
    expect(document.activeElement).toBe(input());
  });

  test("the clear control empties the field and keeps focus", async () => {
    const onInputValueChange = vi.fn();
    mount(<Archive defaultValue="gutenberg" onInputValueChange={onInputValueChange} />);
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="combobox-clear"]')!);
    expect(input().value).toBe("");
    expect(onInputValueChange).toHaveBeenLastCalledWith("");
    expect(document.activeElement).toBe(input());
    expect(document.querySelector('[data-slot="combobox-clear"]')).toBeNull();
  });

  test("the chevron opens the full list and flips while open", async () => {
    mount(<Archive />);
    const trigger = document.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!;
    const glyph = () => trigger.querySelector("svg")!.outerHTML;
    const closed = glyph();
    await userEvent.click(trigger);
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    expect(glyph()).not.toBe(closed);
    expect(document.activeElement).toBe(input());
  });

  test("a click into the field does not open the list", async () => {
    mount(<Archive />);
    await userEvent.click(input());
    await new Promise((r) => setTimeout(r, 100));
    expect(panel()).toBeNull();
  });

  test("a disabled field never opens and has no clear control", async () => {
    mount(<Archive isDisabled defaultInputValue="Jo" />);
    expect(input().disabled).toBe(true);
    expect(document.querySelector('[data-slot="combobox-clear"]')).toBeNull();
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(panel()).toBeNull();
  });
});

describe("Link options and the action row", () => {
  test("a link option is an <a role=option>; Enter follows it and commits nothing", async () => {
    const onValueChange = vi.fn();
    mount(<Archive onValueChange={onValueChange} />);
    await userEvent.click(input());
    await userEvent.keyboard("Grid");
    await vi.waitFor(() => expect(rows().length).toBe(2));
    const link = rows()[0]!;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("#grid-systems");
    expect(link.getAttribute("role")).toBe("option");

    await userEvent.keyboard("{ArrowDown}{Enter}");
    await vi.waitFor(() => expect(location.hash).toBe("#grid-systems"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input().value).toBe("Grid");
    history.replaceState(null, "", location.pathname + location.search);
  });

  test("the action row is present in every state and Enter runs it with the query", async () => {
    const onAction = vi.fn();
    const onValueChange = vi.fn();
    mount(<Archive onAction={onAction} onValueChange={onValueChange} />);
    await userEvent.click(input());
    await userEvent.keyboard("Lovelace");
    await vi.waitFor(() => expect(status()?.getAttribute("data-status")).toBe("empty"));
    // Nothing matches, and the action is still there — never a dead end.
    expect(rows().map((r) => r.textContent)).toEqual(["Search everything for “Lovelace”"]);
    await userEvent.keyboard("{ArrowDown}");
    expect(highlightedText()).toBe("Search everything for “Lovelace”");
    expect(highlighted()!.getAttribute("aria-selected")).toBe("false");
    await userEvent.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledWith("Lovelace");
    expect(onValueChange).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(panel()).toBeNull());
    expect(input().value).toBe("Lovelace");
  });

  test("a press on the action runs it", async () => {
    const onAction = vi.fn();
    mount(<Archive onAction={onAction} />);
    await userEvent.click(input());
    await userEvent.keyboard("Jo");
    await vi.waitFor(() => expect(panel()).not.toBeNull());
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="combobox-action"]')!);
    expect(onAction).toHaveBeenCalledWith("Jo");
  });
});

describe("Async states", () => {
  test("loading: a status row with Button's spinner, aria-busy on the list", async () => {
    mount(<Archive items={[]} filter={null} isLoading defaultInputValue="Müll" />);
    await open();
    expect(status()?.getAttribute("data-status")).toBe("loading");
    expect(status()?.getAttribute("role")).toBe("status");
    expect(statusText()).toBe("Searching…");
    expect(document.querySelector('[data-slot="combobox-spinner"]')).not.toBeNull();
    expect(list()?.getAttribute("aria-busy")).toBe("true");
    // The status row is not an option: the action is the only stop.
    expect(rows().length).toBe(1);
  });

  test("empty: a status line that can repeat the query", async () => {
    mount(<Archive emptyMessage={(q) => `No one in the archive matches “${q}”`} />);
    await userEvent.click(input());
    await userEvent.keyboard("Rams");
    await vi.waitFor(() => expect(statusText()).toBe("No one in the archive matches “Rams”"));
  });

  test("error: the list fails, Try again is a highlightable option", async () => {
    const onRetry = vi.fn();
    mount(<Archive listError="Results couldn’t load" onRetry={onRetry} defaultInputValue="Tesla" />);
    await open();
    expect(status()?.getAttribute("data-status")).toBe("error");
    expect(statusText()).toBe("Results couldn’t load");
    expect(rows().map((r) => r.textContent)).toEqual(["Try again", "Search everything for “Tesla”"]);
    // Opened with ArrowDown, so the first stop — Try again — is highlighted.
    expect(highlightedText()).toBe("Try again");
    await userEvent.keyboard("{Enter}");
    expect(onRetry).toHaveBeenCalledTimes(1);
    // Retrying is not a choice: the list stays open.
    expect(panel()).not.toBeNull();
  });

  test("the result count is announced politely", async () => {
    mount(<Archive />);
    await userEvent.click(input());
    await userEvent.keyboard("Jo");
    await vi.waitFor(() => expect(statusText()).toBe("4 results"));
    expect(status()?.getAttribute("aria-live")).toBe("polite");
  });

  test("async: onInputValueChange fires per keystroke and filter={null} shows items as given", async () => {
    const seen: string[] = [];
    function Async() {
      const [items, setItems] = useState<ComboboxItem[]>([]);
      return (
        <Combobox
          label="People"
          items={items}
          filter={null}
          onInputValueChange={(q) => {
            seen.push(q);
            // The "server" returns everything regardless of the query.
            setItems(FLAT);
          }}
        />
      );
    }
    mount(<Async />);
    await userEvent.click(input());
    await userEvent.keyboard("zz");
    expect(seen).toEqual(["z", "zz"]);
    await vi.waitFor(() => expect(rows().length).toBe(3));
  });
});

describe("The highlight follows the VALUE across result changes", () => {
  function Live({ initial }: { initial: ComboboxItem[] }) {
    const [items, setItems] = useState(initial);
    return (
      <>
        <Combobox label="People" items={items} filter={null} />
        <button type="button" data-testid="swap" onClick={() => setItems((current) => current === initial ? NEXT : MISSING)}>
          swap
        </button>
      </>
    );
  }
  // Babbage moves from index 1 to index 2 — and a newcomer takes index 1.
  const NEXT: ComboboxItem[] = [{ value: "a", label: "Ada Lovelace" }, { value: "d", label: "Dijkstra" }, { value: "b", label: "Babbage" }];
  const MISSING: ComboboxItem[] = [{ value: "e", label: "Euler" }, { value: "f", label: "Fermat" }];

  test("a surviving row keeps the highlight when results reorder", async () => {
    mount(<Live initial={FLAT} />);
    await open();
    await userEvent.keyboard("{ArrowDown}");
    expect(highlightedText()).toBe("Babbage");
    // Results arrive while the user sits on Babbage. Pressed by script, not by
    // pointer, so the input keeps focus and the list stays open.
    act(() => document.querySelector<HTMLElement>('[data-testid="swap"]')!.click());
    await vi.waitFor(() => expect(rows().map((r) => r.textContent)).toEqual(["Ada Lovelace", "Dijkstra", "Babbage"]));
    // Not Dijkstra, which now holds Babbage's old index.
    await vi.waitFor(() => expect(highlightedText()).toBe("Babbage"));
  });

  test("a row that vanished takes the highlight with it", async () => {
    mount(<Live initial={FLAT} />);
    await open();
    await userEvent.keyboard("{ArrowDown}");
    act(() => document.querySelector<HTMLElement>('[data-testid="swap"]')!.click());
    await vi.waitFor(() => expect(highlightedText()).toBe("Babbage"));
    act(() => document.querySelector<HTMLElement>('[data-testid="swap"]')!.click());
    await vi.waitFor(() => expect(rows().map((r) => r.textContent)).toEqual(["Euler", "Fermat"]));
    await vi.waitFor(() => expect(highlighted()).toBeNull());
  });
});

describe("The combobox paints the designed surface", () => {
  test("the control IS Input's control, at every size and both shapes", () => {
    for (const size of ["lg", "md", "sm"] as const) {
      for (const shape of ["soft", "full"] as const) {
        const c = mount(
          <>
            <Combobox label="Archive" items={FLAT} size={size} shape={shape} hasTrigger={false} defaultInputValue="Ada" />
            <Input label="Reference" size={size} shape={shape} defaultValue="Ada" />
          </>,
        );
        const mine = getComputedStyle(control());
        const theirs = getComputedStyle(c.querySelector<HTMLElement>('[data-slot="control"]')!);
        for (const prop of ["height", "borderTopLeftRadius", "borderTopWidth", "borderTopColor", "backgroundColor", "paddingLeft", "columnGap"] as const) {
          expect(mine[prop], `${size}/${shape} ${prop}`).toBe(theirs[prop]);
        }
        const value = getComputedStyle(input());
        const ref = getComputedStyle(c.querySelector<HTMLElement>('[data-slot="input"]')!);
        expect(value.fontSize, `${size} font-size`).toBe(ref.fontSize);
        expect(value.fontWeight, `${size} font-weight`).toBe(ref.fontWeight);
        unmount();
      }
    }
  });

  test("the three sizes differ", () => {
    const heights = (["lg", "md", "sm"] as const).map((size) => {
      mount(<Combobox label="Archive" items={FLAT} size={size} />);
      const h = getComputedStyle(control()).height;
      unmount();
      return h;
    });
    expect(heights).toEqual(["48px", "40px", "32px"]);
  });

  test("focus paints the ring on the control", async () => {
    mount(<Combobox label="Archive" items={FLAT} />);
    const rest = getComputedStyle(control()).boxShadow;
    await userEvent.click(input());
    await settled(control());
    expect(getComputedStyle(control()).boxShadow).not.toBe(rest);
    expect(getComputedStyle(control()).boxShadow).not.toBe("none");
  });

  test("the panel and rows are Select's", async () => {
    const c = mount(<Select label="Reference" items={FLAT} />);
    await userEvent.click(c.querySelector<HTMLElement>('[data-slot="select-trigger"]')!);
    await vi.waitFor(() => expect(document.querySelector('[data-slot="select-panel"]')).not.toBeNull());
    const selectPanel = document.querySelector<HTMLElement>('[data-slot="select-panel"]')!;
    await settled(selectPanel);
    const sp = getComputedStyle(selectPanel);
    const so = getComputedStyle(document.querySelector<HTMLElement>('[data-slot="select-option"]')!);
    const snap = {
      panel: [sp.borderTopLeftRadius, sp.paddingTop, sp.backgroundColor, sp.borderTopColor, sp.boxShadow],
      row: [so.paddingTop, so.paddingLeft, so.borderTopLeftRadius, so.fontSize, so.fontWeight, so.lineHeight, so.color, so.columnGap],
    };
    unmount();

    mount(<Combobox label="Archive" items={FLAT} />);
    await open();
    await settled(panel()!);
    const cp = getComputedStyle(panel()!);
    const co = getComputedStyle(document.querySelector<HTMLElement>('[data-slot="combobox-option"]')!);
    expect([cp.borderTopLeftRadius, cp.paddingTop, cp.backgroundColor, cp.borderTopColor, cp.boxShadow]).toEqual(snap.panel);
    expect([co.paddingTop, co.paddingLeft, co.borderTopLeftRadius, co.fontSize, co.fontWeight, co.lineHeight, co.color, co.columnGap]).toEqual(snap.row);
  });

  test("the panel sits 8px under the field and is at least as wide", async () => {
    mount(<Archive />);
    await open();
    await settled(panel()!);
    const field = control().getBoundingClientRect();
    const box = panel()!.getBoundingClientRect();
    expect(Math.round(box.top - field.bottom)).toBe(8);
    expect(box.width).toBeGreaterThanOrEqual(field.width - 0.5);
  });

  test("highlight and selection are different channels", async () => {
    mount(<Combobox label="Archive" items={FLAT} defaultValue="b" />);
    await open();
    await settled(panel()!);
    const [ada, babbage, curie] = rows();
    // Opening lands the highlight on the committed row; move it off.
    await userEvent.keyboard("{Home}");
    await vi.waitFor(() => expect(highlightedText()).toBe("Ada Lovelace"));
    await settled(panel()!);
    // Selected: NO fill — the weight and the tick carry it — so the selected
    // row paints like a resting one, and the highlighted row does not.
    expect(getComputedStyle(babbage!).backgroundColor).toBe(getComputedStyle(curie!).backgroundColor);
    expect(getComputedStyle(ada!).backgroundColor).not.toBe(getComputedStyle(curie!).backgroundColor);
  });

  test("every row keeps a 16px trailing lane, so labels align", async () => {
    mount(<Archive defaultValue="gutenberg" />);
    await open();
    await settled(panel()!);
    const lanes = Array.from(document.querySelectorAll<HTMLElement>('[role="option"] > span:last-child'));
    const rects = lanes.map((l) => l.getBoundingClientRect());
    expect(new Set(rects.map((r) => r.width))).toEqual(new Set([16]));
    expect(new Set(rects.map((r) => Math.round(r.right))).size).toBe(1);
  });

  test("the action region is separated by 8px of space and no rule", async () => {
    mount(<Archive />);
    await open();
    const region = document.querySelector<HTMLElement>('[data-slot="combobox-action-region"]')!;
    const style = getComputedStyle(region);
    expect(style.paddingTop).toBe("8px");
    expect(style.borderTopWidth).toBe("0px");
  });

  test("the clear control is a 24px target", () => {
    mount(<Archive defaultInputValue="Jo" size="sm" />);
    const box = document.querySelector<HTMLElement>('[data-slot="combobox-clear"]')!.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([24, 24]);
  });

  test("an overflowing list fades at the bottom, and the fade hides at the end", async () => {
    const MANY: ComboboxItem[] = Array.from({ length: 40 }, (_, i) => ({ value: `v${i}`, label: `Person ${i + 1}` }));
    mount(<Combobox label="People" items={MANY} action={<ComboboxAction onAction={() => {}}>Search everything</ComboboxAction>} />);
    await open();
    const fade = () => document.querySelector<HTMLElement>('[data-slot="combobox-panel"] [data-slot="fade"]')!;
    await vi.waitFor(() => expect(getComputedStyle(fade()).opacity).toBe("1"));
    const scroll = document.querySelector<HTMLElement>('[data-slot="combobox-list"]')!;
    scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() => expect(getComputedStyle(fade()).opacity).toBe("0"));
    // The action stays pinned, inside the panel.
    const action = document.querySelector<HTMLElement>('[data-slot="combobox-action"]')!.getBoundingClientRect();
    expect(action.bottom).toBeLessThanOrEqual(panel()!.getBoundingClientRect().bottom);
  });

  test("the panel portals into the field's own root, so a brand scope reaches it", async () => {
    mount(
      <div id="scope" style={{ "--ui-bg-surface": "rgb(255, 224, 102)" } as React.CSSProperties}>
        <Archive />
      </div>,
    );
    await open();
    expect(panel()!.closest("#scope")).not.toBeNull();
    expect(getComputedStyle(panel()!).backgroundColor).toBe("rgb(255, 224, 102)");
  });
});
