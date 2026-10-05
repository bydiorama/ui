import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { ArrowRight } from "griddy-icons";

import { Button } from "@/ui/button/button.tsx";
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

  test("error wiring wins while consumer descriptions are composed", () => {
    const { input } = mount(
      <Input
        label="Email"
        errorText="Required"
        aria-invalid={false}
        aria-describedby="external-description"
      />,
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toEqual([
      `${input.id}-error`,
      "external-description",
    ]);
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
  // md is body-md (14px), not caption: the owner's frames draw every 40px
  // field value at 14px, and Input at 12 beside Select at 14 is what #16 was.
  test.each([
    ["lg", "48px", "14px"],
    ["md", "40px", "14px"],
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

/**
 * `shape` (#18). Every assertion here is a RELATIONSHIP — full against soft,
 * the circle against the capsule — because the numbers move with density and
 * the claims do not.
 */
describe("Input shape", () => {
  const unmount = () => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  };

  test("soft is the default, and full is a capsule at every size", () => {
    for (const size of ["lg", "md", "sm"] as const) {
      const soft = mount(<Input label="Search" size={size} />);
      expect(soft.control.getAttribute("data-shape")).toBe("soft");
      const softRadius = parseFloat(getComputedStyle(soft.control).borderTopLeftRadius);
      unmount();

      const full = mount(<Input label="Search" size={size} shape="full" />);
      const style = getComputedStyle(full.control);
      // rounded-full is a huge radius the box clamps to half its height —
      // so assert what is PAINTED: a radius at least half the height.
      const height = parseFloat(style.height);
      expect(parseFloat(style.borderTopLeftRadius), size).toBeGreaterThanOrEqual(height / 2);
      expect(parseFloat(style.borderTopLeftRadius), size).toBeGreaterThan(softRadius);
      unmount();
    }
  });

  test("full widens the inline inset so the text clears the curve, and keeps the height", () => {
    for (const size of ["lg", "md", "sm"] as const) {
      const soft = getComputedStyle(mount(<Input label="Search" size={size} />).control);
      const [softInset, softHeight] = [parseFloat(soft.paddingLeft), soft.height];
      unmount();
      const full = getComputedStyle(mount(<Input label="Search" size={size} shape="full" />).control);
      // One spacing step (4px) wider, on both sides when nothing trails.
      expect(parseFloat(full.paddingLeft) - softInset, size).toBe(4);
      expect(full.paddingRight, size).toBe(full.paddingLeft);
      expect(full.height, size).toBe(softHeight);
      unmount();
    }
  });

  test("the full inset still moves with density", () => {
    const c = mount(
      <>
        <Input label="Default" shape="full" />
        <div data-ui-density="compact">
          <Input label="Compact" shape="full" />
        </div>
      </>,
    ).container;
    const [def, compact] = [...c.querySelectorAll<HTMLElement>('[data-slot="control"]')];
    expect(parseFloat(getComputedStyle(compact!).paddingLeft)).toBeLessThan(
      parseFloat(getComputedStyle(def!).paddingLeft),
    );
  });

  /**
   * The pill search field: a round submit one Button size under the field.
   * A circle reads as concentric with the capsule only when it sits the same
   * distance from the edge at the END as at the TOP. The top gap comes from
   * centring, (field − button) / 2; the end gap from the padding the field
   * collapses to. Before the collapse the end gap was the 16/12/12 text inset
   * plus the edge, against a top gap of 8/8/4.
   *
   * Tolerance 0.5px: the end padding subtracts the 1.5px hairline TOKEN, and
   * Chromium floors the border to 1px at dPR 1. At dPR 2 the two are equal.
   */
  test.each([
    ["lg", "md"],
    ["md", "sm"],
    ["sm", "sm"],
  ] as const)("a %s field holds a round %s Button concentrically", (size, buttonSize) => {
    const { control } = mount(
      <Input
        label="Search"
        isLabelHidden
        size={size}
        shape="full"
        iconEnd={
          <Button size={buttonSize} shape="full" isIconOnly aria-label="Search" icon={<ArrowRight />} />
        }
      />,
    );
    const field = control.getBoundingClientRect();
    const button = control.querySelector("button")!.getBoundingClientRect();

    const top = button.top - field.top;
    const bottom = field.bottom - button.bottom;
    const end = field.right - button.right;
    expect(Math.abs(top - bottom), "centred").toBeLessThan(0.01);
    expect(Math.abs(end - top), `end ${end} vs top ${top}`).toBeLessThanOrEqual(0.5);
    // And it is a circle inside the capsule, not clipped by it.
    expect(button.width).toBe(button.height);
    expect(top).toBeGreaterThan(0);
  });

  test("the collapse is for a trailing BUTTON only — a glyph keeps the text inset", () => {
    const { control } = mount(
      <Input label="Search" shape="full" iconEnd={<ArrowRight aria-hidden="true" />} />,
    );
    const style = getComputedStyle(control);
    expect(style.paddingRight).toBe(style.paddingLeft);
  });
});
