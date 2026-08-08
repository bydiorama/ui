import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Input } from "@/ui/input/input.tsx";
import { Textarea } from "./textarea.tsx";

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

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const textarea = container.querySelector("textarea");
  const control = container.querySelector('[data-slot="control"]');
  const label = container.querySelector("label");
  if (!textarea || !control || !label) throw new Error("Textarea did not render");
  return { textarea, control: control as HTMLElement, label, container: container! };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

describe("Textarea labelling and description", () => {
  test("the label is a real label — clicking it focuses the field", async () => {
    const { textarea, label } = mount(<Textarea label="Message" />);

    expect(label.htmlFor).toBe(textarea.id);
    expect(textarea.id).not.toBe("");
    await userEvent.click(label);
    expect(document.activeElement).toBe(textarea);
  });

  test("isLabelHidden keeps the label in the accessibility tree", () => {
    const { label } = mount(<Textarea label="Message" isLabelHidden />);

    expect(label.textContent).toContain("Message");
    // sr-only, not display:none — a hidden-from-everything label is no label.
    const style = getComputedStyle(label);
    expect(style.display).not.toBe("none");
    expect(style.visibility).not.toBe("hidden");
    expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  test("two instances on one page get distinct ids", () => {
    const { container: c } = mount(
      <>
        <Textarea label="First" />
        <Textarea label="Second" />
      </>,
    );
    const [a, b] = [...c.querySelectorAll("textarea")];
    expect(a!.id).not.toBe(b!.id);
  });

  test("error is announced before helper, and both are described", () => {
    const { textarea } = mount(
      <Textarea label="Message" helperText="Up to 120 words" errorText="This field is required" />,
    );

    const ids = (textarea.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts[0]).toBe("This field is required");
    expect(texts[1]).toBe("Up to 120 words");
  });

  test("errorText alone marks the field invalid", () => {
    const { textarea } = mount(<Textarea label="Message" errorText="Required" />);
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
  });

  test("error wiring wins while consumer descriptions are composed", () => {
    const { textarea } = mount(
      <Textarea
        label="Message"
        errorText="Required"
        aria-invalid={false}
        aria-describedby="external-description"
      />,
    );
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.getAttribute("aria-describedby")?.split(" ")).toEqual([
      `${textarea.id}-error`,
      "external-description",
    ]);
  });

  test("a valid field carries no aria-invalid and no stale describedby", () => {
    const { textarea } = mount(<Textarea label="Message" />);
    expect(textarea.getAttribute("aria-invalid")).toBeNull();
    expect(textarea.getAttribute("aria-describedby")).toBeNull();
  });
});

describe("Textarea states", () => {
  test("isDisabled blocks typing and leaves the tab order", () => {
    const { textarea } = mount(<Textarea label="Message" isDisabled />);

    expect(textarea.disabled).toBe(true);
    textarea.focus();
    expect(document.activeElement).not.toBe(textarea);
    expect(getComputedStyle(textarea).cursor).toBe("not-allowed");
  });

  /**
   * What each audience gets from the state, asserted rather than assumed —
   * Button's `isBusy` set aria-busy and drew nothing for its whole life, and
   * nothing caught it because the half that worked was the a11y half.
   *
   * Sighted: a sunken fill, a quieter value, no grip. Keyboard: out of the
   * tab order. Pointer: not-allowed. The disabled PLACEHOLDER is deliberately
   * not asserted here — see the doc's knownGaps; it does not change, and that
   * is a cross-component question rather than this component's to answer.
   */
  test("isDisabled is visible to sighted users, not only to the platform", () => {
    const enabled = mount(<Textarea label="Message" defaultValue="text" />);
    const enabledInk = getComputedStyle(enabled.textarea).color;
    const enabledFill = getComputedStyle(enabled.control).backgroundColor;
    unmount();

    const off = mount(<Textarea label="Message" defaultValue="text" isDisabled />);
    expect(getComputedStyle(off.textarea).color).not.toBe(enabledInk);
    expect(getComputedStyle(off.control).backgroundColor).not.toBe(enabledFill);
    expect(getComputedStyle(off.textarea).resize).toBe("none");
  });

  test("typing over multiple lines keeps the newlines", async () => {
    const { textarea } = mount(<Textarea label="Message" defaultValue="" />);
    textarea.focus();
    // Enter inserts a newline in a textarea rather than submitting — the one
    // keyboard difference from Input, and the reason this is not one component
    // with a `multiline` prop.
    await userEvent.keyboard("first{Enter}second");
    expect(textarea.value).toBe("first\nsecond");
  });
});

/**
 * The two failure modes that have shipped in this library before: an
 * indicator that is declared but never painted, and a size class deleted by
 * the class merger. Both are invisible to types, lint and the source.
 */
describe("Textarea focus indicator is painted, not just declared", () => {
  test("focusing the field paints a ring and moves the border", async () => {
    const { textarea, control } = mount(<Textarea label="Message" />);

    const resting = getComputedStyle(control).borderColor;
    textarea.focus();
    await settled(control);

    const focused = getComputedStyle(control);
    expect(focused.borderColor).not.toBe(resting);
    // A shadow of "none" is the exact shape of the Button focus-ring bug.
    expect(focused.boxShadow).not.toBe("none");
    expect(focused.boxShadow).toContain("rgb");
  });

  test("the transition RUNS — the declaration alone proves nothing", () => {
    const { textarea, control } = mount(<Textarea label="Message" />);
    expect(control.getAnimations()).toHaveLength(0);

    textarea.focus();

    // `transitionProperty` reads identically whether the transition runs or
    // not — a Popover assertion on it passed for the whole life of a defect
    // where nothing animated. Only a live animation distinguishes the two,
    // and this is read BEFORE settled() precisely because settled() ends them.
    expect(control.getAnimations().length).toBeGreaterThan(0);
  });

  test("an invalid field's border differs from resting", () => {
    const valid = mount(<Textarea label="Message" />);
    const restingColor = getComputedStyle(valid.control).borderColor;
    unmount();

    const invalid = mount(<Textarea label="Message" errorText="Required" />);
    expect(getComputedStyle(invalid.control).borderColor).not.toBe(restingColor);
  });
});

describe("Textarea forwarding contract (CONVENTIONS §5)", () => {
  test("className lands on the outermost node, so sizing the field works", () => {
    const { container: c, control } = mount(<Textarea label="X" className="w-64" />);
    const field = c.querySelector('[data-slot="field"]') as HTMLElement;

    expect(field.className).toContain("w-64");
    expect(getComputedStyle(field).width).toBe("256px");
    // The control is w-full, so it follows the field rather than fighting it.
    expect(getComputedStyle(control).width).toBe("256px");
  });

  test("native props go to the textarea, not the wrapper", () => {
    const { textarea, container: c } = mount(
      <Textarea label="X" placeholder="Your message" maxLength={12} rows={3} />,
    );
    const field = c.querySelector('[data-slot="field"]') as HTMLElement;

    expect(textarea.placeholder).toBe("Your message");
    expect(textarea.maxLength).toBe(12);
    expect(textarea.rows).toBe(3);
    expect(field.getAttribute("placeholder")).toBeNull();
  });

  test("ref reaches the textarea, not the wrapper — the §5 form-control exception", () => {
    let node: HTMLTextAreaElement | null = null;
    mount(
      <Textarea
        label="X"
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLTextAreaElement);
    // The reason the exception exists: a ref to the wrapper cannot do this.
    node!.focus();
    expect(document.activeElement).toBe(node);
  });
});

describe("Textarea paints the designed surface", () => {
  /**
   * Asserted as a RELATIONSHIP, not as numbers. The claim is that the
   * Textarea reuses Input's `lg` control surface rather than re-deriving it,
   * so the two must agree even when the shared values change. Absolute
   * numbers on each would pass while the two silently drifted apart, which is
   * the only failure here that matters.
   *
   * The padding is compared across the SPLIT: Input puts it on the control
   * wrapper, Textarea puts it on the textarea itself (so the resize grip
   * lands in the corner and a drag grows the box). The inset a user sees is
   * the same inset either way, and that is what is asserted.
   */
  test.each(["lg", "md", "sm"] as const)(
    "size %s is Input's %s surface, inset and type",
    (size) => {
      const { control, textarea } = mount(
        <>
          <Textarea label="Message" size={size} />
          <Input label="Reference" size={size} />
        </>,
      );
      const inputControl = document.querySelectorAll('[data-slot="control"]')[1] as HTMLElement;
      const reference = getComputedStyle(inputControl);
      const referenceText = getComputedStyle(inputControl.querySelector("input")!);
      const surface = getComputedStyle(control);
      const inset = getComputedStyle(textarea);

      expect(surface.borderRadius).toBe(reference.borderRadius);
      expect(surface.borderTopWidth).toBe(reference.borderTopWidth);
      expect(surface.borderTopColor).toBe(reference.borderTopColor);
      expect(surface.backgroundColor).toBe(reference.backgroundColor);
      // The inset is compared across the SPLIT — Input holds it on the control
      // wrapper, this holds it on the textarea. Same inset, different owner.
      expect(inset.paddingLeft).toBe(reference.paddingLeft);
      expect(inset.paddingTop).toBe(reference.paddingTop);
      expect(inset.fontSize).toBe(referenceText.fontSize);
    },
  );

  /**
   * Badge shipped two sizes that were pixel-identical while every test passed,
   * because nothing ever compared them to each other. These compare.
   */
  test("the three sizes actually differ from one another", () => {
    const measure = (size: "lg" | "md" | "sm") => {
      const { control, textarea } = mount(<Textarea label="Message" size={size} />);
      const out = {
        height: parseFloat(getComputedStyle(control).height),
        fontSize: getComputedStyle(textarea).fontSize,
        lineHeight: getComputedStyle(textarea).lineHeight,
        paddingTop: getComputedStyle(textarea).paddingTop,
      };
      unmount();
      return out;
    };
    const [lg, md, sm] = [measure("lg"), measure("md"), measure("sm")];

    // Strictly ordered, not merely unequal — a size scale that is not
    // monotonic is a scale nobody can reason about.
    expect(lg.height).toBeGreaterThan(md.height);
    expect(md.height).toBeGreaterThan(sm.height);
    expect(parseFloat(lg.fontSize)).toBeGreaterThan(parseFloat(md.fontSize));
    // md and sm share Input's 12px type and differ by inset alone — the same
    // relationship Input's own md and sm have.
    expect(sm.fontSize).toBe(md.fontSize);
    expect(sm.lineHeight).toBe(md.lineHeight);
    expect(parseFloat(md.paddingTop)).toBeGreaterThan(parseFloat(sm.paddingTop));
  });

  test("the value's type is the sheet's 14px/18.2px, not the font's default leading", () => {
    const { textarea } = mount(<Textarea label="Message" />);
    const style = getComputedStyle(textarea);

    expect(style.fontSize).toBe("14px");
    // leading-snug (1.3) x 14px. The sheet stores a raw 18px, which is off the
    // --ui-leading-* scale entirely — see the doc's needsDesign entry. A
    // textarea is the first component where this is load-bearing: get it
    // wrong and every line of a paragraph drifts.
    expect(style.lineHeight).toBe("18.2px");
  });

  /**
   * The sheet draws a 128px box over a 109px content area. `rows` is the
   * native way to say that, and the arithmetic has to be written down because
   * two separate platform behaviours sit between the declared values and the
   * measured one:
   *
   *   line box   18.2px computed, laid out at Chromium's 1/64px LayoutUnit
   *              precision → floor(18.2 x 64)/64 = 18.1875px
   *   content    6 x 18.1875                     = 109.125px  (sheet: 109)
   *   padding    py-sm x 2                       =  16px
   *   border     1.5px x 2, floored to 1 DEVICE pixel each at dPR 1
   *              (border-hairline.browser.test.tsx)  =   2px
   *                                                 ---------
   *                                                   127.125px
   *
   * At dPR 2 — where the design was drawn and where most users are — the
   * border is a true 1.5 and the box is 128.125px. So the sheet's 128 is
   * reproduced; what is measured here is the same box on a 1x display.
   */
  test("the default box is the sheet's 128px, and rows drives it at every size", () => {
    const { control } = mount(<Textarea label="Message" />);
    const border = parseFloat(getComputedStyle(control).borderTopWidth);
    expect(border).toBe(1); // the dPR-1 floor the sum above assumes
    expect(parseFloat(getComputedStyle(control).height)).toBeCloseTo(127.125, 2);
    unmount();

    // The derived sizes, by the same arithmetic on a 12px line box:
    //   floor(12 x 1.3 x 64)/64 = 15.59375; 6 rows = 93.5625
    //   md  + p-sm  x2 (16) + 2 = 111.5625      sm  + py-xs x2 (8) + 2 = 103.5625
    for (const [size, height] of [
      ["md", 111.5625],
      ["sm", 103.5625],
    ] as const) {
      const { control: c } = mount(<Textarea label="Message" size={size} />);
      expect(parseFloat(getComputedStyle(c).height)).toBeCloseTo(height, 2);
      unmount();
    }

    // Halving the rows removes exactly three line boxes and nothing else —
    // the chrome is a constant, so `rows` is genuinely driving the content.
    const three = mount(<Textarea label="Message" rows={3} />);
    expect(parseFloat(getComputedStyle(three.control).height)).toBeCloseTo(
      127.125 - 3 * 18.1875,
      2,
    );
  });

  test("resize is vertical only, and isResizable={false} turns it off", () => {
    const { textarea } = mount(<Textarea label="Message" />);
    // Never "both": a field that can be dragged wider breaks the layout that
    // contains it.
    expect(getComputedStyle(textarea).resize).toBe("vertical");
    unmount();

    const fixed = mount(<Textarea label="Message" isResizable={false} />);
    expect(getComputedStyle(fixed.textarea).resize).toBe("none");
    unmount();

    const off = mount(<Textarea label="Message" isDisabled />);
    expect(getComputedStyle(off.textarea).resize).toBe("none");
  });

  /**
   * The two behaviours the wrapper's shape exists for, each checked against
   * the change that would break it. Probed by moving the padding back onto
   * the control "for consistency", which is the edit a future reviewer is
   * most likely to make:
   *
   * - the dead-zone test FAILS (the inset becomes 13px of wrapper that
   *   focuses nothing), and so does the Input-relationship test;
   * - the resize test still PASSES, and is stated accordingly below. It
   *   proves `items-start` — the wrapper taking its height from the child —
   *   which is a separate property from where the padding lives. Saying it
   *   guards the split would be a claim the probe does not support.
   */
  test("a resize drag grows the box rather than being clipped by it", () => {
    const { control, textarea } = mount(<Textarea label="Message" />);
    const before = control.getBoundingClientRect().height;

    // What the native grip does: an inline height on the TEXTAREA. Nothing
    // else in the DOM changes, which is exactly why the wrapper must take its
    // height from the child.
    textarea.style.height = `${textarea.getBoundingClientRect().height + 60}px`;

    expect(control.getBoundingClientRect().height).toBeCloseTo(before + 60, 1);
  });

  test("the inset is part of the field, not dead wrapper padding", () => {
    const { control, textarea } = mount(<Textarea label="Message" />);
    const box = control.getBoundingClientRect();
    const field = textarea.getBoundingClientRect();
    const border = parseFloat(getComputedStyle(control).borderTopWidth);

    // The textarea fills the control's whole inner box, so a click anywhere
    // inside the border lands on the field. With the padding on the wrapper
    // there would be a 12px ring around the edge that focuses nothing.
    expect(field.left - box.left).toBeCloseTo(border, 1);
    expect(box.right - field.right).toBeCloseTo(border, 1);
    expect(field.top - box.top).toBeCloseTo(border, 1);
    expect(box.bottom - field.bottom).toBeCloseTo(border, 1);
  });

  test("the field clears the 24px WCAG 2.5.8 target floor many times over", () => {
    const { control } = mount(<Textarea label="Message" rows={1} />);
    expect(parseFloat(getComputedStyle(control).height)).toBeGreaterThanOrEqual(24);
  });
});
