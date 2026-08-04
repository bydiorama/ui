import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Input } from "./input.tsx";

/**
 * Wait out any running transition before reading computed style.
 *
 * Without this, a computed-style read immediately after a state change
 * returns the value the property is transitioning FROM — so an assertion that
 * a focus border changed fails against a component that works perfectly. The
 * transition is real, the test was racing it.
 */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

/**
 * Contract assertions in a REAL browser (CONVENTIONS §10). Computed style is
 * the only layer that can see a class deleted at runtime or a focus ring
 * drawn in `style: none` — both of which have shipped here before.
 */
let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const input = container.querySelector("input");
  const control = container.querySelector('[data-slot="control"]');
  const label = container.querySelector("label");
  if (!input || !control || !label) throw new Error("Input did not render");
  return { input, control: control as HTMLElement, label, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Input labelling and description", () => {
  test("the label is a real label — clicking it focuses the field", async () => {
    const { input, label } = mount(<Input label="Company name" />);

    expect(label.htmlFor).toBe(input.id);
    expect(input.id).not.toBe("");
    await userEvent.click(label);
    expect(document.activeElement).toBe(input);
  });

  test("isLabelHidden keeps the label in the accessibility tree", () => {
    const { label } = mount(<Input label="Company name" isLabelHidden />);

    expect(label.textContent).toContain("Company name");
    // sr-only, not display:none — a hidden-from-everything label is no label.
    const style = getComputedStyle(label);
    expect(style.display).not.toBe("none");
    expect(style.visibility).not.toBe("hidden");
    expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  test("two instances on one page get distinct ids", () => {
    const { container: c } = mount(
      <>
        <Input label="First" />
        <Input label="Second" />
      </>,
    );
    const [a, b] = [...c.querySelectorAll("input")];
    expect(a!.id).not.toBe(b!.id);
  });

  test("error is announced before helper, and both are described", () => {
    const { input } = mount(
      <Input label="Email" helperText="We never share this" errorText="This field is required" />,
    );

    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts[0]).toBe("This field is required");
    expect(texts[1]).toBe("We never share this");
  });

  test("errorText alone marks the field invalid", () => {
    const { input } = mount(<Input label="Email" errorText="Required" />);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  test("a valid field carries no aria-invalid and no stale describedby", () => {
    const { input } = mount(<Input label="Email" />);
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });
});

describe("Input states", () => {
  test("isDisabled blocks typing and leaves the tab order", async () => {
    const { input } = mount(<Input label="Company name" isDisabled />);

    expect(input.disabled).toBe(true);
    input.focus();
    expect(document.activeElement).not.toBe(input);
    expect(getComputedStyle(input).cursor).toBe("not-allowed");
  });

  test("typing updates an uncontrolled field", async () => {
    const { input } = mount(<Input label="Company name" defaultValue="" />);
    input.focus();
    await userEvent.keyboard("Diorama");
    expect(input.value).toBe("Diorama");
  });
});

/**
 * The two failure modes that have shipped in this library before: an
 * indicator that is declared but never painted, and a size class deleted by
 * the class merger. Both are invisible to types, lint and the source.
 */
describe("Input focus indicator is painted, not just declared", () => {
  test("focusing the field paints a ring and moves the border", async () => {
    const { input, control } = mount(<Input label="Company name" />);

    const resting = getComputedStyle(control).borderColor;
    input.focus();
    await settled(control);

    const focused = getComputedStyle(control);
    expect(focused.borderColor).not.toBe(resting);
    // A shadow of "none" is the exact shape of the Button focus-ring bug.
    expect(focused.boxShadow).not.toBe("none");
    expect(focused.boxShadow).toContain("rgb");
  });

  test("an invalid field's border differs from resting", () => {
    const valid = mount(<Input label="Email" />);
    const restingColor = getComputedStyle(valid.control).borderColor;
    act(() => root?.unmount());
    container?.remove();

    const invalid = mount(<Input label="Email" errorText="Required" />);
    expect(getComputedStyle(invalid.control).borderColor).not.toBe(restingColor);
  });
});

describe("Input forwarding contract (CONVENTIONS §5)", () => {
  test("className lands on the outermost node, so sizing the field works", () => {
    const { container: c, control } = mount(<Input label="X" className="w-64" />);
    const field = c.querySelector('[data-slot="field"]') as HTMLElement;

    expect(field.className).toContain("w-64");
    expect(getComputedStyle(field).width).toBe("256px");
    // The control is w-full, so it follows the field rather than fighting it.
    expect(getComputedStyle(control).width).toBe("256px");
  });

  test("native props go to the input, not the wrapper", () => {
    const { input, container: c } = mount(
      <Input label="X" type="email" placeholder="you@example.com" maxLength={12} />,
    );
    const field = c.querySelector('[data-slot="field"]') as HTMLElement;

    expect(input.type).toBe("email");
    expect(input.placeholder).toBe("you@example.com");
    expect(input.maxLength).toBe(12);
    expect(field.getAttribute("placeholder")).toBeNull();
  });
});

describe("Input typography matches the design sheet", () => {
  test.each([
    ["lg", "48px", "14px"],
    ["md", "40px", "12px"],
    ["sm", "32px", "12px"],
  ] as const)("size %s is %s tall with a %s value", (size, height, fontSize) => {
    const { input, control } = mount(<Input label="Task title" size={size} />);

    expect(getComputedStyle(control).height).toBe(height);
    expect(getComputedStyle(input).fontSize).toBe(fontSize);
  });

  test("every size clears the 24px WCAG 2.5.8 target floor", () => {
    for (const size of ["lg", "md", "sm"] as const) {
      const { control } = mount(<Input label="Task title" size={size} />);
      expect(parseFloat(getComputedStyle(control).height)).toBeGreaterThanOrEqual(24);
      act(() => root?.unmount());
      container?.remove();
    }
  });
});
