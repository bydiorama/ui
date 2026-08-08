import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";
import { InfoCircle } from "griddy-icons";

import { Accordion } from "./accordion.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container!;
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const triggers = () => [...document.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]')];
const panels = () => [...document.querySelectorAll<HTMLElement>('[data-slot="accordion-panel"]')];

function Basic(props: Partial<Parameters<typeof Accordion>[0]> = {}) {
  return (
    <Accordion {...props}>
      {["one", "two", "three"].map((value) => (
        <Accordion.Item key={value} value={value}>
          <Accordion.Trigger icon={<InfoCircle />}>{`Question ${value}`}</Accordion.Trigger>
          <Accordion.Panel>{`Answer ${value}`}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

/** Wait out the height transition before reading a computed value. */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

describe("Accordion structure matches the sheet's anatomy", () => {
  test("every part the sheet names exists in the DOM", () => {
    const c = mount(<Basic defaultValue={["one"]} />);
    for (const slot of [
      "accordion",
      "accordion-item",
      "accordion-header",
      "accordion-trigger",
      "accordion-label",
      "accordion-indicator",
      "accordion-panel",
      "accordion-panel-inner",
    ]) {
      expect(c.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }
  });

  test("the trigger is a real button INSIDE a heading, not a styled div", () => {
    const c = mount(<Basic />);
    const header = c.querySelector('[data-slot="accordion-header"]')!;
    const trigger = c.querySelector('[data-slot="accordion-trigger"]')!;

    // An accordion whose headers are not headings is a stack of buttons: a
    // screen-reader user loses the ability to navigate the list by heading.
    expect(header.tagName).toBe("H3");
    expect(trigger.tagName).toBe("BUTTON");
    expect(header.contains(trigger)).toBe(true);
  });

  test("headingLevel changes the element, and is not guessed", () => {
    mount(<Basic headingLevel={2} />);
    expect(document.querySelector('[data-slot="accordion-header"]')!.tagName).toBe("H2");
    unmount();

    mount(<Basic headingLevel={5} />);
    expect(document.querySelector('[data-slot="accordion-header"]')!.tagName).toBe("H5");
  });
});

describe("Accordion ARIA and keyboard", () => {
  test("the trigger owns the panel and reports its own state", async () => {
    const c = mount(<Basic />);
    const [first] = triggers();

    expect(first!.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(first!);
    expect(first!.getAttribute("aria-expanded")).toBe("true");

    const controlled = first!.getAttribute("aria-controls");
    expect(controlled).toBeTruthy();
    const panel = c.querySelector(`#${CSS.escape(controlled!)}`);
    expect(panel).not.toBeNull();
    // The panel points back at the trigger, which is what makes the pair
    // navigable in both directions.
    expect(panel!.getAttribute("aria-labelledby")).toBe(first!.id);
  });

  /**
   * Tab, not arrows — and that is worth an assertion rather than an omission.
   *
   * The first version of this file asserted arrow-key navigation between
   * headers and used it as the reason to build on the behaviour layer at all.
   * It failed: `loopFocus` is accepted as a prop but the accordion has no key
   * handler, confirmed in the source and then here. Arrow keys are OPTIONAL
   * in the APG accordion pattern, so Tab-only conforms — but the claim had to
   * go, and this pins what actually happens so the next person does not
   * rediscover it as a bug.
   */
  test("Tab walks the triggers; arrows deliberately do nothing", async () => {
    mount(<Basic />);
    const [a, b] = triggers();

    a!.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(a);

    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(b);
  });

  test("Enter and Space both toggle, because it is a real button", async () => {
    mount(<Basic />);
    const [first] = triggers();
    first!.focus();

    await userEvent.keyboard("{Enter}");
    expect(first!.getAttribute("aria-expanded")).toBe("true");
    await userEvent.keyboard(" ");
    expect(first!.getAttribute("aria-expanded")).toBe("false");
  });

  /**
   * ARIA-disabled, not the native attribute — and the difference is not
   * cosmetic. The behaviour layer keeps the trigger FOCUSABLE so assistive
   * tech can still reach it and hear that it is unavailable, which means
   * `disabled:` and `enabled:` variants match nothing. Both were used here
   * first and were dead classes.
   */
  test("isDisabled marks the trigger unavailable without hiding it", async () => {
    const c = mount(<Basic isDisabled />);
    const [first] = triggers();

    expect(first!.getAttribute("aria-disabled")).toBe("true");
    expect(first!.hasAttribute("disabled")).toBe(false);
    // Still reachable: a control that vanishes from the tab order cannot
    // explain itself.
    expect(first!.tabIndex).toBe(0);
    expect(getComputedStyle(first!).cursor).toBe("not-allowed");

    // Playwright refuses to click an aria-disabled element, and it is right
    // to — dispatch natively, because what is being proved is that the
    // handler refuses.
    act(() => {
      first!.click();
    });
    expect(first!.getAttribute("aria-expanded")).toBe("false");
    expect(c.querySelector('[data-slot="accordion-panel"]')).toBeNull();
  });
});

describe("Accordion open behaviour", () => {
  test("single by default — opening one closes the other", async () => {
    mount(<Basic />);
    const [a, b] = triggers();

    await userEvent.click(a!);
    expect(a!.getAttribute("aria-expanded")).toBe("true");
    await userEvent.click(b!);
    // The sheet draws exactly one panel open, and the behaviour layer
    // defaults this way too — asserted rather than assumed.
    expect(a!.getAttribute("aria-expanded")).toBe("false");
    expect(b!.getAttribute("aria-expanded")).toBe("true");
  });

  test("isMultiple keeps both open", async () => {
    mount(<Basic isMultiple />);
    const [a, b] = triggers();

    await userEvent.click(a!);
    await userEvent.click(b!);
    expect(a!.getAttribute("aria-expanded")).toBe("true");
    expect(b!.getAttribute("aria-expanded")).toBe("true");
  });

  test("onValueChange reports the open SET and nothing from the behaviour layer", async () => {
    const onValueChange = vi.fn();
    mount(<Basic onValueChange={onValueChange} />);

    await userEvent.click(triggers()[1]!);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    // Exactly one argument, and it is a plain array. Forwarding the callback
    // whole would hand consumers a Base UI event object as public API.
    expect(onValueChange.mock.calls[0]).toHaveLength(1);
    expect(onValueChange.mock.calls[0]![0]).toEqual(["two"]);
  });

  test("controlled value wins over interaction", async () => {
    mount(<Basic value={["one"]} />);
    const [a, b] = triggers();
    expect(a!.getAttribute("aria-expanded")).toBe("true");

    await userEvent.click(b!);
    // No onValueChange handler, so nothing moves — the prop is the state.
    expect(b!.getAttribute("aria-expanded")).toBe("false");
    expect(a!.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("Accordion paints the designed surface", () => {
  test("the panel animates its HEIGHT from the measurement, not a constant", async () => {
    mount(<Basic />);
    const [first] = triggers();
    await userEvent.click(first!);

    const panel = panels()[0]!;
    await settled(panel);
    const inner = panel.querySelector<HTMLElement>('[data-slot="accordion-panel-inner"]')!;

    // A constant cap would fit the test viewport and pass a "is it visible"
    // assertion. What distinguishes a MEASURED height is that it equals the
    // content — change the content and the number has to follow.
    expect(parseFloat(getComputedStyle(panel).height)).toBeCloseTo(inner.offsetHeight, 0);
    expect(inner.offsetHeight).toBeGreaterThan(0);
    // It clips, which is what makes a height transition possible at all.
    expect(getComputedStyle(panel).overflow).toBe("hidden");
  });

  test("the height transition RUNS — the declaration alone proves nothing", async () => {
    mount(<Basic />);
    // A closed panel is not mounted at all, so there is nothing to measure
    // until the click — which is also why this reads the animation straight
    // after opening, before `settled` ends it.
    expect(panels()).toHaveLength(0);

    await userEvent.click(triggers()[0]!);
    // transitionProperty reads identically whether or not anything animates.
    expect(panels()[0]!.getAnimations().length).toBeGreaterThan(0);
  });

  test("the chevron rotates, and `rotate` is what is transitioned", async () => {
    mount(<Basic />);
    const indicator = document.querySelector('[data-slot="accordion-indicator"]') as HTMLElement;
    const before = getComputedStyle(indicator).rotate;

    await userEvent.click(triggers()[0]!);
    await settled(indicator);
    expect(getComputedStyle(indicator).rotate).not.toBe(before);
    // v4 writes the standalone property, so a transition naming `transform`
    // would cover nothing and the chevron would snap.
    expect(getComputedStyle(indicator).transitionProperty).toContain("rotate");
  });

  test("the icon slot is sized by the COMPONENT at the sheet's 16px", () => {
    const c = mount(<Basic />);
    const svg = c.querySelector('[data-slot="accordion-trigger"] svg') as SVGElement;
    // griddy renders width/height="24" as attributes; an unsized slot ships
    // that. One CSS class beats a presentation attribute.
    expect(getComputedStyle(svg).width).toBe("16px");
    expect(getComputedStyle(svg).height).toBe("16px");
  });

  test("the card variant fills the ITEM and the plain one does not", () => {
    mount(<Basic variant="plain" />);
    const plain = getComputedStyle(document.querySelector('[data-slot="accordion-item"]')!);
    const plainFill = plain.backgroundColor;
    const plainRadius = plain.borderRadius;
    unmount();

    mount(<Basic variant="card" />);
    const card = getComputedStyle(document.querySelector('[data-slot="accordion-item"]')!);
    // Assert they DIFFER, not merely that each is internally consistent —
    // two variants that render identically is the Badge failure.
    expect(card.backgroundColor).not.toBe(plainFill);
    expect(card.borderRadius).not.toBe(plainRadius);
    expect(card.backgroundColor).toBe("rgb(246, 243, 240)");
    expect(card.borderRadius).toBe("8px");
  });

  test("the trigger's label is the sheet's 13px bold, clamped to one line", () => {
    const c = mount(<Basic />);
    const trigger = c.querySelector('[data-slot="accordion-trigger"]') as HTMLElement;
    const label = c.querySelector('[data-slot="accordion-label"]') as HTMLElement;
    const style = getComputedStyle(trigger);

    expect(style.fontSize).toBe("13px");
    expect(style.fontWeight).toBe("600");
    expect(getComputedStyle(label).webkitLineClamp).toBe("1");
  });
});

describe("Accordion focus indicator is painted, not just declared", () => {
  test("keyboard focus draws a real outline", async () => {
    mount(<Basic />);
    const [first] = triggers();

    await userEvent.keyboard("{Tab}");
    // Walk to the trigger rather than assuming it is Nth.
    while (document.activeElement !== first && document.activeElement !== document.body) {
      await userEvent.keyboard("{Tab}");
    }
    expect(document.activeElement).toBe(first);

    const style = getComputedStyle(first!);
    // `outline-none` on an element that owns its ring poisons the style and
    // the ring draws in `none`. That has shipped here before.
    expect(style.outlineStyle).toBe("solid");
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  });
});
