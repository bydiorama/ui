import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Checkbox } from "./checkbox.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const label = container.querySelector<HTMLLabelElement>('[data-slot="checkbox"]')!;
  const input = container.querySelector<HTMLInputElement>('[data-slot="input"]')!;
  const control = container.querySelector<HTMLElement>('[data-slot="control"]')!;
  if (!label || !input || !control) throw new Error("Checkbox did not render its parts");
  return { label, input, control };
}

/**
 * A computed style read at t=0 returns the PRE-transition value, so a working
 * focus ring reads as broken. Wait for the animations to finish first.
 */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Checkbox is a real input, so the platform does the work", () => {
  test("renders a native checkbox that is focusable and in the form", () => {
    const { input } = mount(<Checkbox name="terms">Accept</Checkbox>);

    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("checkbox");
    expect(input.name).toBe("terms");
    // sr-only clips it; it must NOT be display:none, or it leaves the tab order.
    expect(getComputedStyle(input).display).not.toBe("none");
    input.focus();
    expect(document.activeElement).toBe(input);
  });

  test("Space toggles and Enter does not — the platform's contract, not ours", async () => {
    const onCheckedChange = vi.fn();
    const { input } = mount(<Checkbox onCheckedChange={onCheckedChange}>Accept</Checkbox>);

    input.focus();
    await userEvent.keyboard(" ");
    expect(input.checked).toBe(true);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    // Enter submits forms; a checkbox that toggled on it would be the odd one
    // out. No key handler exists in the component, and none should.
    await userEvent.keyboard("{Enter}");
    expect(input.checked).toBe(true);
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  test("the label is part of the control — clicking the text toggles", async () => {
    const { label, input } = mount(<Checkbox>Accept the terms</Checkbox>);
    const text = label.querySelector<HTMLElement>('[data-slot="label"]')!;

    await userEvent.click(text);
    expect(input.checked).toBe(true);
  });

  test("consumer onChange runs before the component reports its state", async () => {
    const calls: string[] = [];
    const { control } = mount(
      <Checkbox
        onChange={() => calls.push("consumer")}
        onCheckedChange={() => calls.push("component")}
      >
        Accept
      </Checkbox>,
    );
    await userEvent.click(control);
    expect(calls).toEqual(["consumer", "component"]);
  });

  test("the accessible name comes from the label, with no aria-label", () => {
    const { label, input } = mount(<Checkbox>Accept the terms</Checkbox>);

    expect(input.getAttribute("aria-label")).toBeNull();
    expect(input.labels?.[0]).toBe(label);
    expect(label.textContent).toContain("Accept the terms");
  });
});

describe("The mixed state uses the DOM property, which has no attribute", () => {
  test("isIndeterminate sets input.indeterminate", () => {
    const { input, label } = mount(<Checkbox isIndeterminate>Select all</Checkbox>);

    // React will not set this from JSX — it is a property, not an attribute.
    // Asserting the attribute instead would pass on a component that does
    // nothing, which is why this reads the property.
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute("indeterminate")).toBeNull();
    expect(label.dataset["state"]).toBe("mixed");
  });

  test("clearing isIndeterminate clears the property", () => {
    const { input } = mount(<Checkbox isIndeterminate>Select all</Checkbox>);
    expect(input.indeterminate).toBe(true);

    act(() => {
      root!.render(<Checkbox isIndeterminate={false}>Select all</Checkbox>);
    });
    expect(input.indeterminate).toBe(false);
  });

  test("clicking a mixed checkbox reports true, leaving the children to the caller", async () => {
    const onCheckedChange = vi.fn();
    const { control } = mount(
      <Checkbox isIndeterminate onCheckedChange={onCheckedChange}>
        Select all
      </Checkbox>,
    );

    // Click the painted box, not the input: the input is clipped, and
    // Playwright refuses to click what a user could not. That refusal is the
    // correct answer — every real click lands on the label or the box.
    await userEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe("Controlled and uncontrolled both work, through the shared hook", () => {
  test("uncontrolled owns its state", async () => {
    const { input, label, control } = mount(<Checkbox defaultIsChecked>Accept</Checkbox>);
    expect(input.checked).toBe(true);

    await userEvent.click(control);
    expect(input.checked).toBe(false);
    expect(label.dataset["state"]).toBe("unchecked");
  });

  test("controlled does not move unless the parent moves it", async () => {
    const onCheckedChange = vi.fn();
    const { input, control } = mount(
      <Checkbox isChecked={false} onCheckedChange={onCheckedChange}>
        Accept
      </Checkbox>,
    );

    await userEvent.click(control);
    // The parent never updated, so the box must still read unchecked. A
    // component that moves anyway looks right for a frame, then disagrees.
    expect(input.checked).toBe(false);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe("Geometry and target size", () => {
  test("the painted box is 18px — size-4.5 must actually resolve", () => {
    const { control } = mount(<Checkbox>Accept</Checkbox>);
    const style = getComputedStyle(control);

    // A class proves nothing unless a rule matches it. 18px is not on the
    // named spacing scale, so this asserts the fractional step compiles.
    expect(style.width).toBe("18px");
    expect(style.height).toBe("18px");
    expect(style.borderRadius).toBe("4px");
  });

  test("the whole row is a 24px target, not the 18px box (WCAG 2.5.8)", () => {
    const { label } = mount(<Checkbox>Accept</Checkbox>);
    // The sheet's row is 19px; padding the label out is the fix, and it has
    // to hold in the browser rather than in a comment.
    expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  });

  test("the label sits centred beside the box, not hugging the top of the row", () => {
    const { label, control } = mount(<Checkbox>Accept</Checkbox>);
    const text = label.querySelector<HTMLElement>('[data-slot="label"]')!;

    const rowBox = label.getBoundingClientRect();
    const textBox = text.getBoundingClientRect();
    const controlBox = control.getBoundingClientRect();

    const centre = (r: DOMRect) => r.top + r.height / 2;

    // Reported from Storybook: the 24px minimum height added for SC 2.5.8 was
    // combined with `items-start`, so the 17px label sat at the top of the row
    // with 6px of dead space beneath it instead of beside the box, which is
    // what the sheet draws (`align-items: center`).
    expect(Math.abs(centre(rowBox) - centre(textBox))).toBeLessThanOrEqual(1);
    expect(Math.abs(centre(controlBox) - centre(textBox))).toBeLessThanOrEqual(1.5);
  });

  test("the label renders at 13px — tailwind-merge must not drop text-label-md", () => {
    const { label } = mount(<Checkbox>Accept</Checkbox>);
    const text = label.querySelector<HTMLElement>('[data-slot="label"]')!;
    // text-label-md and text-ink-primary are both `text-*`; an unregistered
    // namespace makes tailwind-merge treat them as conflicting and silently
    // delete the size. That shipped once already.
    expect(getComputedStyle(text).fontSize).toBe("13px");
  });

  test("cursor communicates operability, which no reset provides", () => {
    const enabled = mount(<Checkbox>Accept</Checkbox>);
    expect(getComputedStyle(enabled.label).cursor).toBe("pointer");

    act(() => root?.unmount());
    container?.remove();

    const disabled = mount(<Checkbox isDisabled>Accept</Checkbox>);
    expect(getComputedStyle(disabled.label).cursor).toBe("not-allowed");
    // Never pointer-events-none — it would kill an explaining tooltip.
    expect(getComputedStyle(disabled.label).pointerEvents).not.toBe("none");
  });
});

describe("Every state paints its designed role", () => {
  test.each([
    // [state, background, border]
    ["unchecked", "rgb(253, 252, 251)", "rgb(152, 145, 138)"],
    ["checked", "rgb(158, 219, 243)", "rgb(158, 219, 243)"],
    ["mixed", "rgb(237, 232, 227)", "rgb(105, 99, 93)"],
  ] as const)("%s", async (state, bg, border) => {
    const { control } = mount(
      <Checkbox
        defaultIsChecked={state === "checked"}
        isIndeterminate={state === "mixed"}
      >
        Accept
      </Checkbox>,
    );
    await settled(control);
    const style = getComputedStyle(control);
    expect(style.backgroundColor).toBe(bg);
    expect(style.borderTopColor).toBe(border);
  });

  test("the mixed box has a visible boundary — border-strong, not a hairline", async () => {
    const { control } = mount(<Checkbox isIndeterminate>Select all</Checkbox>);
    await settled(control);
    // Regression: in dark, border-strong composited to 1.78:1 against the
    // page — weaker than border-control — so the mixed box vanished. The
    // token-layer fix is covered by the resolver's own invariant test; this
    // pins the component to the role that carries it.
    expect(getComputedStyle(control).borderTopColor).toBe("rgb(105, 99, 93)");
  });

  test("only the checked and mixed states SHOW a glyph", () => {
    // The check is always in the DOM and revealed by `:checked` (#34), so a
    // static page can show it without a re-render.
    const unchecked = mount(<Checkbox>Accept</Checkbox>);
    expect(getComputedStyle(unchecked.control.querySelector("svg")!).visibility).toBe("hidden");
    act(() => root?.unmount());
    container?.remove();

    const checked = mount(<Checkbox defaultIsChecked>Accept</Checkbox>);
    const svg = checked.control.querySelector("svg")!;
    // Real glyphs in currentColor survive forced-colors mode; a background
    // image would not.
    expect(getComputedStyle(svg).width).toBe("14px");
    expect(getComputedStyle(checked.control).color).toBe("rgb(29, 27, 25)");
  });
});

describe("Focus is visible", () => {
  test("keyboard focus draws the ring on the box, since the input is clipped", async () => {
    const { input, control } = mount(<Checkbox>Accept</Checkbox>);

    const before = getComputedStyle(control).boxShadow;
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(input);

    await settled(control);
    const after = getComputedStyle(control).boxShadow;
    expect(after).not.toBe(before);
    expect(after).not.toBe("none");
  });
});

describe("Checked state needs no JavaScript (#34)", () => {
  test("toggling the native input paints the box without a React render", () => {
    const { control, input } = mount(<Checkbox>Subscribe</Checkbox>);
    // The fill eases; this asserts WHERE it lands, so take the easing away.
    control.style.transition = "none";
    const rest = getComputedStyle(control).backgroundColor;
    // Set the DOM property directly: what a click does on a page that was
    // rendered to static HTML and never hydrated.
    input.checked = true;
    expect(getComputedStyle(control).backgroundColor).not.toBe(rest);
    expect(getComputedStyle(control.querySelector("svg")!).visibility).toBe("visible");
  });
});

/* ------------------------------------------------------------------ *
 * labelPlacement and description (#9 proposals)
 * ------------------------------------------------------------------ */

describe("Checkbox labelPlacement", () => {
  test("start is the settings row: full width, label first, the control at the END", () => {
    const host = document.createElement("div");
    host.style.width = "420px";
    document.body.appendChild(host);
    const r = createRoot(host);
    act(() => r.render(<Checkbox labelPlacement="start">Snap layouts to the baseline grid</Checkbox>));
    const row = host.querySelector<HTMLElement>('[data-slot="checkbox"]')!.getBoundingClientRect();
    const label = host.querySelector<HTMLElement>('[data-slot="label"]')!.getBoundingClientRect();
    const box = host.querySelector<HTMLElement>('[data-slot="control"]')!.getBoundingClientRect();
    expect(row.width).toBe(420);
    expect(label.left).toBeLessThan(box.left);
    expect(box.right).toBeCloseTo(row.right, 0);
    // Visual order only: the input still precedes the visual control, which
    // every peer-* selector depends on.
    const input = host.querySelector('[data-slot="input"]')!;
    expect(input.compareDocumentPosition(host.querySelector('[data-slot="control"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => r.unmount());
    host.remove();
  });

  test("end (default) is unchanged: control first, an inline row", () => {
    const { label } = mount(<Checkbox>Publish automatically</Checkbox>);
    expect(getComputedStyle(label).display).toBe("inline-flex");
  });
});

describe("Checkbox description", () => {
  test("named by the label, DESCRIBED by the description, and both are the hit target", async () => {
    const onCheckedChange = vi.fn();
    mount(
      <Checkbox description="Herbert Bayer and Otl Aicher get an email." onCheckedChange={onCheckedChange}>
        Notify the studio
      </Checkbox>,
    );
    const input = document.querySelector<HTMLInputElement>('[data-slot="input"]')!;
    const labelId = input.getAttribute("aria-labelledby")!;
    const descriptionId = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(labelId)!.textContent).toBe("Notify the studio");
    expect(document.getElementById(descriptionId)!.textContent).toBe("Herbert Bayer and Otl Aicher get an email.");
    // Clicking the description toggles: it is inside the <label>.
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="description"]')!);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  test("a caller's own aria-describedby is kept beside the description", () => {
    mount(
      <Checkbox description="Sends at 09:00." aria-describedby="policy-note">
        Daily digest
      </Checkbox>,
    );
    const ids = document.querySelector('[data-slot="input"]')!.getAttribute("aria-describedby")!.split(" ");
    expect(ids).toContain("policy-note");
    expect(ids).toHaveLength(2);
  });

  test("the control sits on the label's FIRST line, not the block's centre", () => {
    const host = document.createElement("div");
    host.style.width = "240px";
    document.body.appendChild(host);
    const r = createRoot(host);
    act(() =>
      r.render(
        <Checkbox description="Quotes and hyphens sit outside the measure, as Jan Tschichold set them in 1928.">
          Keep hanging punctuation
        </Checkbox>,
      ),
    );
    const label = host.querySelector<HTMLElement>('[data-slot="label"]')!.getBoundingClientRect();
    const box = host.querySelector<HTMLElement>('[data-slot="control"]')!.getBoundingClientRect();
    expect(Math.abs(box.top - label.top)).toBeLessThan(3);
    act(() => r.unmount());
    host.remove();
  });

  test("description is muted, and dims with the row when disabled", () => {
    const probe = (token: string) => {
      const p = document.createElement("div");
      p.style.color = `var(${token})`;
      document.body.appendChild(p);
      const v = getComputedStyle(p).color;
      p.remove();
      return v;
    };
    const { label } = mount(<Checkbox description="Sends at 09:00.">Daily digest</Checkbox>);
    expect(getComputedStyle(label.querySelector('[data-slot="description"]')!).color).toBe(probe("--ui-text-muted"));
    act(() => root?.unmount());
    container?.remove();
    const disabled = mount(<Checkbox isDisabled description="Unavailable.">Embed Univers</Checkbox>);
    expect(getComputedStyle(disabled.label.querySelector('[data-slot="description"]')!).color).toBe(probe("--ui-text-disabled"));
  });
});
