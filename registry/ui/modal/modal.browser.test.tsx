import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useRef } from "react";
import type { ReactElement } from "react";

import { Card } from "@/ui/card/card.tsx";
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

    // Radius, edge and shadow are asserted against Card below, not here.
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

    const titleEl = document.querySelector<HTMLElement>('[data-slot="modal-title"]')!;
    const title = getComputedStyle(titleEl);
    // title-sm, at the role's OWN weight (ADR 0020 §3) — which is the 600 the
    // redraw asks for, so no type-role exception is declared. title-sm is
    // FLUID (ADR 0009), so its size is compared to Card's title below rather
    // than pinned here; the weight is not fluid and is read off the role.
    expect(titleEl.classList.contains("text-title-sm")).toBe(true);
    expect(title.fontWeight).toBe(
      getComputedStyle(titleEl).getPropertyValue("--ui-text-title-sm-weight").trim(),
    );
    expect(title.fontWeight).toBe("600");

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

/**
 * #23: the owner redrew the confirm dialog as CARD'S surface — same corner,
 * same hairline, same lift, same header type — so a dialog raised over cards
 * reads as the same object as them.
 *
 * Asserted as a RELATIONSHIP, rendered side by side, never as numbers: pinning
 * "24px" on each would pass while Card and Modal drifted apart, which is the
 * only failure that matters here. Every one of these failed before the change:
 * Modal was 16px, had no border at all, carried sm's single shadow layer, and
 * set its title at title-lg / 500.
 */
describe("Modal wears Card's surface (#23)", () => {
  function ModalBesideCard() {
    return (
      <>
        <Card>
          <Card.Header>Members</Card.Header>
        </Card>
        <Modal defaultIsOpen>
          <Modal.Surface>
            <Modal.Title>Remove member?</Modal.Title>
            <Modal.Description>They lose access to this brand profile.</Modal.Description>
          </Modal.Surface>
        </Modal>
      </>
    );
  }

  test("same radius, same hairline, same shadow", async () => {
    mount(<ModalBesideCard />);
    const s = surface()!;
    await settled(s);
    const modal = getComputedStyle(s);
    const card = getComputedStyle(document.querySelector('[data-slot="card"]')!);

    expect(modal.borderTopLeftRadius).toBe(card.borderTopLeftRadius);
    expect(modal.borderBottomRightRadius).toBe(card.borderBottomRightRadius);
    // The radius-xl step, not radius-lg — a sanity check that the comparison
    // is not two zeros agreeing.
    expect(Number.parseFloat(modal.borderTopLeftRadius)).toBeGreaterThan(16);

    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      expect(modal[`border${side}Style`], side).toBe("solid");
      expect(modal[`border${side}Width`], side).toBe(card[`border${side}Width`]);
      expect(modal[`border${side}Color`], side).toBe(card[`border${side}Color`]);
    }
    expect(modal.borderTopWidth).toBe("1px");

    // The whole shadow list, transparent placeholder layers included: both
    // elements are built by the same Tailwind utility, so they must match
    // byte for byte. sm is ONE substantive layer and md two, so the old
    // value cannot satisfy this.
    expect(modal.boxShadow).toBe(card.boxShadow);
  });

  test("the title is Card.Header's title: same role, size, weight and inset", async () => {
    mount(<ModalBesideCard />);
    await settled(surface()!);
    const modalTitle = document.querySelector<HTMLElement>('[data-slot="modal-title"]')!;
    const cardTitle = document.querySelector<HTMLElement>('[data-slot="card-title"]')!;
    const m = getComputedStyle(modalTitle);
    const c = getComputedStyle(cardTitle);

    // Same viewport, same fluid role: these must be equal to the pixel.
    expect(m.fontSize).toBe(c.fontSize);
    expect(m.fontWeight).toBe(c.fontWeight);
    expect(m.lineHeight).toBe(c.lineHeight);
    expect(m.letterSpacing).toBe(c.letterSpacing);
    expect(m.fontFamily).toBe(c.fontFamily);

    // Card puts its unboxed inset on the HEADER, Modal on the title itself
    // (it has no header row) — so compare where the TEXT starts, measured
    // from each surface's own border box.
    const inset = (text: HTMLElement, box: Element) =>
      text.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(text).paddingLeft) -
      box.getBoundingClientRect().left;
    expect(inset(modalTitle, surface()!)).toBeCloseTo(
      inset(cardTitle.parentElement!, document.querySelector('[data-slot="card"]')!) +
        Number.parseFloat(getComputedStyle(cardTitle).paddingLeft),
      1,
    );
  });

  test("the description shares the title's left edge", async () => {
    mount(<ModalBesideCard />);
    await settled(surface()!);
    const textStart = (slot: string) => {
      const el = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
      return el.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(el).paddingLeft);
    };
    expect(textStart("modal-description")).toBeCloseTo(textStart("modal-title"), 1);
  });
});

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


describe("Modal.Surface chooses where focus lands, in its own terms (#28)", () => {
  // Two controls ahead of the target, so the default (the first tabbable
  // element) and the requested one cannot coincide.
  function Fixture({ useFunctions = false }: { useFunctions?: boolean }) {
    const targetRef = useRef<HTMLButtonElement>(null);
    const afterRef = useRef<HTMLButtonElement>(null);
    return (
      <Modal>
        <Modal.Trigger>Open</Modal.Trigger>
        <button ref={afterRef} type="button">After close</button>
        <Modal.Surface
          initialFocus={useFunctions ? () => targetRef.current : targetRef}
          finalFocus={useFunctions ? () => afterRef.current : afterRef}
        >
          <button type="button">First</button>
          <button type="button">Second</button>
          <button ref={targetRef} type="button">Target</button>
        </Modal.Surface>
      </Modal>
    );
  }

  const named = (name: string) =>
    Array.from(document.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent === name)!;

  for (const useFunctions of [false, true]) {
    const form = useFunctions ? "a function" : "a ref";

    test(`initialFocus as ${form} lands on the target, not the first tabbable element`, async () => {
      mount(<Fixture useFunctions={useFunctions} />);
      await userEvent.click(trigger());
      await vi.waitFor(() => expect(surface()).not.toBeNull());
      await expect.poll(() => document.activeElement?.textContent).toBe("Target");
    });

    test(`finalFocus as ${form} receives focus on close, instead of the trigger`, async () => {
      mount(<Fixture useFunctions={useFunctions} />);
      await userEvent.click(trigger());
      await vi.waitFor(() => expect(surface()).not.toBeNull());
      await expect.poll(() => document.activeElement?.textContent).toBe("Target");
      await userEvent.keyboard("{Escape}");
      await expect.poll(() => document.activeElement).toBe(named("After close"));
    });
  }

  test("without them the defaults stand, and a function finding nothing keeps them", async () => {
    for (const props of [{}, { initialFocus: () => null, finalFocus: () => null }]) {
      mount(
        <Modal>
          <Modal.Trigger>Open</Modal.Trigger>
          <Modal.Surface {...props}>
            <button type="button">First</button>
            <button type="button">Target</button>
          </Modal.Surface>
        </Modal>,
      );
      await userEvent.click(trigger());
      await vi.waitFor(() => expect(surface()).not.toBeNull());
      await expect.poll(() => surface()!.contains(document.activeElement)).toBe(true);
      expect(document.activeElement?.textContent).not.toBe("Target");
      await userEvent.keyboard("{Escape}");
      await expect.poll(() => document.activeElement).toBe(trigger());
      act(() => root?.unmount());
      container?.remove();
      root = null; container = null;
    }
  });
});
