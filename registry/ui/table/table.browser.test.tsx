import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { Table, type TableColumn, type TableSize } from "./table.tsx";

interface Designer {
  id: string;
  name: string;
  discipline: string;
  year: number;
}

const DESIGNERS: Designer[] = [
  { id: "tschichold", name: "Jan Tschichold", discipline: "Asymmetric typography", year: 1928 },
  { id: "brockmann", name: "Josef Müller-Brockmann", discipline: "Grid systems", year: 1961 },
  { id: "marconi", name: "Guglielmo Marconi", discipline: "Radio telegraphy", year: 1895 },
];

const COLUMNS: TableColumn<Designer>[] = [
  { key: "name", header: "Name", isSortable: true, cell: (row) => row.name },
  { key: "discipline", header: "Discipline", width: 260, cell: (row) => row.discipline },
  { key: "year", header: "Year", width: 96, isNumeric: true, cell: (row) => row.year },
];

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/**
 * Hover the row through one of its CELLS.
 *
 * The contract project's viewport is 414x896 — a phone — and this suite mounts
 * a 900px table so the lane arithmetic is real. A row's own centre is
 * therefore off-screen, `elementFromPoint` returns null there, and Playwright
 * hovers nothing at all while reporting success. The first data cell's centre
 * is on-screen, and `:hover` matches every ancestor of what the pointer is
 * over, so hovering it hovers the row.
 */
function hoverTarget(row: HTMLElement): HTMLElement {
  return row.querySelector<HTMLElement>('[data-slot="table-cell"]')!;
}

function mount(ui: ReactElement) {
  container = document.createElement("div");
  // A real width, so the flexing lane has something to take. The default
  // container is 0-wide and every lane would report 0.
  container.style.width = "900px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const all = <T extends HTMLElement>(slot: string) =>
    [...container!.querySelectorAll<T>(`[data-slot="${slot}"]`)];
  return {
    container: container!,
    frame: container.querySelector<HTMLElement>('[data-slot="table"]')!,
    grid: container.querySelector<HTMLTableElement>('[data-slot="table-grid"]')!,
    body: container.querySelector<HTMLElement>('[data-slot="table-body"]')!,
    headerRow: container.querySelector<HTMLElement>('[data-slot="table-header-row"]')!,
    headerCells: all<HTMLTableCellElement>("table-header-cell"),
    rows: all<HTMLTableRowElement>("table-row"),
    cells: all<HTMLTableCellElement>("table-cell"),
    sorts: all<HTMLButtonElement>("table-sort"),
    checkboxes: [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')],
  };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/** The resolved value of a token, so an assertion names the ROLE not a hex. */
function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/**
 * A read taken immediately after a state change returns the value the property
 * is transitioning FROM, so a working hover reads as broken.
 */
async function settled(el: Element) {
  await act(async () => {
    await Promise.all(
      el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)),
    );
  });
}

const base = {
  caption: "Designers",
  columns: COLUMNS,
  rows: DESIGNERS,
  getRowId: (row: Designer) => row.id,
};

const selectable = {
  ...base,
  isSelectable: true as const,
  getRowLabel: (row: Designer) => `Select ${row.name}`,
  selectAllLabel: "Select all designers",
};

describe("the frame", () => {
  test("is a bg-elevated mat with a subtle edge, radius-lg and 4px of padding", () => {
    const { frame } = mount(<Table {...base} />);
    const style = getComputedStyle(frame);

    expect(style.borderRadius).toBe("16px");
    expect(style.padding).toBe("4px");
    expect(style.borderTopWidth).toBe("1px");
    expect(style.borderTopColor).toBe(tokenColor("--ui-border-subtle"));
    expect(style.backgroundColor).toBe(tokenColor("--ui-bg-elevated"));
  });

  test("the body clips at the CONCENTRIC radius — outer minus the mat's padding", () => {
    const { container: host } = mount(<Table {...base} />);
    const clip = host.querySelector<HTMLElement>('[data-slot="table-body-clip"]')!;
    const style = getComputedStyle(clip);

    expect(style.overflow).toBe("clip");
    // radius-lg 16 − space-xs 4 = 12, the sheet's inner corner exactly. It is
    // written as the arithmetic because 12 is not a step on the radius scale.
    expect(style.borderRadius).toBe("12px");
  });

  test("clipping on the FRAME would not have produced that corner", () => {
    // Why the body has a node of its own. A clip on the frame cuts along the
    // frame's own 15px curve offset by 4px of padding — a shallow bite, not a
    // 12px round — and a <tr> cannot carry a border-radius in either border
    // model, so the rows cannot own it either.
    const { frame, headerRow, rows } = mount(<Table {...base} />);
    expect(getComputedStyle(frame).borderRadius).toBe("16px");
    expect(getComputedStyle(frame).overflow).not.toBe("clip");
    // The last row's bottom corners are the clip's, not its own.
    expect(getComputedStyle(headerRow).borderRadius).toBe("0px");
    for (const cell of [...rows.at(-1)!.children] as HTMLElement[]) {
      expect(getComputedStyle(cell).borderBottomLeftRadius).toBe("0px");
    }
  });

  test("the header sits on the mat and the rows sit on the surface above it", () => {
    const { headerRow, rows } = mount(<Table {...base} />);
    const head = getComputedStyle(headerRow.children[0] as HTMLElement).backgroundColor;
    const body = getComputedStyle(rows[0]!.children[0] as HTMLElement).backgroundColor;

    expect(head).toBe(tokenColor("--ui-bg-elevated"));
    expect(body).toBe(tokenColor("--ui-bg-surface"));
    // The two must DIFFER, or the header is invisible.
    expect(head).not.toBe(body);
  });
});

describe("the body's corners", () => {
  test("the FIRST data row is rounded at its top corners", () => {
    const { rows } = mount(<Table {...selectable} />);
    const cells = [...rows[0]!.children] as HTMLElement[];

    // radius-md, as the sheet draws it: the body reads as a slab under the
    // header rather than as its continuation.
    expect(getComputedStyle(cells[0]!).borderTopLeftRadius).toBe("8px");
    expect(getComputedStyle(cells.at(-1)!).borderTopRightRadius).toBe("8px");
    // Only the outer two. A corner on an interior cell would cut a notch in
    // the middle of the row.
    expect(getComputedStyle(cells[1]!).borderTopLeftRadius).toBe("0px");
  });

  test("no other row is", () => {
    const { rows } = mount(<Table {...selectable} />);
    for (const row of rows.slice(1)) {
      for (const cell of [...row.children] as HTMLElement[]) {
        expect(getComputedStyle(cell).borderTopLeftRadius).toBe("0px");
      }
    }
  });

  test("with no select lane the corner moves to the first DATA cell", () => {
    const { rows } = mount(<Table {...base} />);
    const cells = [...rows[0]!.children] as HTMLElement[];
    expect(getComputedStyle(cells[0]!).borderTopLeftRadius).toBe("8px");
  });

  test("an EMPTY body is rounded the same way — the rule is the body's top edge", () => {
    const { container: host } = mount(<Table {...selectable} rows={[]} empty={<p>None</p>} />);
    const cell = host.querySelector<HTMLElement>('[data-slot="table-empty"]')!;
    expect(getComputedStyle(cell).borderTopLeftRadius).toBe("8px");
    expect(getComputedStyle(cell).borderTopRightRadius).toBe("8px");
  });

  test("a loading body is rounded the same way", () => {
    const { container: host } = mount(<Table {...selectable} rows={[]} isLoading />);
    const first = host.querySelector<HTMLElement>('[data-slot="table-loading-row"]')!;
    expect(getComputedStyle(first.children[0] as HTMLElement).borderTopLeftRadius).toBe("8px");
  });

  test("the separate border model is what makes any of that possible", () => {
    // border-radius does not apply at all under `collapse`, so this is not a
    // stylistic choice — the corners above are silently lost without it.
    const { grid } = mount(<Table {...base} />);
    expect(getComputedStyle(grid).borderCollapse).toBe("separate");
    expect(getComputedStyle(grid).borderSpacing).toBe("0px");
  });
});

describe("the lane system", () => {
  test("a declared width is the lane's width, and the undeclared column takes the rest", () => {
    const { cells, frame } = mount(<Table {...base} />);
    const [name, discipline, year] = [cells[0]!, cells[1]!, cells[2]!];

    expect(getComputedStyle(discipline).width).toBe("260px");
    expect(getComputedStyle(year).width).toBe("96px");

    // 900 container − 2px border − 8px padding = 890 of table.
    const available = frame.clientWidth - 8;
    expect(Math.round(name.getBoundingClientRect().width)).toBe(available - 260 - 96);
  });

  test("the table is FIXED, which is the only reason the lanes hold", () => {
    const { grid } = mount(<Table {...base} />);
    expect(getComputedStyle(grid).tableLayout).toBe("fixed");
  });

  test("the select lane is 2 x inline + 16 at every size — 40 / 48 / 64", () => {
    const widths = ([["sm", 40], ["md", 48], ["lg", 64]] as const).map(([size, expected]) => {
      const { container: host } = mount(<Table {...selectable} size={size} />);
      const lane = host.querySelector<HTMLElement>('[data-slot="table-select-row"]')!;
      const measured = getComputedStyle(lane).width;
      unmount();
      return [measured, `${expected}px`];
    });
    for (const [measured, expected] of widths) expect(measured).toBe(expected);
  });

  test("density does NOT move the lane system", () => {
    const laneAt = (size: TableSize) => {
      const { cells } = mount(<Table {...base} size={size} />);
      const width = getComputedStyle(cells[1]!).width;
      unmount();
      return width;
    };
    expect(laneAt("sm")).toBe("260px");
    expect(laneAt("md")).toBe("260px");
    expect(laneAt("lg")).toBe("260px");
  });
});

describe("density", () => {
  const measure = (size: TableSize) => {
    const { rows, headerRow, cells, grid } = mount(<Table {...base} size={size} />);
    const out = {
      row: getComputedStyle(rows[0]!).height,
      header: getComputedStyle(headerRow).height,
      inline: getComputedStyle(cells[0]!).paddingRight,
      body: getComputedStyle(grid).fontSize,
    };
    unmount();
    return out;
  };

  test("moves row height, header height, inline padding and body size — the sheet's four", () => {
    expect(measure("sm")).toEqual({ row: "36px", header: "32px", inline: "12px", body: "13px" });
    expect(measure("md")).toEqual({ row: "44px", header: "40px", inline: "16px", body: "14px" });
    expect(measure("lg")).toEqual({ row: "56px", header: "48px", inline: "24px", body: "16px" });
  });

  test("and the three DIFFER from each other — asserting each alone would pass on identical sizes", () => {
    const [sm, md, lg] = [measure("sm"), measure("md"), measure("lg")];
    expect(new Set([sm.row, md.row, lg.row]).size).toBe(3);
    expect(new Set([sm.header, md.header, lg.header]).size).toBe(3);
    expect(new Set([sm.inline, md.inline, lg.inline]).size).toBe(3);
    expect(new Set([sm.body, md.body, lg.body]).size).toBe(3);
  });
});

describe("the dividers", () => {
  test("every row but the last carries a 1px hairline in the MAT's own colour", () => {
    // On the CELLS: the separate border model ignores a border on a <tr>, and
    // the separate model is what the first row's corners require.
    const { rows } = mount(<Table {...base} />);
    for (const cell of [...rows[0]!.children] as HTMLElement[]) {
      const style = getComputedStyle(cell);
      expect(style.borderBottomWidth).toBe("1px");
      // Not a border role: the divider IS the frame surface showing between
      // rows that float on it, so it has to track that surface exactly.
      expect(style.borderBottomColor).toBe(tokenColor("--ui-bg-elevated"));
    }
  });

  test("the LAST row has none — the frame's own padding closes the body", () => {
    const { rows } = mount(<Table {...base} />);
    for (const cell of [...rows.at(-1)!.children] as HTMLElement[]) {
      expect(getComputedStyle(cell).borderBottomWidth).toBe("0px");
    }
  });
});

describe("the header", () => {
  test("labels are 12px muted, at the leading their role sets", () => {
    const { headerCells } = mount(<Table {...base} />);
    const style = getComputedStyle(headerCells[1]!);

    expect(style.fontSize).toBe("12px");
    expect(style.color).toBe(tokenColor("--ui-text-muted"));
    expect(style.fontWeight).toBe("500");
  });

  test("a hidden header keeps its name and loses its paint", () => {
    const { headerCells } = mount(
      <Table
        {...base}
        columns={[
          ...COLUMNS,
          { key: "actions", header: "Actions", isHeaderHidden: true, width: 56, align: "end", cell: () => null },
        ]}
      />,
    );
    const label = headerCells.at(-1)!.querySelector("span")!;
    expect(label.textContent).toBe("Actions");
    // sr-only clips rather than hides: still in the accessibility tree.
    expect(getComputedStyle(label).position).toBe("absolute");
    expect(getComputedStyle(label).width).toBe("1px");
  });

  test("a numeric lane is right-aligned and set in tabular figures", () => {
    const { cells } = mount(<Table {...base} />);
    const style = getComputedStyle(cells[2]!);
    expect(style.textAlign).toBe("right");
    expect(style.fontVariantNumeric).toContain("tabular-nums");
  });

  test("only sortable columns get a control, and it declares aria-sort", () => {
    const { headerCells, sorts } = mount(<Table {...base} />);
    expect(sorts).toHaveLength(1);
    expect(headerCells[0]!.getAttribute("aria-sort")).toBe("none");
    expect(headerCells[1]!.getAttribute("aria-sort")).toBeNull();
  });
});

describe("sorting", () => {
  test("reports ascending first, then flips — and never sorts the rows itself", async () => {
    const onSortChange = vi.fn();
    const { sorts, rows } = mount(<Table {...base} onSortChange={onSortChange} />);

    await userEvent.click(sorts[0]!);
    expect(onSortChange).toHaveBeenLastCalledWith({ columnKey: "name", direction: "ascending" });

    await userEvent.click(sorts[0]!);
    expect(onSortChange).toHaveBeenLastCalledWith({ columnKey: "name", direction: "descending" });

    // The rows are the rows it was handed, in the order it was handed them.
    expect(rows.map((row) => row.getAttribute("data-state"))).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("Jan Tschichold");
  });

  test("the indicator is LATENT at rest and solid once the column is sorted", async () => {
    const { sorts } = mount(<Table {...base} />);
    const indicator = sorts[0]!.querySelector<SVGElement>('[data-slot="table-sort-indicator"]')!;

    // Present in the layout throughout, so revealing it reflows nothing.
    expect(getComputedStyle(indicator).opacity).toBe("0");
    expect(getComputedStyle(indicator).width).toBe("16px");

    await userEvent.click(sorts[0]!);
    await settled(indicator);
    expect(getComputedStyle(indicator).opacity).toBe("1");
  });

  test("hovering an unsorted column HINTS the indicator at 40%", async () => {
    // The three-step ladder — latent, hint, committed — existed in the class
    // list and in no assertion. The header is at the top of the frame, so its
    // centre is on-screen in the 414px test viewport.
    const { sorts } = mount(<Table {...base} />);
    const indicator = sorts[0]!.querySelector<SVGElement>('[data-slot="table-sort-indicator"]')!;

    expect(getComputedStyle(indicator).opacity).toBe("0");
    await userEvent.hover(sorts[0]!);
    await settled(indicator);
    expect(getComputedStyle(indicator).opacity).toBe("0.4");
  });

  test("the header's fill and ink both answer the pointer", async () => {
    const { sorts, headerCells } = mount(<Table {...base} />);
    expect(getComputedStyle(sorts[0]!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(headerCells[0]!).color).toBe(tokenColor("--ui-text-muted"));

    await userEvent.hover(sorts[0]!);
    await settled(sorts[0]!);
    expect(getComputedStyle(sorts[0]!).backgroundColor).toBe(tokenColor("--ui-bg-hover"));
    expect(getComputedStyle(sorts[0]!).color).toBe(tokenColor("--ui-text-primary"));
  });

  test("ascending turns the chevron over; descending leaves it alone", async () => {
    const { sorts } = mount(<Table {...base} />);
    const indicator = sorts[0]!.querySelector<SVGElement>('[data-slot="table-sort-indicator"]')!;

    await userEvent.click(sorts[0]!);
    await settled(indicator);
    expect(getComputedStyle(indicator).rotate).toBe("180deg");

    await userEvent.click(sorts[0]!);
    await settled(indicator);
    expect(getComputedStyle(indicator).rotate).toBe("none");
  });

  test("the sorted header's aria-sort and data-state agree with each other", async () => {
    const { sorts, headerCells } = mount(<Table {...base} />);
    await userEvent.click(sorts[0]!);
    expect(headerCells[0]!.getAttribute("aria-sort")).toBe("ascending");
    expect(sorts[0]!.getAttribute("data-state")).toBe("ascending");
  });

  test("the control fills its lane, so the hover fill is the whole column head", () => {
    const { headerCells, sorts } = mount(<Table {...base} />);
    expect(Math.round(sorts[0]!.getBoundingClientRect().width)).toBe(
      Math.round(headerCells[0]!.getBoundingClientRect().width),
    );
    expect(Math.round(sorts[0]!.getBoundingClientRect().height)).toBe(
      Math.round(headerCells[0]!.getBoundingClientRect().height),
    );
    expect(getComputedStyle(sorts[0]!).cursor).toBe("pointer");
  });
});

describe("selection", () => {
  test("every checkbox is named after the row it selects", () => {
    const { checkboxes } = mount(<Table {...selectable} />);
    // One header box plus one per row.
    expect(checkboxes).toHaveLength(4);
    const names = checkboxes.map((box) => box.closest("label")!.textContent);
    expect(names[0]).toBe("Select all designers");
    expect(names[1]).toBe("Select Jan Tschichold");
  });

  test("a partial selection makes the header box MIXED", () => {
    const { checkboxes } = mount(
      <Table {...selectable} defaultSelectedIds={["tschichold"]} />,
    );
    expect(checkboxes[0]!.indeterminate).toBe(true);
    expect(checkboxes[0]!.closest("label")!.getAttribute("data-state")).toBe("mixed");
  });

  test("clicking a MIXED header box selects everything, never nothing", async () => {
    const onSelectionChange = vi.fn();
    const { checkboxes } = mount(
      <Table
        {...selectable}
        defaultSelectedIds={["tschichold"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    // Click the label — a visually-hidden input is not what a user can hit.
    await userEvent.click(checkboxes[0]!.closest("label")!);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["tschichold", "brockmann", "marconi"]);
  });

  test("clicking a FULL header box clears it", async () => {
    const onSelectionChange = vi.fn();
    const { checkboxes } = mount(
      <Table
        {...selectable}
        defaultSelectedIds={DESIGNERS.map((row) => row.id)}
        onSelectionChange={onSelectionChange}
      />,
    );
    await userEvent.click(checkboxes[0]!.closest("label")!);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  test("pressing the row toggles it — the pointer convenience for the checkbox", async () => {
    const onSelectionChange = vi.fn();
    const { rows } = mount(<Table {...selectable} onSelectionChange={onSelectionChange} />);

    await userEvent.click(rows[1]!.querySelector('[data-slot="table-cell"]')!);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["brockmann"]);
  });

  test("a click on the row's own checkbox toggles ONCE, not twice", async () => {
    // Both the label and the row answer this click. Without the guard the two
    // cancel and the row never changes — which looks exactly like a dead
    // control.
    const onSelectionChange = vi.fn();
    const { checkboxes } = mount(<Table {...selectable} onSelectionChange={onSelectionChange} />);

    await userEvent.click(checkboxes[1]!.closest("label")!);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["tschichold"]);
  });

  test("a selected row is washed AND edged — the wash alone is colour", () => {
    const { rows } = mount(<Table {...selectable} defaultSelectedIds={["tschichold"]} />);
    const selected = rows[0]!;

    expect(
      getComputedStyle(selected.querySelector<HTMLElement>('[data-slot="table-cell"]')!)
        .backgroundColor,
    ).toBe(tokenColor("--ui-bg-accent-subtle"));

    const lane = selected.querySelector<HTMLElement>('[data-slot="table-select-row"]')!;
    const edge = getComputedStyle(lane, "::before");
    expect(edge.width).toBe("3px");
    expect(edge.backgroundColor).toBe(tokenColor("--ui-bg-accent-legible"));
  });

  test("the edge is dropped while the row is HOVERED", async () => {
    const { rows } = mount(<Table {...selectable} defaultSelectedIds={["tschichold"]} />);
    const lane = rows[0]!.querySelector<HTMLElement>('[data-slot="table-select-row"]')!;

    expect(getComputedStyle(lane, "::before").display).not.toBe("none");
    await userEvent.hover(hoverTarget(rows[0]!));
    await settled(rows[0]!);
    expect(getComputedStyle(lane, "::before").display).toBe("none");
    // The row still carries a cue that is not colour: its checkbox is checked.
    expect(rows[0]!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true);
  });

  test("an unselected row draws no edge at all", () => {
    const { rows } = mount(<Table {...selectable} defaultSelectedIds={["tschichold"]} />);
    const lane = rows[1]!.querySelector<HTMLElement>('[data-slot="table-select-row"]')!;
    expect(getComputedStyle(lane, "::before").content).toBe("none");
  });

  test("there is no select lane, and no press, when selection is off", async () => {
    const { rows, checkboxes } = mount(<Table {...base} />);
    expect(checkboxes).toHaveLength(0);
    expect(getComputedStyle(rows[0]!).cursor).not.toBe("pointer");
  });
});

describe("row states", () => {
  test("hover and press are DIFFERENT fills — the sheet paints both the same value", async () => {
    const { rows } = mount(<Table {...selectable} />);
    const row = rows[0]!;
    const cell = hoverTarget(row);
    const resting = getComputedStyle(cell).backgroundColor;

    await userEvent.hover(cell);
    await settled(row);
    const hovered = getComputedStyle(cell).backgroundColor;

    expect(hovered).toBe(tokenColor("--ui-bg-hover"));
    expect(hovered).not.toBe(resting);
    // `bg-active` is the pressed fill. Asserting the ROLES differ is what
    // catches the defect: two states drawn identically give a press no
    // feedback, and each assertion on its own would pass.
    expect(tokenColor("--ui-bg-active")).not.toBe(tokenColor("--ui-bg-hover"));
  });

  test("a hovered SELECTED row keeps its selection colour", async () => {
    const { rows } = mount(<Table {...selectable} defaultSelectedIds={["tschichold"]} />);
    await userEvent.hover(hoverTarget(rows[0]!));
    await settled(rows[0]!);
    expect(getComputedStyle(hoverTarget(rows[0]!)).backgroundColor).toBe(
      tokenColor("--ui-bg-accent-subtle-hover"),
    );
  });

  test("a disabled row is inert, and its DATA stays readable", () => {
    const { rows, checkboxes } = mount(
      <Table {...selectable} isRowDisabled={(row) => row.id === "marconi"} />,
    );
    const disabled = rows[2]!;

    expect(disabled.getAttribute("data-disabled")).toBe("true");
    expect(checkboxes[3]!.disabled).toBe(true);
    expect(getComputedStyle(disabled).cursor).not.toBe("pointer");
    // NOT text-disabled, which measures 2.09:1 in light. A row's data is
    // content; WCAG exempts an inactive control's label, not a name.
    const cell = disabled.querySelector<HTMLElement>('[data-slot="table-cell"]')!;
    expect(getComputedStyle(cell).color).toBe(tokenColor("--ui-text-muted"));
    expect(getComputedStyle(cell).color).not.toBe(tokenColor("--ui-text-disabled"));
  });

  test("a disabled row is left out of select-all", async () => {
    const onSelectionChange = vi.fn();
    const { checkboxes } = mount(
      <Table
        {...selectable}
        isRowDisabled={(row) => row.id === "marconi"}
        onSelectionChange={onSelectionChange}
      />,
    );
    await userEvent.click(checkboxes[0]!.closest("label")!);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["tschichold", "brockmann"]);
  });

  test("the primary lane carries darker ink and more weight than the rest", () => {
    const { cells } = mount(<Table {...base} />);
    const primary = getComputedStyle(cells[0]!);
    const other = getComputedStyle(cells[1]!);

    expect(primary.color).toBe(tokenColor("--ui-text-primary"));
    expect(other.color).toBe(tokenColor("--ui-text-secondary"));
    expect(primary.fontWeight).toBe("500");
    expect(other.fontWeight).toBe("400");
    expect(primary.color).not.toBe(other.color);
  });
});

describe("the select lane", () => {
  test("the checkbox does not MOVE when its glyph appears", async () => {
    // Checkbox's own root is `inline-flex`, which is BASELINE-aligned in a
    // cell — and an inline-flex box's baseline is its first flex item's, which
    // holds a glyph when checked or mixed and nothing when unchecked. The
    // header box drifted half a pixel on every selection change. Table passes
    // `flex` so the cell's align-middle lays it out instead.
    const { checkboxes, headerRow } = mount(<Table {...selectable} />);
    const control = checkboxes[0]!
      .closest("label")!
      .querySelector<HTMLElement>('[data-slot="control"]')!;
    const offset = () =>
      Number(
        (control.getBoundingClientRect().top - headerRow.getBoundingClientRect().top).toFixed(2),
      );

    const unchecked = offset();
    await userEvent.click(checkboxes[1]!.closest("label")!);
    expect(offset(), "mixed moved the header box").toBe(unchecked);
    await userEvent.click(checkboxes[2]!.closest("label")!);
    expect(offset(), "checked moved the header box").toBe(unchecked);
    await userEvent.click(checkboxes[3]!.closest("label")!);
    expect(offset(), "back to mixed moved the header box").toBe(unchecked);
  });

  test("a row's own checkbox holds its place too", async () => {
    const { checkboxes, rows } = mount(<Table {...selectable} />);
    const control = checkboxes[1]!
      .closest("label")!
      .querySelector<HTMLElement>('[data-slot="control"]')!;
    const offset = () =>
      Number((control.getBoundingClientRect().top - rows[0]!.getBoundingClientRect().top).toFixed(2));

    const before = offset();
    await userEvent.click(checkboxes[1]!.closest("label")!);
    expect(offset()).toBe(before);
  });
});

describe("focus", () => {
  test("the ROW draws the ring when a control inside it takes keyboard focus", async () => {
    const { rows, checkboxes } = mount(<Table {...selectable} />);
    const row = rows[0]!;

    expect(getComputedStyle(row).outlineStyle).toBe("none");

    // Tab from the header box, past the Name column's sort control, into the
    // first row's box. The sort control is a tab stop between them.
    checkboxes[0]!.focus();
    await userEvent.keyboard("{Tab}");
    await userEvent.keyboard("{Tab}");
    await settled(row);

    expect(document.activeElement).toBe(checkboxes[1]);
    const style = getComputedStyle(row);
    // An outline, not a box-shadow: forced-colors mode forces box-shadow to
    // `none` and the indicator would cease to exist there.
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineWidth).toBe("2px");
    expect(style.outlineColor).toBe(tokenColor("--ui-focus-ring-color"));
    // Inset, so the frame's clip cannot eat it.
    expect(style.outlineOffset).toBe("-2px");
  });
});

describe("data states", () => {
  test("loading keeps the header and the lanes, and marks the BODY busy", () => {
    const { body, headerCells, rows, container: host } = mount(
      <Table {...selectable} rows={[]} isLoading loadingRowCount={4} />,
    );

    expect(body.getAttribute("aria-busy")).toBe("true");
    expect(headerCells).toHaveLength(3);
    expect(rows).toHaveLength(0);
    expect(host.querySelectorAll('[data-slot="table-loading-row"]')).toHaveLength(4);

    const bar = host.querySelector<HTMLElement>('[data-slot="table-skeleton"]')!;
    expect(getComputedStyle(bar).height).toBe("10px");
    expect(getComputedStyle(bar).backgroundColor).toBe(tokenColor("--ui-bg-sunken"));
  });

  test("a loading row is the same height as a real one", () => {
    const { container: host } = mount(<Table {...base} rows={[]} isLoading />);
    const loading = host.querySelector<HTMLElement>('[data-slot="table-loading-row"]')!;
    expect(getComputedStyle(loading).height).toBe("44px");
  });

  test("empty spans every lane and announces politely", () => {
    const { container: host, headerCells } = mount(
      <Table {...selectable} rows={[]} empty={<p>No designers match this filter</p>} />,
    );
    const cell = host.querySelector<HTMLTableCellElement>('[data-slot="table-empty"]')!;

    // The header stays: it is the only thing that says what was filtered.
    expect(headerCells).toHaveLength(3);
    // Three columns plus the select lane.
    expect(cell.colSpan).toBe(4);
    expect(cell.getAttribute("aria-live")).toBe("polite");
    // aria-live is a global attribute — the cell keeps being a cell.
    expect(cell.getAttribute("role")).toBeNull();
  });

  test("loading wins over empty — a recovery shown mid-flight says the search failed", () => {
    const { container: host } = mount(
      <Table {...base} rows={[]} isLoading empty={<p>Nothing here</p>} />,
    );
    expect(host.querySelector('[data-slot="table-empty"]')).toBeNull();
    expect(host.querySelectorAll('[data-slot="table-loading-row"]').length).toBeGreaterThan(0);
  });
});

describe("semantics and forwarding (§5)", () => {
  test("it is a real table, named by a visually hidden caption", () => {
    const { grid } = mount(<Table {...base} />);
    const caption = grid.querySelector("caption")!;

    expect(grid.tagName).toBe("TABLE");
    expect(caption.textContent).toBe("Designers");
    expect(getComputedStyle(caption).position).toBe("absolute");
    expect(grid.querySelectorAll("th[scope='col']")).toHaveLength(3);
    expect(grid.querySelector("thead")).not.toBeNull();
    expect(grid.querySelector("tbody")).not.toBeNull();
  });

  test("ref and className land on the frame, not on the table", () => {
    const ref = createRef<HTMLDivElement>();
    const { frame, grid } = mount(<Table {...base} ref={ref} className="mt-2xl" />);

    expect(ref.current).toBe(frame);
    expect(getComputedStyle(frame).marginTop).toBe("32px");
    expect(getComputedStyle(grid).marginTop).toBe("0px");
    // The frame's own padding survives the consumer's margin.
    expect(getComputedStyle(frame).padding).toBe("4px");
  });

  test("data-size is on the frame, so a consumer can target a density", () => {
    const { frame } = mount(<Table {...base} size="lg" />);
    expect(frame.getAttribute("data-size")).toBe("lg");
  });
});
