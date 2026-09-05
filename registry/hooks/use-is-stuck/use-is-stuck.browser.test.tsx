/**
 * `useIsStuck`, measured by actually scrolling.
 *
 * The state this answers is invisible to the DOM — there is no `:stuck`, no
 * attribute, nothing to query. So every assertion here drives a real scroll
 * in a real scroll container and waits for the observer to fire; an
 * IntersectionObserver is asynchronous by design and reading the hook's
 * return synchronously after `scrollTo` reads the previous answer.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, useCallback, useState } from "react";

import { useIsStuck } from "@/hooks/use-is-stuck";

let host: HTMLDivElement | null = null;
let root: Root | null = null;

/** A scroller with a sticky bar at the top and enough content to move. */
function Fixture({
  offset = 0,
  isHidden = false,
  isDetached = false,
}: {
  offset?: number;
  isHidden?: boolean;
  /** Mirrors Header's `isAffixEnabled ? node : null` off-switch. */
  isDetached?: boolean;
}) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const isStuck = useIsStuck(isDetached ? null : node, offset);
  const attach = useCallback((el: HTMLElement | null) => setNode(el), []);

  return (
    <div data-testid="scroller" style={{ height: "200px", overflowY: "auto" }}>
      {/* Lead-in taller than any offset under test: with a 60px sticky
          offset and only 40px above it, the bar starts ALREADY parked. */}
      <div style={{ height: "120px" }} />
      <div
        ref={attach}
        data-testid="bar"
        data-stuck={isStuck || undefined}
        style={{
          position: "sticky",
          top: `${offset}px`,
          height: "30px",
          background: "red",
          ...(isHidden ? { display: "none" } : {}),
        }}
      />
      <div style={{ height: "1200px" }} />
    </div>
  );
}

function mount(ui: React.ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const stuck = () => document.querySelector('[data-testid="bar"]')!.hasAttribute("data-stuck");

async function scrollTo(top: number) {
  const scroller = document.querySelector<HTMLElement>('[data-testid="scroller"]')!;
  await act(async () => {
    scroller.scrollTop = top;
    // Two frames: one for the scroll to land, one for the observer callback.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

describe("useIsStuck", () => {
  test("false at rest, true once the element parks, false again on the way back", async () => {
    mount(<Fixture />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(stuck(), "a bar the page has not reached is not stuck").toBe(false);

    await scrollTo(300);
    await vi.waitFor(() => expect(stuck()).toBe(true));

    await scrollTo(0);
    await vi.waitFor(() => expect(stuck()).toBe(false));
  });

  test("the offset is the caller's, not a constant", async () => {
    // A bar pinned at `top: 60` parks 60px later than one at `top: 0`. The
    // root margin has to be derived from the caller's own offset — hardcode
    // -1px and this bar reports stuck while it is still travelling.
    mount(<Fixture offset={60} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(stuck()).toBe(false);

    // 40px of lead-in, so the bar reaches its 60px parking line only after
    // the scroller has moved further than the offset.
    await scrollTo(10);
    await vi.waitFor(() => expect(stuck()).toBe(false));

    await scrollTo(400);
    await vi.waitFor(() => expect(stuck()).toBe(true));
  });

  test("a display:none element is NOT reported as stuck", async () => {
    // THE TRAP, found in use. A hidden element has an empty rect, an empty
    // rect has an intersectionRatio of 0, and 0 < 1 — so the naive test
    // answers "stuck" for something that is not on the page. A bar hidden at
    // one breakpoint came back wearing its scrolled ground. The guard is the
    // empty RECT, not `isIntersecting` — under `threshold: [1]` that flag
    // means "fully visible", so it is false for a parked bar too. Drop the
    // rect check and this test fails while every other one here passes.
    mount(<Fixture isHidden />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(stuck()).toBe(false);

    await scrollTo(300);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(stuck(), "hidden is not stuck").toBe(false);
  });

  test("passing null RESETS, rather than freezing the last answer", async () => {
    // The caller's off-switch. Header passes `isAffixEnabled ? node : null`
    // so that a bar toggled out of affix WHILE STUCK does not keep its
    // floating ground with nothing underneath it to float over. A hook that
    // merely skips when the node goes away leaves the last `true` in state
    // forever, and the bar keeps its scrolled treatment at scroll top.
    mount(<Fixture />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await scrollTo(300);
    await vi.waitFor(() => expect(stuck()).toBe(true));

    // Detach exactly as Header does, without moving the scroll position.
    act(() => root!.render(<Fixture isDetached />));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(stuck(), "the state must fall back to false, not stay stuck").toBe(false);
  });

  test("the observer is rooted at the SCROLL CONTAINER, not the viewport", async () => {
    // The bug that hides: a bar pinned inside a scrolling panel sits at a
    // fixed position in the VIEWPORT, so a viewport-rooted observer watches
    // it never move and the state never flips — while the identical code
    // works on a page that scrolls as a whole. The fixture above scrolls an
    // inner div and never moves the page, so every passing assertion in this
    // file is already evidence for the root; this one names it.
    mount(<Fixture />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const pageScrollBefore = window.scrollY;
    await scrollTo(400);
    await vi.waitFor(() => expect(stuck()).toBe(true));
    expect(window.scrollY, "the page itself never scrolled").toBe(pageScrollBefore);
  });
});
