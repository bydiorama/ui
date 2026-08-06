import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import type { ReactElement } from "react";

import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { Sheet } from "./sheet.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

const panel = () => document.querySelector<HTMLElement>('[data-slot="sheet-panel"]');
const scrim = () => document.querySelector<HTMLElement>('[data-slot="sheet-scrim"]');
const trigger = () => document.querySelector<HTMLElement>('[data-slot="sheet-trigger"]')!;

async function settled(el: Element) {
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

function Basic(props: { isDismissable?: boolean; side?: "left" | "right"; onOpenChange?: (v: boolean) => void } = {}) {
  const { side, ...rest } = props;
  return (
    <Sheet {...rest}>
      <Sheet.Trigger>Open menu</Sheet.Trigger>
      <Sheet.Panel label="Primary navigation" {...(side ? { side } : {})}>
        <a href="#one">One</a>
        <a href="#two">Two</a>
        <Sheet.Close>Done</Sheet.Close>
      </Sheet.Panel>
    </Sheet>
  );
}

describe("Sheet is a dialog, and Base UI provides the behaviour", () => {
  test("nothing is rendered until it is opened", () => {
    mount(<Basic />);
    expect(panel()).toBeNull();
    expect(scrim()).toBeNull();
  });

  test("it is a named modal dialog — an unnamed one announces only 'dialog'", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const p = panel()!;
    expect(p.getAttribute("role")).toBe("dialog");
    // aria-label, not aria-labelledby: there is no Title part, because the
    // design draws no heading inside the panel.
    expect(p.getAttribute("aria-label")).toBe("Primary navigation");
    // NOT aria-modal: Base UI marks the rest of the page `inert`, which is the
    // stronger mechanism — it removes the content from the a11y tree AND from
    // hit-testing, where aria-modal is only a hint. Asserted below by what a
    // user can actually reach, not by an attribute that may never be set.
  });

  test("the page behind is inert while open", async () => {
    const c = mount(
      <>
        <button type="button" id="behind">Behind</button>
        <Basic />
      </>,
    );
    await userEvent.click(trigger());
    await settled(panel()!);
    const behind = c.querySelector<HTMLElement>("#behind")!;
    const marked = behind.closest("[inert], [aria-hidden='true']");
    expect(marked, "nothing outside the drawer was marked inert or aria-hidden").not.toBeNull();
  });

  test("focus moves in on open and RETURNS to the trigger on close", async () => {
    mount(<Basic />);
    const t = trigger();
    await userEvent.click(t);
    await settled(panel()!);
    expect(panel()!.contains(document.activeElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 250));
    // Focus falling to <body> is the classic hand-rolled-drawer failure, and
    // it strands a keyboard user at the top of the page.
    expect(document.activeElement).toBe(t);
  });

  test("isDismissable={false} refuses Escape but NOT the close control", async () => {
    const onOpenChange = vi.fn();
    mount(<Basic isDismissable={false} onOpenChange={onOpenChange} />);
    await userEvent.click(trigger());
    await settled(panel()!);

    await userEvent.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 250));
    // `dismissible` is not a Base UI prop; opting out means cancelling the two
    // incidental reasons. Assert the BEHAVIOUR — a forwarded prop that does
    // not exist is dropped by JSX without a word.
    expect(panel()).not.toBeNull();

    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="sheet-close"]')!);
    await new Promise((r) => setTimeout(r, 250));
    // A panel that cannot be closed at all is worse than one that can be
    // dismissed by accident.
    expect(panel()).toBeNull();
  });

  test("the page behind is inert — Tab cannot leave the panel", async () => {
    mount(
      <>
        <button type="button" id="behind">Behind</button>
        <Basic />
      </>,
    );
    await userEvent.click(trigger());
    await settled(panel()!);
    for (let i = 0; i < 6; i++) await userEvent.keyboard("{Tab}");
    expect(panel()!.contains(document.activeElement)).toBe(true);
  });
});

describe("Sheet paints a drawer, not a dialog", () => {
  test("it is flush to its edge and as tall as the screen", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const box = p.getBoundingClientRect();
    const style = getComputedStyle(p);

    expect(style.position).toBe("fixed");
    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.top)).toBe(0);
    // inset-y-0, not a height: 100vh lies on mobile, and a drawer is as tall
    // as whatever the browser currently calls the viewport.
    expect(Math.round(box.height)).toBe(Math.round(window.innerHeight));
  });

  test("ONLY the two inner corners are rounded, and they mirror with side", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const left = getComputedStyle(panel()!);
    // A fully rounded panel leaves four slivers of scrim in the screen
    // corners — that reads as a modal, not a drawer.
    expect(left.borderTopRightRadius).toBe("16px");
    expect(left.borderBottomRightRadius).toBe("16px");
    expect(left.borderTopLeftRadius).toBe("0px");
    expect(left.borderBottomLeftRadius).toBe("0px");
  });

  test("side=\"right\" is the MIRROR, not a copy", async () => {
    mount(<Basic side="right" />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const style = getComputedStyle(p);
    expect(p.dataset["side"]).toBe("right");
    expect(Math.round(p.getBoundingClientRect().right)).toBe(Math.round(window.innerWidth));
    // Asserted as the mirror of the left case above rather than as four more
    // numbers: a copy-paste that forgot to swap would pass that version.
    expect(style.borderTopLeftRadius).toBe("16px");
    expect(style.borderTopRightRadius).toBe("0px");
  });

  test("the panel is 80% wide, floored and capped", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const style = getComputedStyle(p);
    // 256px is the design's own 80% of a 320px screen, used as the floor
    // because a `fixed` element resolves against the nearest TRANSFORMED
    // ancestor and a percentage silently scopes to a docs cell.
    expect(style.minWidth).toBe("256px");
    // --ui-nav-width, the rail's own width: a Sidebar is what this holds.
    expect(style.maxWidth).toBe("272px");
    const w = p.getBoundingClientRect().width;
    expect(w).toBeGreaterThanOrEqual(256);
    expect(w).toBeLessThanOrEqual(272);
  });

  test("the scrim covers the viewport and uses the scrim ROLE", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const s = scrim()!;
    await settled(s);
    const style = getComputedStyle(s);
    expect(style.position).toBe("fixed");
    // --ui-scrim in light: the design drew this as a raw #98918A29, which is
    // the same value written as a palette step at 16%.
    expect(style.backgroundColor).toBe("rgba(152, 145, 138, 0.16)");
    expect(Math.round(s.getBoundingClientRect().width)).toBe(Math.round(window.innerWidth));
  });

  test("the entrance ACTUALLY animates the panel's position", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const running = panel()!
      .getAnimations()
      .map((a) => (a as CSSTransition).transitionProperty);
    // v4's translate-* writes the standalone `translate` property, so a
    // transition naming `transform` covers nothing and the drawer appears
    // fully open. Modal and Popover both shipped that defect; asserted here
    // through getAnimations() because the class list looks right either way.
    expect(running).toContain("translate");
  });
});

describe("Sheet composes with Sidebar", () => {
  test("the rail's own width and radius give way to the panel's", async () => {
    mount(
      <Sheet>
        <Sheet.Trigger>Open</Sheet.Trigger>
        <Sheet.Panel label="Primary navigation">
          <Sidebar label="Primary" className="h-full w-full rounded-none">
            <Sidebar.Item href="#a">One</Sidebar.Item>
          </Sidebar>
        </Sheet.Panel>
      </Sheet>,
    );
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const rail = p.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    // Asserted as a RELATIONSHIP: Sidebar's w-nav is a fixed 272px meant for a
    // docked rail, and tailwind-merge has to let a consumer's w-full displace
    // it (§5). A hard 256 here would pass while the two silently drifted.
    expect(rail.getBoundingClientRect().width).toBe(p.getBoundingClientRect().width);
    expect(getComputedStyle(rail).borderTopLeftRadius).toBe("0px");
  });
});

describe("Sheet re-skins under a brand scope, when given somewhere to live", () => {
  /** A hostile brand seed re-bound as inline custom properties, the way a
   *  themed portal scopes its tokens. Only --ui-bg-base matters here. */
  const BRAND = { "--ui-bg-base": "rgb(255, 224, 102)" } as Record<string, string>;

  function Scoped({ withContainer }: { withContainer: boolean }) {
    const [scope, setScope] = useState<HTMLDivElement | null>(null);
    return (
      <div ref={setScope} style={BRAND as React.CSSProperties} id="scope">
        <Sheet>
          <Sheet.Trigger>Open</Sheet.Trigger>
          <Sheet.Panel label="Scoped navigation" {...(withContainer ? { container: scope } : {})}>
            <a href="#a">One</a>
          </Sheet.Panel>
        </Sheet>
      </div>
    );
  }

  test("WITHOUT container it leaves the scope and paints theme zero", async () => {
    mount(<Scoped withContainer={false} />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    // The defect, pinned so the escape hatch below is measured against
    // something real: theme vars are INHERITED, and document.body is not
    // inside the themed subtree.
    expect(p.closest("#scope")).toBeNull();
    expect(getComputedStyle(p).backgroundColor).toBe("rgb(255, 255, 255)");
  });

  test("WITH container it inherits the brand", async () => {
    mount(<Scoped withContainer />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    expect(p.closest("#scope")).not.toBeNull();
    // bg-base resolves through the wrapper's own --ui-bg-base rather than the
    // document's. Asserted as the brand value, not merely "different": a panel
    // that inherited some third thing would pass a difference check.
    expect(getComputedStyle(p).backgroundColor).toBe("rgb(255, 224, 102)");
  });
});
