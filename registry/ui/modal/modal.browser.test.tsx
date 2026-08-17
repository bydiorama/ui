import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Modal } from "./modal.tsx";

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

const surface = () => document.querySelector<HTMLElement>('[data-slot="modal-surface"]');
const scrim = () => document.querySelector<HTMLElement>('[data-slot="modal-scrim"]');
const trigger = () => document.querySelector<HTMLElement>('[data-slot="modal-trigger"]')!;

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

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function Basic(props: { isDismissable?: boolean; onOpenChange?: (v: boolean) => void } = {}) {
  return (
    <Modal {...props}>
      <Modal.Trigger>New task</Modal.Trigger>
      <Modal.Surface>
        <Modal.Title>New task</Modal.Title>
        <Modal.Description>Give it a name and an owner.</Modal.Description>
        <Modal.Footer>
          <Modal.Close>Cancel</Modal.Close>
          <button type="button">Create task</button>
        </Modal.Footer>
      </Modal.Surface>
    </Modal>
  );
}

describe("The behaviour layer does the behaviour", () => {
  test("opens, and names itself from the title and description", async () => {
    mount(<Basic />);
    expect(surface()).toBeNull();

    await userEvent.click(trigger());
    const s = surface()!;
    expect(s).not.toBeNull();
    expect(s.getAttribute("role")).toBe("dialog");

    const labelledBy = s.getAttribute("aria-labelledby");
    const describedBy = s.getAttribute("aria-describedby");
    expect(document.getElementById(labelledBy!)?.dataset["slot"]).toBe("modal-title");
    expect(document.getElementById(describedBy!)?.dataset["slot"]).toBe("modal-description");
    // No aria-label to drift from what is on screen.
    expect(s.getAttribute("aria-label")).toBeNull();
  });

  test("focus moves into the dialog and returns to the trigger on close", async () => {
    mount(<Basic />);
    const t = trigger();
    await userEvent.click(t);

    await vi.waitFor(() => expect(surface()!.contains(document.activeElement)).toBe(true));

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(surface()).toBeNull());
    // Focus falling to <body> strands a keyboard user at the top of the page.
    expect(document.activeElement).toBe(t);
  });

  test("the page behind is inert while open", async () => {
    mount(
      <>
        <button type="button" data-testid="behind">
          Behind
        </button>
        <Basic />
      </>,
    );
    await userEvent.click(trigger());

    const behind = document.querySelector<HTMLElement>('[data-testid="behind"]')!;
    // The contract that matters is that the page behind is removed from the
    // accessibility tree and the tab order. Base UI marks the outside of the
    // dialog rather than blocking programmatic .focus(), so assert the marking
    // — an assertion about focus() would be testing the mechanism, not the
    // requirement, and would break on any equivalent implementation.
    const marked = behind.closest("[inert], [aria-hidden='true']");
    expect(marked, "nothing outside the dialog was marked inert or aria-hidden").not.toBeNull();
  });

  test("isDismissable={false} keeps Escape from closing it", async () => {
    mount(<Basic isDismissable={false} />);
    await userEvent.click(trigger());
    expect(surface()).not.toBeNull();

    await userEvent.keyboard("{Escape}");
    // Deliberate friction: losing the work would be worse.
    await new Promise((r) => setTimeout(r, 50));
    expect(surface()).not.toBeNull();
  });

  test("an explicit Close still works when isDismissable is false", async () => {
    // Refusing dismissal cancels the escape-key and outside-press reasons
    // only. Cancelling close-press too would make the dialog unclosable —
    // a worse failure than the one the opt-out exists to prevent.
    mount(<Basic isDismissable={false} />);
    await userEvent.click(trigger());
    expect(surface()).not.toBeNull();

    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="modal-close"]')!);
    await vi.waitFor(() => expect(surface()).toBeNull());
  });

  test("Modal.Close dismisses", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());

    const close = document.querySelector<HTMLElement>('[data-slot="modal-close"]')!;
    await userEvent.click(close);
    await vi.waitFor(() => expect(surface()).toBeNull());
  });

  test("onOpenChange reports a boolean, not the library's event object", async () => {
    const onOpenChange = vi.fn();
    mount(<Basic onOpenChange={onOpenChange} />);

    await userEvent.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(onOpenChange.mock.calls[0]).toHaveLength(1);
  });
});

describe("The surface paints the designed dialog", () => {
  test("geometry, elevation and the scrim resolve", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const s = surface()!;
    await settled(s);
    const style = getComputedStyle(s);

    expect(style.borderRadius).toBe("16px");
    expect(style.padding).toBe("16px");
    expect(style.gap).toBe("32px");
    expect(style.backgroundColor).toBe("rgb(253, 252, 251)");
    expect(style.boxShadow).not.toBe("none");

    // `bg-scrim` did not exist as a utility until this component; the scrim is
    // a scheme-only role that was emitted as CSS with no Tailwind name, so an
    // arbitrary `bg-(--ui-scrim)` would have gone unchecked by the gate.
    const scrimStyle = getComputedStyle(scrim()!);
    expect(scrimStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(scrimStyle.position).toBe("fixed");
  });

  test("long content scrolls inside the surface, not the page", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const style = getComputedStyle(surface()!);
    expect(style.overflowY).toBe("auto");
    // Capped to the viewport, or a tall dialog would push its own footer off.
    expect(style.maxHeight).not.toBe("none");
  });

  test("title and description use the designed roles", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(surface()!);

    const title = getComputedStyle(document.querySelector('[data-slot="modal-title"]')!);
    // title-lg is FLUID (ADR 0009): a band, not a value.
    const titlePx = Number.parseFloat(title.fontSize);
    expect(titlePx).toBeGreaterThanOrEqual(17);
    expect(titlePx).toBeLessThanOrEqual(24);
    expect(title.fontWeight).toBe("500");

    const description = getComputedStyle(
      document.querySelector('[data-slot="modal-description"]')!,
    );
    expect(description.fontSize).toBe("14px");
    expect(description.color).toBe("rgb(47, 44, 41)");
  });

  test("the footer separates the dismissing action from the committing one", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const footer = document.querySelector<HTMLElement>('[data-slot="modal-footer"]')!;
    expect(getComputedStyle(footer).justifyContent).toBe("space-between");
  });
});


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

describe("Modal's motion and sizes are real, not declared", () => {
  test("the enter transition ACTUALLY runs on scale, not just opacity", async () => {
    mount(<Basic />);
    // The surface is not in the DOM until the trigger is pressed, so the
    // capture listens on the document — `transitionrun` bubbles.
    const running = (await transitionsStartedBy(surface, () => userEvent.click(trigger()))).map(
      (a) => (a as CSSTransition).transitionProperty,
    );
    // Tailwind v4's scale-* sets the standalone `scale` property, so the
    // original `transition-[opacity,transform]` covered nothing: the dialog
    // snapped to full size while only opacity eased. Asserted through
    // getAnimations() because the class list, the compiled CSS and the
    // computed transitionProperty all looked entirely correct.
    expect(running).toContain("scale");
    expect(running).toContain("opacity");
  });

  test("md and lg are DIFFERENT widths", async () => {
    mount(
      <>
        <Modal defaultIsOpen>
          <Modal.Surface size="md"><Modal.Title>Small</Modal.Title></Modal.Surface>
        </Modal>
        <Modal defaultIsOpen>
          <Modal.Surface size="lg"><Modal.Title>Large</Modal.Title></Modal.Surface>
        </Modal>
      </>,
    );
    const [md, lg] = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="modal-surface"]'));
    // `max-w-md` and `max-w-xl` LOOK like Tailwind's container scale but
    // resolved against this system's spacing scale — 12px and 24px caps that
    // min-w-80 overrode, so both sizes rendered at exactly 320px. Nothing
    // compared them to each other, which is the only test that fails.
    //
    // Asserted on max-width rather than rendered width: the test viewport is
    // narrower than both caps, so `w-full` makes the two render identically
    // there — which is exactly how a 12px cap hid for so long.
    expect(getComputedStyle(md!).maxWidth).toBe("416px");
    expect(getComputedStyle(lg!).maxWidth).toBe("640px");
    expect(getComputedStyle(md!).maxWidth).not.toBe(getComputedStyle(lg!).maxWidth);
  });
});
