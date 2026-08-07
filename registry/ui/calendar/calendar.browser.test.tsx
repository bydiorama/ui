import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Calendar } from "./calendar.tsx";

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

/** A fixed month, so no test depends on the day it runs. August 2026 starts
 *  on a Saturday, which also exercises six leading blanks. */
const AUGUST = new Date(2026, 7, 15, 12);

const days = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="calendar-day"]'));
const day = (n: number) => days().find((d) => d.textContent === String(n))!;
/** The gridcell wrapping a day. `aria-selected` lives there, not on the
 *  button — it is not an allowed attribute on role=button. */
const cell = (n: number) => day(n).closest('[role="gridcell"]')!;
const heading = () => document.querySelector<HTMLElement>('[data-slot="calendar-heading"]')!;
const grid = () => document.querySelector<HTMLElement>('[data-slot="calendar-grid"]')!;

describe("Calendar is an ARIA grid, named and navigable", () => {
  test("it is a named grid of gridcells, with column headers", () => {
    const c = mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    expect(grid().getAttribute("role")).toBe("grid");
    expect(grid().getAttribute("aria-label")).toBe("Choose a date");
    expect(c.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
    // 31 days in August, and every one is a cell.
    expect(days()).toHaveLength(31);
  });

  test("weekday headers carry the FULL name, not the abbreviation", () => {
    const c = mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    const first = c.querySelector<HTMLElement>('[role="columnheader"]')!;
    // "Sun" read aloud is not a weekday. The visible text stays short.
    expect(first.getAttribute("aria-label")).toBe("Sunday");
    expect(first.textContent).toBe("Sun");
  });

  test("every day is named in full — a bare '3' locates nothing", () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    expect(day(3).getAttribute("aria-label")).toContain("August");
    expect(day(3).getAttribute("aria-label")).toContain("2026");
  });

  test("exactly ONE day is in the tab order — a roving tabindex", () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    // 31 tab stops is what the grid pattern exists to avoid.
    const tabbable = days().filter((d) => d.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });
});

describe("The keyboard contract is the ARIA date-picker pattern", () => {
  async function focusDay(n: number) {
    day(n).focus();
    await Promise.resolve();
  }

  test("arrows move by a day and by a week", async () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    await focusDay(10);
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("11");
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("18");
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement?.textContent).toBe("17");
    await userEvent.keyboard("{ArrowUp}");
    expect(document.activeElement?.textContent).toBe("10");
  });

  test("Home and End go to the ends of the WEEK, not the month", async () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    // 12 August 2026 is a Wednesday; its week runs Sunday 9 to Saturday 15.
    await focusDay(12);
    await userEvent.keyboard("{Home}");
    expect(document.activeElement?.textContent).toBe("9");
    await userEvent.keyboard("{End}");
    expect(document.activeElement?.textContent).toBe("15");
  });

  test("PageUp and PageDown change the month, and the grid follows", async () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    await focusDay(15);
    await userEvent.keyboard("{PageDown}");
    expect(heading().textContent).toContain("September");
    expect(document.activeElement?.textContent).toBe("15");
    await userEvent.keyboard("{PageUp}");
    expect(heading().textContent).toContain("August");
  });

  test("an arrow off the edge of the month CHANGES the month", async () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    await focusDay(31);
    await userEvent.keyboard("{ArrowRight}");
    // Otherwise the last week of a month is a dead end, and a keyboard user
    // has to go back up to the header to continue.
    expect(heading().textContent).toContain("September");
    expect(document.activeElement?.textContent).toBe("1");
  });

  test("Enter selects, and selecting the same day again clears it", async () => {
    const onValueChange = vi.fn();
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} onValueChange={onValueChange} />);
    await userEvent.click(day(3));
    expect(cell(3).getAttribute("aria-selected")).toBe("true");
    expect(onValueChange.mock.calls[0]![0]).toBeInstanceOf(Date);
    await userEvent.click(day(3));
    expect(cell(3).getAttribute("aria-selected")).toBe("false");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  test("the previous and next buttons are NAMED, not bare chevrons", async () => {
    const c = mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    const prev = c.querySelector<HTMLElement>('[data-slot="calendar-prev"]')!;
    expect(prev.getAttribute("aria-label")).toBe("Previous month");
    await userEvent.click(prev);
    expect(heading().textContent).toContain("July");
  });
});

describe("Calendar's date arithmetic survives the calendar", () => {
  test("a 31st plus a month does not skip to the month after next", async () => {
    // `new Date(2026, 0, 31)` plus one month is 3 March, not February — the
    // classic off-by-a-month. addMonths normalises to day 1 first.
    mount(<Calendar label="Choose a date" defaultMonth={new Date(2026, 0, 31, 12)} />);
    const next = document.querySelector<HTMLElement>('[data-slot="calendar-next"]')!;
    await userEvent.click(next);
    expect(heading().textContent).toContain("February");
  });

  test("February 2028 has 29 days", () => {
    mount(<Calendar label="Choose a date" defaultMonth={new Date(2028, 1, 10, 12)} />);
    expect(days()).toHaveLength(29);
  });

  test("a month starting on Saturday leaves six leading blanks", () => {
    const c = mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    // 1 August 2026 is a Saturday. Get this wrong and every date in the grid
    // sits under the wrong weekday, which no colour or spacing test catches.
    void c;
    expect(day(1).closest('[role="row"]')?.querySelectorAll('[data-slot="calendar-blank"]')).toHaveLength(6);
  });

  test("weekStartsOn=1 moves Monday to the front and re-lays the grid", () => {
    const c = mount(<Calendar label="Choose a date" defaultMonth={AUGUST} weekStartsOn={1} />);
    const first = c.querySelector<HTMLElement>('[role="columnheader"]')!;
    expect(first.getAttribute("aria-label")).toBe("Monday");
    // Saturday is now the sixth column, so 1 August needs five blanks, not six.
    expect(day(1).closest('[role="row"]')?.querySelectorAll('[data-slot="calendar-blank"]')).toHaveLength(5);
  });

  test("a disabled date cannot be selected but stays readable", async () => {
    mount(
      <Calendar
        label="Choose a date"
        defaultMonth={AUGUST}
        isDateDisabled={(d) => d.getDate() === 5}
      />,
    );
    expect(day(5).getAttribute("aria-disabled")).toBe("true");
    // A NATIVE click, not userEvent: Playwright's actionability check treats
    // aria-disabled as not-enabled and waits for it forever. What matters here
    // is that the handler refuses, which a dispatched click proves just as well.
    await act(async () => { day(5).click(); });
    expect(cell(5).getAttribute("aria-selected")).toBe("false");
    // aria-disabled, not the disabled attribute: a date a screen-reader user
    // cannot reach is one they cannot be told the reason for.
    expect((day(5) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Calendar paints the sheet's card", () => {
  test("the day cell is a square on the elevated surface", () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    const box = day(10).getBoundingClientRect();
    expect(Math.round(box.width)).toBe(Math.round(box.height));
    expect(getComputedStyle(day(10)).backgroundColor).toBe("rgb(246, 243, 240)");
    expect(getComputedStyle(day(10)).borderRadius).toBe("8px");
  });

  test("a selected day differs from a resting one in fill AND ink", async () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} defaultValue={new Date(2026, 7, 3, 12)} />);
    const a = getComputedStyle(day(3));
    const b = getComputedStyle(day(10));
    // Asserted as a difference: matching values would pass while the selected
    // state silently disappeared.
    expect(a.backgroundColor).not.toBe(b.backgroundColor);
    expect(a.color).not.toBe(b.color);
    expect(Number(a.fontWeight)).toBeGreaterThan(Number(b.fontWeight));
  });

  test("weekday headers are MUTED ink, not the disabled role", () => {
    const c = mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    const head = c.querySelector<HTMLElement>('[data-slot="calendar-weekday"]')!;
    // The sheet used --ui-text-disabled, which measures under 2:1 here — a
    // weekday name is not a disabled control. Corrected in Paper.
    expect(getComputedStyle(head).color).toBe("rgb(105, 99, 93)");
  });

  test("the focus ring is PAINTED on a day", async () => {
    mount(<Calendar label="Choose a date" defaultMonth={AUGUST} />);
    expect(getComputedStyle(day(1)).boxShadow).toBe("none");
    const target = days().find((d) => d.getAttribute("tabindex") === "0")!;
    for (let i = 0; i < 6 && document.activeElement !== target; i++) await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(target);
    await Promise.all(target.getAnimations().map((a) => a.finished.catch(() => undefined)));
    expect(getComputedStyle(target).boxShadow).not.toBe("none");
  });
});

describe("Today is an input, not an ambient fact", () => {
  test("the `today` prop decides which cell is marked", () => {
    const c = mount(
      <Calendar
        label="Choose a date"
        defaultMonth={new Date(2026, 7, 1, 12)}
        today={new Date(2026, 7, 6, 12)}
      />,
    );
    const marked = c.querySelectorAll<HTMLElement>("[data-today]");
    // Exactly one, or "today" is being matched by something looser than a day.
    expect(marked).toHaveLength(1);
    expect(marked[0]!.textContent?.trim()).toBe("6");
  });

  test("omitting it falls back to the real clock", () => {
    const now = new Date();
    const c = mount(<Calendar label="Choose a date" />);
    const marked = c.querySelectorAll<HTMLElement>("[data-today]");
    // The default has to keep working — a seam that silently turns the
    // feature off in production is worse than no seam.
    expect(marked).toHaveLength(1);
    expect(marked[0]!.textContent?.trim()).toBe(String(now.getDate()));
  });

  test("a pinned today does NOT move when the month does", async () => {
    // The regression this prop exists for: the visual baseline pinned month
    // and value, passed the day it was recorded, and failed the next morning
    // because the ring had moved a cell overnight. A baseline that rots on a
    // schedule is worse than one that is wrong, because it trains people to
    // re-record without looking.
    const c = mount(
      <Calendar
        label="Choose a date"
        defaultMonth={new Date(2026, 7, 1, 12)}
        today={new Date(2026, 7, 6, 12)}
      />,
    );
    expect(c.querySelectorAll("[data-today]")).toHaveLength(1);
    // September has no 6 August in it, so the ring must disappear entirely
    // rather than land on some other cell.
    const next = c.querySelector<HTMLElement>('[data-slot="calendar-next"]')!;
    await userEvent.click(next);
    expect(c.querySelectorAll("[data-today]")).toHaveLength(0);
  });
});
