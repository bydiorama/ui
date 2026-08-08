import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { ImageEdit } from "./image-edit.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/** A loadable SVG of a chosen aspect, so naturalWidth/Height are real. */
const image_ = (w: number, h: number) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#888"/></svg>`,
  );

/** Waits for the picture to load, which is what unlocks the cover fit. */
async function loaded(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth) return;
  await act(async () => {
    await new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  });
}

/**
 * The four corners of the PAINTED picture, in viewport pixels.
 *
 * Read back out of the DOM rather than recomputed from the component's own
 * formula, which would only prove the formula equals itself. The only thing
 * duplicated here is `object-contain`, and that is a browser behaviour: the
 * scale and the rotation come from the resolved transform MATRIX.
 */
function paintedQuad(img: HTMLImageElement) {
  const el = img.getBoundingClientRect();
  // Undo the transform to recover the element's own box, then find the picture
  // inside it under object-contain.
  const m = new DOMMatrix(getComputedStyle(img).transform);
  const boxW = img.offsetWidth;
  const boxH = img.offsetHeight;
  const fit = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const pw = img.naturalWidth * fit;
  const ph = img.naturalHeight * fit;
  // The element's untransformed centre is the transformed rect's centre: every
  // transform here is centred (translate, rotate and scale about the middle).
  const cx = el.left + el.width / 2;
  const cy = el.top + el.height / 2;
  return [
    [-pw / 2, -ph / 2],
    [pw / 2, -ph / 2],
    [pw / 2, ph / 2],
    [-pw / 2, ph / 2],
  ].map(([x, y]) => {
    // Rotation and scale only — the translation is already in `el`'s centre.
    const p = new DOMMatrix().rotateSelf(0, 0, rotationOf(m)).scaleSelf(scaleOf(m)).transformPoint(
      new DOMPoint(x, y),
    );
    return { x: cx + p.x, y: cy + p.y };
  });
}

const scaleOf = (m: DOMMatrix) => Math.hypot(m.a, m.b);
const rotationOf = (m: DOMMatrix) => (Math.atan2(m.b, m.a) * 180) / Math.PI;

/** Is a point inside the (convex) quad? */
function inside(quad: Array<{ x: number; y: number }>, px: number, py: number) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i]!;
    const b = quad[(i + 1) % 4]!;
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (Math.abs(cross) < 0.5) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** The guarantee, stated once: no corner of the crop falls off the picture. */
function cropIsCovered(img: HTMLImageElement, crop: HTMLElement) {
  const quad = paintedQuad(img);
  const c = crop.getBoundingClientRect();
  // A pixel of slack, because the cover fit lands exactly on the boundary at
  // 100% and floating point does not respect "exactly".
  const e = 1;
  return (
    inside(quad, c.left + e, c.top + e) &&
    inside(quad, c.right - e, c.top + e) &&
    inside(quad, c.right - e, c.bottom - e) &&
    inside(quad, c.left + e, c.bottom - e)
  );
}

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = "384px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const q = <T extends HTMLElement>(slot: string) =>
    container!.querySelector<T>(`[data-slot="${slot}"]`);
  return {
    container: container!,
    root: q("image-edit")!,
    stage: q("image-edit-stage")!,
    crop: q("image-edit-crop")!,
    image: q<HTMLImageElement>("image-edit-image")!,
    q,
  };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/** The translate() component of the image's transform, in px. */
function translationOf(el: HTMLElement) {
  const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform);
  if (!match) throw new Error(`no translate in ${el.style.transform}`);
  return { x: Number.parseFloat(match[1]!), y: Number.parseFloat(match[2]!) };
}

function key(el: HTMLElement, k: string, shiftKey = false) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, shiftKey, bubbles: true, cancelable: true }));
  });
}

describe("ImageEdit stage", () => {
  test("is the media ground, not the accent-derived emphasis role", () => {
    const { stage } = mount(<ImageEdit src={PIXEL} alt="" />);
    // --ui-bg-media in light. Painted with --ui-bg-emphasis, as the sheet
    // draws it, this would be the BRAND colour — #ffe066 under the stress
    // seed — and every colour in the picture judged against it.
    expect(getComputedStyle(stage).backgroundColor).toBe("rgb(29, 27, 25)");
    expect(getComputedStyle(stage).height).toBe("260px");
  });

  test("is focusable and names itself", () => {
    const { stage } = mount(<ImageEdit src={PIXEL} alt="" cropLabel="Crop area" />);
    expect(stage.getAttribute("role")).toBe("group");
    expect(stage.getAttribute("aria-label")).toBe("Crop area");
    expect(stage.tabIndex).toBe(0);

    // The keyboard path is ANNOUNCED, not discovered — the sheet draws no
    // affordance for it at all.
    const hintId = stage.getAttribute("aria-describedby")!;
    expect(document.getElementById(hintId)!.textContent).toContain("arrow keys");
  });

  /**
   * ONE picture, which is the fix for the doubling.
   *
   * The first version drew it twice — dimmed across the stage and again inside
   * the crop — and the two could never align, because each was
   * `object-contain` inside a different box (384x260 against 240x168) and so
   * resolved to a different scale and offset. Rotating showed both quads at
   * once. A count is what distinguishes the two versions; the transforms were
   * identical in both.
   */
  test("draws the picture exactly once", () => {
    const { container: c, q } = mount(<ImageEdit src={PIXEL} alt="Abstract gradient" />);
    const images = c.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(q<HTMLImageElement>("image-edit-image")!.alt).toBe("Abstract gradient");
  });

  test("the crop dims what is outside it without a second copy", () => {
    const { crop } = mount(<ImageEdit src={PIXEL} alt="" />);
    // A spread larger than the stage: everything outside the window is dimmed,
    // nothing inside is, and it follows border-radius — which is how the
    // circular mask gets a circular hole.
    const shadow = getComputedStyle(crop).boxShadow;
    expect(shadow).not.toBe("none");
    expect(shadow).toContain("9999px");
  });
});

describe("ImageEdit crop window", () => {
  test("rect is the sheet's 240x168 and carries corner marks", () => {
    const { crop, q } = mount(<ImageEdit src={PIXEL} alt="" />);
    const box = crop.getBoundingClientRect();
    expect(Math.round(box.width)).toBe(240);
    expect(Math.round(box.height)).toBe(168);
    expect(q("image-edit-handles")).not.toBeNull();
  });

  test("circle is 168px round and has NO corner marks", () => {
    const { crop, q } = mount(<ImageEdit src={PIXEL} alt="" shape="circle" />);
    const box = crop.getBoundingClientRect();
    expect(Math.round(box.width)).toBe(168);
    expect(Math.round(box.height)).toBe(168);
    expect(parseFloat(getComputedStyle(crop).borderRadius)).toBeGreaterThan(80);
    // A round crop cannot deliver the rectangle a corner handle promises, and
    // the sheet draws none on that row.
    expect(q("image-edit-handles")).toBeNull();
  });

  test("the two shapes are different shapes", () => {
    const rect = mount(<ImageEdit src={PIXEL} alt="" />).crop.getBoundingClientRect();
    unmount();
    const circle = mount(<ImageEdit src={PIXEL} alt="" shape="circle" />).crop.getBoundingClientRect();
    expect(Math.round(rect.width)).not.toBe(Math.round(circle.width));
  });

  test("the window's edge is ink ON MEDIA, so it holds over any photograph", () => {
    const { crop } = mount(<ImageEdit src={PIXEL} alt="" />);
    const style = getComputedStyle(crop);
    expect(style.borderStyle).toBe("solid");
    // --ui-text-on-media (neutral-95), identical in both schemes.
    expect(style.borderColor).toBe("rgb(246, 243, 240)");
  });

  test("the corner marks are decoration and carry no handlers", () => {
    const { q } = mount(<ImageEdit src={PIXEL} alt="" />);
    const handles = q("image-edit-handles")!;
    // The window does not resize — the image moves — so a mark that looked
    // interactive but did nothing would be worse than one that looks static.
    expect(handles.getAttribute("aria-hidden")).toBe("true");
    expect(handles.querySelectorAll("button")).toHaveLength(0);
  });
});

describe("ImageEdit keyboard path — the one the sheet does not draw", () => {
  test("arrows move the image, and Shift moves it further", async () => {
    // Zoomed past the cover fit, so there IS somewhere to pan to. At exactly
    // 100% the picture covers the crop and nothing more, and the assertion
    // below that it does not move is the other half of the same rule.
    const { stage, image } = mount(<ImageEdit src={image_(1600, 900)} alt="" defaultZoom={200} />);
    await loaded(image);
    expect(translationOf(image)).toEqual({ x: 0, y: 0 });

    key(stage, "ArrowRight");
    expect(translationOf(image).x).toBe(8);
    key(stage, "ArrowDown");
    expect(translationOf(image).y).toBe(8);
    key(stage, "ArrowLeft");
    key(stage, "ArrowUp");
    expect(translationOf(image)).toEqual({ x: 0, y: 0 });

    key(stage, "ArrowRight", true);
    // A coarse step, so crossing a large picture does not take fifty presses.
    expect(translationOf(image).x).toBe(32);
  });

  /**
   * The clamp binds on the axis where the cover fit is TIGHT, and only there.
   *
   * A 600x900 portrait fits the stage at 173x260 and has to grow to 240 wide
   * to cover the crop — so horizontally the picture is exactly the crop's width
   * and cannot move at all, while vertically it is 361 tall against a 168 crop
   * and has room. Asserting "it never moves at 100%" would have been wrong: a
   * 16:9 already over-covers at 100% and pans perfectly legitimately.
   */
  test("at 100% it is pinned on the axis the cover fit binds, and free on the other", async () => {
    const { stage, image } = mount(<ImageEdit src={image_(600, 900)} alt="" defaultZoom={100} />);
    await loaded(image);

    key(stage, "ArrowRight", true);
    key(stage, "ArrowLeft", true);
    expect(translationOf(image).x, "the tight axis moved").toBe(0);

    key(stage, "ArrowDown", true);
    expect(translationOf(image).y, "the free axis did not move").toBe(32);
  });

  /**
   * The trap this test exists for: a handler that calls preventDefault on
   * EVERY key swallows Tab and Escape, and the dialog can then only be left
   * with a pointer — trading one SC 2.1.1 failure for a worse one.
   */
  test("keys it does not handle are left alone", () => {
    const { stage } = mount(<ImageEdit src={PIXEL} alt="" />);
    for (const k of ["Tab", "Escape", "a"]) {
      const event = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true });
      act(() => {
        stage.dispatchEvent(event);
      });
      expect(event.defaultPrevented, `${k} was swallowed`).toBe(false);
    }
    const arrow = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    act(() => {
      stage.dispatchEvent(arrow);
    });
    // …and the ones it does handle ARE prevented, or the page scrolls.
    expect(arrow.defaultPrevented).toBe(true);
  });
});

describe("ImageEdit controls", () => {
  test("zoom and rotation are real sliders with real values", () => {
    const { container: c } = mount(
      <ImageEdit src={PIXEL} alt="" defaultZoom={128} hasRotation defaultRotation={-12} />,
    );
    const sliders = c.querySelectorAll<HTMLInputElement>('input[type="range"]');
    expect(sliders).toHaveLength(2);
    expect(sliders[0]!.value).toBe("128");
    expect(sliders[1]!.value).toBe("-12");
  });

  test("rotation is opt-in — one control by default", () => {
    const { container: c } = mount(<ImageEdit src={PIXEL} alt="" />);
    expect(c.querySelectorAll('input[type="range"]')).toHaveLength(1);
    expect(c.querySelectorAll('[data-slot="image-edit-control"]')).toHaveLength(1);
  });

  test("the readouts carry their units and are not announced twice", () => {
    const { container: c } = mount(
      <ImageEdit src={PIXEL} alt="" defaultZoom={128} hasRotation defaultRotation={-12} />,
    );
    const values = [...c.querySelectorAll('[data-slot="image-edit-control-value"]')];
    expect(values.map((v) => v.textContent)).toEqual(["128%", "−12°"]);
    // The slider already announces its value; hearing it twice teaches nothing.
    for (const v of values) expect(v.getAttribute("aria-hidden")).toBe("true");
  });

  test("changing the zoom scales the picture", () => {
    const onZoomChange = vi.fn();
    const { container: c, image } = mount(
      <ImageEdit src={PIXEL} alt="" defaultZoom={100} onZoomChange={onZoomChange} />,
    );
    const before = Number(/scale\(([\d.]+)\)/.exec(image.style.transform)![1]);

    const slider = c.querySelector<HTMLInputElement>('input[type="range"]')!;
    act(() => {
      // A real input event, which is what Base UI listens for.
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!.call(slider, "200");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onZoomChange).toHaveBeenCalled();
    const after = Number(
      /scale\(([\d.]+)\)/.exec(
        c.querySelector<HTMLImageElement>('[data-slot="image-edit-image"]')!.style.transform,
      )![1],
    );
    // Doubled RELATIVE to whatever 100% resolved to. An absolute number would
    // be asserting the cover fit, which is a different claim and is measured
    // by the coverage tests above.
    expect(after / before).toBeCloseTo(2, 2);
  });

  test("the transform composes translate, then rotate, then scale", () => {
    const { image } = mount(
      <ImageEdit src={PIXEL} alt="" defaultZoom={150} hasRotation defaultRotation={-12} />,
    );
    // ORDER matters: written as Tailwind's standalone properties the browser
    // picks the order, and a rotation then swings the pan around with it —
    // which reads as the image sliding sideways when you straighten it. The
    // scale is left as a wildcard because it now carries the cover fit.
    expect(image.style.transform).toMatch(
      /^translate\(0px, 0px\) rotate\(-12deg\) scale\([\d.]+\)$/,
    );
  });

  test("a controlled zoom does not move itself", () => {
    const { container: c, image } = mount(<ImageEdit src={PIXEL} alt="" zoom={128} />);
    const before = image.style.transform;
    const slider = c.querySelector<HTMLInputElement>('input[type="range"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!.call(slider, "200");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Controlled means the caller decides. §4 — and useControllableState is
    // the one implementation, never a bespoke one.
    expect(image.style.transform).toBe(before);
  });
});

/**
 * The guarantee the whole cover fit exists for: at 100% the crop is FULL.
 *
 * Before this, 100% meant "contained in the stage", which promised nothing
 * about the crop — and the crop is what the user gets back. Every case below
 * fails against that version.
 */
describe("ImageEdit never hands back a crop with a hole in it", () => {
  test.each([
    ["16:9", 1600, 900],
    ["4:3", 1200, 900],
    ["panorama", 3000, 600],
    ["portrait", 600, 900],
    ["very tall", 600, 3000],
  ])("%s fills the crop at 100%%", async (_name, w, h) => {
    const { image, crop } = mount(<ImageEdit src={image_(w, h)} alt="" defaultZoom={100} />);
    await loaded(image);
    expect(cropIsCovered(image, crop)).toBe(true);
  });

  test.each([0, -11, -20, -27, -45, 45])("still fills it at %s degrees", async (deg) => {
    const { image, crop } = mount(
      <ImageEdit src={image_(1600, 900)} alt="" defaultZoom={100} hasRotation defaultRotation={deg} />,
    );
    await loaded(image);
    // A fitted 16:9 is 384x216 and the crop's rotated box needs 283x240 at
    // -20 degrees, so the old model opened the corners here.
    expect(cropIsCovered(image, crop)).toBe(true);
  });

  test("the circular mask is covered too", async () => {
    const { image, crop } = mount(
      <ImageEdit src={image_(600, 3000)} alt="" shape="circle" defaultZoom={100} />,
    );
    await loaded(image);
    expect(cropIsCovered(image, crop)).toBe(true);
  });

  test("panning cannot drag the crop off the picture", async () => {
    const { stage, image, crop } = mount(
      <ImageEdit src={image_(1600, 900)} alt="" defaultZoom={120} />,
    );
    await loaded(image);
    // Far more than any overhang, in every direction.
    for (const k of ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"]) {
      for (let i = 0; i < 60; i++) key(stage, k, true);
      expect(cropIsCovered(image, crop), `after holding ${k}`).toBe(true);
    }
  });

  test("zooming back out re-clamps a pan that was legal when it was made", async () => {
    const { container: c, stage, image, crop } = mount(
      <ImageEdit src={image_(1600, 900)} alt="" defaultZoom={300} />,
    );
    await loaded(image);
    for (let i = 0; i < 40; i++) key(stage, "ArrowRight", true);

    const slider = c.querySelector<HTMLInputElement>('input[type="range"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!.call(slider, "100");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // The offset was legal at 300% and is not at 100%. Clamped on READ, or the
    // crop drifts off the picture with nothing having been dragged.
    expect(cropIsCovered(image, crop)).toBe(true);
  });
});

describe("ImageEdit forwarding — §5", () => {
  test("the ref lands on the outermost node", () => {
    const ref = createRef<HTMLDivElement>();
    const { root: el } = mount(<ImageEdit ref={ref} src={PIXEL} alt="" />);
    expect(ref.current).toBe(el);
  });

  test("className lands on the outermost node", () => {
    const { root: el } = mount(<ImageEdit src={PIXEL} alt="" className="opacity-50" />);
    expect(getComputedStyle(el).opacity).toBe("0.5");
  });
});
