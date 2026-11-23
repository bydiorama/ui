import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { ColorPicker, normalizeHex, parseHex, type ColorSwatch } from "./color-picker.tsx";
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

const SWATCHES: readonly ColorSwatch[] = [
  { value: "#FFFFFF", label: "White" },
  { value: "#1B6C84", label: "Brand blue" },
  { value: "#CD7F48", label: "Copper" },
  { value: "#1D1B19", label: "Ink" },
];

const $ = <T extends Element = HTMLElement>(slot: string) => document.querySelector<T>(`[data-slot="${slot}"]`);
const trigger = () => $<HTMLButtonElement>("color-picker-trigger")!;
const panel = () => $("color-picker-panel");
const area = () => $("color-picker-area")!;
const hue = () => document.querySelector<HTMLInputElement>('[data-slot="color-picker-hue"] input[type="range"]')!;
const alpha = () => document.querySelector<HTMLInputElement>('[data-slot="color-picker-alpha"] input[type="range"]')!;
const hex = () => document.querySelector<HTMLInputElement>('[data-slot="color-picker-fields"] input')!;
const radios = () => Array.from(document.querySelectorAll<HTMLInputElement>('[data-slot="color-picker-swatch"] input'));
const swatch = (i: number) => document.querySelectorAll<HTMLElement>('[data-slot="color-picker-swatch"]')[i]!;

/** See the fuller note in date-picker.browser.test.tsx. */
async function settled(el: Element) {
  for (let i = 0; i < 3 && el.getAnimations().length === 0; i++) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }
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

const token = (name: string) => colourOf(`var(${name})`);

/**
 * A `defaultIsOpen` panel moves focus to its initial target AFTER mount, so a
 * `.focus()` issued before that lands is taken straight back. Wait for it.
 */
async function focusSettled(target: () => Element = area) {
  await expect.poll(() => document.activeElement).toBe(target());
}

describe("Hex parsing is the value contract", () => {
  test("every accepted spelling normalises to upper-case six or eight digits", () => {
    expect(normalizeHex("1b6c84", false)).toBe("#1B6C84");
    expect(normalizeHex("#abc", false)).toBe("#AABBCC");
    expect(normalizeHex("#1B6C8480", true)).toBe("#1B6C8480");
    expect(normalizeHex("#1B6C84", true)).toBe("#1B6C84FF");
    expect(normalizeHex("#12345", false)).toBeNull();
    expect(normalizeHex("blue", false)).toBeNull();
    expect(parseHex("#00000080")?.a).toBeCloseTo(0.5, 2);
  });
});

describe("ColorPicker is a labelled field", () => {
  test("the label and the value name the trigger; a placeholder never does", () => {
    mount(<ColorPicker label="Accent colour" defaultValue="#1b6c84" />);
    const ids = trigger().getAttribute("aria-labelledby")!.split(" ");
    const name = ids.map((id) => document.getElementById(id)!.textContent).join(" ");
    expect(name).toBe("Accent colour #1B6C84");
  });

  test("an empty field shows the placeholder and a sunken chip", () => {
    mount(<ColorPicker label="Accent colour" />);
    expect($("color-picker-value")!.textContent).toBe("Pick a colour");
    // 400, not the value's 500 — `font-normal` emitted nothing here once.
    expect(getComputedStyle($("color-picker-value")!.firstElementChild!).fontWeight).toBe("400");
    expect(getComputedStyle($("color-picker-chip")!).backgroundColor).toBe(token("--ui-bg-sunken"));
  });

  test("the field is Select's control at every size, measured rather than pinned", () => {
    for (const size of ["lg", "md", "sm"] as const) {
      const c = mount(
        <div>
          <ColorPicker label="Accent" size={size} defaultValue="#1B6C84" />
          <Select label="Services" size={size} items={[{ value: "a", label: "A" }]} />
        </div>,
      );
      const field = getComputedStyle(trigger());
      const select = getComputedStyle(c.querySelector<HTMLElement>('[data-slot="select-trigger"]')!);
      for (const property of ["height", "borderRadius", "borderTopWidth", "borderTopColor", "backgroundColor", "paddingLeft", "fontSize"] as const) {
        expect(`${size} ${property}: ${field[property]}`).toBe(`${size} ${property}: ${select[property]}`);
      }
      act(() => root?.unmount());
      container?.remove();
    }
  });

  test("the three sizes DIFFER — compared to each other, not each to itself", () => {
    const c = mount(
      <div>
        <ColorPicker label="lg" size="lg" defaultValue="#1B6C84" />
        <ColorPicker label="md" size="md" defaultValue="#1B6C84" />
        <ColorPicker label="sm" size="sm" defaultValue="#1B6C84" />
      </div>,
    );
    const heights = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="color-picker-trigger"]')).map(
      (t) => t.getBoundingClientRect().height,
    );
    expect(heights).toEqual([48, 40, 32]);
    const chips = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="color-picker-chip"]')).map(
      (t) => t.getBoundingClientRect().width,
    );
    expect(chips).toEqual([20, 20, 16]);
  });

  test("the focus ring is PAINTED, not merely declared", async () => {
    mount(<ColorPicker label="Accent colour" defaultValue="#1B6C84" />);
    expect(getComputedStyle(trigger()).boxShadow).toBe("none");
    await userEvent.tab();
    expect(document.activeElement).toBe(trigger());
    await settled(trigger());
    expect(getComputedStyle(trigger()).boxShadow).toContain(token("--ui-border-focus"));
  });

  test("errorText marks it invalid with an edge, not only a message (SC 1.4.1)", () => {
    const c = mount(
      <div>
        <ColorPicker label="Fine" defaultValue="#1B6C84" />
        <ColorPicker label="Broken" defaultValue="#9EDBF3" errorText="Too light." helperText="Used for links." />
      </div>,
    );
    const [fine, broken] = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="color-picker-trigger"]'));
    expect(broken!.getAttribute("aria-invalid")).toBe("true");
    expect(getComputedStyle(broken!).borderTopColor).not.toBe(getComputedStyle(fine!).borderTopColor);
    const described = broken!.getAttribute("aria-describedby")!.split(" ").map((id) => document.getElementById(id)!.textContent);
    expect(described).toEqual(["Too light.", "Used for links."]);
  });

  test("a disabled field does not open, and still answers hover", async () => {
    mount(<ColorPicker label="Accent colour" defaultValue="#1B6C84" isDisabled />);
    expect(trigger().disabled).toBe(true);
    expect(getComputedStyle(trigger()).cursor).toBe("not-allowed");
    expect(getComputedStyle(trigger()).pointerEvents).not.toBe("none");
    act(() => trigger().click());
    expect(panel()).toBeNull();
  });
});

describe("The swatch variant is Button's icon-only box", () => {
  test("it is a real Button, named by the label and the value", () => {
    const c = mount(
      <div>
        <ColorPicker label="Fill" variant="swatch" size="md" defaultValue="#1B6C84" />
        <ColorPicker label="Stroke" variant="swatch" size="sm" defaultValue="#1B6C84" />
      </div>,
    );
    const [md, sm] = Array.from(c.querySelectorAll<HTMLElement>('[data-slot="color-picker-trigger"]'));
    expect(md!.tagName).toBe("BUTTON");
    expect(md!.getAttribute("aria-label")).toBe("Fill, #1B6C84");
    expect(md!.getBoundingClientRect().width).toBe(32);
    expect(sm!.getBoundingClientRect().width).toBe(24);
    // The visible label would duplicate the aria-label.
    expect(getComputedStyle(c.querySelector('[data-slot="color-picker-label"]')!).position).toBe("absolute");
  });
});

describe("Opening the editor", () => {
  test("lands on the area, and Escape gives focus back to the trigger", async () => {
    mount(<ColorPicker label="Accent colour" defaultValue="#1B6C84" />);
    await userEvent.click(trigger());
    await expect.poll(() => document.activeElement).toBe(area());
    expect(panel()!.getAttribute("aria-label")).toBe("Accent colour");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.activeElement).toBe(trigger());
    await expect.poll(() => panel()).toBeNull();
  });

  test("its cap is the positioner's MEASUREMENT, not a constant (§7c)", async () => {
    mount(<ColorPicker label="Accent colour" defaultValue="#1B6C84" />);
    await userEvent.click(trigger());
    const positioner = panel()!.parentElement!;
    const read = (name: string) => Number.parseFloat(getComputedStyle(positioner).getPropertyValue(name));
    expect(read("--available-height")).toBeGreaterThan(0);
    expect(Number.parseFloat(getComputedStyle(panel()!).maxHeight)).toBeCloseTo(read("--available-height"), 0);
  });

  test("the panel is Popover's surface, 320 wide", async () => {
    mount(<ColorPicker label="Accent colour" defaultIsOpen defaultValue="#1B6C84" />);
    await settled(panel()!);
    const style = getComputedStyle(panel()!);
    expect(panel()!.getBoundingClientRect().width).toBe(320);
    expect(style.backgroundColor).toBe(token("--ui-bg-elevated"));
    expect(style.borderTopColor).toBe(token("--ui-border-subtle"));
    expect(style.rowGap).toBe("12px");
  });
});

describe("The area is a two-axis slider", () => {
  test("arrows move saturation and brightness, announced together", async () => {
    const onValueChange = vi.fn();
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#FF0000" onValueChange={onValueChange} />);
    await focusSettled();
    expect(area().getAttribute("aria-valuetext")).toBe("Saturation 100%, brightness 100%");
    await userEvent.keyboard("{ArrowDown}");
    expect(area().getAttribute("aria-valuetext")).toBe("Saturation 100%, brightness 99%");
    await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(area().getAttribute("aria-valuetext")).toBe("Saturation 90%, brightness 99%");
    expect(onValueChange).toHaveBeenLastCalledWith("#FC1919");
  });

  test("Home and End reach the saturation extremes", async () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" />);
    await focusSettled();
    await userEvent.keyboard("{Home}");
    expect(area().getAttribute("aria-valuenow")).toBe("0");
    await userEvent.keyboard("{End}");
    expect(area().getAttribute("aria-valuenow")).toBe("100");
  });

  test("a press jumps the thumb there", async () => {
    const onValueChange = vi.fn();
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#FF0000" onValueChange={onValueChange} />);
    await settled(panel()!);
    const rect = area().getBoundingClientRect();
    // Half across, a quarter down: saturation 50, brightness 75. Not a corner —
    // the radius makes a corner pixel the PANEL's, which is the honest answer.
    await userEvent.click(area(), { position: { x: rect.width / 2, y: rect.height / 4 } });
    // The panel's content box: 320 − 2 × 16 padding − 2 × 1 border (sheet
    // corrected to fill, as the code does — a fixed 288 overflowed it).
    expect(rect.width).toBe(286);
    expect(onValueChange.mock.lastCall?.[0]).toMatch(/^#BF(5F|60)(5F|60)$/);
    expect(document.activeElement).toBe(area());
  });

  test("the ring is drawn on the THUMB, where the arrows act", async () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" />);
    await expect.poll(() => document.activeElement).toBe(area());
    // Opened by default, focus came programmatically — Tab out and back in
    // so :focus-visible matches the way a keyboard user meets it.
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    const thumb = $("color-picker-area-thumb")!;
    await settled(thumb);
    expect(getComputedStyle(thumb).boxShadow).toContain(token("--ui-border-focus"));
  });

  test("brightness 0 keeps the hue — black does not reset the ground to red", async () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" />);
    const before = hue().value;
    await focusSettled();
    for (let i = 0; i < 10; i++) await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(area().getAttribute("aria-valuetext")).toContain("brightness 0%");
    expect(hue().value).toBe(before);
    expect(getComputedStyle(area()).backgroundColor).not.toBe("rgb(255, 0, 0)");
  });
});

describe("The tracks are Base UI sliders with our paint", () => {
  test("hue is a named native range, stepping a degree", async () => {
    const onValueChange = vi.fn();
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#FF0000" onValueChange={onValueChange} />);
    expect(hue().getAttribute("aria-label")).toBe("Hue");
    expect(hue().getAttribute("aria-valuetext")).toBe("0°");
    await focusSettled();
    act(() => hue().focus());
    await userEvent.keyboard("{ArrowRight}");
    expect(hue().getAttribute("aria-valuetext")).toBe("1°");
    expect(onValueChange).toHaveBeenLastCalledWith("#FF0400");
  });

  test("the spectrum's stops sit on the thumb CENTRE's travel, not the track's width", async () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#FF0000" />);
    const track = hue().closest('[data-slot="color-picker-hue"]')!.querySelector<HTMLElement>("[style]")!;
    const image = getComputedStyle(track).backgroundImage;
    // The ends are 8px in — `calc(var(--ui-space-sm) + …)` — not at 0 / 100%.
    expect(image).toContain("rgb(255, 0, 0) calc(0% + 8px)");
    expect(image).toContain("rgb(255, 0, 0) calc(100% - 8px)");
  });

  test("hasAlpha adds an opacity track and two hex digits", async () => {
    const onValueChange = vi.fn();
    mount(<ColorPicker label="Accent" defaultIsOpen hasAlpha defaultValue="#1B6C84" onValueChange={onValueChange} />);
    expect(alpha().getAttribute("aria-label")).toBe("Opacity");
    expect(alpha().getAttribute("aria-valuetext")).toBe("100%");
    await focusSettled();
    act(() => alpha().focus());
    await userEvent.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith("#1B6C84FC");
  });

  test("the alpha track does not exist without hasAlpha", () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" />);
    expect($("color-picker-alpha")).toBeNull();
  });
});

describe("The hex field edits a draft", () => {
  test("Enter commits, normalised", async () => {
    const onValueChange = vi.fn();
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" onValueChange={onValueChange} />);
    await userEvent.clear(hex());
    await userEvent.type(hex(), "c84{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith("#CC8844");
    expect(hex().value).toBe("#CC8844");
  });

  test("unparseable text reverts on commit, and emits nothing", async () => {
    const onValueChange = vi.fn();
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" onValueChange={onValueChange} />);
    await userEvent.clear(hex());
    await userEvent.type(hex(), "nope{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(hex().value).toBe("#1B6C84");
  });

  test("the first Escape restores the text and keeps the panel open", async () => {
    mount(<ColorPicker label="Accent" defaultValue="#1B6C84" />);
    await userEvent.click(trigger());
    await userEvent.clear(hex());
    await userEvent.type(hex(), "12");
    await userEvent.keyboard("{Escape}");
    expect(hex().value).toBe("#1B6C84");
    expect(panel()).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => panel()).toBeNull();
  });

  test("it sits on the chrome ground — the panel is bg-elevated (ADR 0017)", () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" />);
    const control = hex().parentElement!;
    expect(getComputedStyle(control).backgroundColor).toBe(token("--ui-bg-field-chrome"));
  });
});

describe("Swatches are a native radio group", () => {
  test("the group is named, each swatch by its label, and the match is checked", () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1b6c84" swatches={SWATCHES} swatchesLabel="Brand palette" />);
    const group = document.querySelector<HTMLElement>('[role="radiogroup"]')!;
    expect(document.getElementById(group.getAttribute("aria-labelledby")!)!.textContent).toBe("Brand palette");
    expect(radios().map((r) => r.getAttribute("aria-label"))).toEqual(["White", "Brand blue", "Copper", "Ink"]);
    expect(radios().map((r) => r.checked)).toEqual([false, true, false, false]);
  });

  test("a press selects and emits; the panel stays open", async () => {
    const onValueChange = vi.fn();
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" swatches={SWATCHES} onValueChange={onValueChange} />);
    await userEvent.click(swatch(2));
    expect(onValueChange).toHaveBeenLastCalledWith("#CD7F48");
    expect(radios()[2]!.checked).toBe(true);
    expect(panel()).not.toBeNull();
  });

  test("arrows move AND select, so focus and selection are one swatch", async () => {
    const onValueChange = vi.fn();
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" swatches={SWATCHES} onValueChange={onValueChange} />);
    await focusSettled();
    act(() => radios()[1]!.focus());
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(radios()[2]);
    expect(radios()[2]!.checked).toBe(true);
    expect(onValueChange).toHaveBeenLastCalledWith("#CD7F48");
  });

  test("the resting edge is border-strong — the only boundary a white swatch has", () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" swatches={SWATCHES} />);
    // ring-inset draws as an inset box-shadow.
    expect(getComputedStyle(swatch(0)).boxShadow).toContain(`${token("--ui-border-strong")} 0px 0px 0px 1px inset`);
  });

  test("selected, focused and resting draw three DIFFERENT rings", async () => {
    mount(<ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" swatches={SWATCHES} />);
    await settled(swatch(1));
    const rest = getComputedStyle(swatch(0)).boxShadow;
    const checked = getComputedStyle(swatch(1)).boxShadow;
    expect(checked).toContain(token("--ui-text-primary"));
    await focusSettled();
    act(() => radios()[2]!.focus());
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");
    await settled(swatch(2));
    const focused = getComputedStyle(swatch(2)).boxShadow;
    expect(focused).toContain(token("--ui-border-focus"));
    expect(new Set([rest, checked, focused]).size).toBe(3);
  });

  test("palette only: no editor, and focus opens on the checked swatch", async () => {
    mount(<ColorPicker label="Tag" defaultValue="#CD7F48" swatches={SWATCHES} isPaletteOnly />);
    await userEvent.click(trigger());
    expect($("color-picker-area")).toBeNull();
    expect($("color-picker-hue")).toBeNull();
    expect($("color-picker-fields")).toBeNull();
    await expect.poll(() => document.activeElement).toBe(radios()[2]);
  });
});

describe("Controlled", () => {
  test("an outside change moves the controls; the picker's own emits are not echoed back", async () => {
    function Harness() {
      const [value, setValue] = useState<string | null>("#1B6C84");
      return (
        <>
          <button type="button" data-testid="reset" onClick={() => setValue("#CD7F48")}>reset</button>
          <ColorPicker label="Accent" defaultIsOpen value={value} onValueChange={setValue} />
        </>
      );
    }
    mount(<Harness />);
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="reset"]')!.click());
    expect(hex().value).toBe("#CD7F48");
    expect($("color-picker-value")!.textContent).toBe("#CD7F48");
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
    const brand = toStyleObject(resolveThemePair(BRAND), "light");
    return (
      <div ref={setHost} style={brand as React.CSSProperties}>
        <ColorPicker label="Accent" defaultIsOpen defaultValue="#1B6C84" {...(withContainer ? { container: host } : {})} />
      </div>
    );
  }

  test("without a container it paints theme zero; with one it inherits the brand", () => {
    mount(<Themed withContainer={false} />);
    const escaped = getComputedStyle(panel()!).borderTopColor;
    act(() => root?.unmount());
    container?.remove();

    mount(<Themed withContainer />);
    const inherited = getComputedStyle(panel()!).borderTopColor;

    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), "light");
    expect(escaped).toBe(colourOf(zero["--ui-border-subtle"]!));
    expect(inherited).not.toBe(escaped);
  });
});
