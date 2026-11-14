import { afterEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

import { Button } from "@/ui/button/button.tsx";
import { Modal } from "./modal.tsx";

/**
 * Pixel measurements, which is why this lives in the `visual` project rather
 * than beside the contract tests: that project gives the test frame a page
 * larger than itself, so the frame is NOT scaled to fit. In `contract` it is
 * scaled to 0.8, and a ring resampled at 0.8 cannot say which of its edges is
 * heavier. No baselines — every assertion here is arithmetic on the capture.
 */
let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

async function settled(el: Element) {
  // Base UI suppresses the enter transition for one frame, so wait for it to
  // exist before waiting for it to finish (see modal.browser.test.tsx).
  for (let i = 0; i < 3 && el.getAnimations().length === 0; i++) await nextFrame();
  for (let i = 0; i < 5; i++) {
    const running = el.getAnimations();
    if (running.length === 0) break;
    await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
  }
}

/** Where `y` sits between two device pixels: 0 is on the grid. */
const subpixel = (y: number) => (((y * devicePixelRatio) % 1) + 1) % 1;

/**
 * The ring of `el`, read from a screenshot of `frame`: the ink down one pixel
 * column through its top edge and, mirrored, up through its bottom edge. Each
 * run starts outside the box and keeps every pixel that differs from the
 * frame's own fill, so it reads the ring in either scheme.
 */
async function edgeRuns(frame: HTMLElement, el: HTMLElement, x: number) {
  const shot = (await page.screenshot({ element: frame, base64: true, save: false })) as unknown;
  const img = new Image();
  img.src = `data:image/png;base64,${typeof shot === "string" ? shot : (shot as { base64: string }).base64}`;
  await img.decode();
  const f = frame.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const dpr = devicePixelRatio;
  // A capture that is not 1:1 with the frame would measure a resampled ring.
  expect(img.width).toBe(Math.round(f.width * dpr));

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const column = ctx.getImageData(Math.round((r.left - f.left + x) * dpr), 0, 1, img.height).data;
  const at = (y: number) => [column[y * 4]!, column[y * 4 + 1]!, column[y * 4 + 2]!];
  const fill = at(Math.round((r.top - f.top - 6) * dpr));
  const ink = (y: number) => Math.round(at(y).reduce((sum, c, i) => sum + Math.abs(c - fill[i]!), 0) / 3);
  const run = (from: number, step: number) => {
    const out: number[] = [];
    let y = from;
    while (ink(y) <= 2 && Math.abs(y - from) < 6 * dpr) y += step;
    for (; y >= 0 && y < img.height && ink(y) > 2; y += step) out.push(ink(y));
    return out;
  };
  return {
    top: run(Math.floor((r.top - f.top - 3) * dpr), 1),
    bottom: run(Math.ceil((r.bottom - f.top + 3) * dpr), -1),
  };
}

describe("Modal paints on whole pixels", () => {
  /**
   * The dialog was centred with `top-1/2 left-1/2 -translate-1/2`, and a
   * transform is painted exactly where it lands — unsnapped. Whenever the
   * centring arithmetic, or the fluid title's fractional line height above the
   * footer, put a control off the pixel grid, its 1.5px hairline split the
   * half pixel unevenly: the outline Cancel button's bottom edge read visibly
   * heavier than its top. "Sometimes", because it moved with the window height
   * and the dialog's content. Layout offsets are snapped at paint, so
   * auto-margin centring cannot do it.
   *
   * Measured in pixels because nothing declarative tells the two apart: both
   * rings compute to the same `box-shadow`, and getBoundingClientRect reports
   * the same fractional top for both centring methods.
   *
   * The spacer walks the button through each sub-pixel offset: growing the
   * surface by d moves its top up by d/2 and everything below the spacer
   * down by d/2.
   */
  test.each([0, 0.25, 0.5, 0.75])(
    "a footer button's hairline paints evenly top and bottom at a %spx offset",
    async (offset) => {
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      act(() => {
        root!.render(
          <Modal defaultIsOpen>
            <Modal.Surface>
              <Modal.Title>Discard changes?</Modal.Title>
              <div data-testid="spacer" />
              <Modal.Footer>
                <Modal.Close render={<Button variant="outline" size="md">Cancel</Button>} />
                <Button size="md">Discard</Button>
              </Modal.Footer>
            </Modal.Surface>
          </Modal>,
        );
      });
      const surface = document.querySelector<HTMLElement>('[data-slot="modal-surface"]')!;
      await settled(surface);
      const cancel = surface.querySelector<HTMLElement>('[data-variant="outline"]')!;
      const grow = ((((offset - subpixel(cancel.getBoundingClientRect().top)) % 1) + 1) % 1) * 2;
      surface.querySelector<HTMLElement>('[data-testid="spacer"]')!.style.height = `${grow / devicePixelRatio}px`;
      await nextFrame();
      expect(subpixel(cancel.getBoundingClientRect().top)).toBeCloseTo(offset, 2);

      // Inside the straight run of the edge: past the 8px corner, before the label.
      const { top, bottom } = await edgeRuns(surface, cancel, 10);
      expect(top.length).toBeGreaterThan(0);
      // The bottom edge is the top edge mirrored, pixel for pixel, within a
      // rounding step.
      expect(bottom).toHaveLength(top.length);
      bottom.forEach((v, i) => expect(Math.abs(v - top[i]!)).toBeLessThanOrEqual(3));
    },
  );
});
