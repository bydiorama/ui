import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Popover } from "./popover.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

/** The panel is portalled, so it is never inside the mount container. */
const panel = () => document.querySelector<HTMLElement>('[data-slot="popover-panel"]');
const trigger = () => document.querySelector<HTMLElement>('[data-slot="popover-trigger"]')!;

async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function Basic(props: { onOpenChange?: (isOpen: boolean) => void } = {}) {
  return (
    <Popover {...props}>
      <Popover.Trigger>Open popover</Popover.Trigger>
      <Popover.Panel>
        <Popover.Title>Popover contents</Popover.Title>
        <Popover.Description>Exports use the template set in Brand profile.</Popover.Description>
      </Popover.Panel>
    </Popover>
  );
}

describe("The behaviour layer does the behaviour", () => {
  test("the trigger announces the relationship before anything opens", () => {
    mount(<Basic />);
    const t = trigger();

    expect(t.getAttribute("aria-expanded")).toBe("false");
    expect(t.getAttribute("aria-haspopup")).toBe("dialog");
    expect(panel()).toBeNull();
  });

  test("clicking opens the panel and flips aria-expanded", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());

    expect(panel()).not.toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  test("Escape closes and returns focus to the trigger", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    expect(panel()).not.toBeNull();

    await userEvent.keyboard("{Escape}");

    // Focus restoration is the thing hand-rolled popovers get wrong: the panel
    // unmounts and focus falls to <body>, stranding a keyboard user at the
    // top of the document.
    await vi.waitFor(() => expect(panel()).toBeNull());
    expect(document.activeElement).toBe(trigger());
  });

  test("an outside click dismisses", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    expect(panel()).not.toBeNull();

    await userEvent.click(document.body);
    await vi.waitFor(() => expect(panel()).toBeNull());
  });

  test("onOpenChange reports a boolean, not the library's event object", async () => {
    const onOpenChange = vi.fn();
    mount(<Basic onOpenChange={onOpenChange} />);

    await userEvent.click(trigger());
    // The wrapper narrows Base UI's (open, eventDetails) to our own contract.
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(onOpenChange.mock.calls[0]).toHaveLength(1);
  });
});

describe("The trigger slot is never wrapped (CONVENTIONS §3)", () => {
  test("a rendered element keeps its own tag, classes and accessible name", async () => {
    mount(
      <Popover>
        <Popover.Trigger
          render={
            <button type="button" className="my-own-class" aria-label="Open the details">
              Details
            </button>
          }
        />
        <Popover.Panel>
          <Popover.Title>Details</Popover.Title>
        </Popover.Panel>
      </Popover>,
    );

    const t = trigger();
    expect(t.tagName).toBe("BUTTON");
    expect(t.classList.contains("my-own-class")).toBe(true);
    expect(t.getAttribute("aria-label")).toBe("Open the details");
    // It gained the wiring without losing itself.
    expect(t.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("The panel paints the designed surface", () => {
  test("geometry and elevation resolve — numeric utilities the gate cannot check", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const style = getComputedStyle(p);

    // `rounded-xl`, `min-w-80` and `p-lg` are numeric or theme-mapped; only a
    // browser proves the rule actually matched the element. 24 = the Banner's
    // radius-md (8) + this panel's p-lg (16) — concentric exactly (§6).
    expect(style.borderRadius).toBe("24px");
    expect(style.minWidth).toBe("320px");
    expect(style.padding).toBe("16px");

    // bg-elevated (neutral-95) with the hairline that carries the boundary —
    // the fill alone measures 1.11:1 against a white page.
    expect(style.backgroundColor).toBe("rgb(246, 243, 240)");
    expect(style.borderTopColor).toBe("rgb(218, 212, 206)");
    expect(style.boxShadow).not.toBe("none");
  });

  test("unboxed content is inset one step inside the 32px radius", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);

    const title = document.querySelector<HTMLElement>('[data-slot="popover-title"]')!;
    const description = document.querySelector<HTMLElement>('[data-slot="popover-description"]')!;

    // The rule the design encodes: bare text steps in by --ui-space-sm so it
    // does not crowd the corner arc; boxed children stay flush at p-lg.
    expect(getComputedStyle(title).paddingLeft).toBe("8px");
    expect(getComputedStyle(title).paddingRight).toBe("8px");
    expect(getComputedStyle(description).paddingLeft).toBe("8px");
  });

  test("title and description use the designed roles", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);

    const title = getComputedStyle(document.querySelector('[data-slot="popover-title"]')!);
    // title-sm is a FLUID role (ADR 0009): a band, not a value, so the only
    // honest assertion is the band. The floor is the part that broke — it
    // shrank to 11.52px, under the scale's own 12px minimum, which is what
    // ADR 0009 exists to prevent.
    const titlePx = Number.parseFloat(title.fontSize);
    expect(titlePx).toBeGreaterThanOrEqual(12);
    expect(titlePx).toBeLessThanOrEqual(16);
    expect(title.fontWeight).toBe("600");

    const description = getComputedStyle(
      document.querySelector('[data-slot="popover-description"]')!,
    );
    // body-md in secondary ink, per the actions sheet — the only place a
    // description is actually drawn.
    expect(description.fontSize).toBe("14px");
    expect(description.color).toBe("rgb(47, 44, 41)");
  });

  test("the motion utilities actually compiled — the gate cannot see these", async () => {
    // `scale-95`, `origin-(--transform-origin)` and the arbitrary
    // `transition-[opacity,transform]` are numeric or arbitrary, so
    // check:utilities skips all three by design. An unknown utility emits NO
    // css and nothing reports it — the failure mode that killed the press
    // animation once already.
    mount(<Basic />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const style = getComputedStyle(p);

    expect(style.transitionDuration).not.toBe("0s");
    expect(style.transitionProperty).toContain("opacity");
    expect(style.transitionProperty).toContain("transform");
    // Base UI writes --transform-origin on the popup so the panel grows from
    // the trigger. Still "50% 50%" would mean the utility never matched.
    expect(style.transformOrigin).not.toBe("50% 50%");

    // Read the COMPILED CSS for the scale step, rather than probing a bare
    // class from this file: Tailwind only compiles what it finds when scanning
    // source, and the component uses the VARIANT form, so a bare `scale-95`
    // set here would be absent even when the component's rule exists — a probe
    // that fails for the wrong reason is worse than no probe.
    const rules: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) rules.push(rule.cssText);
      } catch {
        // Cross-origin sheet — nothing of ours lives there.
      }
    }
    const scaleRule = rules.find(
      (text) => text.includes("starting-style") && text.includes("scale"),
    );
    expect(scaleRule, "no compiled rule pairs starting-style with a scale").toBeDefined();
    expect(scaleRule).toMatch(/--tw-scale-|scale\(/);
  });

  test("the title names the panel for assistive tech", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());

    const p = panel()!;
    const labelledBy = p.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.dataset["slot"]).toBe("popover-title");
  });
});
