import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import type { ReactElement } from "react";

import { Tooltip } from "./tooltip.tsx";
import { Copy, Trash } from "griddy-icons";

import { Button } from "../button/button.tsx";
import {
  HOVER_INTENT_DELAY_MS,
  HOVER_INTENT_CLOSE_MS,
  HOVER_INTENT_SKIP_MS,
} from "@/lib/motion";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  // Room on every side, so a `top` preference is honoured rather than flipped.
  // Mounted flush at the origin the positioner has nowhere to put the chip and
  // collision handling silently answers a different question than the test
  // meant to ask.
  container.style.margin = "200px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

/**
 * The chip is portalled, so it is never inside the mount container — and it
 * stays MOUNTED through its exit transition carrying `data-closed`. Asserting
 * `toBeNull()` therefore fails on a tooltip that is closing correctly, so
 * "open" is the attribute and not the presence of the node.
 */
const chip = () => document.querySelector<HTMLElement>('[data-slot="tooltip"][data-open]');
const anyChip = () => document.querySelector<HTMLElement>('[data-slot="tooltip"]');
const trigger = () => document.querySelector<HTMLElement>('[data-slot="tooltip-trigger"]')!;

async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}


/**
 * The transitions an interaction STARTS on an element that does not exist yet.
 *
 * Two traps, one after the other. Reading `getAnimations()` on the line after an
 * awaited click is a race with a deadline of the transition's own duration, and
 * it loses roughly one run in three once the suite is big enough that files
 * share workers — reported as a dead transition on code that works.
 * `transitionrun` fires when the browser CREATES the transition, so listening
 * there cannot race.
 *
 * The second trap is what listening COSTS here: the surface is portalled and
 * does not exist when the listener has to be attached, so the listener goes on
 * the document — and `document.documentElement.getAnimations()` returns the
 * ROOT's own animations, not its descendants'. Collecting there yields an empty
 * set on every run, which is a test that fails identically whether the
 * transition works or not. `document.getAnimations()` is the one that walks the
 * document; the result is then filtered to the element actually under test.
 */
async function transitionsStartedBy(target: () => Element | null, interaction: () => Promise<void>) {
  const captured = new Set<Animation>();
  const capture = () => {
    for (const animation of document.getAnimations()) captured.add(animation);
  };
  document.addEventListener("transitionrun", capture, true);
  await interaction();
  // Up to five frames, not one. Base UI writes `style="transition: none"` on a
  // surface for the frame it opens in — so it cannot animate from a stale
  // position — which means the transition does not exist yet when the first
  // callback runs. One frame passed in isolation and lost roughly one full-suite
  // run in three, which is the same race one level down from the one this helper
  // was written to remove.
  const on = () => [...captured].some((a) => (a.effect as KeyframeEffect | null)?.target === target());
  for (let i = 0; i < 5 && !on(); i++) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    capture();
  }
  document.removeEventListener("transitionrun", capture, true);
  const el = target();
  return [...captured].filter((a) => (a.effect as KeyframeEffect | null)?.target === el);
}

/** Long enough for the open delay to elapse, and then some. */
const past = (ms: number) => new Promise((r) => setTimeout(r, ms + 120));

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function Basic(props: { onOpenChange?: (isOpen: boolean) => void } = {}) {
  return (
    <Tooltip {...props}>
      <Tooltip.Trigger render={<Button isIconOnly aria-label="Duplicate" icon={<Copy />} />} />
      <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
    </Tooltip>
  );
}

describe("the behaviour layer does the behaviour", () => {
  test("nothing is on screen until the trigger is used", () => {
    mount(<Basic />);

    expect(chip()).toBeNull();
    // A tooltip DESCRIBES; it does not own its trigger the way a popover does,
    // so there is no aria-expanded and no aria-haspopup.
    expect(trigger().getAttribute("aria-expanded")).toBeNull();
    expect(trigger().getAttribute("aria-haspopup")).toBeNull();
  });

  test("keyboard focus opens it with NO delay — a Tab press is never accidental", async () => {
    mount(<Basic />);

    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(trigger());
    expect(chip()).not.toBeNull();
  });

  test("the chip is what DESCRIBES the trigger, and this library wires it", async () => {
    mount(<Basic />);

    await userEvent.keyboard("{Tab}");
    const described = trigger().getAttribute("aria-describedby");

    // Base UI 1.7.0 supplies neither of these — measured, not assumed. Without
    // them the whole component is decoration: visible to a pointer and absent
    // to a screen reader, which is the one thing a tooltip cannot be.
    expect(described).toBeTruthy();
    expect(chip()!.getAttribute("role")).toBe("tooltip");
    // The chip's own id, not a guess: the description has to resolve to the
    // element the reader is being pointed at.
    expect(document.getElementById(described!)).toBe(chip());
    expect(document.getElementById(described!)!.textContent).toContain("Duplicate to a brand");
  });

  test("Escape closes it and focus does not move — it never took focus", async () => {
    mount(<Basic />);

    await userEvent.keyboard("{Tab}");
    expect(chip()).not.toBeNull();

    await userEvent.keyboard("{Escape}");
    expect(chip()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    // Still in the DOM while it fades, and no longer open — the distinction the
    // `[data-open]` selector exists to draw.
    if (anyChip()) expect(anyChip()!.hasAttribute("data-open")).toBe(false);
  });

  test("moving focus away closes it", async () => {
    mount(
      <>
        <Basic />
        <button type="button">Elsewhere</button>
      </>,
    );

    await userEvent.keyboard("{Tab}");
    expect(chip()).not.toBeNull();

    await userEvent.keyboard("{Tab}");
    expect(chip()).toBeNull();
  });

  test("controlled: the caller's open state wins", async () => {
    const onOpenChange = vi.fn();
    mount(
      <Tooltip isOpen={false} onOpenChange={onOpenChange}>
        <Tooltip.Trigger render={<Button isIconOnly aria-label="Duplicate" icon={<Copy />} />} />
        <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
      </Tooltip>,
    );

    await userEvent.keyboard("{Tab}");

    expect(onOpenChange).toHaveBeenCalled();
    // The parent refused, so nothing opened.
    expect(chip()).toBeNull();
  });

  test("isDisabled stops it opening without touching the trigger", async () => {
    mount(
      <Tooltip isDisabled>
        <Tooltip.Trigger render={<Button isIconOnly aria-label="Duplicate" icon={<Copy />} />} />
        <Tooltip.Content>Duplicate to a brand</Tooltip.Content>
      </Tooltip>,
    );

    await userEvent.keyboard("{Tab}");

    expect(chip()).toBeNull();
    // The control itself is untouched — still focusable, still enabled.
    expect(document.activeElement).toBe(trigger());
    expect((trigger() as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("the trigger is the caller's control, never one of ours", () => {
  test("render is passed through — the Button keeps its own element and name", async () => {
    mount(<Basic />);
    const t = trigger();

    expect(t.tagName).toBe("BUTTON");
    expect(t.getAttribute("aria-label")).toBe("Duplicate");
    // Button's own data-slot survives, which is the tell that nothing wrapped it.
    expect(t.getAttribute("data-slot")).toBe("tooltip-trigger");
    expect(t.className).toContain("inline-flex");
  });

  test("a DISABLED control does not open it — the platform swallows its pointer events", async () => {
    mount(
      <Tooltip>
        <Tooltip.Trigger
          render={
<Button isIconOnly isDisabled aria-label="Delete" icon={<Trash />} />
          }
        />
        <Tooltip.Content>Read-only in this brand</Tooltip.Content>
      </Tooltip>,
    );
    const t = trigger() as HTMLButtonElement;
    expect(t.disabled).toBe(true);

    await userEvent.hover(t);
    await past(HOVER_INTENT_DELAY_MS);

    // This is the sheet's one wrong claim, recorded rather than worked around:
    // a disabled form control receives no mouse events in Chromium, and it is
    // out of the tab order, so BOTH paths to the tooltip are closed. Explaining
    // why a control is unavailable needs a wrapper the caller owns — the doc
    // carries the recipe. Craft rule 16 is about not ADDING pointer-events:none
    // on top; it cannot give back what `disabled` already takes.
    expect(chip()).toBeNull();
  });
});

describe("timing comes from lib/motion, not from a call site", () => {
  test("hover waits out the intent delay before anything appears", async () => {
    mount(<Basic />);

    await userEvent.hover(trigger());
    // Deliberately shorter than the threshold: a pointer crossing a toolbar
    // must not set off six chips on the way past.
    await new Promise((r) => setTimeout(r, HOVER_INTENT_DELAY_MS / 3));
    expect(chip()).toBeNull();

    await past(HOVER_INTENT_DELAY_MS);
    expect(chip()).not.toBeNull();
  });

  test("it closes immediately on unhover — there is nothing in it to travel to", async () => {
    mount(
      <>
        <Basic />
        <button type="button">Elsewhere</button>
      </>,
    );

    await userEvent.hover(trigger());
    await past(HOVER_INTENT_DELAY_MS);
    expect(chip()).not.toBeNull();

    await userEvent.unhover(trigger());
    await new Promise((r) => setTimeout(r, HOVER_INTENT_CLOSE_MS + 60));
    expect(chip()).toBeNull();
  });

  test("inside a Provider, a neighbour opens instantly after one has closed", async () => {
    mount(
      <Tooltip.Provider>
        <Tooltip>
          <Tooltip.Trigger render={<Button isIconOnly aria-label="First" icon={<Copy />} />} />
          <Tooltip.Content>First</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger render={<Button isIconOnly aria-label="Second" icon={<Copy />} />} />
          <Tooltip.Content>Second</Tooltip.Content>
        </Tooltip>
      </Tooltip.Provider>,
    );
    const [first, second] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="tooltip-trigger"]'),
    ];

    await userEvent.hover(first!);
    await past(HOVER_INTENT_DELAY_MS);
    expect(chip()!.textContent).toContain("First");

    // Well inside the skip window, and well under the open delay: without the
    // provider this assertion is the one that fails.
    await userEvent.hover(second!);
    await new Promise((r) => setTimeout(r, Math.min(HOVER_INTENT_SKIP_MS / 3, 80)));
    expect(chip()!.textContent).toContain("Second");
  });

  test("only ONE tooltip is open at a time, whatever the callers ask for", async () => {
    mount(
      <>
        <Tooltip defaultIsOpen>
          <Tooltip.Trigger render={<Button isIconOnly aria-label="First" icon={<Copy />} />} />
          <Tooltip.Content>First</Tooltip.Content>
        </Tooltip>
        <Tooltip defaultIsOpen>
          <Tooltip.Trigger render={<Button isIconOnly aria-label="Second" icon={<Copy />} />} />
          <Tooltip.Content>Second</Tooltip.Content>
        </Tooltip>
      </>,
    );

    // The behaviour layer keeps a single open tooltip, so the second
    // `defaultIsOpen` renders nothing at all — worth asserting because it is
    // invisible in the source and cost a visual baseline that photographed a
    // button with an empty gap beneath it.
    expect(document.querySelectorAll('[data-slot="tooltip"][data-open]').length).toBe(1);
  });

  test("the enter transition ACTUALLY runs on scale, not just opacity", async () => {
    mount(<Basic />);
    // The chip is not in the DOM until the trigger takes focus, so the capture
    // listens on the document — `transitionrun` bubbles.
    const running = (await transitionsStartedBy(chip, () => userEvent.keyboard("{Tab}"))).map(
      (a) => (a as CSSTransition).transitionProperty,
    );

    // `transitionProperty` on the element looks correct in both the working and
    // the broken version — v4 writes `scale` as a standalone property, so a
    // transition naming `transform` covers none of it. getAnimations() is the
    // only thing that can tell them apart.
    expect(running).toContain("scale");
    expect(running).toContain("opacity");
  });
});

describe("the chip is drawn the way the sheet draws it", () => {
  test("an emphasis chip, not an elevated panel — the decision the sheet exists to make", async () => {
    mount(<Basic />);
    await userEvent.keyboard("{Tab}");
    const el = chip()!;
    await settled(el);
    const cs = getComputedStyle(el);

    // Opaque, dark, and carrying no border: the fill is what separates it from
    // a Menu, and a hairline on a near-black chip is only a smudge.
    expect(cs.backgroundColor).toBe("rgb(29, 27, 25)");
    expect(cs.borderTopWidth).toBe("0px");
    expect(cs.boxShadow).not.toBe("none");
  });

  test("caption type at the 12px floor, at prose leading because it wraps", async () => {
    mount(<Basic />);
    await userEvent.keyboard("{Tab}");
    const cs = getComputedStyle(chip()!);

    expect(cs.fontSize).toBe("12px");
    expect(cs.fontWeight).toBe("500");
    // leading-normal, not leading-flat: a control label never wraps and this
    // always might.
    expect(Number.parseFloat(cs.lineHeight)).toBeGreaterThan(14);
  });

  test("geometry: 8/4 padding, radius-md, a 24px floor", async () => {
    mount(<Basic />);
    await userEvent.keyboard("{Tab}");
    const el = chip()!;
    // The enter transition scales from 0.98, and getBoundingClientRect reports
    // the SCALED box — 24.19 reads as 23.70 and the 24px floor looks broken.
    await settled(el);
    const cs = getComputedStyle(el);

    expect(cs.paddingLeft).toBe("8px");
    expect(cs.paddingRight).toBe("8px");
    expect(cs.paddingTop).toBe("4px");
    expect(cs.paddingBottom).toBe("4px");
    expect(cs.borderRadius).toBe("8px");
    // 4 + 16.2 + 4 clears it on its own; the floor is for a one-word tooltip.
    expect(el.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  });

  test("the measure is capped on the TEXT, so it cannot collide with the viewport cap", async () => {
    mount(
      <Tooltip>
        <Tooltip.Trigger render={<Button isIconOnly aria-label="Delete" icon={<Trash />} />} />
        <Tooltip.Content>
          Removes the file from every brand this workspace owns. It cannot be undone.
        </Tooltip.Content>
      </Tooltip>,
    );
    await userEvent.keyboard("{Tab}");

    const text = document.querySelector<HTMLElement>('[data-slot="tooltip-text"]')!;
    expect(getComputedStyle(text).maxWidth).toBe("256px");
    // Two max-w classes in ONE list and tailwind-merge keeps only the last —
    // which is how Modal's viewport cap never once applied. They are on
    // different elements here, and this is what proves both survived.
    expect(getComputedStyle(chip()!).maxWidth).not.toBe("256px");
    expect(text.getBoundingClientRect().width).toBeLessThanOrEqual(256);
  });

  test("the chip is capped by the space the positioner measured, not by a constant", async () => {
    mount(<Basic />);
    await userEvent.keyboard("{Tab}");
    const el = chip()!;
    const positioner = el.parentElement!;

    // Asserting "it stays on screen" passes on the bug — a fixed cap fits a
    // comfortable viewport. What differs is the number's SOURCE.
    const available = getComputedStyle(positioner).getPropertyValue("--available-height").trim();
    expect(available).toBeTruthy();
    expect(getComputedStyle(el).maxHeight).toBe(available);
  });
});

describe("placement", () => {
  test("top · center by default — below a control in a form covers the next field", async () => {
    mount(<Basic />);
    await userEvent.keyboard("{Tab}");

    expect(chip()!.parentElement!.getAttribute("data-side")).toBe("top");
    expect(chip()!.parentElement!.getAttribute("data-align")).toBe("center");
  });

  test("side and align are forwarded, in our vocabulary", async () => {
    mount(
      <Tooltip>
        <Tooltip.Trigger render={<Button isIconOnly aria-label="Delete" icon={<Trash />} />} />
        <Tooltip.Content side="right" align="start">
          Duplicate to a brand
        </Tooltip.Content>
      </Tooltip>,
    );
    await userEvent.keyboard("{Tab}");

    expect(chip()!.parentElement!.getAttribute("data-side")).toBe("right");
    expect(chip()!.parentElement!.getAttribute("data-align")).toBe("start");
  });

  test("the offset from the trigger is space-sm, and it is a real gap", async () => {
    mount(<Basic />);
    await userEvent.keyboard("{Tab}");

    const gap = trigger().getBoundingClientRect().top - chip()!.getBoundingClientRect().bottom;
    expect(gap).toBeGreaterThanOrEqual(7.5);
    expect(gap).toBeLessThanOrEqual(8.5);
  });
});

describe("Tooltip re-skins under a brand scope, when given somewhere to live", () => {
  /** A hostile brand seed re-bound as inline custom properties, the way a
   *  themed portal scopes its tokens. Only --ui-bg-emphasis matters here. */
  const BRAND = { "--ui-bg-emphasis": "rgb(255, 224, 102)" } as Record<string, string>;

  function Scoped({ withContainer }: { withContainer: boolean }) {
    const [scope, setScope] = useState<HTMLDivElement | null>(null);
    return (
      <div ref={setScope} style={BRAND as React.CSSProperties} id="tooltip-scope">
        <Tooltip>
          <Tooltip.Trigger render={<Button isIconOnly aria-label="Duplicate" icon={<Copy />} />} />
          <Tooltip.Content {...(withContainer ? { container: scope } : {})}>
            Duplicate to a brand
          </Tooltip.Content>
        </Tooltip>
      </div>
    );
  }

  test("WITHOUT container it leaves the scope and paints theme zero", async () => {
    mount(<Scoped withContainer={false} />);
    await userEvent.keyboard("{Tab}");
    const el = chip()!;
    await settled(el);
    // The defect, pinned so the escape hatch below is measured against
    // something real: theme vars are INHERITED, and document.body is not
    // inside the themed subtree.
    expect(el.closest("#tooltip-scope")).toBeNull();
    expect(getComputedStyle(el).backgroundColor).toBe("rgb(29, 27, 25)");
  });

  test("WITH container it inherits the brand", async () => {
    mount(<Scoped withContainer />);
    await userEvent.keyboard("{Tab}");
    const el = chip()!;
    await settled(el);
    expect(el.closest("#tooltip-scope")).not.toBeNull();
    // Asserted as the brand value, not merely "different": a chip that
    // inherited some third thing would pass a difference check.
    expect(getComputedStyle(el).backgroundColor).toBe("rgb(255, 224, 102)");
  });
});
