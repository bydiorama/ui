/**
 * `useScrollEdges`, measured by actually scrolling.
 *
 * The last test is the one that matters most: it is the trap the portal
 * found in use, and a ResizeObserver-only implementation passes every other
 * assertion in this file.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, useCallback, useState } from "react";

import { useScrollEdges } from "@/hooks/use-scroll-edges";

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function Fixture({
  rows = 40,
  isWide = false,
  direction = "ltr",
}: {
  rows?: number;
  isWide?: boolean;
  direction?: "ltr" | "rtl";
}) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const edges = useScrollEdges(node);
  const attach = useCallback((el: HTMLElement | null) => setNode(el), []);

  return (
    <div
      ref={attach}
      dir={direction}
      data-testid="scroller"
      data-top={edges.top || undefined}
      data-bottom={edges.bottom || undefined}
      data-left={edges.left || undefined}
      data-right={edges.right || undefined}
      style={{ height: "150px", width: "200px", overflow: "auto" }}
    >
      <div style={{ width: isWide ? "900px" : "auto" }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} style={{ height: "20px" }}>
            row {i}
          </div>
        ))}
      </div>
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

const el = () => document.querySelector<HTMLElement>('[data-testid="scroller"]')!;
const edge = (name: "top" | "bottom" | "left" | "right") => el().hasAttribute(`data-${name}`);

async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

async function scrollTo({ top, left }: { top?: number; left?: number }) {
  await act(async () => {
    if (top !== undefined) el().scrollTop = top;
    if (left !== undefined) el().scrollLeft = left;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

describe("useScrollEdges", () => {
  test("a container that overflows reports its far edge on FIRST paint", async () => {
    // Commit-time, not effect-time: a list that overflows on mount must not
    // flash without its fade for a frame.
    mount(<Fixture />);
    await settle();
    expect(edge("bottom"), "there is more content below").toBe(true);
    expect(edge("top"), "nothing above yet").toBe(false);
  });

  test("a container that fits reports no edges at all", async () => {
    mount(<Fixture rows={2} />);
    await settle();
    expect(edge("top")).toBe(false);
    expect(edge("bottom")).toBe(false);
  });

  test("scrolling to the end clears the far edge and sets the near one", async () => {
    mount(<Fixture />);
    await settle();

    await scrollTo({ top: 400 });
    expect(edge("top")).toBe(true);

    // All the way down. The fractional-slack allowance is what makes this
    // pass: a container at its true end reports a scrollTop a fraction under
    // scrollHeight - clientHeight, so an exact comparison leaves a fade
    // painted at an edge the user has already reached.
    await scrollTo({ top: el().scrollHeight });
    expect(edge("bottom"), "flush at the bottom").toBe(false);
    expect(edge("top")).toBe(true);
  });

  test("both axes are answered independently", async () => {
    mount(<Fixture isWide />);
    await settle();
    expect(edge("right")).toBe(true);
    expect(edge("left")).toBe(false);

    await scrollTo({ left: 300 });
    expect(edge("left")).toBe(true);
    expect(edge("right")).toBe(true);
  });

  test("RTL: the inline offset is mapped onto PHYSICAL edges", async () => {
    // Two separate mistakes live here and the first hides the second.
    // Chromium and Firefox scroll an RTL container to a NEGATIVE scrollLeft,
    // so the raw value compares wrong at both ends — but taking the
    // magnitude only gets you the distance from the INLINE START, and in RTL
    // that is the physical RIGHT. An abs-only implementation passes nothing
    // here: at rest an RTL container is flush right with its content off to
    // the left, and abs-only reports exactly the opposite. Fade sides are
    // physical, so these edges have to be too.
    mount(<Fixture isWide direction="rtl" />);
    await settle();
    expect(edge("left"), "content extends to the physical left").toBe(true);
    expect(edge("right"), "flush against the physical right").toBe(false);

    // And the far end, so a symmetric mistake cannot pass the test above.
    // Chromium scrolls RTL toward NEGATIVE scrollLeft.
    await scrollTo({ left: -(el().scrollWidth) });
    expect(edge("left"), "now flush against the physical left").toBe(false);
    expect(edge("right"), "content is back off to the right").toBe(true);
  });

  test("CONTENT growing without the container resizing is noticed", async () => {
    // THE TRAP. Rows appended to a list that already fills its box resize
    // NOTHING — the container's border box is identical before and after —
    // so a ResizeObserver alone never fires and the bottom fade stays hidden
    // over content that is now scrollable. A scroll listener does not fire
    // either, because nobody scrolled. Only the commit-time re-measure
    // catches it, and this test fails without it while every other test here
    // still passes.
    mount(<Fixture rows={2} />);
    await settle();
    expect(edge("bottom"), "two rows fit").toBe(false);

    act(() => root!.render(<Fixture rows={40} />));
    await settle();
    await vi.waitFor(() =>
      expect(edge("bottom"), "forty rows do not, and nothing resized").toBe(true),
    );
  });
});
