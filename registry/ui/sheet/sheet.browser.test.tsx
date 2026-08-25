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
    // aria-label, not aria-labelledby: this composition renders no
    // Sheet.Title, so `label` is the whole name. With a Title both are set and
    // aria-labelledby wins — asserted further down.
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

  test("the panel carries --ui-shadow-md, not Modal's single-layer sm", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    /*
      Tailwind emits FOUR fully transparent placeholder layers ahead of the
      real shadow — the inset/ring slots, each `rgba(0, 0, 0, 0) 0px 0px 0px
      0px`. So a naive layer count reads 6 and an equality assertion on
      `boxShadow` compares against four things this component never set. Split
      on the colour stops and drop the transparent ones.
    */
    const layers = getComputedStyle(p)
      .boxShadow.split(/,(?=\s*rgba?\()/)
      .map((l) => l.trim())
      .filter((l) => !l.startsWith("rgba(0, 0, 0, 0)"));

    // TWO substantive layers is what separates md from sm, and it is the whole
    // change: sm is the 0.5px/1.5px blur alone, md adds the 1px/3px above it.
    expect(layers).toHaveLength(2);
    expect(layers[0]).toBe("rgba(29, 27, 25, 0.14) 0px 1px 3px 0px");
    expect(layers[1]).toBe("rgba(29, 27, 25, 0.08) 0px 0.5px 1.5px 0px");
    // The panel and the page behind it are BOTH --ui-bg-base, so the scrim
    // leaves a 1.16:1 step in light and this shadow is the rest of the edge.
    expect(getComputedStyle(p).backgroundColor).toBe("rgb(255, 255, 255)");
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

/** A panel with all four regions and a body long enough to scroll. */
function Composed(props: { size?: "sm" | "md" | "lg"; rows?: number; withTitle?: boolean } = {}) {
  const { size, rows = 60, withTitle = true } = props;
  return (
    <Sheet>
      <Sheet.Trigger>Open</Sheet.Trigger>
      <Sheet.Panel label="Filters" side="right" {...(size ? { size } : {})}>
        <Sheet.Header>
          <button type="button" className="size-8 shrink-0">Back</button>
          <Sheet.Close>Close</Sheet.Close>
        </Sheet.Header>
        <Sheet.Body>
          {withTitle && <Sheet.Title>Discipline</Sheet.Title>}
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="h-6 shrink-0">Row {i}</div>
          ))}
        </Sheet.Body>
        <Sheet.Footer>
          <button type="button" className="h-8">Show results</button>
          <button type="button" className="h-8">Clear all</button>
        </Sheet.Footer>
      </Sheet.Panel>
    </Sheet>
  );
}

const header = () => document.querySelector<HTMLElement>('[data-slot="sheet-header"]')!;
const body = () => document.querySelector<HTMLElement>('[data-slot="sheet-body"]')!;
const footer = () => document.querySelector<HTMLElement>('[data-slot="sheet-footer"]')!;

/** Drive a real scroll and let the listener and its re-render land. */
async function scrollBy(el: HTMLElement, top: number) {
  el.scrollTop = top;
  for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(() => r(null)));
}

describe("Sheet has a width axis, and it is capped rather than fixed", () => {
  test("each size resolves its OWN cap, and the three differ", async () => {
    const caps: string[] = [];
    for (const size of ["sm", "md", "lg"] as const) {
      const c = mount(<Composed size={size} rows={2} />);
      await userEvent.click(trigger());
      const p = panel()!;
      await settled(p);
      expect(p.dataset["size"]).toBe(size);
      caps.push(getComputedStyle(p).maxWidth);
      act(() => root?.unmount());
      c.remove();
      root = null;
    }
    // The numbers, because each is a DIFFERENT token and a copy-paste that
    // pointed two sizes at one of them would still produce three data-size
    // attributes: --ui-nav-width, --ui-dialog-width-md, --ui-dialog-width-lg.
    expect(caps).toEqual(["272px", "416px", "640px"]);
    // And that they differ, because `max-w-md`-shaped utilities resolve
    // against this system's SPACING scale — the defect that had every Modal
    // rendering at one width while three sizes were declared.
    expect(new Set(caps).size).toBe(3);
  });

  test("size defaults to sm — the geometry Sheet already shipped", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    expect(p.dataset["size"]).toBe("sm");
    expect(getComputedStyle(p).maxWidth).toBe("272px");
  });
});

describe("Sheet.Body is the only region that scrolls", () => {
  test("the Header and Footer hold their positions while the Body moves", async () => {
    mount(<Composed />);
    await userEvent.click(trigger());
    await settled(panel()!);

    const headerTop = header().getBoundingClientRect().top;
    const footerTop = footer().getBoundingClientRect().top;
    const firstRowTop = body().querySelector("div")!.getBoundingClientRect().top;

    await scrollBy(body(), 120);

    // The defect the parts exist to fix: with the scroll on the panel, a
    // header scrolls away with the content it labels.
    expect(header().getBoundingClientRect().top).toBe(headerTop);
    expect(footer().getBoundingClientRect().top).toBe(footerTop);
    // And the body really did move, or the assertion above proves nothing.
    expect(body().querySelector("div")!.getBoundingClientRect().top).toBeLessThan(firstRowTop - 100);
  });

  test("the hairline arrives on scroll and the 48px lane does NOT move", async () => {
    mount(<Composed />);
    await userEvent.click(trigger());
    await settled(panel()!);

    const h = header();
    const restShadow = getComputedStyle(h).boxShadow;
    const restHeight = h.getBoundingClientRect().height;
    expect(restHeight).toBe(48);

    await scrollBy(body(), 200);
    await settled(h);

    const scrolledShadow = getComputedStyle(h).boxShadow;
    // Asserted as a DIFFERENCE plus the role's own value: pinning one
    // serialisation would pass while both states collapsed to the same thing.
    expect(scrolledShadow).not.toBe(restShadow);
    expect(scrolledShadow).toContain("inset");
    // --ui-border-subtle in light.
    expect(scrolledShadow).toContain("rgb(218, 212, 206)");
    // The whole reason this is a box-shadow and not a border: a border is
    // border-box, so it would take its pixel out of the 32px content lane and
    // pay it back asymmetrically — 7.5 above, 8.5 below.
    expect(h.getBoundingClientRect().height).toBe(restHeight);
  });

  test("the Header's inset is uniform 8 on all four sides", async () => {
    mount(<Composed />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const h = header().getBoundingClientRect();
    const kids = [...header().children].map((c) => c.getBoundingClientRect());
    const left = Math.min(...kids.map((k) => k.left)) - h.left;
    const right = h.right - Math.max(...kids.map((k) => k.right));
    const top = Math.min(...kids.map((k) => k.top)) - h.top;
    const bottom = h.bottom - Math.max(...kids.map((k) => k.bottom));
    for (const [side, gap] of [["left", left], ["right", right], ["top", top], ["bottom", bottom]] as const) {
      expect(gap, `${side} inset`).toBeCloseTo(8, 1);
    }
  });
});

describe("Sheet.Body is reachable by keyboard, but only while it scrolls", () => {
  test("a body that overflows is a NAMED tab stop with a visible ring", async () => {
    mount(<Composed />);
    await userEvent.click(trigger());
    await settled(panel()!);

    const b = body();
    expect(b.dataset["scrollable"]).toBe("true");
    expect(b.tabIndex).toBe(0);
    expect(b.getAttribute("role")).toBe("region");
    // Named from the dialog's own label — a reachable region with no name is
    // as useless as a named one nobody can reach.
    expect(b.getAttribute("aria-label")).toBe("Filters");

    // Driven with real Tab presses, and WALKED rather than counted.
    // `:focus-visible` does not match a programmatic `.focus()` on a div in
    // Chromium, so `b.focus()` reads the ring as absent when it is merely not
    // being shown — and a fixed number of Tabs asserts against whatever
    // happens to be Nth in a focus-trapped dialog.
    for (let i = 0; i < 12 && document.activeElement !== b; i++) {
      await userEvent.keyboard("{Tab}");
    }
    expect(document.activeElement, "never tabbed to the body").toBe(b);
    await settled(b);
    const style = getComputedStyle(b);
    expect(style.outlineStyle).toBe("solid");
    expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
    // INSET: the region is flush with the panel's edges, so an outward ring
    // would be clipped by the panel's own overflow on three sides.
    expect(parseFloat(style.outlineOffset)).toBeLessThan(0);
  });

  test("a body that FITS is not a tab stop at all", async () => {
    mount(<Composed rows={1} />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const b = body();
    // Unconditional tabIndex is what most implementations ship, and it puts a
    // silent tab stop in front of every panel whose content fits.
    expect(b.dataset["scrollable"]).toBeUndefined();
    expect(b.hasAttribute("tabindex")).toBe(false);
    expect(b.hasAttribute("role")).toBe(false);
  });
});

describe("Sheet.Title names the dialog", () => {
  test("with a Title, the name comes from the Title rather than the label", async () => {
    mount(<Composed rows={2} />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const titleId = document.querySelector('[data-slot="sheet-title"]')!.id;
    expect(titleId).toBeTruthy();
    // Both are set and aria-labelledby WINS, which is why the doc says the two
    // must say the same thing.
    expect(p.getAttribute("aria-labelledby")).toBe(titleId);
    expect(p.getAttribute("aria-label")).toBe("Filters");
  });

  test("without a Title, the label is still the whole name", async () => {
    mount(<Composed rows={2} withTitle={false} />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    expect(document.querySelector('[data-slot="sheet-title"]')).toBeNull();
    expect(p.getAttribute("aria-label")).toBe("Filters");
  });
});

describe("Sheet.Footer stacks", () => {
  test("its actions are full width and stacked, not Modal's row", async () => {
    mount(<Composed rows={2} />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const f = footer();
    expect(getComputedStyle(f).flexDirection).toBe("column");
    const [a, b] = [...f.children].map((c) => c.getBoundingClientRect());
    // A panel capped at 272-416px has no room for two side by side.
    expect(a!.width).toBe(b!.width);
    expect(b!.top).toBeGreaterThan(a!.bottom - 1);
    // 16 + 32 + 8 + 32 + 16.
    expect(f.getBoundingClientRect().height).toBe(104);
  });
});
