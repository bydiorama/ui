import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { AspectRatio, type AspectRatioName } from "./aspect-ratio.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/**
 * A FIXED width, because that is the only way to observe a ratio.
 *
 * The component's height comes from its width, so a frame in an
 * auto-width container has no defined height and every ratio measures the
 * same nothing. 200px divides into whole pixels for none of the six, which is
 * deliberate — the assertions below compare ratios, not roundings.
 */
const WIDTH = 200;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = `${WIDTH}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const frame = container.querySelector<HTMLElement>('[data-slot="aspect-ratio"]');
  if (!frame) throw new Error("AspectRatio did not render");
  return { frame, container: container! };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const IMG = <img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" />;

describe("AspectRatio shape", () => {
  test.each([
    ["square", 1 / 1],
    ["story", 9 / 16],
    ["portrait", 3 / 4],
    ["landscape", 4 / 3],
    ["card", 1.586 / 1],
    ["screen", 16 / 9],
  ] as Array<[AspectRatioName, number]>)("%s renders at %s", (ratio, expected) => {
    const { frame } = mount(<AspectRatio ratio={ratio}>{IMG}</AspectRatio>);
    const box = frame.getBoundingClientRect();

    // The PAINTED box, not the declared property. `aspect-ratio: 4/3` beside
    // any height utility resolves to the height and reports the declaration
    // unchanged, so reading the declaration cannot tell a working ratio from
    // an overridden one.
    expect(box.width).toBeCloseTo(WIDTH, 1);
    expect(box.width / box.height).toBeCloseTo(expected, 2);
  });

  test("the six ratios are six different shapes", () => {
    const heights = new Set<number>();
    for (const ratio of ["square", "story", "portrait", "landscape", "card", "screen"] as const) {
      const { frame } = mount(<AspectRatio ratio={ratio}>{IMG}</AspectRatio>);
      heights.add(Math.round(frame.getBoundingClientRect().height));
      unmount();
    }
    // Badge shipped with two pixel-identical sizes and every test passed,
    // because nothing ever compared them to each other. Six named ratios that
    // draw five shapes would be the same defect.
    expect(heights.size).toBe(6);
  });

  test("story and screen are inverses, not the same number written twice", () => {
    const of = (ratio: AspectRatioName) => {
      const { frame } = mount(<AspectRatio ratio={ratio}>{IMG}</AspectRatio>);
      const box = frame.getBoundingClientRect();
      const value = box.width / box.height;
      unmount();
      return value;
    };
    // The one mistake this vocabulary exists to prevent: 9/16 written where
    // 16/9 was meant reads correctly in the source and is wrong on the screen.
    expect(of("story") * of("screen")).toBeCloseTo(1, 2);
    expect(of("portrait") * of("landscape")).toBeCloseTo(1, 2);
  });
});

describe("AspectRatio frame", () => {
  test("clips to the soft radius over a recessed well", () => {
    const { frame } = mount(<AspectRatio>{IMG}</AspectRatio>);
    const style = getComputedStyle(frame);

    expect(style.borderRadius).toBe("8px");
    // The clip is what makes the radius mean anything — an unclipped frame
    // draws rounded corners and the image squares them off again.
    expect(style.overflow).toBe("clip");
    // --ui-bg-sunken in light. Asserted as the resolved colour, not the class.
    expect(style.backgroundColor).toBe("rgb(237, 232, 227)");
  });

  test("a child img is sized and cropped by the FRAME, not by itself", () => {
    const { frame, container: c } = mount(<AspectRatio ratio="screen">{IMG}</AspectRatio>);
    const img = c.querySelector("img")!;
    const style = getComputedStyle(img);

    // A 1x1 gif with no sizing of its own would paint 1x1 in the corner. The
    // rule is applied from the outside precisely so the call site does not
    // have to remember these two declarations.
    expect(style.objectFit).toBe("cover");
    const box = img.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    expect(box.width).toBeCloseTo(frameBox.width, 1);
    expect(box.height).toBeCloseTo(frameBox.height, 1);
  });

  test("data attributes expose the ratio without depending on class names", () => {
    const { frame } = mount(<AspectRatio ratio="card">{IMG}</AspectRatio>);
    expect(frame.dataset.slot).toBe("aspect-ratio");
    expect(frame.dataset.ratio).toBe("card");
  });
});

describe("AspectRatio forwarding — §5", () => {
  test("the ref lands on the frame, which is the outermost node", () => {
    const ref = createRef<HTMLDivElement>();
    const { frame } = mount(
      <AspectRatio ratio="landscape" ref={ref}>
        {IMG}
      </AspectRatio>,
    );
    expect(ref.current).toBe(frame);
  });

  test("className displaces the ratio, which is the documented escape hatch", () => {
    const { frame } = mount(
      <AspectRatio ratio="square" className="aspect-[21/9]">
        {IMG}
      </AspectRatio>,
    );
    const box = frame.getBoundingClientRect();
    // The doc promises this works. It only works because tailwind-merge
    // classifies both utilities in the `aspect-ratio` group and drops the
    // component's — if that ever stops, the frame silently stays square and
    // the only evidence is the painted box.
    expect(box.width / box.height).toBeCloseTo(21 / 9, 2);
  });

  test("native props go to the frame", () => {
    const { frame } = mount(
      <AspectRatio id="hero" aria-label="Cover art" role="img">
        {IMG}
      </AspectRatio>,
    );
    expect(frame.id).toBe("hero");
    expect(frame.getAttribute("aria-label")).toBe("Cover art");
  });
});
