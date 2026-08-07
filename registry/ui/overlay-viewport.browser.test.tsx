/**
 * One rule, asserted across every component that anchors a panel to a trigger.
 *
 * Base UI flips and shifts by default, so at a comfortable window size an
 * anchored panel already appears to behave — it visibly moves out of the way
 * near an edge. That is the half that works, and it is why the other half went
 * unnoticed: repositioning cannot make a panel SMALLER than the space it lands
 * in. Every panel in this library carried a fixed `max-h-64` — a flat 256px
 * with no knowledge of the window — so on a short viewport the panel ran past
 * the bottom and the rows below the fold could not be reached by pointer at
 * all.
 *
 * `check:overlays` enforces that the constraint is declared. This file proves
 * it has an effect, which is a different question: the gate reads source, and
 * source has been the least trustworthy layer in this repo from the start.
 *
 * It lives outside any one component's folder deliberately — the rule is the
 * system's, not Select's (§7c).
 */
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Button } from "@/ui/button/button.tsx";
import { Multiselect, type MultiselectItem } from "@/ui/multiselect/multiselect.tsx";
import { Popover } from "@/ui/popover/popover.tsx";
import { Select, type SelectItem } from "@/ui/select/select.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/**
 * Pins the trigger into a viewport CORNER.
 *
 * The bug only exists at an edge, so a component rendered in the middle of the
 * page proves nothing. Bottom-right is the corner that exercises both axes and
 * both the flip (there is no room below) and the shift (none to the right).
 */
function mountAt(ui: ReactElement, corner: { bottom: number; right: number }) {
  container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    bottom: `${corner.bottom}px`,
    right: `${corner.right}px`,
    width: "220px",
  });
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

async function settled(el: Element) {
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

/** Long enough that an unconstrained panel MUST overflow a short viewport. */
const MANY: SelectItem[] = Array.from({ length: 40 }, (_, i) => ({
  value: `v${i}`,
  label: `Service number ${i + 1}`,
}));
const MANY_MULTI: MultiselectItem[] = MANY.map(({ value, label }) => ({ value, label }));

const CASES: Array<{ name: string; slot: string; ui: ReactElement }> = [
  {
    name: "Select",
    slot: "select-panel",
    ui: <Select label="Services" items={MANY} />,
  },
  {
    name: "Multiselect",
    slot: "multiselect-panel",
    ui: <Multiselect label="Services" items={MANY_MULTI} />,
  },
  {
    name: "Popover",
    slot: "popover-panel",
    ui: (
      <Popover>
        <Popover.Trigger render={<Button>Open</Button>} />
        <Popover.Panel>
          <div style={{ height: 1200 }}>Tall contents</div>
        </Popover.Panel>
      </Popover>
    ),
  },
];

describe("an anchored panel never renders outside the viewport", () => {
  for (const { name, slot, ui } of CASES) {
    test(`${name} stays inside when opened in the bottom-right corner`, async () => {
      const c = mountAt(ui, { bottom: 8, right: 8 });
      // Whatever the component's trigger is — a Select trigger, a Multiselect
      // combobox, a Button — it is the one focusable thing rendered.
      const trigger = c.querySelector<HTMLElement>("button, [role='combobox']")!;
      await userEvent.click(trigger);

      const panel = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
      expect(panel, `${name}: no panel opened, so nothing was tested`).not.toBeNull();
      await settled(panel);

      const box = panel.getBoundingClientRect();
      // Half a pixel of slack for sub-pixel positioning, and no more. This is
      // an assertion about CONTAINMENT, so it must not be loose enough to pass
      // a panel hanging off the edge.
      expect(box.top, `${name}: top edge above the viewport`).toBeGreaterThanOrEqual(-0.5);
      expect(box.left, `${name}: left edge outside the viewport`).toBeGreaterThanOrEqual(-0.5);
      expect(box.bottom, `${name}: runs past the bottom`).toBeLessThanOrEqual(window.innerHeight + 0.5);
      expect(box.right, `${name}: runs past the right`).toBeLessThanOrEqual(window.innerWidth + 0.5);
    });
  }

  test("the cap TRACKS the measured space — it is not a constant", async () => {
    // The containment assertions above do NOT distinguish the fix from the
    // bug, and it is worth being precise about why: the old `max-h-64` is a
    // flat 256px, which fits inside this test viewport perfectly well, so a
    // panel built the broken way still lands fully on screen here. Probed
    // exactly that way — all four containment cases passed against the fixed
    // cap. They are worth keeping as the statement of the rule; they are not
    // worth trusting as its proof.
    //
    // What separates the two is where the number COMES FROM. Base UI measures
    // the space it found and publishes it as `--available-height`; the fix
    // says the panel is at most that, so the resolved max-height must equal
    // the measurement. A constant cap cannot, at any viewport size.
    const c = mountAt(<Select label="Services" items={MANY} />, { bottom: 8, right: 8 });
    await userEvent.click(c.querySelector<HTMLElement>("button")!);
    const panel = document.querySelector<HTMLElement>('[data-slot="select-panel"]')!;
    await settled(panel);

    const positioner = panel.parentElement!;
    const available = Number.parseFloat(
      getComputedStyle(positioner).getPropertyValue("--available-height"),
    );
    expect(available, "Base UI published no measurement to constrain against").toBeGreaterThan(0);
    expect(Number.parseFloat(getComputedStyle(panel).maxHeight)).toBeCloseTo(available, 0);

    // And the content really is long enough that the cap has to do something.
    expect(panel.scrollHeight, "the list is not long enough to be testing a cap")
      .toBeGreaterThan(available);
  });
});
