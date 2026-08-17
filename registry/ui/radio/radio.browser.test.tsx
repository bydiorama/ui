import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useRef } from "react";
import type { ReactElement } from "react";

import { Radio, RadioGroup } from "./radio.tsx";
import { Checkbox } from "../checkbox/checkbox.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

function mount(ui: ReactElement) {
  const el = render(ui);
  const fieldset = el.querySelector<HTMLFieldSetElement>('[data-slot="radio-group"]')!;
  const options = el.querySelector<HTMLElement>('[data-slot="radio-group-options"]')!;
  const inputs = [...el.querySelectorAll<HTMLInputElement>('[data-slot="input"]')];
  const controls = [...el.querySelectorAll<HTMLElement>('[data-slot="control"]')];
  const labels = [...el.querySelectorAll<HTMLLabelElement>('[data-slot="radio"]')];
  if (!fieldset || !options || !inputs.length) throw new Error("RadioGroup did not render its parts");
  return { el, fieldset, options, inputs, controls, labels };
}

/**
 * A computed style read at t=0 returns the PRE-transition value, so a working
 * focus ring reads as broken. Wait for the animations to finish first.
 */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

const THREE = (
  <RadioGroup label="Reviewer" defaultValue="tschichold">
    <Radio value="brockmann">Josef Müller-Brockmann</Radio>
    <Radio value="tschichold">Jan Tschichold</Radio>
    <Radio value="crouwel">Wim Crouwel</Radio>
  </RadioGroup>
);

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("the platform does the work", () => {
  test("renders a fieldset, a legend and real radio inputs", () => {
    const { fieldset, el, inputs } = mount(THREE);

    expect(fieldset.tagName).toBe("FIELDSET");
    expect(el.querySelector('[data-slot="radio-group-label"]')!.tagName).toBe("LEGEND");
    for (const input of inputs) {
      expect(input.tagName).toBe("INPUT");
      expect(input.type).toBe("radio");
      // sr-only clips it; it must NOT be display:none, or it leaves the tab order.
      expect(getComputedStyle(input).display).not.toBe("none");
    }
  });

  test("every option shares one generated name — that is what makes them a group", () => {
    const { inputs } = mount(THREE);
    const names = new Set(inputs.map((i) => i.name));

    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  test("two groups on one page get DIFFERENT generated names", () => {
    const el = render(
      <>
        <RadioGroup label="One">
          <Radio value="a">A</Radio>
        </RadioGroup>
        <RadioGroup label="Two">
          <Radio value="a">A</Radio>
        </RadioGroup>
      </>,
    );
    const [first, second] = [...el.querySelectorAll<HTMLInputElement>('[data-slot="input"]')];

    // Shared names would make these ONE set: arrow keys would jump between the
    // groups and choosing in one would clear the other.
    expect(first!.name).not.toBe(second!.name);
  });

  test("the set is one tab stop, entered at the selected option", async () => {
    const { inputs } = mount(THREE);

    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(inputs[1]);

    // Tab LEAVES the group rather than moving to the next option.
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).not.toBe(inputs[2]);
  });

  test("arrow keys move AND select, without a key handler of our own", async () => {
    const onValueChange = vi.fn();
    const el = render(
      <RadioGroup label="Reviewer" defaultValue="tschichold" onValueChange={onValueChange}>
        <Radio value="brockmann">Josef Müller-Brockmann</Radio>
        <Radio value="tschichold">Jan Tschichold</Radio>
        <Radio value="crouwel">Wim Crouwel</Radio>
      </RadioGroup>,
    );
    const inputs = [...el.querySelectorAll<HTMLInputElement>('[data-slot="input"]')];

    await userEvent.keyboard("{Tab}");
    await userEvent.keyboard("{ArrowDown}");

    expect(document.activeElement).toBe(inputs[2]);
    expect(inputs[2]!.checked).toBe(true);
    expect(onValueChange).toHaveBeenLastCalledWith("crouwel");
  });

  test("the label is part of the control — clicking the words selects", async () => {
    const onValueChange = vi.fn();
    const el = render(
      <RadioGroup label="Reviewer" onValueChange={onValueChange}>
        <Radio value="brockmann">Josef Müller-Brockmann</Radio>
        <Radio value="crouwel">Wim Crouwel</Radio>
      </RadioGroup>,
    );
    const text = el.querySelectorAll<HTMLElement>('[data-slot="label"]')[1]!;

    await userEvent.click(text);

    expect(onValueChange).toHaveBeenLastCalledWith("crouwel");
  });

  test("a <Radio> outside a group refuses to render rather than announcing nothing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      act(() => {
        const el = document.createElement("div");
        createRoot(el).render(<Radio value="a">Orphan</Radio>);
      }),
    ).toThrow(/RadioGroup/);
    error.mockRestore();
  });
});

describe("selection", () => {
  test("controlled: the caller's value wins and the component does not move on its own", async () => {
    const onValueChange = vi.fn();
    const { inputs } = mount(
      <RadioGroup label="Reviewer" value="brockmann" onValueChange={onValueChange}>
        <Radio value="brockmann">Josef Müller-Brockmann</Radio>
        <Radio value="crouwel">Wim Crouwel</Radio>
      </RadioGroup>,
    );

    await userEvent.click(inputs[1]!.closest("label")!);

    expect(onValueChange).toHaveBeenLastCalledWith("crouwel");
    // The parent refused to update, so nothing moved. A component that flipped
    // anyway is the bug useControllableState exists to prevent.
    expect(inputs[0]!.checked).toBe(true);
    expect(inputs[1]!.checked).toBe(false);
  });

  test("uncontrolled: it owns its own state", async () => {
    const { inputs } = mount(THREE);

    await userEvent.click(inputs[2]!.closest("label")!);

    expect(inputs[2]!.checked).toBe(true);
    expect(inputs[1]!.checked).toBe(false);
  });
});

describe("geometry, as the sheet lays it out", () => {
  test("the circle is 18px and the dot is 8px", () => {
    const { controls, el } = mount(THREE);
    const control = controls[1]!;

    expect(control.getBoundingClientRect().width).toBeCloseTo(18, 1);
    expect(control.getBoundingClientRect().height).toBeCloseTo(18, 1);
    // --ui-radius-full is 999px in this system, not Tailwind's 9999.
    expect(getComputedStyle(control).borderRadius).toBe("999px");

    const dot = el.querySelector<HTMLElement>('[data-slot="dot"]')!;
    expect(dot.getBoundingClientRect().width).toBeCloseTo(8, 1);
    expect(dot.getBoundingClientRect().height).toBeCloseTo(8, 1);
  });

  test("the ROW clears SC 2.5.8, which the 18px circle alone does not", () => {
    const { labels } = mount(THREE);
    // 18px circle beside a 13px/130% line ≈ 17px would be a 19px target.
    // min-h-6 = 24 is what closes the 5px gap.
    expect(labels[0]!.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  });

  test("the group's gap steps from 8 to 12 when an option carries a description", () => {
    const plain = mount(THREE);
    expect(getComputedStyle(plain.options).rowGap).toBe("8px");

    act(() => root?.unmount());
    container?.remove();

    const described = mount(
      <RadioGroup label="Delivery" defaultValue="grid">
        <Radio value="grid" description="Typeset to the twelve-column module.">
          Grid systems
        </Radio>
        <Radio value="alphabet">New Alphabet</Radio>
      </RadioGroup>,
    );
    // If the `has-*` pair failed to compile this reads 8px and nothing else
    // in the suite would notice — the whole reason it is asserted.
    expect(getComputedStyle(described.options).rowGap).toBe("12px");
  });

  test("a described row aligns to the top so the circle lands on the label's first line", () => {
    const plain = mount(THREE);
    expect(getComputedStyle(plain.labels[0]!).alignItems).toBe("center");

    act(() => root?.unmount());
    container?.remove();

    const described = mount(
      <RadioGroup label="Delivery" defaultValue="grid">
        <Radio value="grid" description="Typeset to the twelve-column module.">
          Grid systems
        </Radio>
      </RadioGroup>,
    );
    expect(getComputedStyle(described.labels[0]!).alignItems).toBe("flex-start");
  });

  test("horizontal lays the options in a row at 24px", () => {
    const { options } = mount(
      <RadioGroup label="Status" orientation="horizontal" defaultValue="active">
        <Radio value="active">Active</Radio>
        <Radio value="pending">Pending</Radio>
      </RadioGroup>,
    );

    expect(getComputedStyle(options).flexDirection).toBe("row");
    expect(getComputedStyle(options).columnGap).toBe("24px");
  });
});

describe("Radio and Checkbox are one family, so assert the RELATIONSHIP", () => {
  test("identical control size and border width — the pair sits in one column", () => {
    // Both UNSELECTED: a selected radio beside an unchecked box would compare
    // the accent fill against the resting one and fail for the wrong reason.
    const el = render(
      <>
        <RadioGroup label="Reviewer">
          <Radio value="a">Radio</Radio>
        </RadioGroup>
        <Checkbox>Checkbox</Checkbox>
      </>,
    );
    const circle = el.querySelectorAll<HTMLElement>('[data-slot="control"]')[0]!;
    const box = el.querySelectorAll<HTMLElement>('[data-slot="control"]')[1]!;

    const a = getComputedStyle(circle);
    const b = getComputedStyle(box);

    // Pinning 18px and 1px on each would pass while the two silently drifted
    // apart, which is the only failure that matters here.
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(a.borderTopWidth).toBe(b.borderTopWidth);
    expect(a.backgroundColor).toBe(b.backgroundColor);
    expect(a.borderTopColor).toBe(b.borderTopColor);
  });

  test("only the SHAPE differs", () => {
    const el = render(
      <>
        <RadioGroup label="Reviewer">
          <Radio value="a">Radio</Radio>
        </RadioGroup>
        <Checkbox>Checkbox</Checkbox>
      </>,
    );
    const circle = el.querySelectorAll<HTMLElement>('[data-slot="control"]')[0]!;
    const box = el.querySelectorAll<HTMLElement>('[data-slot="control"]')[1]!;

    expect(getComputedStyle(circle).borderRadius).not.toBe(getComputedStyle(box).borderRadius);
  });
});

describe("states are drawn, and they DIFFER", () => {
  test("selected and unselected are not the same fill", () => {
    const { controls } = mount(THREE);
    const unselected = getComputedStyle(controls[0]!);
    const selected = getComputedStyle(controls[1]!);

    expect(selected.backgroundColor).not.toBe(unselected.backgroundColor);
    expect(selected.borderTopColor).not.toBe(unselected.borderTopColor);
  });

  test("keyboard focus draws the ring on the circle, since the input is clipped", async () => {
    const { controls, inputs } = mount(THREE);
    const control = controls[1]!;

    const before = getComputedStyle(control).boxShadow;
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(inputs[1]);

    await settled(control);
    const after = getComputedStyle(control).boxShadow;
    expect(after).not.toBe(before);
    expect(after).not.toBe("none");
  });

  test("a disabled group disables every input, through the fieldset", () => {
    const { fieldset, inputs, labels } = mount(
      <RadioGroup label="Reviewer" defaultValue="a" isDisabled>
        <Radio value="a">Selected</Radio>
        <Radio value="b">Unselected</Radio>
      </RadioGroup>,
    );

    expect(fieldset.disabled).toBe(true);
    for (const input of inputs) expect(input.disabled).toBe(true);
    expect(getComputedStyle(labels[0]!).cursor).toBe("not-allowed");
    // NEVER pointer-events: none — it removes the hover that would explain why
    // the control is unavailable (craft rule 16).
    expect(getComputedStyle(labels[0]!).pointerEvents).not.toBe("none");
  });

  test("one disabled option leaves the rest operable", () => {
    const { inputs } = mount(
      <RadioGroup label="Reviewer" defaultValue="a">
        <Radio value="a">Available</Radio>
        <Radio value="b" isDisabled>
          Unavailable
        </Radio>
      </RadioGroup>,
    );

    expect(inputs[0]!.disabled).toBe(false);
    expect(inputs[1]!.disabled).toBe(true);
  });

  test("a disabled SELECTED option keeps its dot — the choice still has to be readable", () => {
    const { el } = mount(
      <RadioGroup label="Reviewer" defaultValue="a" isDisabled>
        <Radio value="a">Selected</Radio>
      </RadioGroup>,
    );

    expect(el.querySelector('[data-slot="dot"]')).not.toBeNull();
  });

  test("invalid moves the resting edge and wires the message to every input", () => {
    const { el, inputs, controls } = mount(
      <RadioGroup label="Licence" errorText="Choose a licence.">
        <Radio value="ofl">Open Font Licence</Radio>
        <Radio value="proprietary">Proprietary</Radio>
      </RadioGroup>,
    );
    const error = el.querySelector<HTMLElement>('[data-slot="radio-group-error"]')!;

    expect(error.textContent).toBe("Choose a licence.");
    for (const input of inputs) {
      expect(input.getAttribute("aria-invalid")).toBe("true");
      // On the INPUT, not the fieldset: fieldset descriptions are read
      // inconsistently and the input is what takes focus.
      expect(input.getAttribute("aria-describedby")).toBe(error.id);
    }

    act(() => root?.unmount());
    container?.remove();

    const valid = mount(
      <RadioGroup label="Licence">
        <Radio value="ofl">Open Font Licence</Radio>
      </RadioGroup>,
    );
    expect(getComputedStyle(controls[0]!).borderTopColor).not.toBe(
      getComputedStyle(valid.controls[0]!).borderTopColor,
    );
  });
});

describe("forwarding (CONVENTIONS §5)", () => {
  test("the group's ref is the fieldset; the option's is its input", () => {
    let groupNode: HTMLFieldSetElement | null = null;
    let optionNode: HTMLInputElement | null = null;

    function Probe() {
      const group = useRef<HTMLFieldSetElement>(null);
      const option = useRef<HTMLInputElement>(null);
      groupNode = group.current;
      optionNode = option.current;
      return (
        <RadioGroup label="Reviewer" ref={group}>
          <Radio value="a" ref={option}>
            A
          </Radio>
        </RadioGroup>
      );
    }

    const el = render(<Probe />);
    // Read after commit rather than during render.
    act(() => {});
    groupNode = el.querySelector<HTMLFieldSetElement>('[data-slot="radio-group"]');
    optionNode = el.querySelector<HTMLInputElement>('[data-slot="input"]');

    expect(groupNode!.tagName).toBe("FIELDSET");
    expect(optionNode!.tagName).toBe("INPUT");
    // The whole point of §5's exception: a ref to a wrapper cannot be focused.
    optionNode!.focus();
    expect(document.activeElement).toBe(optionNode);
  });

  test("className lands on the outermost node of each part", () => {
    const { fieldset, labels } = mount(
      <RadioGroup label="Reviewer" className="w-full">
        <Radio value="a" className="opacity-70">
          A
        </Radio>
      </RadioGroup>,
    );

    expect(fieldset.classList.contains("w-full")).toBe(true);
    expect(labels[0]!.classList.contains("opacity-70")).toBe(true);
  });

  test("native input props reach the input, and the group owns `name`", () => {
    const { inputs } = mount(
      <RadioGroup label="Reviewer" name="reviewer">
        <Radio value="a" required>
          A
        </Radio>
      </RadioGroup>,
    );

    expect(inputs[0]!.required).toBe(true);
    expect(inputs[0]!.name).toBe("reviewer");
  });
});
