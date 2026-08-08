import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { DatePicker } from "./date-picker.tsx";
import { Select } from "@/ui/select/select.tsx";

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

/** Fixed dates. Anything that reads the clock is a test that fails overnight. */
const AUGUST = new Date(2026, 7, 1, 12);
const THIRD = new Date(2026, 7, 3, 12);
const TODAY = new Date(2026, 7, 2, 12);

const trigger = () => document.querySelector<HTMLButtonElement>('[data-slot="date-picker-trigger"]')!;
const panel = () => document.querySelector<HTMLElement>('[data-slot="date-picker-panel"]');
const value = () => document.querySelector<HTMLElement>('[data-slot="date-picker-value"]')!;
const days = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="calendar-day"]'));
const day = (n: number) => days().find((d) => d.textContent === String(n))!;

/** A computed read taken mid-transition returns the value it is coming FROM. */
async function settled(el: Element) {
  // Wait for the transition to EXIST before waiting for it to finish.
  //
  // Base UI suppresses transitions for exactly one frame after a surface
  // opens — it writes `style="transition: none"` inline so the panel cannot
  // animate from a stale position — and an inline style beats every class.
  // So `getAnimations()` sampled on that frame returns [], this helper
  // resolves instantly, and the caller reads geometry or computed style in
  // the MIDDLE of the transition it thought it had awaited.
  //
  // That was not theoretical: Select's "opens BELOW the trigger" and "the
  // enter transition ACTUALLY runs on scale" both flaked on main, one or the
  // other on nearly every run, and this is the single cause of both. A panel
  // read while `scale-98` is still applied is 2% smaller and sits 2px lower,
  // which is exactly the 10.35-versus-8 the offset assertion kept reporting.
  for (let i = 0; i < 3 && el.getAnimations().length === 0; i++) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }
  // Then DRAIN, rather than awaiting one batch. Waiting for a transition to
  // appear can itself let a second one start — Switch's track begins moving
  // between two accent fills during those frames — and a single
  // `Promise.all` returns while that one is still mid-flight, which reads as
  // an interpolated colour that matches no token at all.
  for (let i = 0; i < 5; i++) {
    const running = el.getAnimations();
    if (running.length === 0) break;
    await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
  }
}

/** Any CSS colour, as the browser's own `rgb(...)`, so two can be compared. */
function colourOf(value: string): string {
  const probe = document.createElement("div");
  probe.style.color = value;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

describe("DatePicker is a labelled field that opens a Calendar", () => {
  test("the label names the trigger — a placeholder never does", () => {
    const c = mount(<DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} />);
    const labelled = c.querySelector<HTMLElement>(`#${CSS.escape(trigger().getAttribute("aria-labelledby")!)}`)!;
    expect(labelled.textContent).toBe("Deadline");
    expect(value().textContent).toBe("Pick a date");
  });

  test("isLabelHidden hides the label without removing it", () => {
    const c = mount(<DatePicker label="Deadline" isLabelHidden defaultMonth={AUGUST} today={TODAY} />);
    const label = c.querySelector<HTMLElement>('[data-slot="date-picker-label"]')!;
    expect(label.textContent).toBe("Deadline");
    // sr-only, never display:none — the accessible name still has to exist.
    const style = getComputedStyle(label);
    expect(style.display).not.toBe("none");
    expect(style.position).toBe("absolute");
    expect(style.clipPath).toBe("inset(50%)");
    // 1px, not 16: `sr-only` and `px-sm` are alternatives here rather than
    // layers, because a later px-sm puts back the padding sr-only removes.
    expect(style.width).toBe("1px");
    expect(style.height).toBe("1px");
  });

  test("the trigger is a disclosure, and the panel only exists while open", async () => {
    mount(<DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} />);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(panel()).toBeNull();
    await userEvent.click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(panel()).not.toBeNull();
    expect(days()).toHaveLength(31);
  });

  test("a chosen date is FORMATTED, not stringified", () => {
    mount(<DatePicker label="Deadline" defaultValue={THIRD} defaultMonth={AUGUST} today={TODAY} />);
    // Intl at dateStyle "long" — locale-dependent, so assert the parts rather
    // than a string this suite would have to re-pin per runner locale.
    expect(value().textContent).toContain("2026");
    expect(value().textContent).toMatch(/August|august|8/);
    expect(value().textContent).not.toContain("GMT");
  });

  test("formatValue replaces the default entirely", () => {
    mount(
      <DatePicker
        label="Deadline"
        defaultValue={THIRD}
        defaultMonth={AUGUST}
        today={TODAY}
        formatValue={(date) => `${date.getFullYear()}-08-03`}
      />,
    );
    expect(value().textContent).toBe("2026-08-03");
  });
});

describe("The field is Input's control, not a fourth variant of it", () => {
  test("its geometry matches a live Select trigger, measured rather than pinned", () => {
    const c = mount(
      <div>
        <DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} />
        <Select label="Services" items={[{ value: "a", label: "A" }]} />
      </div>,
    );
    const field = getComputedStyle(trigger());
    const select = getComputedStyle(c.querySelector<HTMLElement>('[data-slot="select-trigger"]')!);
    // Asserting `48px` on each would pass while the two drifted apart, which
    // is the only failure that matters — a field is a field.
    for (const property of ["height", "borderRadius", "borderTopWidth", "borderTopColor", "backgroundColor", "paddingLeft", "fontSize"] as const) {
      expect(`${property}: ${field[property]}`).toBe(`${property}: ${select[property]}`);
    }
  });

  test("the placeholder is a quieter ink than a chosen value", () => {
    const c = mount(
      <div>
        <DatePicker label="Empty" defaultMonth={AUGUST} today={TODAY} />
        <DatePicker label="Chosen" defaultValue={THIRD} defaultMonth={AUGUST} today={TODAY} />
      </div>,
    );
    const [empty, chosen] = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="date-picker-value"]'));
    expect(getComputedStyle(empty!.firstElementChild!).color).not.toBe(getComputedStyle(chosen!).color);
  });

  test("the pointer affordance is explicit, both ways", async () => {
    const c = mount(
      <div>
        <DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} />
        <DatePicker label="Off" defaultMonth={AUGUST} today={TODAY} isDisabled />
      </div>,
    );
    const [enabled, disabled] = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="date-picker-trigger"]'));
    // No browser gives a button a pointer cursor, and no reset here adds one.
    expect(getComputedStyle(enabled!).cursor).toBe("pointer");
    expect(getComputedStyle(disabled!).cursor).toBe("not-allowed");
    // The ATTRIBUTE, never pointer-events:none — a disabled control still has
    // to be hoverable for the tooltip that explains it.
    expect((disabled as HTMLButtonElement).disabled).toBe(true);
    expect(getComputedStyle(disabled!).pointerEvents).not.toBe("none");
  });

  test("the focus ring is PAINTED, not merely declared", async () => {
    mount(<DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} />);
    expect(getComputedStyle(trigger()).boxShadow).toBe("none");
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(trigger());
    // A read taken before the transition finishes returns the value it is
    // coming from, which is exactly "no ring".
    await settled(trigger());
    expect(getComputedStyle(trigger()).boxShadow).not.toBe("none");
  });

  test("errorText marks the field invalid and is described alongside the helper", () => {
    const c = mount(
      <DatePicker
        label="Deadline"
        defaultMonth={AUGUST}
        today={TODAY}
        helperText="You can change this later."
        errorText="A deadline is required."
      />,
    );
    expect(trigger().getAttribute("aria-invalid")).toBe("true");
    const described = trigger().getAttribute("aria-describedby")!.split(" ");
    expect(described).toHaveLength(2);
    // Both, and the error FIRST: an error rarely makes the guidance
    // irrelevant, and dropping it mid-correction is when it is needed most.
    expect(c.querySelector(`#${CSS.escape(described[0]!)}`)!.textContent).toBe("A deadline is required.");
    expect(c.querySelector(`#${CSS.escape(described[1]!)}`)!.textContent).toBe("You can change this later.");
  });

  test("an invalid field's edge differs from a resting one", () => {
    const c = mount(
      <div>
        <DatePicker label="Fine" defaultMonth={AUGUST} today={TODAY} />
        <DatePicker label="Broken" defaultMonth={AUGUST} today={TODAY} errorText="Required" />
      </div>,
    );
    const [fine, broken] = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="date-picker-trigger"]'));
    // Colour is not the only channel — the message is the other — but an
    // error state whose border is identical to default is a real defect, and
    // it is the one Input shipped first.
    expect(getComputedStyle(fine!).borderTopColor).not.toBe(getComputedStyle(broken!).borderTopColor);
  });
});

describe("Choosing, clearing and dismissing", () => {
  test("choosing a date fills the field and CLOSES the panel", async () => {
    const onValueChange = vi.fn();
    mount(
      <DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} onValueChange={onValueChange} />,
    );
    await userEvent.click(trigger());
    await userEvent.click(day(3));
    expect(onValueChange.mock.calls[0]![0]).toBeInstanceOf(Date);
    expect(value().textContent).toContain("2026");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    await expect.poll(() => document.activeElement).toBe(trigger());
  });

  test("CLEARING deliberately leaves the panel open", async () => {
    mount(<DatePicker label="Deadline" defaultValue={THIRD} defaultMonth={AUGUST} today={TODAY} />);
    await userEvent.click(trigger());
    // Clicking the selected day again empties the field, and the next thing
    // that user wants is another date — closing under them would make them
    // reopen the panel to finish one action.
    await userEvent.click(day(3));
    expect(value().textContent).toBe("Pick a date");
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  test("opening lands on the DAY, not on the previous-month arrow", async () => {
    mount(<DatePicker label="Deadline" defaultValue={THIRD} defaultMonth={AUGUST} today={TODAY} />);
    await userEvent.click(trigger());
    // Base UI's default initial focus is the first focusable descendant,
    // which is the previous-month chrome control — three Tabs from the thing
    // a date field exists to choose.
    await expect.poll(() => document.activeElement?.getAttribute("data-slot")).toBe("calendar-day");
    expect(document.activeElement?.textContent).toBe("3");
  });

  test("Escape closes and gives focus back to the trigger", async () => {
    mount(<DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} />);
    await userEvent.click(trigger());
    await userEvent.keyboard("{Escape}");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    // Polled: Base UI restores focus after the exit transition, so a bare
    // read here is a race that passes alone and fails in a full run.
    await expect.poll(() => document.activeElement).toBe(trigger());
  });

  test("onOpenChange fires for every route in and out", async () => {
    const onOpenChange = vi.fn();
    mount(
      <DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  test("a controlled open state is the caller's alone", async () => {
    function Controlled() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} isOpen={isOpen} />
          <button type="button" data-testid="external" onClick={() => setIsOpen(true)}>open</button>
        </>
      );
    }
    const c = mount(<Controlled />);
    await userEvent.click(trigger());
    // The component must not open itself when the caller holds the state.
    expect(panel()).toBeNull();
    await userEvent.click(c.querySelector<HTMLElement>('[data-testid="external"]')!);
    expect(panel()).not.toBeNull();
  });

  test("a disabled field does not open", async () => {
    mount(<DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} isDisabled />);
    // Dispatched rather than driven: Playwright's actionability check waits
    // forever on a control it considers not-enabled, and what is being proved
    // is that the handler refuses.
    await act(async () => { trigger().click(); });
    expect(panel()).toBeNull();
  });
});

describe("The panel never renders outside the viewport (§7c)", () => {
  test("its cap is the positioner's MEASUREMENT, not a constant", async () => {
    mount(<DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} />);
    await userEvent.click(trigger());
    const positioner = panel()!.parentElement!;
    const read = (name: string) =>
      Number.parseFloat(getComputedStyle(positioner).getPropertyValue(name));
    // A fixed `max-h-64` fits an 896px test viewport perfectly well, so the
    // obvious assertion — "the panel is on screen" — passes against the bug.
    // What distinguishes the two is where the number COMES FROM.
    expect(read("--available-height")).toBeGreaterThan(0);
    expect(Number.parseFloat(getComputedStyle(panel()!).maxHeight)).toBeCloseTo(read("--available-height"), 0);
    expect(Number.parseFloat(getComputedStyle(panel()!).maxWidth)).toBeCloseTo(read("--available-width"), 0);
  });

  test("the panel is the Calendar card — one boundary, not two", async () => {
    mount(<DatePicker label="Deadline" defaultMonth={AUGUST} today={TODAY} />);
    await userEvent.click(trigger());
    const shell = getComputedStyle(panel()!);
    // No fill and no edge of its own: wrapping one surface in another would
    // draw two boundaries where the sheet draws one.
    expect(shell.borderTopWidth).toBe("0px");
    expect(shell.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    const card = panel()!.querySelector<HTMLElement>('[data-slot="calendar"]')!;
    expect(getComputedStyle(card).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });
});

describe("A portalled panel needs the theme brought to it", () => {
  const BRAND: ThemeSeed = {
    colors: {
      bg: "#fffdf5", surface: "#ffffff", muted: "#f4ecd8",
      textPrimary: "#1a1400", textMuted: "#6b5d3f",
      border: "rgba(26, 20, 0, 0.12)", accent: "#ffe066",
    },
  };

  function Themed({ withContainer }: { withContainer: boolean }) {
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    // Pinned to light: `toStyleObject` defaults to `light-dark()`, which would
    // make this assertion depend on the runner's colour scheme.
    const brand = toStyleObject(resolveThemePair(BRAND), "light");
    return (
      <div ref={setHost} style={brand as React.CSSProperties}>
        <DatePicker
          label="Deadline"
          defaultIsOpen
          defaultMonth={AUGUST}
          today={TODAY}
          {...(withContainer ? { container: host } : {})}
        />
      </div>
    );
  }

  test("without a container it paints theme zero; with one it inherits the brand", async () => {
    mount(<Themed withContainer={false} />);
    const escaped = getComputedStyle(panel()!.querySelector('[data-slot="calendar"]')!).backgroundColor;
    act(() => root?.unmount());
    container?.remove();

    mount(<Themed withContainer />);
    const inherited = getComputedStyle(panel()!.querySelector('[data-slot="calendar"]')!).backgroundColor;

    // Both halves asserted: a `container` prop that changed nothing would pass
    // a test that only looked at the second.
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), "light");
    expect(escaped, "escaping the scope should paint theme zero's surface").toBe(
      colourOf(zero["--ui-bg-surface"]!),
    );
    expect(inherited).not.toBe(escaped);
  });
});
